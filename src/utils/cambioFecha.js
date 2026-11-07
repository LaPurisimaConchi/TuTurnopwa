// src/utils/cambioFecha.js
// Reglas del cambio de fecha que hace el propio cliente sin iniciar sesión
// (número de reserva + email). Sin React ni Firebase: lo usa api/cambiar-fecha.js
// y la pantalla /gestionar-reserva para mostrar los mismos plazos.
import {
  esReservaValida,
  normalizarMetodo,
  plazasDeTurno,
  plazasLibres,
  plazasPorMetodo,
} from "./plazasOcupadas.js";
import { esTurnoConsulta, limpiarTurno, turnosDisponiblesEnFecha } from "./turnosFecha.js";

// Política de cancelación: se puede reprogramar avisando con 72 h de antelación
export const ANTELACION_HORAS = 72;
// La nueva clase debe empezar con este margen, para que el taller pueda prepararla
export const MARGEN_NUEVA_CLASE_HORAS = 24;
export const MAX_CAMBIOS_CLIENTE = 1;
export const DIAS_VENTANA = 90;

const ZONA = "Europe/Madrid";
const HORA = 3_600_000;
const DIA = 24 * HORA;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const normalizarEmail = (valor = "") => String(valor || "").trim().toLowerCase();

export const esFechaISO = (valor) => FECHA.test(String(valor || ""));

// "Ahora" en hora de Madrid como milisegundos «de pared» (sin zona), para poder
// compararlos con el inicio de una clase, que se guarda como fecha y turno locales
export function ahoraMadridMs(ahora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: ZONA,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(ahora)
      .map((p) => [p.type, p.value])
  );

  return Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    Number(partes.hour) % 24,
    Number(partes.minute),
    Number(partes.second)
  );
}

export const fechaDeMs = (ms) => new Date(ms).toISOString().slice(0, 10);

// Inicio de la clase en milisegundos «de pared». Turno "17:30-20:30" → 17:30; si
// el turno no tiene hora, se toma el comienzo del día (el caso más restrictivo)
export function inicioClaseMs(fecha, turno = "") {
  if (!esFechaISO(fecha)) return NaN;

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const hora = String(turno).match(/(\d{1,2}):(\d{2})/);

  return Date.UTC(anio, mes - 1, dia, hora ? Number(hora[1]) : 0, hora ? Number(hora[2]) : 0);
}

const pareceReservaDirecta = (obj) =>
  !!obj &&
  typeof obj === "object" &&
  ("fecha" in obj || "estado" in obj || "estadoPago" in obj || "uid" in obj || "orderId" in obj);

// Localiza una reserva por número de pedido en el valor de /reservas. Devuelve la
// ruta completa y los datos tal y como están guardados.
//   reservas/{clase}/{fecha}/{turno}/{reservaId}
//   reservas/{clase}/{fecha}/{turno}/{metodo}/{reservaId}
export function buscarReservaEnArbol(reservas, orderId) {
  if (!reservas || typeof reservas !== "object" || !orderId) return null;

  for (const [clase, fechas] of Object.entries(reservas)) {
    for (const [fecha, turnos] of Object.entries(fechas || {})) {
      for (const [turno, hijos] of Object.entries(turnos || {})) {
        for (const [clave, valor] of Object.entries(hijos || {})) {
          if (!valor || typeof valor !== "object") continue;

          if (pareceReservaDirecta(valor)) {
            if (valor.orderId === orderId) {
              return { segmentos: ["reservas", clase, fecha, turno, clave], reserva: valor };
            }
            continue;
          }

          for (const [reservaId, reserva] of Object.entries(valor)) {
            if (reserva?.orderId === orderId) {
              return {
                segmentos: ["reservas", clase, fecha, turno, clave, reservaId],
                reserva,
              };
            }
          }
        }
      }
    }
  }

  return null;
}

// ¿Puede el cliente cambiar esta reserva él mismo? Si no, el motivo se le enseña.
export function evaluarCambio(reserva, ahoraMs = ahoraMadridMs()) {
  const cambiosHechos = Number(reserva?.numCambiosCliente || 0);

  if (
    reserva?.cancelada === true ||
    String(reserva?.estado || "").toLowerCase() === "cancelada"
  ) {
    return { ok: false, motivo: "Esta reserva está cancelada." };
  }

  if (!esReservaValida(reserva)) {
    return { ok: false, motivo: "Esta reserva no está confirmada y pagada." };
  }

  // Bonos y talleres de dos sesiones tienen otras fechas ligadas a la reserva
  if (reserva?.desdeBono || reserva?.segundaSesion || reserva?.tipoTaller === "dos_sesiones") {
    return {
      ok: false,
      motivo: "Esta reserva forma parte de un bono o de un taller de dos sesiones. Escríbenos y la cambiamos.",
    };
  }

  if (cambiosHechos >= MAX_CAMBIOS_CLIENTE) {
    return {
      ok: false,
      motivo: "Ya cambiaste la fecha de esta reserva una vez. Si necesitas otro cambio, escríbenos.",
    };
  }

  const inicio = inicioClaseMs(reserva?.fecha, reserva?.turno);
  if (Number.isNaN(inicio)) {
    return { ok: false, motivo: "No se puede leer la fecha de la reserva. Escríbenos y la cambiamos." };
  }

  if (inicio - ahoraMs < ANTELACION_HORAS * HORA) {
    return {
      ok: false,
      motivo: `Los cambios se piden con al menos ${ANTELACION_HORAS} horas de antelación y a tu clase le queda menos.`,
    };
  }

  return { ok: true, motivo: "" };
}

// Plazas libres de un turno para esta reserva, con las mismas reglas que el panel
export function plazasLibresParaReserva({ reservas, clase, carpeta, reserva, fecha, turno }) {
  const maxTorno = Number(clase?.plazas?.maxTorno || 12);
  const maxTotales = Number(clase?.plazas?.maxTotales || clase?.plazas?.plazasTotales || 45);
  const metodo = normalizarMetodo(reserva);

  if (metodo) {
    const { torno, modelado } = plazasPorMetodo(reservas, fecha, turno);
    return plazasLibres({ torno, modelado, esTorno: metodo === "torno", maxTorno, maxTotales });
  }

  const ocupadas = plazasDeTurno(reservas.child(`${carpeta}/${fecha}/${turno}`));
  return Math.max(maxTotales - ocupadas, 0);
}

// Por qué un día no se puede elegir (o "" si está bien)
export function motivoFechaNoValida({ fecha, turno, ahoraMs, bloqueos = {} }) {
  if (!esFechaISO(fecha)) return "La fecha no es válida.";

  const inicio = inicioClaseMs(fecha, turno);
  if (Number.isNaN(inicio) || inicio - ahoraMs < MARGEN_NUEVA_CLASE_HORAS * HORA) {
    return `La nueva clase debe empezar dentro de, al menos, ${MARGEN_NUEVA_CLASE_HORAS} horas.`;
  }

  if (inicio - ahoraMs > DIAS_VENTANA * DIA) {
    return `Solo se puede elegir una fecha de los próximos ${DIAS_VENTANA} días.`;
  }

  if (bloqueos?.[fecha]?.bloqueado) return "Ese día no hay taller.";

  return "";
}

// Turnos que se pueden elegir en una fecha, sin mirar el aforo
export function turnosElegibles({ clase, fecha, fechasHabilitadas, reservasGrupos }) {
  const turnos = turnosDisponiblesEnFecha({ clase, fecha, fechasHabilitadas, reservasGrupos });
  return esTurnoConsulta(turnos) ? [] : turnos.map(limpiarTurno);
}

// Días y turnos a los que puede pasar la reserva: con hueco para todas sus plazas
export function opcionesDeCambio({
  reservas,
  reserva,
  carpeta,
  clase,
  bloqueos,
  fechasHabilitadas,
  reservasGrupos,
  ahoraMs = ahoraMadridMs(),
}) {
  const plazas = Number(reserva?.plazas || 1);
  const opciones = [];
  const [anio, mes, dia] = fechaDeMs(ahoraMs).split("-").map(Number);
  const hoy = Date.UTC(anio, mes - 1, dia);

  for (let i = 0; i <= DIAS_VENTANA; i += 1) {
    const fecha = fechaDeMs(hoy + i * DIA);
    const turnos = [];

    turnosElegibles({ clase, fecha, fechasHabilitadas, reservasGrupos }).forEach((turno) => {
      if (motivoFechaNoValida({ fecha, turno, ahoraMs, bloqueos })) return;
      if (fecha === reserva.fecha && turno === limpiarTurno(reserva.turno)) return;

      const libres = plazasLibresParaReserva({ reservas, clase, carpeta, reserva, fecha, turno });
      if (libres >= plazas) turnos.push({ turno, libres });
    });

    if (turnos.length) opciones.push({ fecha, turnos });
  }

  return opciones;
}

// --- Reservas de grupo -------------------------------------------------------
// Los turnos de grupo son fijos (los mismos que ofrece ReservaGrupos.jsx). No hay
// aforo que comprobar: la fecha de un grupo se acuerda con el taller, así que el
// cambio se aplica y queda marcado para que Berto lo revise.
export const TURNOS_GRUPO = ["11:30-14:30", "17:30-20:30"];

export function evaluarCambioGrupo(grupo, ahoraMs = ahoraMadridMs()) {
  const estado = String(grupo?.estado || "").toLowerCase();

  if (grupo?.cancelada === true || estado.includes("cancelada")) {
    return { ok: false, motivo: "Esta reserva está cancelada." };
  }

  // Los grupos se pagan de una vez: hasta entonces la reserva no está confirmada
  if (estado !== "confirmada") {
    return { ok: false, motivo: "Esta reserva todavía no está confirmada y pagada." };
  }

  if (Number(grupo?.numCambiosCliente || 0) >= MAX_CAMBIOS_CLIENTE) {
    return {
      ok: false,
      motivo: "Ya cambiaste la fecha de esta reserva una vez. Si necesitas otro cambio, escríbenos.",
    };
  }

  const inicio = inicioClaseMs(grupo?.fecha, grupo?.turno);
  if (Number.isNaN(inicio)) {
    return { ok: false, motivo: "No se puede leer la fecha de la reserva. Escríbenos y la cambiamos." };
  }

  if (inicio - ahoraMs < ANTELACION_HORAS * HORA) {
    return {
      ok: false,
      motivo: `Los cambios se piden con al menos ${ANTELACION_HORAS} horas de antelación y a vuestra reserva le queda menos.`,
    };
  }

  return { ok: true, motivo: "" };
}

export function opcionesDeCambioGrupo({ grupo, bloqueos, ahoraMs = ahoraMadridMs() }) {
  const [anio, mes, dia] = fechaDeMs(ahoraMs).split("-").map(Number);
  const hoy = Date.UTC(anio, mes - 1, dia);
  const opciones = [];

  for (let i = 0; i <= DIAS_VENTANA; i += 1) {
    const fecha = fechaDeMs(hoy + i * DIA);
    const turnos = TURNOS_GRUPO.filter(
      (turno) =>
        !motivoFechaNoValida({ fecha, turno, ahoraMs, bloqueos }) &&
        !(fecha === grupo.fecha && turno === grupo.turno)
    ).map((turno) => ({ turno, libres: null }));

    if (turnos.length) opciones.push({ fecha, turnos });
  }

  return opciones;
}
