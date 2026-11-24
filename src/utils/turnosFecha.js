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

// Un turno abierto por una franja debe empezar, como muy tarde, este margen antes de que
// ella termine
export const MARGEN_FIN_FRANJA_MIN = 30;

// ¿El turno empieza dentro de alguna de las franjas? Solo cuenta la hora de inicio:
// con la franja 10:00-14:00 se abre el turno 11:00-15:00 (y hasta uno que empiece a
// las 13:30), pero no el 09:00-11:00, ni el 13:45, ni el 14:00-16:00.
export function turnoEmpiezaEnFranjas(turno, franjas = []) {
  const inicio = /^(\d{1,2}):(\d{2})\s*-/.exec(limpiarTurno(turno));
  if (!inicio) return false;
  const minutos = Number(inicio[1]) * 60 + Number(inicio[2]);

  return franjas.some((franja) => {
    const m = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(limpiarTurno(franja));
    return (
      !!m &&
      minutos >= Number(m[1]) * 60 + Number(m[2]) &&
      minutos <= Number(m[3]) * 60 + Number(m[4]) - MARGEN_FIN_FRANJA_MIN
    );
  });
}

// `diaAbierto`: el día no tiene horario pero está abierto. `true` abre todos los turnos
// de días abiertos del taller (la reserva que se hace llega al mínimo de personas y
// abre su propia franja); una lista de franjas ("10:00-14:00", las de las reservas que
// llegaron al mínimo) abre solo los turnos que empiezan dentro de alguna.
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
    turnosDiasAbiertos(clase)
      .filter((t) => !Array.isArray(diaAbierto) || turnoEmpiezaEnFranjas(t, diaAbierto))
      .forEach((t) => turnos.push(t));
  }

  return turnos;
}
