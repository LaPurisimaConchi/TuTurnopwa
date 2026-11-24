// src/utils/turnosFecha.js
// Turnos de un taller en una fecha. Sin React ni Firebase: lo usan las pantallas
// (turnosTaller.js) y las funciones de Vercel (api/cambiar-fecha.js).

const DIAS_SEMANA = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

export const normalizarTurnos = (turnosRaw) => {
  if (!turnosRaw) return [];
  if (Array.isArray(turnosRaw)) {
    return turnosRaw.map((t) => String(t || "").trim()).filter(Boolean);
  }
  if (typeof turnosRaw === "object") {
    return Object.values(turnosRaw).map((t) => String(t || "").trim()).filter(Boolean);
  }
  if (typeof turnosRaw === "string") return [turnosRaw.trim()].filter(Boolean);
  return [];
};

// "17:30 a 20:30" → "17:30-20:30"; los turnos «a consultar» no se tocan
export const limpiarTurno = (turno) =>
  String(turno)
    .replace(/(\d{1,2}:\d{2})\s+a\s+(\d{1,2}:\d{2})/i, "$1-$2")
    .trim();

export const nombreDiaSemana = (fechaISO) => {
  if (!fechaISO) return "";
  const [year, month, day] = fechaISO.split("-").map(Number);
  return DIAS_SEMANA[new Date(year, month - 1, day).getDay()] || "";
};

export const esTurnoConsulta = (turnos = []) =>
  turnos.length === 1 && turnos[0].toLowerCase().includes("consultar");

// Un turno con horas ("11:30-14:30"): lo único que vale como turno de día abierto
export const esTurnoConHoras = (turno) => {
  const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(limpiarTurno(turno));
  return !!m && Number(m[3]) * 60 + Number(m[4]) > Number(m[1]) * 60 + Number(m[2]);
};

// Solo los talleres del panel con horario semanal tienen turnos que piden el mínimo de
// personas: los de siempre sin migrar, los monográficos (fechas fijas) y los bonos no.
export const abreDias = (clase) =>
  !!clase && clase.dinamica === true && clase.monografico !== true && clase.tipoProducto !== "bono";

const minutosDe = (h, m) => Number(h) * 60 + Number(m);
const RANGO = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;

// Turnos de un día de la semana que piden el mínimo de personas para abrirse
// (`clase.horariosMinimo[dia]`, subconjunto de `clase.horarios[dia]`)
export function turnosMinimoDeClase(clase, fecha) {
  if (!abreDias(clase)) return [];
  const dia = nombreDiaSemana(fecha);
  const delDia = normalizarTurnos(clase?.horarios?.[dia]).map(limpiarTurno);
  return normalizarTurnos(clase?.horariosMinimo?.[dia])
    .map(limpiarTurno)
    .filter((t) => esTurnoConHoras(t) && delDia.includes(t));
}

// Un turno abierto por una reserva debe empezar, como muy tarde, este margen antes de que
// termine el turno de esa reserva
export const MARGEN_FIN_FRANJA_MIN = 30;

// ¿El turno empieza dentro de alguna de las franjas? Solo cuenta la hora de inicio:
// con la franja 10:00-14:00 se abre el turno 11:00-15:00 (y hasta uno que empiece a
// las 13:30), pero no el 09:00-11:00, ni el 13:45, ni el 14:00-16:00.
export function turnoEmpiezaEnFranjas(turno, franjas = []) {
  const inicio = /^(\d{1,2}):(\d{2})\s*-/.exec(limpiarTurno(turno));
  if (!inicio) return false;
  const minutos = minutosDe(inicio[1], inicio[2]);

  return franjas.some((franja) => {
    const m = RANGO.exec(limpiarTurno(franja));
    return (
      !!m &&
      minutos >= minutosDe(m[1], m[2]) &&
      minutos <= minutosDe(m[3], m[4]) - MARGEN_FIN_FRANJA_MIN
    );
  });
}

// ¿El turno cabe entero dentro de alguna franja? Es la regla de las franjas que se abren
// desde administración (sin margen: la franja 10:00-14:00 abre 11:00-13:00, no 13:00-15:00).
export function turnoDentroDeFranjas(turno, franjas = []) {
  const t = RANGO.exec(limpiarTurno(turno));
  if (!t) return false;
  const inicio = minutosDe(t[1], t[2]);
  const fin = minutosDe(t[3], t[4]);

  return franjas.some((franja) => {
    const m = RANGO.exec(limpiarTurno(franja));
    return !!m && inicio >= minutosDe(m[1], m[2]) && fin <= minutosDe(m[3], m[4]);
  });
}

// ¿Este turno que pide el mínimo está abierto a cualquier número de personas?
// `diaAbierto`: franjas de las reservas que llegaron al mínimo ese día (lista), o `true`
// (la reserva que se hace abre su propia franja). Una fecha habilitada desde administración
// abre los turnos que caben en sus franjas (o todos, si es el día entero).
export function turnoAbiertoSinMinimo({ turno, diaAbierto = false, habilitacion = null }) {
  if (diaAbierto === true) return true;
  if (Array.isArray(diaAbierto) && turnoEmpiezaEnFranjas(turno, diaAbierto)) return true;
  if (!habilitacion?.habilitada) return false;

  const franjas = normalizarTurnos(habilitacion.turnosHabilitados || habilitacion.turnosDisponibles);
  return franjas.length ? turnoDentroDeFranjas(turno, franjas) : true;
}

// Turnos del día que se reservan con cualquier número de personas: los del horario semanal
// que no piden el mínimo y los que lo piden pero están abiertos (ver `turnoAbiertoSinMinimo`).
export function turnosDisponiblesEnFecha({ clase, fecha, fechasHabilitadas = {}, diaAbierto = false }) {
  if (!fecha) return [];

  const turnos = normalizarTurnos(clase?.horarios?.[nombreDiaSemana(fecha)]).map(limpiarTurno);
  const minimo = turnosMinimoDeClase(clase, fecha);
  const habilitacion = fechasHabilitadas?.[fecha];

  return turnos.filter(
    (t) => !minimo.includes(t) || turnoAbiertoSinMinimo({ turno: t, diaAbierto, habilitacion })
  );
}

// Turnos del día que piden el mínimo de personas y todavía no están abiertos
export function turnosConMinimoEnFecha({ clase, fecha, fechasHabilitadas = {}, diaAbierto = false }) {
  if (!fecha) return [];
  const habilitacion = fechasHabilitadas?.[fecha];
  return turnosMinimoDeClase(clase, fecha).filter(
    (t) => !turnoAbiertoSinMinimo({ turno: t, diaAbierto, habilitacion })
  );
}
