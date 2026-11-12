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

// Turnos en los que reservan los grupos, sea cual sea el horario habitual del taller
export const TURNOS_GRUPO = ["11:30-14:30", "17:30-20:30"];

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

export function turnosDisponiblesEnFecha({
  clase,
  fecha,
  fechasHabilitadas = {},
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

  // Un grupo confirmado ya no abre turnos: los días de solo grupo se habilitan con
  // el mínimo de personas del taller (ver estadoDiaTaller).

  return turnos;
}
