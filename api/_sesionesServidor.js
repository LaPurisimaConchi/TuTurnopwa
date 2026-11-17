// api/_sesionesServidor.js
// Siguientes sesiones de un taller de varias sesiones que se reservó solo con la primera
// (la reserva guarda `segundaSesion` con la fecha a partir de la cual se puede reservar la
// siguiente). Con más de dos sesiones, cada sesión que se reserva deja a su vez pendiente
// la siguiente en el mismo campo, hasta completar el taller.
// Lo llama api/codigo-reserva.js:
//   tipo "sesionesPendientes"  lista las sesiones por reservar del usuario
//   tipo "siguienteSesion"     reserva la siguiente sesión de un pedido (sin coste: ya
//                              se pagó con la primera) comprobando el aforo real
import { escribirConAforo, fallo } from "./_reservarServidor.js";
import { normalizarConfigEspacio } from "../src/utils/configEspacio.js";
import { hoyMadrid } from "../src/utils/formatoFecha.js";
import { bloqueoAfectaTurno } from "../src/utils/rangosHora.js";
import { esReservaValida, normalizarMetodo } from "../src/utils/plazasOcupadas.js";
import { diasEntreSesionesDe, sesionesDeTaller, sumarDias } from "../src/utils/sesionesTaller.js";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PEDIDO = /^\d{4,20}$/;
const TURNO = /^[^./$#[\]]{1,60}$/;
const sinControl = (texto) => [...texto].every((c) => c.charCodeAt(0) >= 32);

// Campos de la primera reserva que no pasan a la nueva sesión
const NO_COPIAR = [
  "uid", "estado", "estadoPago", "reservadaHasta", "creadaEnMs", "incluyeTorno", "sobreaforo",
  "codigoReserva", "pagoAdmin", "segundaSesion", "fechaPrimeraSesion", "reprogramada",
  "reprogramadaEn", "fechaOriginal", "turnoOriginal", "ultimaFechaAnterior", "procesado",
  "pagadoEn", "timestamp", "actualizadoEn", "recuperada", "recuperableHasta",
  "correoCancelacionEnviadoEn", "cancelacionEstudio", "canceladaPor", "canceladaEn",
  "motivoCancelacion", "fechasSesiones", "sesionCurso", "sesionesCurso",
];

// Reservas de un usuario (con su ruta) que cumplen `filtro`, recorriendo el árbol de reservas
function buscar(nodo, filtro, ruta = "reservas", halladas = []) {
  if (!nodo || typeof nodo !== "object") return halladas;

  for (const [clave, valor] of Object.entries(nodo)) {
    if (!valor || typeof valor !== "object") continue;
    const rutaHija = `${ruta}/${clave}`;

    if (typeof valor.uid === "string" && valor.orderId !== undefined) {
      if (filtro(valor)) halladas.push({ ruta: rutaHija, reserva: valor });
      continue;
    }
    buscar(valor, filtro, rutaHija, halladas);
  }

  return halladas;
}

const pendiente = (r) =>
  r.segundaSesion && typeof r.segundaSesion === "object" && r.segundaSesion.reservada !== true && esReservaValida(r);

// --- tipo "sesionesPendientes" --------------------------------------------------

export async function sesionesPendientes(db, uid) {
  const snap = await db.ref("reservas").get();
  const hallazgos = buscar(snap.exists() ? snap.val() : {}, (r) => r.uid === uid && pendiente(r));

  return {
    ok: true,
    status: 200,
    hoy: hoyMadrid(),
    sesiones: hallazgos.map(({ reserva: r }) => ({
      orderId: String(r.orderId),
      clase: String(r.clase || ""),
      claseId: String(r.claseId || ""),
      numeroSesion: (Number(r.sesionCurso) || 1) + 1,
      fechaSesionAnterior: String(r.fecha || ""),
      fechaDisponible: String(r.segundaSesion.fechaDisponible || ""),
      plazas: Number(r.plazas || 1),
    })),
  };
}

// --- tipo "siguienteSesion" -----------------------------------------------------

export async function reservarSiguienteSesion(db, uid, { orderId, fecha, turno } = {}) {
  orderId = String(orderId || "");
  fecha = String(fecha || "");
  turno = String(turno || "").replaceAll(" a ", "-").trim();

  if (!PEDIDO.test(orderId)) return fallo(400, "Pedido no válido");
  if (!FECHA.test(fecha)) return fallo(400, "Fecha no válida");
  if (!TURNO.test(turno) || !sinControl(turno)) return fallo(400, "Turno no válido");

  const [reservasSnap, bloqueosSnap, espacioSnap] = await Promise.all([
    db.ref("reservas").get(),
    db.ref("bloqueosFechas").get(),
    db.ref("configuracionEspacio").get(),
  ]);

  const propias = buscar(
    reservasSnap.exists() ? reservasSnap.val() : {},
    (r) => r.uid === uid && String(r.orderId) === orderId
  );
  const conSiguiente = propias.filter(
    ({ reserva }) => reserva.segundaSesion && typeof reserva.segundaSesion === "object"
  );
  if (!conSiguiente.length) return fallo(404, "No se ha encontrado la reserva.");

  // La sesión de este pedido que tiene la siguiente por reservar
  const primera = conSiguiente.find(({ reserva }) => reserva.segundaSesion.reservada !== true);
  if (!primera) {
    return fallo(409, "No quedan sesiones por reservar en este pedido.", { codigo: "ya_reservada" });
  }

  const origen = primera.reserva;
  if (!esReservaValida(origen)) {
    return fallo(409, "Esta reserva no está confirmada y pagada.", { codigo: "no_valida" });
  }

  const disponible = String(origen.segundaSesion.fechaDisponible || "");
  // Solo se puede reservar cuando ya ha llegado la fecha de habilitación (como en la
  // pantalla) y en una fecha igual o posterior a ella
  const hoy = hoyMadrid();
  if (FECHA.test(disponible) && (hoy < disponible || fecha < disponible)) {
    return fallo(409, "Todavía no se puede reservar esta sesión.", { codigo: "pronto", fechaDisponible: disponible });
  }
  if (fecha < hoy) return fallo(409, "Esa fecha ya ha pasado", { codigo: "fecha_pasada" });

  const bloqueos = bloqueosSnap.exists() ? bloqueosSnap.val() || {} : {};
  if (bloqueoAfectaTurno(bloqueos[fecha], turno)) {
    return fallo(409, "Ese día no está disponible", { codigo: "bloqueado" });
  }

  // Misma carpeta que la primera sesión (con su método, si lo tiene), en la nueva fecha y turno
  const tramos = primera.ruta.split("/"); // reservas/{taller}/{fecha}/{turno}[/{método}]/{clave}
  const carpeta = ["reservas", tramos[1], fecha, turno, ...(tramos.length > 5 ? [tramos[4]] : [])].join("/");
  const clave = db.ref(carpeta).push().key;

  const claseSnap = await db.ref(`clases/${origen.claseId}`).get();
  const clase = claseSnap.exists() ? claseSnap.val() : null;
  const totalSesiones = Math.max(clase ? sesionesDeTaller(clase) : 2, 2);
  const numeroSesion = (Number(origen.sesionCurso) || 1) + 1;
  if (numeroSesion > totalSesiones) return fallo(409, "Ya están todas las sesiones reservadas.", { codigo: "ya_reservada" });
  const torno = origen.incluyeTorno === true || normalizarMetodo(origen) === "torno";

  const datos = { ...origen };
  NO_COPIAR.forEach((campo) => delete datos[campo]);

  const ahora = new Date();
  const timestamp = ahora.toISOString();
  const reserva = {
    ...datos,
    uid,
    fecha,
    turno,
    plazas: Number(origen.plazas || 1),
    precio: 0,
    precioUnitario: 0,
    precioTotal: 0,
    precioEnSesion1: true,
    sesionCurso: numeroSesion,
    sesionesCurso: totalSesiones,
    // Si quedan más sesiones, esta deja pendiente la siguiente
    ...(numeroSesion < totalSesiones
      ? {
          segundaSesion: {
            habilitada: false,
            fechaDisponible: sumarDias(fecha, diasEntreSesionesDe(clase || {}, totalSesiones)[numeroSesion - 1]),
            reservada: false,
            fechaReserva: null,
          },
        }
      : {}),
    estado: "Confirmada",
    estadoPago: "pagado",
    procesado: true,
    incluyeTorno: torno,
    orderId,
    timestamp,
    creadaEnMs: timestamp,
  };

  const config = normalizarConfigEspacio(espacioSnap.exists() ? espacioSnap.val() : null);
  const resultado = await escribirConAforo(
    db,
    [{ fecha, turno, torno, ruta: `${carpeta}/${clave}`, clave, datos: reserva }],
    config,
    ahora.getTime()
  );
  if (!resultado.ok) return resultado;

  // La primera reserva queda con su siguiente sesión marcada como reservada, y la
  // nueva sesión aparece en el perfil
  const listaClave = db.ref(`usuarios/${uid}/listaReservas`).push().key;
  await db.ref().update({
    [`${primera.ruta}/segundaSesion/habilitada`]: true,
    [`${primera.ruta}/segundaSesion/reservada`]: true,
    [`${primera.ruta}/segundaSesion/fechaReserva`]: fecha,
    [`${primera.ruta}/segundaSesion/turnoReserva`]: turno,
    [`usuarios/${uid}/listaReservas/${listaClave}`]: {
      clase: String(reserva.clase || ""),
      claseId: String(reserva.claseId || ""),
      fecha,
      turno,
      metodo: String(reserva.metodo || ""),
      plazas: reserva.plazas,
      precio: 0,
      precioUnitario: 0,
      precioTotal: 0,
      estado: "Confirmada",
      estadoPago: "pagado",
      orderId,
      timestamp,
      actualizadoEn: timestamp,
      desdeTarjeta: !!origen.desdeTarjeta,
      nombreTipoClase: String(origen.nombreTipoClase || ""),
      tipoClase: String(origen.tipoClase || ""),
      sesionCurso: numeroSesion,
      reservaId: clave,
    },
  });

  return { ok: true, status: 200, reservaId: clave, orderId };
}
