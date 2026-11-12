// api/cambiar-fecha.js
// Cambio de fecha de una reserva (individual o de grupo) por parte del cliente, sin
// iniciar sesión: se identifica con el código de reserva (api/_codigosReserva.js) y
// el email con el que reservó. Las compras de invitado viven en una sesión anónima
// que no se puede reabrir, así que esta es la única forma de que vuelvan a su
// reserva. Las reservas anteriores a los códigos también entran con su número de
// pedido (solo dígitos); al entrar se les crea el código y se les devuelve.
//
// POST { accion: "buscar",    codigo, email }
//      { accion: "confirmar", codigo, email, fecha, turno }
//
// Se lee y escribe con firebase-admin (ni /reservas ni los nodos de apoyo son
// públicos) y todas las reglas se comprueban aquí, nunca en el navegador:
// src/utils/cambioFecha.js.
import { createHash } from "node:crypto";
import { adminDb } from "./_firebaseAdmin.js";
import { applyCors } from "./_cors.js";
import {
  ANTELACION_HORAS,
  MAX_CAMBIOS_CLIENTE,
  TURNOS_GRUPO,
  ahoraMadridMs,
  esFechaISO,
  evaluarCambio,
  evaluarCambioGrupo,
  motivoFechaNoValida,
  normalizarEmail,
  opcionesDeCambio,
  opcionesDeCambioEdicion,
  opcionesDeCambioGrupo,
  plazasLibresParaReserva,
  turnosElegibles,
} from "../src/utils/cambioFecha.js";
import {
  asegurarCodigo,
  actualizarRutaCodigo,
  buscarGrupoPorOrderId,
  buscarReservaIndividual,
  esCodigoValido,
  formatearCodigo,
  normalizarCodigo,
} from "./_codigosReserva.js";
import { limpiarTurno } from "../src/utils/turnosFecha.js";
import { normalizarConfigEspacio } from "../src/utils/configEspacio.js";
import { escribirConAforo } from "./_reservarServidor.js";

import { fechaDMA } from "../src/utils/formatoFecha.js";
export const config = { runtime: "nodejs" };

const NO_ENCONTRADA =
  "No encontramos una reserva con esos datos. Revisa el código de reserva y el email con el que reservaste.";
const ORDER_ID = /^\d{4,20}$/; // reservas anteriores a los códigos

// --- Límite de intentos -----------------------------------------------------
// Sin él se podrían probar números de reserva (son correlativos) hasta acertar el
// email. Se cuenta por IP y, aparte, los fallos por número de reserva.
async function consumirIntento(clave, maximo, ventanaMs) {
  const ahora = Date.now();
  const resultado = await adminDb.ref(`limitesCambioFecha/${clave}`).transaction((actual) => {
    if (!actual || ahora - Number(actual.desde || 0) > ventanaMs) {
      return { n: 1, desde: ahora };
    }
    if (Number(actual.n || 0) >= maximo) return; // aborta: sin cambios
    return { n: Number(actual.n || 0) + 1, desde: actual.desde };
  });

  return resultado.committed;
}

const hash = (texto) => createHash("sha256").update(String(texto)).digest("hex").slice(0, 32);

const ipDe = (req) =>
  String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "desconocida")
    .split(",")[0]
    .trim();

// --- Localizar la reserva ---------------------------------------------------
// Devuelve { tipo, codigo, ... } o null. Con código sale del índice; con un número
// de pedido (reservas antiguas) se busca y se le crea el código.
async function localizar(entrada) {
  if (ORDER_ID.test(entrada)) {
    const individual = await buscarReservaIndividual(adminDb, entrada);
    if (individual) {
      const codigo = await asegurarCodigo(adminDb, {
        clave: entrada,
        datos: {
          tipo: "individual",
          orderId: entrada,
          ruta: individual.segmentos.join("/"),
          uid: individual.reserva.uid || "",
        },
      });
      return { tipo: "individual", codigo, ...individual };
    }

    const grupo = await buscarGrupoPorOrderId(adminDb, entrada);
    if (grupo) {
      const codigo = await asegurarCodigo(adminDb, {
        clave: `grupo_${grupo.id}`,
        datos: { tipo: "grupo", grupoId: grupo.id, uid: grupo.grupo.uid || "" },
      });
      return { tipo: "grupo", codigo, ...grupo };
    }

    return null;
  }

  if (!esCodigoValido(entrada)) return null;

  const codigo = normalizarCodigo(entrada);
  const indice = await adminDb.ref(`codigosReserva/${codigo}`).get();
  if (!indice.exists()) return null;

  const datos = indice.val() || {};

  if (datos.tipo === "grupo") {
    const grupo = await adminDb.ref(`reservasGrupos/${datos.grupoId}`).get();
    return grupo.exists() ? { tipo: "grupo", codigo, id: datos.grupoId, grupo: grupo.val() } : null;
  }

  const individual = await buscarReservaIndividual(adminDb, datos.orderId);
  if (!individual) return null;

  // El panel pudo mover la reserva: el código se queda apuntando a la ruta nueva
  if (individual.segmentos.join("/") !== datos.ruta) {
    await actualizarRutaCodigo(adminDb, codigo, individual.segmentos.join("/"));
  }

  return { tipo: "individual", codigo, ...individual };
}

async function emailDeLaReserva(reserva) {
  const emails = [reserva.email];

  if (reserva.uid) {
    const usuario = await adminDb.ref(`usuarios/${reserva.uid}/email`).get();
    emails.push(usuario.val());
  }

  return emails.map(normalizarEmail).filter(Boolean);
}

// --- Datos que se enseñan al cliente ---------------------------------------
const resumenDe = (reserva, evaluacion, { tipo, codigo }) => ({
  tipo,
  codigo: formatearCodigo(codigo),
  clase: reserva.clase || "",
  fecha: reserva.fecha || "",
  turno: limpiarTurno(reserva.turno || ""),
  metodo: tipo === "grupo" ? reserva.nombreGrupo || "" : reserva.nombreTipoClase || reserva.metodo || "",
  plazas: Number(reserva.plazas || 1),
  reprogramada: !!reserva.reprogramada,
  fechaOriginal: reserva.fechaOriginal || "",
  puedeCambiar: evaluacion.ok,
  motivo: evaluacion.motivo,
  antelacionHoras: ANTELACION_HORAS,
  cambiosRestantes: Math.max(MAX_CAMBIOS_CLIENTE - Number(reserva.numCambiosCliente || 0), 0),
});

async function contextoDeLaClase(segmentos, reserva) {
  const carpeta = segmentos[1];
  const claseId = reserva.claseId || carpeta;

  const [clase, bloqueos, habilitadas, grupos, reservas, espacio] = await Promise.all([
    adminDb.ref(`clases/${claseId}`).get(),
    adminDb.ref("bloqueosFechas").get(),
    adminDb.ref("fechasHabilitadas").get(),
    adminDb.ref("reservasGrupos").get(),
    adminDb.ref("reservas").get(),
    adminDb.ref("configuracionEspacio").get(),
  ]);

  return {
    carpeta,
    clase: clase.exists() ? clase.val() : null,
    bloqueos: bloqueos.val() || {},
    fechasHabilitadas: habilitadas.val() || {},
    reservasGrupos: grupos.val() || {},
    // Snapshots y configuración para el aforo real (src/utils/aforo.js)
    grupos,
    config: normalizarConfigEspacio(espacio.exists() ? espacio.val() : null),
    reservas,
  };
}

const textoFechaHora = () =>
  new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });

const sinOnline =
  "No se puede cambiar esta reserva por internet. Escríbenos y la cambiamos.";

// Campos que deja un cambio hecho por el cliente (mismos que usa el panel)
function camposDeCambio({ reserva, nuevaFecha, nuevoTurno, turnoAnterior, cambio }) {
  return {
    fecha: nuevaFecha,
    turno: nuevoTurno,
    reprogramada: true,
    fechaOriginal: reserva.fechaOriginal || reserva.fecha,
    turnoOriginal: limpiarTurno(reserva.turnoOriginal || turnoAnterior),
    ultimaFechaAnterior: reserva.fecha,
    ultimoTurnoAnterior: turnoAnterior,
    fechaReprogramada: nuevaFecha,
    turnoReprogramado: nuevoTurno,
    reprogramadaEn: cambio,
    reprogramadaPor: "Cliente",
    numCambiosCliente: Number(reserva.numCambiosCliente || 0) + 1,
    avisoPerfil: "Has cambiado la fecha de tu reserva. Revisa la nueva fecha y turno.",
  };
}

// Constancia para el panel y copia del perfil, comunes a individuales y grupos
async function anotarCambio({ actualizaciones, orderId, uid, seguimiento, reserva, turnoAnterior, cambio, etiqueta }) {
  if (uid && orderId) {
    const lista = await adminDb.ref(`usuarios/${uid}/listaReservas`).get();
    lista.forEach((item) => {
      if (item.val()?.orderId === orderId) {
        Object.entries(seguimiento).forEach(([campo, valor]) => {
          actualizaciones[`usuarios/${uid}/listaReservas/${item.key}/${campo}`] = valor;
        });
      }
    });
  }

  if (!orderId) return;

  const notas = adminDb.ref(`reservasNotas/${orderId}`);
  actualizaciones[`reservasNotas/${orderId}/reprogramaciones/${notas.child("reprogramaciones").push().key}`] = {
    fechaAnterior: reserva.fecha,
    turnoAnterior,
    fechaNueva: seguimiento.fecha,
    turnoNuevo: seguimiento.turno,
    fechaCambio: cambio,
    realizadoPor: "Cliente",
  };
  actualizaciones[`reservasNotas/${orderId}/notasInternas/${notas.child("notasInternas").push().key}`] = {
    texto: `${etiqueta} reprogramada por el cliente desde la web. Antes: ${fechaDMA(reserva.fecha)} - ${turnoAnterior}. Ahora: ${fechaDMA(seguimiento.fecha)} - ${seguimiento.turno}.`,
    fecha: cambio,
  };
}

// --- Rama de grupos ----------------------------------------------------------
async function resolverGrupo({ accion, encontrada, cuerpo, ahoraMs, res }) {
  const { id, grupo, codigo } = encontrada;
  const evaluacion = evaluarCambioGrupo(grupo, ahoraMs);
  const resumen = (reserva, ev) => resumenDe(reserva, ev, { tipo: "grupo", codigo });

  if (accion === "buscar") {
    if (!evaluacion.ok) {
      return res.status(200).json({ ok: true, reserva: resumen(grupo, evaluacion), opciones: [] });
    }

    const bloqueos = (await adminDb.ref("bloqueosFechas").get()).val() || {};
    return res.status(200).json({
      ok: true,
      reserva: resumen(grupo, evaluacion),
      opciones: opcionesDeCambioGrupo({ grupo, bloqueos, ahoraMs }),
    });
  }

  if (!evaluacion.ok) return res.status(409).json({ ok: false, error: evaluacion.motivo });

  const nuevaFecha = String(cuerpo.fecha || "");
  const nuevoTurno = limpiarTurno(cuerpo.turno || "");

  if (!esFechaISO(nuevaFecha) || !TURNOS_GRUPO.includes(nuevoTurno)) {
    return res.status(400).json({ ok: false, error: "Elige una fecha y un turno." });
  }

  const bloqueos = (await adminDb.ref("bloqueosFechas").get()).val() || {};
  const motivo = motivoFechaNoValida({ fecha: nuevaFecha, turno: nuevoTurno, ahoraMs, bloqueos });
  if (motivo) return res.status(409).json({ ok: false, error: motivo });

  if (nuevaFecha === grupo.fecha && nuevoTurno === limpiarTurno(grupo.turno)) {
    return res.status(409).json({ ok: false, error: "Elige una fecha o un turno distinto al actual." });
  }

  const cambio = textoFechaHora();
  const turnoAnterior = limpiarTurno(grupo.turno || "");
  const seguimiento = {
    ...camposDeCambio({ reserva: grupo, nuevaFecha, nuevoTurno, turnoAnterior, cambio }),
    fechaAnterior: grupo.fecha || "",
    // Las fechas de grupo se acuerdan con el taller: Berto revisa lo que cambia el cliente
    cambioClientePendienteRevision: true,
    actualizadoEn: new Date().toISOString(),
  };

  const actualizaciones = {};
  Object.entries(seguimiento).forEach(([campo, valor]) => {
    actualizaciones[`reservasGrupos/${id}/${campo}`] = valor;
  });

  await anotarCambio({
    actualizaciones,
    orderId: grupo.orderId,
    uid: grupo.uid,
    seguimiento,
    reserva: grupo,
    turnoAnterior,
    cambio,
    etiqueta: "Reserva de grupo",
  });

  await adminDb.ref().update(actualizaciones);

  return res.status(200).json({
    ok: true,
    reserva: resumen(
      { ...grupo, ...seguimiento },
      { ok: false, motivo: "Ya has cambiado la fecha de esta reserva." }
    ),
  });
}

// --- Rama de monográficos ---------------------------------------------------
// Una reserva de monográfico son varias sesiones (una por reserva, mismo pedido). Solo
// se puede pasar a otra edición entera. Cuenta el primer día para el plazo de 72 h.
async function resolverEdicion({ accion, encontrada, cuerpo, ahoraMs, res }) {
  const { segmentos, reserva, codigo } = encontrada;
  const orderId = reserva.orderId;
  const evaluacion = evaluarCambio(reserva, ahoraMs);
  const resumen = (r, ev) => resumenDe(r, ev, { tipo: "individual", codigo });

  const contexto = await contextoDeLaClase(segmentos, reserva);
  if (!contexto.clase) {
    return accion === "buscar"
      ? res.status(200).json({ ok: true, reserva: resumen(reserva, { ok: false, motivo: sinOnline }), opciones: [] })
      : res.status(409).json({ ok: false, error: sinOnline });
  }

  const ediciones = evaluacion.ok
    ? opcionesDeCambioEdicion({
        clase: contexto.clase,
        reserva,
        reservas: contexto.reservas,
        grupos: contexto.grupos,
        config: contexto.config,
        bloqueos: contexto.bloqueos,
        ahoraMs,
      })
    : [];

  if (accion === "buscar") {
    return res.status(200).json({ ok: true, reserva: resumen(reserva, evaluacion), opciones: [], ediciones });
  }

  if (!evaluacion.ok) return res.status(409).json({ ok: false, error: evaluacion.motivo });

  const nueva = ediciones.find((e) => e.id === String(cuerpo.edicionId || ""));
  if (!nueva) {
    return res.status(409).json({ ok: false, error: "Esa edición ya no está disponible. Elige otra." });
  }

  // Todas las sesiones actuales de este pedido, en la carpeta del taller
  const dias = [];
  contexto.reservas.child(segmentos[1]).forEach((fechaSnap) => {
    fechaSnap.forEach((turnoSnap) => {
      turnoSnap.forEach((hijo) => {
        if (hijo.val()?.orderId === orderId) {
          dias.push(`reservas/${segmentos[1]}/${fechaSnap.key}/${turnoSnap.key}/${hijo.key}`);
        }
      });
    });
  });
  if (!dias.length) return res.status(409).json({ ok: false, error: sinOnline });

  const cambio = textoFechaHora();
  const turnoAnterior = limpiarTurno(reserva.turno || "");
  const [primera] = nueva.fechas;
  const seguimiento = {
    ...camposDeCambio({ reserva, nuevaFecha: primera.fecha, nuevoTurno: primera.turno, turnoAnterior, cambio }),
    edicionId: nueva.id,
    fechasEdicion: nueva.fechas,
  };

  const ahora = new Date().toISOString();
  const preparadas = nueva.fechas.map((dia, indice) => {
    const base = `reservas/${segmentos[1]}/${dia.fecha}/${dia.turno}`;
    const clave = adminDb.ref(base).push().key;
    const datos = {
      ...reserva,
      ...seguimiento,
      fecha: dia.fecha,
      turno: dia.turno,
      sesionEdicion: indice + 1,
      sesionesEdicion: nueva.fechas.length,
      incluyeTorno: dia.torno === true,
      creadaEnMs: ahora,
    };
    delete datos.reservadaHasta;

    return {
      fecha: dia.fecha,
      turno: dia.turno,
      torno: dia.torno === true,
      ruta: `${base}/${clave}`,
      clave,
      datos,
    };
  });

  // Si todo cabe: se borran las sesiones anteriores y el código apunta a la edición nueva
  const alExito = { [`codigosReserva/${codigo}/ruta`]: preparadas[0].ruta };
  dias.forEach((ruta) => {
    alExito[ruta] = null;
  });

  await anotarCambio({
    actualizaciones: alExito,
    orderId,
    uid: reserva.uid,
    seguimiento,
    reserva,
    turnoAnterior,
    cambio,
    etiqueta: "Reserva de monográfico",
  });

  const resultado = await escribirConAforo(adminDb, preparadas, contexto.config, Date.now(), alExito);
  if (!resultado.ok) {
    return res
      .status(resultado.status)
      .json({ ok: false, error: "Esa edición se acaba de llenar. Elige otra." });
  }

  return res.status(200).json({
    ok: true,
    reserva: resumen(
      { ...reserva, ...seguimiento },
      { ok: false, motivo: "Ya has cambiado la fecha de esta reserva." }
    ),
  });
}

// --- Rama de reservas individuales ------------------------------------------
async function resolverIndividual({ accion, encontrada, cuerpo, ahoraMs, res }) {
  if (encontrada.reserva?.edicionId) {
    return resolverEdicion({ accion, encontrada, cuerpo, ahoraMs, res });
  }

  const { segmentos, reserva, codigo } = encontrada;
  const orderId = reserva.orderId;
  const evaluacion = evaluarCambio(reserva, ahoraMs);
  const resumen = (r, ev) => resumenDe(r, ev, { tipo: "individual", codigo });

  if (accion === "buscar") {
    if (!evaluacion.ok) {
      return res.status(200).json({ ok: true, reserva: resumen(reserva, evaluacion), opciones: [] });
    }

    const contexto = await contextoDeLaClase(segmentos, reserva);
    if (!contexto.clase) {
      return res
        .status(200)
        .json({ ok: true, reserva: resumen(reserva, { ok: false, motivo: sinOnline }), opciones: [] });
    }

    return res.status(200).json({
      ok: true,
      reserva: resumen(reserva, evaluacion),
      opciones: opcionesDeCambio({ ...contexto, reserva, ahoraMs }),
    });
  }

  if (!evaluacion.ok) return res.status(409).json({ ok: false, error: evaluacion.motivo });

  const nuevaFecha = String(cuerpo.fecha || "");
  const nuevoTurno = limpiarTurno(cuerpo.turno || "");

  if (!esFechaISO(nuevaFecha) || !nuevoTurno) {
    return res.status(400).json({ ok: false, error: "Elige una fecha y un turno." });
  }

  const contexto = await contextoDeLaClase(segmentos, reserva);
  if (!contexto.clase) return res.status(409).json({ ok: false, error: sinOnline });

  const motivo = motivoFechaNoValida({
    fecha: nuevaFecha,
    turno: nuevoTurno,
    ahoraMs,
    bloqueos: contexto.bloqueos,
  });
  if (motivo) return res.status(409).json({ ok: false, error: motivo });

  const turnosDelDia = turnosElegibles({
    clase: contexto.clase,
    fecha: nuevaFecha,
    fechasHabilitadas: contexto.fechasHabilitadas,
    reservasGrupos: contexto.reservasGrupos,
  });
  if (!turnosDelDia.includes(nuevoTurno)) {
    return res.status(409).json({ ok: false, error: "Ese turno no está disponible ese día." });
  }

  const [, , fechaActual, turnoActual, ...resto] = segmentos;
  if (nuevaFecha === fechaActual && nuevoTurno === limpiarTurno(turnoActual)) {
    return res.status(409).json({ ok: false, error: "Elige una fecha o un turno distinto al actual." });
  }

  const libres = plazasLibresParaReserva({
    reservas: contexto.reservas,
    grupos: contexto.grupos,
    config: contexto.config,
    reserva,
    fecha: nuevaFecha,
    turno: nuevoTurno,
  });
  if (libres < Number(reserva.plazas || 1)) {
    return res.status(409).json({ ok: false, error: "Ya no quedan plazas suficientes en ese turno." });
  }

  // Misma forma que la reserva original: con o sin carpeta de método
  const carpetaMetodo = resto.length > 1 ? [resto[0]] : [];
  const baseNueva = ["reservas", segmentos[1], nuevaFecha, nuevoTurno, ...carpetaMetodo].join("/");
  const rutaNueva = `${baseNueva}/${adminDb.ref(baseNueva).push().key}`;

  const cambio = textoFechaHora();
  const turnoAnterior = limpiarTurno(reserva.turno || turnoActual);
  const seguimiento = camposDeCambio({ reserva, nuevaFecha, nuevoTurno, turnoAnterior, cambio });

  const actualizaciones = {
    [rutaNueva]: { ...reserva, ...seguimiento },
    [segmentos.join("/")]: null,
    [`codigosReserva/${codigo}/ruta`]: rutaNueva,
  };

  await anotarCambio({
    actualizaciones,
    orderId,
    uid: reserva.uid,
    seguimiento,
    reserva,
    turnoAnterior,
    cambio,
    etiqueta: "Reserva",
  });

  await adminDb.ref().update(actualizaciones);

  return res.status(200).json({
    ok: true,
    reserva: resumen(
      { ...reserva, ...seguimiento },
      { ok: false, motivo: "Ya has cambiado la fecha de esta reserva." }
    ),
  });
}

// --- Manejador ---------------------------------------------------------------
export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const cuerpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const accion = String(cuerpo.accion || "");
    const entrada = ORDER_ID.test(String(cuerpo.codigo || "").replace(/\s+/g, ""))
      ? String(cuerpo.codigo).replace(/\s+/g, "")
      : normalizarCodigo(cuerpo.codigo);
    const email = normalizarEmail(cuerpo.email);

    if (!["buscar", "confirmar"].includes(accion)) {
      return res.status(400).json({ ok: false, error: "Acción no válida" });
    }

    if (!entrada || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ ok: false, error: "Introduce el código de reserva y tu email." });
    }

    const demasiados = {
      ok: false,
      error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
    };

    if (!(await consumirIntento(`ip_${hash(ipDe(req))}`, 30, 15 * 60_000))) {
      return res.status(429).json(demasiados);
    }

    // Quien falla muchas veces con un mismo código queda bloqueado un rato
    const claveFallos = `codigo_${hash(entrada)}`;
    const fallos = await adminDb.ref(`limitesCambioFecha/${claveFallos}`).get();
    if (
      fallos.exists() &&
      Number(fallos.val()?.n || 0) >= 6 &&
      Date.now() - Number(fallos.val()?.desde || 0) < 60 * 60_000
    ) {
      return res.status(429).json(demasiados);
    }

    const noEncontrada = async () => {
      await consumirIntento(claveFallos, Number.MAX_SAFE_INTEGER, 60 * 60_000);
      return res.status(404).json({ ok: false, error: NO_ENCONTRADA });
    };

    const encontrada = await localizar(entrada);
    if (!encontrada) return noEncontrada();

    // Mismo mensaje si el código no existe o el email no coincide
    const datosReserva = encontrada.tipo === "grupo" ? encontrada.grupo : encontrada.reserva;
    if (!(await emailDeLaReserva(datosReserva)).includes(email)) return noEncontrada();

    const contexto = { accion, encontrada, cuerpo, ahoraMs: ahoraMadridMs(), res };

    return encontrada.tipo === "grupo" ? await resolverGrupo(contexto) : await resolverIndividual(contexto);
  } catch (error) {
    console.error("Error en /api/cambiar-fecha:", error);
    return res.status(500).json({ ok: false, error: "No se pudo completar la operación. Inténtalo de nuevo." });
  }
}
