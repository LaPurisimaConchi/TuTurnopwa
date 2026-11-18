// api/_pedidoServidor.js
// Prepara el pago de un pedido: lo crea el servidor en pedidosPendientes/{orderId} con
// el importe calculado a partir de la ficha del taller (clases/{id}), nunca con el que
// manda el navegador. api/crear-sesion.js solo firma ese importe y el aviso del TPV
// (api/notificacionTPV.js) comprueba que lo cobrado coincide con él.
// La llama api/codigo-reserva.js con tipo "prepararPago" (no cuenta como función de
// Vercel: empieza por _).
//
// Qué se cobra en cada caso:
// - reserva: las reservas pendientes que el pedido ya tiene en reservas/… (una, o una
//   por sesión en talleres de varias sesiones y monográficos), con el precio por
//   persona de su ficha por las plazas. Solo esas reservas se confirman al pagar
//   (reservasPedido).
// - bono: el precio del bono (más el cambio a torno); el bono que se crea al pagar
//   (datosBono) lo construye el servidor con la ficha.
// - grupo: la reserva de grupo del pedido, con el precio por persona de su taller.
// - tarjeta_regalo: la opción elegida de /comprar-tarjeta-regalo por las plazas.
import { fichaParaCobrar } from "../src/migracion/parcheTalleres.js";
import { TALLERES_FIJOS, idRealDeAliasRegalo } from "../src/catalogoBase.js";
import {
  MAX_PLAZAS_RESERVA,
  opcionTarjetaRegalo,
  plazasTarjetaValidas,
  precioBono,
  precioGrupoPorPersona,
  precioPorPersona,
} from "../src/utils/precioPedido.js";
import { datosPrimeraSesionBono } from "../src/utils/estadoBono.js";
import { edicionPorId, esMonografico } from "../src/utils/monografico.js";
import { sesionesDeTaller } from "../src/utils/sesionesTaller.js";
import { hoyMadrid } from "../src/utils/formatoFecha.js";
import { turnoYaEmpezado } from "../src/utils/cambioFecha.js";
import { reservasDelPedido } from "./_canjeServidor.js";

// 12 dígitos: el número de pedido que se manda a Redsys (api/crear-sesion.js)
export const PEDIDO_PAGO = /^\d{12}$/;
const ID = /^[A-Za-z0-9_-]{1,60}$/;
const GRUPO_ID = /^[A-Za-z0-9_-]{10,40}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const TURNO = /^[^./$#[\]]{1,60}$/;
const MAX_CLASES_BONO = 20;

export const fallo = (status, error, extra = {}) => ({ ok: false, status, error, codigo: "error", ...extra });

// Texto de una ficha o de la pantalla, sin caracteres de control y con un máximo
const texto = (valor, max = 200) =>
  [...String(valor ?? "")]
    .map((c) => (c.charCodeAt(0) < 32 ? " " : c))
    .join("")
    .trim()
    .slice(0, max);

const redondear = (euros) => Math.round(Number(euros) * 100) / 100;

const sumarUnMes = (fechaISO) => {
  const d = new Date(`${fechaISO}T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

const pendiente = (r) => String(r?.estado || "").toLowerCase() === "pendiente";

async function leerFicha(db, claseId) {
  if (!ID.test(String(claseId || ""))) return null;
  const snap = await db.ref(`clases/${claseId}`).get();
  return snap.exists() ? snap.val() || null : null;
}

const nombreDeTaller = (ficha, claseId) =>
  texto(ficha?.nombre || ficha?.["nombre "] || TALLERES_FIJOS[claseId]?.nombre || claseId);

// Orden de una reserva dentro de su pedido (sesión 1, 2…; si no lo dice, por fecha)
const ordenSesion = (r) =>
  Number(r.reserva.sesionCurso || r.reserva.sesionEdicion || 0) || 0;

// --- reserva ----------------------------------------------------------------------

async function pedidoDeReserva(db, uid, orderId) {
  const todas = await db.ref("reservas").get();
  const delPedido = reservasDelPedido(todas.val(), orderId).filter((r) => r.reserva.uid === uid);

  if (!delPedido.length) return fallo(404, "No se ha encontrado la reserva de este pedido.");
  if (!delPedido.every((r) => pendiente(r.reserva))) {
    return fallo(409, "Esta reserva ya no está pendiente de pago.", { codigo: "no_pendiente" });
  }
  if (delPedido.some((r) => r.reserva.desdeBono === true)) {
    return fallo(400, "Esta reserva es la primera sesión de un bono.");
  }

  const ordenadas = [...delPedido].sort(
    (a, b) => ordenSesion(a) - ordenSesion(b) || String(a.reserva.fecha).localeCompare(String(b.reserva.fecha))
  );
  const principal = ordenadas[0].reserva;
  const claseId = String(principal.claseId || "");
  if (!ordenadas.every((r) => String(r.reserva.claseId || "") === claseId)) {
    return fallo(400, "Las reservas del pedido no son del mismo taller.");
  }

  const ficha = fichaParaCobrar(claseId, await leerFicha(db, claseId));
  if (!ficha) return fallo(404, "Este taller no existe.");

  const plazas = Number(principal.plazas);
  if (!Number.isInteger(plazas) || plazas < 1 || plazas > MAX_PLAZAS_RESERVA) {
    return fallo(400, "Número de plazas no válido.");
  }
  if (!ordenadas.every((r) => Number(r.reserva.plazas) === plazas)) {
    return fallo(400, "Las sesiones del pedido no tienen las mismas plazas.");
  }

  // Cuántas reservas puede tener el pedido: un monográfico, todas las sesiones de su
  // edición; un taller de varias sesiones reservadas de una vez, una por sesión; si
  // no, una sola. Así no se cobra una y se confirman más.
  let unidad;
  if (esMonografico(ficha)) {
    const edicionId = String(principal.edicionId || "");
    const edicion = edicionPorId(ficha, edicionId);
    const sesiones = Array.isArray(edicion?.fechas) ? edicion.fechas.length : 0;
    const numeros = new Set(ordenadas.map((r) => Number(r.reserva.sesionEdicion) || 1));
    if (
      !sesiones ||
      ordenadas.length !== sesiones ||
      numeros.size !== sesiones ||
      !ordenadas.every((r) => String(r.reserva.edicionId || "") === edicionId)
    ) {
      return fallo(400, "Las sesiones del pedido no coinciden con la edición.");
    }
    unidad = Number(ficha.precio) || 0;
  } else {
    const sesiones = Number(principal.sesionesCurso) || 1;
    if (sesiones > 1) {
      const numeros = new Set(ordenadas.map((r) => Number(r.reserva.sesionCurso) || 0));
      if (sesiones !== sesionesDeTaller(ficha) || ordenadas.length !== sesiones || numeros.size !== sesiones) {
        return fallo(400, "Las sesiones del pedido no coinciden con el taller.");
      }
    } else if (ordenadas.length !== 1) {
      return fallo(400, "El pedido tiene más reservas de las que se pagan.");
    }

    unidad = precioPorPersona(ficha, principal);
    // Todas las sesiones son de la misma opción que la primera
    if (!ordenadas.every((r) => precioPorPersona(ficha, r.reserva) === unidad)) {
      return fallo(400, "Las sesiones del pedido no son de la misma opción.");
    }
  }

  if (!(unidad > 0)) return fallo(409, "No se ha podido calcular el precio de este taller.", { codigo: "sin_precio" });
  const total = redondear(unidad * plazas);

  // El precio que guarda la reserva (perfil, panel, correo) pasa a ser el del servidor
  const precios = {};
  ordenadas.forEach(({ ruta, reserva }) => {
    const llevaPrecio = Number(reserva.precioTotal || reserva.precio || 0) > 0;
    if (!llevaPrecio) return;
    precios[`${ruta}/precio`] = total;
    precios[`${ruta}/precioUnitario`] = redondear(unidad);
    precios[`${ruta}/precioTotal`] = total;
  });

  return {
    ok: true,
    escrituras: precios,
    pedido: {
      tipo: "reserva",
      esBono: false,
      clase: nombreDeTaller(ficha, claseId) || texto(principal.clase),
      claseId,
      metodo: texto(principal.metodo),
      fecha: texto(principal.fecha, 10),
      turno: texto(principal.turno, 60),
      plazas,
      precioUnitario: redondear(unidad),
      precioTotal: total,
      reservasPedido: ordenadas.map((r) => r.ruta),
    },
  };
}

// --- bono -------------------------------------------------------------------------

async function pedidoDeBono(db, uid, orderId, cuerpo) {
  const claseId = String(cuerpo.claseId || "");
  const bruta = await leerFicha(db, claseId);
  const ficha = fichaParaCobrar(claseId, bruta);
  if (!ficha || ficha.tipoProducto !== "bono") return fallo(404, "Este bono no existe.");
  const activo = ficha.estado ? ficha.estado === "activa" : ficha.activa !== false;
  if (!activo) return fallo(404, "Este bono no está disponible.");

  // La primera sesión: la pantalla del panel la reserva con la compra (desdeBono);
  // las de siempre no reservan ninguna
  const todas = await db.ref("reservas").get();
  const delPedido = reservasDelPedido(todas.val(), orderId).filter((r) => r.reserva.uid === uid);
  if (delPedido.some((r) => r.reserva.desdeBono !== true) || delPedido.length > 1) {
    return fallo(400, "Las reservas del pedido no son de este bono.");
  }
  const primera = delPedido[0] || null;
  if (primera && (!pendiente(primera.reserva) || String(primera.reserva.claseId || "") !== claseId)) {
    return fallo(409, "La primera sesión del bono ya no está pendiente.", { codigo: "no_pendiente" });
  }
  if (!primera && bruta?.dinamica) return fallo(404, "No se ha encontrado la primera sesión del bono.");

  const fechaInicio = primera ? String(primera.reserva.fecha || "") : texto(cuerpo.fechaInicio, 10);
  if (!FECHA.test(fechaInicio) || fechaInicio < hoyMadrid()) return fallo(400, "Fecha de inicio no válida.");
  const turnoHabitual = texto(cuerpo.turno || primera?.reserva?.turno, 60);
  if (!TURNO.test(turnoHabitual)) return fallo(400, "Turno no válido.");

  const { precioBase, extraCambioTorno, precioTotal } = precioBono(ficha, { cambioTorno: cuerpo.cambioTorno === true });
  if (!(precioTotal > 0)) return fallo(409, "No se ha podido calcular el precio del bono.", { codigo: "sin_precio" });

  const numeroClases = Math.min(
    Math.max(1, Math.round(Number(ficha.numeroClases ?? ficha.NumeroClases ?? 4)) || 4),
    MAX_CLASES_BONO
  );
  const nombre = nombreDeTaller(ficha, claseId) || "Bono mensual";
  const ahora = new Date().toISOString();
  const fechaFinMes = sumarUnMes(fechaInicio);

  const datosBono = {
    claseId,
    clase: nombre,
    tipo: "bono",
    subtipo: texto(ficha.subtipo) || `${numeroClases}_clases`,
    numeroClases,
    fechaInicio,
    fechaFinMes,
    fechaCaducidadBono: fechaFinMes,
    turnoHabitual,
    duracionClase: texto(ficha.duracionClase || ficha.duracion) || "3 horas",
    modalidad: texto(ficha.modalidad),
    ...(ficha.distribucionClases ? { distribucionClases: texto(ficha.distribucionClases) } : {}),
    ...(ficha.incluyeDecoracion !== undefined ? { incluyeDecoracion: Boolean(ficha.incluyeDecoracion) } : {}),
    ...(ficha.permiteCambioTorno === true
      ? { incluyeCambioTorno: cuerpo.cambioTorno === true, extraCambioTorno }
      : {}),
    precioBase,
    precioTotal,
    estadoPago: "pendiente",
    orderId,
    creadoEn: ahora,
    actualizadoEn: ahora,
    ...(primera
      ? datosPrimeraSesionBono({
          numeroClases,
          fecha: fechaInicio,
          turno: String(primera.reserva.turno || ""),
          taller: nombre,
          reservaId: primera.ruta.split("/").pop(),
          timestamp: ahora,
        })
      : { clasesConsumidas: 0, clasesRestantes: numeroClases, estadoBono: "activo", sesionesConsumidas: {} }),
  };

  return {
    ok: true,
    escrituras: {},
    pedido: {
      tipo: "bono",
      esBono: true,
      datosBono,
      clase: nombre,
      claseId,
      fechaInicio,
      fechaFinMes,
      fechaCaducidadBono: fechaFinMes,
      turno: turnoHabitual,
      plazas: 1,
      numeroClases,
      duracionClase: datosBono.duracionClase,
      incluyeDecoracion: datosBono.incluyeDecoracion === true,
      precioUnitario: precioTotal,
      precioTotal,
      reservasPedido: primera ? [primera.ruta] : [],
    },
  };
}

// --- grupo ------------------------------------------------------------------------

async function pedidoDeGrupo(db, uid, orderId, cuerpo) {
  const grupoId = String(cuerpo.grupoId || "");
  if (!GRUPO_ID.test(grupoId)) return fallo(400, "Reserva de grupo no válida.");

  const snap = await db.ref(`reservasGrupos/${grupoId}`).get();
  const grupo = snap.exists() ? snap.val() || {} : null;
  if (!grupo || grupo.uid !== uid || String(grupo.orderId || "") !== orderId) {
    return fallo(404, "No se ha encontrado la reserva de grupo.");
  }
  if (!pendiente(grupo) || grupo.modoPago !== "completo") {
    return fallo(409, "Esta reserva de grupo ya no está pendiente de pago.", { codigo: "no_pendiente" });
  }
  if (turnoYaEmpezado(String(grupo.fecha || ""), String(grupo.turno || ""))) {
    return fallo(409, "Ese turno ya ha empezado. Elige otro turno u otro día.", { codigo: "fecha_pasada" });
  }

  const tallerId = String(grupo.tallerId || "");
  const ficha = await leerFicha(db, tallerId);
  if (!ficha) return fallo(404, "El taller de este grupo no existe.");

  const plazas = Number(grupo.plazas);
  if (!Number.isInteger(plazas) || plazas < 1 || plazas > MAX_PLAZAS_RESERVA) {
    return fallo(400, "Número de personas no válido.");
  }

  const unidad = precioGrupoPorPersona(ficha, grupo.opcionTaller, grupo.metodoTaller);
  if (!(unidad > 0)) return fallo(409, "No se ha podido calcular el precio del grupo.", { codigo: "sin_precio" });
  const total = redondear(unidad * plazas);
  const ruta = `reservasGrupos/${grupoId}`;

  return {
    ok: true,
    escrituras: {
      [`${ruta}/precio`]: total,
      [`${ruta}/precioUnitario`]: redondear(unidad),
      [`${ruta}/precioTotal`]: total,
      [`${ruta}/totalPagado`]: total,
      [`${ruta}/totalPendiente`]: 0,
    },
    pedido: {
      tipo: "grupo",
      esBono: false,
      grupoId,
      clase: texto(grupo.clase) || nombreDeTaller(ficha, tallerId),
      claseId: "reserva-grupo",
      tallerId,
      metodo: "grupo",
      fecha: texto(grupo.fecha, 10),
      turno: texto(grupo.turno, 60),
      plazas,
      precioUnitario: redondear(unidad),
      precioTotal: total,
    },
  };
}

// --- tarjeta regalo ---------------------------------------------------------------

async function pedidoDeTarjeta(db, uid, orderId, cuerpo) {
  const claseIdOpcion = String(cuerpo.claseId || "");
  const idReal = idRealDeAliasRegalo(claseIdOpcion) || claseIdOpcion;
  const ficha = await leerFicha(db, idReal);
  const opcion = opcionTarjetaRegalo(cuerpo.opcionId, ficha ? { [idReal]: ficha } : {});
  if (!opcion || String(opcion.claseId || "") !== claseIdOpcion) {
    return fallo(404, "Esta tarjeta regalo ya no está a la venta.", { codigo: "sin_opcion" });
  }

  const plazas = Number(cuerpo.plazas);
  if (!plazasTarjetaValidas(opcion, plazas)) return fallo(400, "Número de personas no válido.");

  const unidad = Number(opcion.precio) || 0;
  if (!(unidad > 0)) return fallo(409, "No se ha podido calcular el precio de la tarjeta.", { codigo: "sin_precio" });
  const total = redondear(unidad * plazas);
  const esBono = opcion.tipoTaller === "bono_mensual";

  return {
    ok: true,
    escrituras: {},
    pedido: {
      tipo: "tarjeta_regalo",
      esBono: false,
      desdeCompraTarjeta: true,
      opcionId: String(opcion.id),
      clase: texto(opcion.clase),
      claseId: claseIdOpcion,
      subtipo: texto(opcion.subtipo),
      tipoPieza: texto(opcion.tipoPieza),
      metodo: texto(opcion.metodo),
      tipoTaller: texto(opcion.tipoTaller),
      rutaReserva: texto(opcion.rutaReserva),
      requiereMetodo: !!opcion.requiereMetodo,
      requiereTipoPieza: !!opcion.requiereTipoPieza,
      plazas,
      numeroClases: esBono ? Number(ficha?.numeroClases ?? ficha?.NumeroClases) || 0 : 0,
      precioUnitario: redondear(unidad),
      precioOriginal: redondear(unidad),
      precioTotal: total,
    },
  };
}

// Reservas que confirma un pedido al pagarse: las que apuntó el servidor al preparar el
// pago (vacío si no tiene ninguna, como una tarjeta regalo). null en los pedidos de
// antes, que se siguen buscando por número de pedido.
export function rutasDelPedido(pedido) {
  if (pedido?.importeServidor !== true) return null;
  const lista = pedido.reservasPedido;
  return new Set((Array.isArray(lista) ? lista : Object.values(lista || {})).map(String));
}

// Reserva de grupo que confirma un pedido: la suya si lo preparó el servidor ("" si no
// es de grupo); null en los pedidos de antes (se busca por número de pedido)
export function grupoDelPedido(pedido) {
  if (pedido?.importeServidor !== true) return null;
  return pedido.tipo === "grupo" ? String(pedido.grupoId || "") : "";
}

// --- entrada ----------------------------------------------------------------------

const PREPARAR = {
  reserva: (db, uid, orderId) => pedidoDeReserva(db, uid, orderId),
  bono: pedidoDeBono,
  grupo: pedidoDeGrupo,
  tarjeta_regalo: pedidoDeTarjeta,
};

// Crea (o rehace, si sigue pendiente y es de la misma persona) el pedido y devuelve
// el importe que se va a cobrar: { ok, status, orderId, precioTotal, precioUnitario, plazas }
export async function prepararPago(db, uid, cuerpo = {}) {
  const orderId = String(cuerpo.orderId || "");
  if (!PEDIDO_PAGO.test(orderId)) return fallo(400, "Pedido no válido.");

  const preparar = PREPARAR[String(cuerpo.pedido || "")];
  if (!preparar) return fallo(400, "Tipo de pedido no válido.");

  const ref = db.ref(`pedidosPendientes/${orderId}`);
  const existente = await ref.get();
  if (existente.exists()) {
    const previo = existente.val() || {};
    if (previo.uid !== uid) return fallo(409, "Este número de pedido ya existe.", { codigo: "pedido_ocupado" });
    if (previo.procesado === true || String(previo.estadoPago || "pendiente") !== "pendiente") {
      return fallo(409, "Este pedido ya está pagado o cerrado.", { codigo: "no_pendiente" });
    }
  }

  const resultado = await preparar(db, uid, orderId, cuerpo);
  if (!resultado.ok) return resultado;

  const ahora = new Date().toISOString();
  const pedido = {
    desdeTarjeta: false,
    desdeTarjetaRegalo: false,
    desdeCompraTarjeta: false,
    datosBono: null,
    subtipo: "",
    tipoPieza: "",
    metodo: "",
    ...resultado.pedido,
    orderId,
    uid,
    payMethod: "card",
    estadoPago: "pendiente",
    procesado: false,
    importeServidor: true,
    creadoEn: existente.exists() ? existente.val()?.creadoEn || ahora : ahora,
    actualizadoEn: ahora,
  };

  await db.ref().update({ ...resultado.escrituras, [`pedidosPendientes/${orderId}`]: pedido });

  return {
    ok: true,
    status: 200,
    orderId,
    precioTotal: pedido.precioTotal,
    precioUnitario: pedido.precioUnitario,
    plazas: pedido.plazas,
  };
}
