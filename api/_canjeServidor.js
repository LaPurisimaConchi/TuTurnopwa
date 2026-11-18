// api/_canjeServidor.js
// Tarjetas regalo y bonos en el servidor (no cuenta como función de Vercel: empieza
// por _). Antes lo hacía el navegador; las reglas ya no le dejan escribir tarjetas
// ni bonos. Lo llama api/codigo-reserva.js:
//   tipo "tarjeta"   comprueba un código y devuelve lo que la pantalla necesita para seguir
//   tipo "canjear"   confirma con la tarjeta las reservas pendientes de un pedido (y crea el bono)
//   tipo "usarBono"  reserva una clase de un bono del perfil y la descuenta
//
// Una tarjeta solo se canjea una vez: se «reclama» con una transacción (dos pestañas
// o un doble clic no pasan las dos) y se marca usada en la misma escritura que
// confirma la reserva. Si algo falla antes, la reclamación se libera.
import { escribirConAforo, fallo } from "./_reservarServidor.js";
import { enviarCorreoReserva } from "./_correoReserva.js";
import { asegurarCodigo } from "./_codigosReserva.js";
import { normalizarConfigEspacio } from "../src/utils/configEspacio.js";
import { hoyMadrid } from "../src/utils/formatoFecha.js";
import { bloqueoAfectaTurno } from "../src/utils/rangosHora.js";
import { normalizarMetodo } from "../src/utils/plazasOcupadas.js";
import {
  datosPrimeraSesionBono,
  motivoFechaFueraDeBono,
  obtenerEstadoVisibleBono,
  sesionBonoRepetida,
} from "../src/utils/estadoBono.js";
import { turnoYaEmpezado } from "../src/utils/cambioFecha.js";

const ID = /^[A-Za-z0-9_-]{1,60}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PEDIDO = /^\d{4,20}$/;
const TURNO = /^[^./$#[\]]{1,60}$/;
const CODIGO_TARJETA = /^[A-Z0-9-]{4,40}$/;
const RECLAMO_CADUCA_MS = 2 * 60 * 1000;
const MAX_CLASES_BONO = 20;

const sinControl = (texto) => [...texto].every((c) => c.charCodeAt(0) >= 32);
const texto = (valor, max = 200) => String(valor ?? "").slice(0, max);

// Carpetas de reservas de los bonos de siempre (como en UsarBono)
export const CARPETA_BONO_ANTIGUO = {
  modelamano4clases: "ModelaAManoYDecoraTusPiezasFavoritas",
  tornodesdecero4clases: "TornoAlfareroEmpezarDesdeCero",
  tornodecoracion4clases: "TornoAlfareroYDecoracion",
  tornoperfeccionamiento6clases: "TornoAlfareroPerfeccionaLoQueYaSabes",
};

const tarjetaUsada = (t) =>
  t?.usado === true ||
  t?.canjeado === true ||
  ["usada", "canjeado"].includes(String(t?.estadoCanje || "").toLowerCase());

// --- Búsqueda -------------------------------------------------------------------

// Tarjeta por su código: primero el índice y, para tarjetas antiguas sin índice, el listado
async function buscarTarjeta(db, codigo) {
  const limpio = String(codigo || "").trim().toUpperCase();
  if (!CODIGO_TARJETA.test(limpio)) return null;

  const indice = await db.ref(`codigosTarjetaRegalo/${limpio}`).get();
  if (indice.exists()) {
    const id = String(indice.val());
    if (ID.test(id)) {
      const snap = await db.ref(`tarjetasRegalo/${id}`).get();
      if (snap.exists()) return { id, ...snap.val() };
    }
  }

  const todas = await db.ref("tarjetasRegalo").get();
  let encontrada = null;
  todas.forEach((item) => {
    const valor = item.val();
    if (!encontrada && String(valor?.codigo || "").trim().toUpperCase() === limpio) {
      encontrada = { id: item.key, ...valor };
    }
  });
  return encontrada;
}

// Todas las reservas de un pedido (un taller de varias sesiones o un monográfico
// tienen una por sesión con el mismo orderId), con su ruta
export function reservasDelPedido(nodo, orderId, ruta = "reservas", halladas = []) {
  if (!nodo || typeof nodo !== "object") return halladas;

  for (const [clave, valor] of Object.entries(nodo)) {
    if (!valor || typeof valor !== "object") continue;
    const rutaHija = `${ruta}/${clave}`;

    if (String(valor.orderId || "") === orderId && (valor.uid || valor.estado)) {
      halladas.push({ ruta: rutaHija, reserva: valor });
      continue;
    }
    reservasDelPedido(valor, orderId, rutaHija, halladas);
  }

  return halladas;
}

// --- Reclamar y liberar ---------------------------------------------------------

async function reclamar(db, tarjetaId, uid) {
  const ahora = Date.now();
  const { committed, snapshot } = await db.ref(`tarjetasRegalo/${tarjetaId}`).transaction((t) => {
    // Sin datos en caché: se devuelve tal cual y se repite con los del servidor
    if (t === null) return t;
    if (tarjetaUsada(t)) return;
    if (t.canjeadoPorUID && t.canjeadoPorUID !== uid) return;

    const enCurso = t.reclamadaEn && ahora - Number(t.reclamadaEn) < RECLAMO_CADUCA_MS;
    if (enCurso && t.reclamadaPor !== uid) return;

    return { ...t, reclamadaEn: ahora, reclamadaPor: uid };
  });
  return committed && snapshot.val()?.reclamadaPor === uid;
}

async function liberar(db, tarjetaId, uid) {
  await db
    .ref(`tarjetasRegalo/${tarjetaId}`)
    .transaction((t) => {
      if (t === null) return t;
      if (tarjetaUsada(t) || t.reclamadaPor !== uid) return;
      return { ...t, reclamadaEn: null, reclamadaPor: null };
    })
    .catch((error) => console.error("No se pudo liberar la tarjeta regalo:", error));
}

// --- tipo "tarjeta" -------------------------------------------------------------

// Lo que necesita la pantalla de canje para llevar a la reserva. Nunca devuelve los
// datos de quien la compró ni de quien la recibe.
export async function consultarTarjeta(db, uid, codigo) {
  const tarjeta = await buscarTarjeta(db, codigo);
  if (!tarjeta) return fallo(404, "Código no válido. Revisa que lo has escrito bien.", { codigo: "no_existe" });

  return {
    ok: true,
    status: 200,
    tarjeta: {
      id: tarjeta.id,
      codigo: texto(tarjeta.codigo, 40),
      clase: texto(tarjeta.clase),
      claseId: texto(tarjeta.claseId, 60),
      subtipo: texto(tarjeta.subtipo),
      tipoPieza: texto(tarjeta.tipoPieza),
      tipoTaller: texto(tarjeta.tipoTaller),
      metodo: texto(tarjeta.metodo),
      precioTotal: Number(tarjeta.precioTotal) || 0,
      plazas: Number(tarjeta.plazas) || 1,
      numeroClases: Number(tarjeta.numeroClases) || 0,
      pagada: String(tarjeta.estadoPago || "").toLowerCase() === "pagado",
      usada: tarjetaUsada(tarjeta),
      deOtraPersona: !!tarjeta.canjeadoPorUID && tarjeta.canjeadoPorUID !== uid,
    },
  };
}

// --- tipo "canjear" -------------------------------------------------------------

// Campos del bono que se toman de la pantalla; el resto (clases, estado, pago) los pone el servidor
const CAMPOS_BONO = [
  "clase",
  "subtipo",
  "fechaInicio",
  "fechaFinMes",
  "fechaCaducidadBono",
  "turnoHabitual",
  "duracionClase",
  "modalidad",
  "distribucionClases",
  "incluyeDecoracion",
  "incluyeCambioTorno",
  "extraCambioTorno",
];

function datosBonoDeCliente(bono) {
  const limpio = {};
  if (!bono || typeof bono !== "object") return limpio;
  for (const campo of CAMPOS_BONO) {
    const valor = bono[campo];
    if (valor === undefined || valor === null) continue;
    if (typeof valor === "boolean" || typeof valor === "number") limpio[campo] = valor;
    else if (typeof valor === "string") limpio[campo] = texto(valor);
    else if (typeof valor === "object" && JSON.stringify(valor).length < 2000) limpio[campo] = valor;
  }
  return limpio;
}

// Clases del bono: las de la tarjeta o las de la ficha del taller; la pantalla solo
// decide si no hay ninguna de las dos (bonos de siempre sin ficha completa)
function clasesDelBono(tarjeta, clase, bonoCliente) {
  const candidatas = [
    Number(tarjeta?.numeroClases),
    Number(clase?.numeroClases ?? clase?.NumeroClases),
    Number(bonoCliente?.numeroClases),
    4,
  ];
  const elegida = candidatas.find((n) => Number.isInteger(n) && n > 0) || 4;
  return Math.min(elegida, MAX_CLASES_BONO);
}

export async function canjearTarjeta(db, uid, { codigo, orderId, bono } = {}) {
  orderId = String(orderId || "");
  if (!PEDIDO.test(orderId)) return fallo(400, "Pedido no válido");

  const tarjeta = await buscarTarjeta(db, codigo);
  if (!tarjeta) return fallo(404, "Código no válido", { codigo: "no_existe" });
  if (String(tarjeta.estadoPago || "").toLowerCase() !== "pagado") {
    return fallo(409, "Esta tarjeta regalo aún no consta como pagada.", { codigo: "no_pagada" });
  }

  if (!(await reclamar(db, tarjeta.id, uid))) {
    return fallo(409, "Esta tarjeta regalo ya se ha usado o hay un canje en curso.", { codigo: "tarjeta_usada" });
  }

  try {
    const ahora = new Date().toISOString();
    const todas = await db.ref("reservas").get();
    const delPedido = reservasDelPedido(todas.val(), orderId).filter((r) => r.reserva.uid === uid);
    const pendientes = delPedido.filter(
      (r) => String(r.reserva.estado || "").toLowerCase() === "pendiente"
    );

    const esBonoSinReserva = !delPedido.length && bono && typeof bono === "object";
    if (!pendientes.length && !esBonoSinReserva) {
      await liberar(db, tarjeta.id, uid);
      return fallo(404, "No se ha encontrado la reserva a confirmar.");
    }

    // La tarjeta es de un taller concreto: si ese taller existe, la reserva tiene que ser suya
    const claseIdReserva = String(pendientes[0]?.reserva?.claseId || bono?.claseId || "");
    const claseTarjetaSnap = ID.test(String(tarjeta.claseId || ""))
      ? await db.ref(`clases/${tarjeta.claseId}`).get()
      : null;
    if (claseTarjetaSnap?.exists() && claseIdReserva !== tarjeta.claseId) {
      await liberar(db, tarjeta.id, uid);
      return fallo(409, "Esta tarjeta regalo es de otro taller.", { codigo: "otro_taller" });
    }

    const plazasTarjeta = Number(tarjeta.plazas) || 1;
    if (pendientes.some((r) => Number(r.reserva.plazas || 1) > plazasTarjeta)) {
      await liberar(db, tarjeta.id, uid);
      return fallo(409, `Esta tarjeta regalo es para ${plazasTarjeta} plaza(s).`, { codigo: "plazas" });
    }

    const codigoTarjeta = String(tarjeta.codigo || "");
    const escritura = {};

    pendientes.forEach(({ ruta }) => {
      Object.assign(escritura, {
        [`${ruta}/estado`]: "Confirmada",
        [`${ruta}/estadoPago`]: "pagado",
        [`${ruta}/procesado`]: true,
        [`${ruta}/desdeTarjeta`]: true,
        [`${ruta}/tarjetaRegaloId`]: tarjeta.id,
        [`${ruta}/codigoTarjeta`]: codigoTarjeta,
        [`${ruta}/actualizadoEn`]: ahora,
      });
    });

    const primera = pendientes[0] || null;
    const primeraReserva = primera?.reserva || {};

    // Bono: el de la pantalla nueva lleva su primera sesión (desdeBono); los de siempre
    // se canjean sin reserva y la primera clase se reserva después desde el perfil
    const conBono = pendientes.some((r) => r.reserva.desdeBono === true) || esBonoSinReserva;
    let bonoCreado = null;

    if (conBono) {
      const bonoRef = db.ref(`usuarios/${uid}/bonos/${orderId}`);
      const existente = await bonoRef.get();

      if (!existente.exists()) {
        const claseId = String(primeraReserva.claseId || bono?.claseId || tarjeta.claseId || "");
        const claseSnap = ID.test(claseId) ? await db.ref(`clases/${claseId}`).get() : null;
        const clase = claseSnap?.exists() ? claseSnap.val() : null;
        const numeroClases = clasesDelBono(tarjeta, clase, bono);
        const deCliente = datosBonoDeCliente(bono);

        const primeraSesion = primera
          ? datosPrimeraSesionBono({
              numeroClases,
              fecha: primeraReserva.fecha,
              turno: primeraReserva.turno,
              taller: deCliente.clase || primeraReserva.clase || clase?.nombre || "",
              reservaId: primera.ruta.split("/").pop(),
              timestamp: ahora,
            })
          : {
              clasesConsumidas: 0,
              clasesRestantes: numeroClases,
              estadoBono: "activo",
              sesionesConsumidas: {},
            };

        bonoCreado = {
          ...deCliente,
          bonoId: orderId,
          uid,
          clase: deCliente.clase || primeraReserva.clase || clase?.nombre || tarjeta.clase || "Bono",
          claseId,
          tipo: "bono",
          tipoTaller: "bono_mensual",
          numeroClases,
          ...primeraSesion,
          precioBase: 0,
          precioTotal: Number(tarjeta.precioTotal) || 0,
          estadoPago: "pagado",
          orderId,
          tarjetaRegaloId: tarjeta.id,
          codigoTarjeta,
          creadaDesde: "tarjeta_regalo",
          creadoEn: ahora,
          actualizadoEn: ahora,
        };
        escritura[`usuarios/${uid}/bonos/${orderId}`] = bonoCreado;
      }
    }

    // La tarjeta queda usada en la misma escritura que confirma la reserva
    const marcaTarjeta = {
      canjeado: true,
      usado: true,
      estadoCanje: "canjeado",
      canjeadoPorUID: uid,
      usadoPorUID: uid,
      fechaCanje: ahora,
      fechaUso: ahora,
      actualizadoEn: ahora,
      orderIdCanje: orderId,
      reservaId: primera ? primera.ruta.split("/").pop() : "",
      fechaReserva: primeraReserva.fecha || bono?.fechaInicio || "",
      turnoReserva: primeraReserva.turno || bono?.turnoHabitual || "",
      metodoReserva: primeraReserva.metodo || "",
      reclamadaEn: null,
      reclamadaPor: null,
    };
    Object.entries(marcaTarjeta).forEach(([campo, valor]) => {
      escritura[`tarjetasRegalo/${tarjeta.id}/${campo}`] = valor;
    });

    const uidComprador = String(tarjeta.uidComprador || "");
    if (ID.test(uidComprador)) {
      const copia = await db.ref(`usuarios/${uidComprador}/tarjetasRegalo/${tarjeta.id}`).get();
      if (copia.exists()) {
        Object.entries(marcaTarjeta).forEach(([campo, valor]) => {
          escritura[`usuarios/${uidComprador}/tarjetasRegalo/${tarjeta.id}/${campo}`] = valor;
        });
      }
    }

    // En el perfil de quien canjea, como hacía la pantalla (una entrada por pedido)
    if (primera) {
      const lista = await db.ref(`usuarios/${uid}/listaReservas`).get();
      let claveLista = "";
      lista.forEach((item) => {
        if (String(item.val()?.orderId || "") === orderId) claveLista = item.key;
      });

      const entrada = {
        ...primeraReserva,
        uid,
        reservaId: primera.ruta.split("/").pop(),
        estado: "Confirmada",
        estadoPago: "pagado",
        desdeTarjeta: true,
        tarjetaRegaloId: tarjeta.id,
        codigoTarjeta,
        creadaDesde: "tarjeta_regalo",
        actualizadoEn: ahora,
      };
      delete entrada.reservadaHasta;

      const clave = claveLista || db.ref(`usuarios/${uid}/listaReservas`).push().key;
      escritura[`usuarios/${uid}/listaReservas/${clave}`] = entrada;

      const usuario = await db.ref(`usuarios/${uid}/reservas`).get();
      if (!claveLista) escritura[`usuarios/${uid}/reservas`] = (Number(usuario.val()) || 0) + 1;
    }

    await db.ref().update(escritura);

    // Código de reserva (K7M3-9QXP) para cambiar la fecha sin sesión, como al pagar con el TPV
    let codigoReserva = "";
    if (primera && !bonoCreado) {
      try {
        codigoReserva = await asegurarCodigo(db, {
          clave: orderId,
          datos: { tipo: "individual", orderId, ruta: primera.ruta, uid },
        });
        await db.ref().update(
          Object.fromEntries(pendientes.map(({ ruta }) => [`${ruta}/codigoReserva`, codigoReserva]))
        );
      } catch (error) {
        console.error("Canje: no se pudo crear el código de reserva:", error);
      }
    }

    // El correo nunca rompe el canje (enviarCorreoReserva se traga sus errores)
    await enviarCorreoReserva(
      bonoCreado
        ? { reserva: { ...bonoCreado, desdeTarjeta: true }, uid, orderId, tipo: "bono" }
        : {
            reserva: {
              ...primeraReserva,
              estado: "Confirmada",
              estadoPago: "pagado",
              desdeTarjeta: true,
              ...(codigoReserva ? { codigoReserva } : {}),
            },
            uid,
            orderId,
            tipo: "reserva",
          }
    );

    return { ok: true, status: 200, orderId, ...(bonoCreado ? { bonoId: orderId } : {}) };
  } catch (error) {
    await liberar(db, tarjeta.id, uid);
    throw error;
  }
}

// --- tipo "usarBono" ------------------------------------------------------------

export async function usarBono(db, uid, { bonoId, fecha, turno } = {}) {
  bonoId = String(bonoId || "");
  fecha = String(fecha || "");
  turno = String(turno || "").replaceAll(" a ", "-").trim();

  if (!ID.test(bonoId)) return fallo(400, "Bono no válido");
  if (!FECHA.test(fecha)) return fallo(400, "Fecha no válida");
  if (!TURNO.test(turno) || !sinControl(turno)) return fallo(400, "Turno no válido");

  const bonoRef = db.ref(`usuarios/${uid}/bonos/${bonoId}`);
  const bonoSnap = await bonoRef.get();
  if (!bonoSnap.exists()) return fallo(404, "No se ha encontrado el bono.");

  const bono = bonoSnap.val();
  if (String(bono.estadoPago || "").toLowerCase() !== "pagado") {
    return fallo(409, "Este bono aún no consta como pagado.", { codigo: "no_pagado" });
  }
  const estado = obtenerEstadoVisibleBono(bono);
  if (estado !== "Activo") {
    return fallo(409, estado === "Caducado" ? "Tu bono está caducado." : "No quedan clases disponibles en este bono.", {
      codigo: estado === "Caducado" ? "caducado" : "agotado",
    });
  }

  const claseId = String(bono.claseId || "");
  const [claseSnap, bloqueosSnap, espacioSnap] = await Promise.all([
    ID.test(claseId) ? db.ref(`clases/${claseId}`).get() : Promise.resolve(null),
    db.ref("bloqueosFechas").get(),
    db.ref("configuracionEspacio").get(),
  ]);
  const clase = claseSnap?.exists() ? claseSnap.val() : null;
  const carpetaTaller = String(clase?.reservasPath || CARPETA_BONO_ANTIGUO[claseId] || claseId);
  if (!ID.test(carpetaTaller)) return fallo(400, "Taller no válido");

  if (fecha < hoyMadrid()) return fallo(409, "Esa fecha ya ha pasado", { codigo: "fecha_pasada" });
  if (turnoYaEmpezado(fecha, turno)) {
    return fallo(409, "Ese turno ya ha empezado. Elige otro turno u otro día.", { codigo: "fecha_pasada" });
  }
  const fueraDeBono = motivoFechaFueraDeBono(bono, fecha);
  if (fueraDeBono) return fallo(409, fueraDeBono, { codigo: "fuera_de_bono" });
  const bonosSnap = await db.ref(`usuarios/${uid}/bonos`).get();
  if (sesionBonoRepetida(bonosSnap.val(), fecha, turno)) {
    return fallo(409, "Ya tienes una clase reservada ese día en ese turno.", { codigo: "repetida" });
  }
  const bloqueos = bloqueosSnap.exists() ? bloqueosSnap.val() || {} : {};
  if (bloqueoAfectaTurno(bloqueos[fecha], turno)) {
    return fallo(409, "Ese día no está disponible", { codigo: "bloqueado" });
  }

  const config = normalizarConfigEspacio(espacioSnap.exists() ? espacioSnap.val() : null);
  const ahora = new Date();
  const timestamp = ahora.toISOString();
  const orderId = String(ahora.getTime()).slice(-12);
  const nombreClase = String(bono.clase || clase?.nombre || "Bono");
  const modalidad = String(bono.modalidad || clase?.modalidad || "");
  const torno = normalizarMetodo({ metodo: modalidad }) === "torno";

  const carpeta = `reservas/${carpetaTaller}/${fecha}/${turno}`;
  const clave = db.ref(carpeta).push().key;
  const reserva = {
    uid,
    clase: nombreClase,
    claseId,
    fecha,
    turno,
    modalidad,
    metodo: modalidad,
    precio: 0,
    precioBase: 0,
    precioTotal: 0,
    plazas: 1,
    desdeBono: true,
    bonoId,
    estado: "Confirmada",
    estadoPago: "pagado",
    incluyeTorno: torno,
    orderId,
    timestamp,
    creadaEnMs: timestamp,
  };

  const resultado = await escribirConAforo(
    db,
    [{ fecha, turno, torno, ruta: `${carpeta}/${clave}`, clave, datos: reserva }],
    config,
    ahora.getTime()
  );
  if (!resultado.ok) return resultado;

  // La clase se descuenta con una transacción: dos reservas a la vez no gastan la misma
  const { committed } = await bonoRef.transaction((actual) => {
    if (actual === null) return actual;
    if (obtenerEstadoVisibleBono(actual) !== "Activo") return;

    const restantes = Math.max(Number(actual.clasesRestantes || 0) - 1, 0);
    return {
      ...actual,
      clasesConsumidas: Number(actual.clasesConsumidas || 0) + 1,
      clasesRestantes: restantes,
      estadoBono: restantes === 0 ? "agotado" : "activo",
      ultimaSesionReservada: fecha,
      actualizadoEn: timestamp,
    };
  });

  if (!committed) {
    await db.ref(`${carpeta}/${clave}`).remove();
    return fallo(409, "No quedan clases disponibles en este bono.", { codigo: "agotado" });
  }

  const sesionClave = db.ref(`usuarios/${uid}/bonos/${bonoId}/sesionesConsumidas`).push().key;
  const listaClave = db.ref(`usuarios/${uid}/listaReservas`).push().key;
  await db.ref().update({
    [`usuarios/${uid}/bonos/${bonoId}/sesionesConsumidas/${sesionClave}`]: {
      fecha,
      turno,
      taller: nombreClase,
      clase: nombreClase,
      reservaId: clave,
      timestamp,
    },
    [`usuarios/${uid}/listaReservas/${listaClave}`]: { ...reserva, reservaId: clave },
  });

  return { ok: true, status: 200, reservaId: clave, orderId };
}
