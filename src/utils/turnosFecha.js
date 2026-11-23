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

// Turnos que ofrece un taller en un día abierto (sin horario semanal): los «turnos de
// días abiertos» de su ficha (`clase.turnos`). Sin turnos válidos no puede abrir días.
export const turnosDiasAbiertos = (clase) =>
  normalizarTurnos(clase?.turnos).map(limpiarTurno).filter(esTurnoConHoras);

// `diaAbierto`: el día no tiene horario pero está abierto (por una reserva que llega
// al mínimo de personas, o porque esta misma lo abre)
export function turnosDisponiblesEnFecha({
  clase,
  fecha,
  fechasHabilitadas = {},
  diaAbierto = false,
}) {
  if (!fecha) return [];

  const turnos = normalizarTurnos(clase?.horarios?.[nombreDiaSemana(fecha)]).map(
    limpiarTurno
  );

  const habilitacion = fechasHabilitadas?.[fecha];
  if (habilitacion?.habilitada) {
    const configurados =
      habilitacion.turnosHabilitados || habilitacion.turnosDisponibles;
    const permitidos = configurados
      ? normalizarTurnos(configurados)
      : normalizarTurnos(clase?.turnos);

    permitidos.map(limpiarTurno).forEach((t) => {
      if (!turnos.includes(t)) turnos.push(t);
    });
  }

  // Un día sin horario abierto por una reserva con el mínimo de personas del taller
  if (!turnos.length && diaAbierto && !habilitacion?.habilitada) {
    turnosDiasAbiertos(clase).forEach((t) => turnos.push(t));
  }

  return turnos;
}
