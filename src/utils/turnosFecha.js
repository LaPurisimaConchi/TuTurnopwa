// src/utils/turnosFecha.js
// Turnos de un taller en una fecha. Sin React ni Firebase: lo usan las pantallas
// (turnosTaller.js) y las funciones de Vercel (api/cambiar-fecha.js).

import { horaAMinutos, inicioDeTurno } from "./duracionTurno.js";

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

// Solo los talleres y bonos del panel con horario semanal tienen turnos que piden el mínimo
// de personas: los de siempre sin migrar y los monográficos (fechas fijas) no.
export const abreDias = (clase) =>
  !!clase && clase.dinamica === true && clase.monografico !== true;

const minutosDe = (h, m) => Number(h) * 60 + Number(m);
const RANGO = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;

// --- Turnos extra: turnos creados desde el panel para fechas concretas ---------------------
// Se guardan en `turnosExtra/{claseId}/{fecha}/{inicio}` = { turno: "10:00-13:00", minimo, … }
// (el fin sale de la duración del taller al crearlos; es la clave de las reservas, como los del
// horario semanal). `conTurnosExtra` los pega a la ficha como `turnosExtraPorFecha`, y las
// funciones de abajo los suman a los del horario semanal: así los ven la reserva, el cambio
// de fecha, los bonos y el servidor sin cambiar sus llamadas. Si el horario semanal ya tiene
// un turno con la misma hora de inicio, manda el del horario.

// Ficha del taller + sus turnos extra (`extrasDelTaller` = turnosExtra[claseId]: { fecha: { inicio: {...} } })
export function conTurnosExtra(clase, extrasDelTaller) {
  if (!clase || !extrasDelTaller || typeof extrasDelTaller !== "object") return clase;

  const porFecha = {};
  for (const [fecha, entradas] of Object.entries(extrasDelTaller)) {
    const lista = Object.values(entradas && typeof entradas === "object" ? entradas : {})
      .map((e) => ({ turno: limpiarTurno(e?.turno || ""), minimo: e?.minimo === true }))
      .filter((e) => esTurnoConHoras(e.turno));
    if (lista.length) porFecha[fecha] = lista;
  }

  return Object.keys(porFecha).length ? { ...clase, turnosExtraPorFecha: porFecha } : clase;
}

// Turnos extra de ese día que el horario semanal no tiene ya: [{ turno, minimo }]
export function turnosExtraDeFecha(clase, fecha) {
  if (!abreDias(clase)) return [];
  const extras = clase?.turnosExtraPorFecha?.[fecha];
  if (!Array.isArray(extras) || !extras.length) return [];

  const semanales = new Set(
    normalizarTurnos(clase?.horarios?.[nombreDiaSemana(fecha)])
      .map((t) => inicioDeTurno(limpiarTurno(t)))
      .filter(Boolean)
  );
  return extras.filter((e) => !semanales.has(inicioDeTurno(e.turno)));
}

const inicioEnMinutos = (turno) => horaAMinutos(inicioDeTurno(turno)) ?? Number.MAX_SAFE_INTEGER;

// Todos los turnos de un día: los del horario semanal y los extra, por hora de inicio
export function turnosDelDia(clase, fecha) {
  const semanales = normalizarTurnos(clase?.horarios?.[nombreDiaSemana(fecha)]).map(limpiarTurno);
  const extra = turnosExtraDeFecha(clase, fecha)
    .map((e) => e.turno)
    .filter((t) => !semanales.includes(t));
  if (!extra.length) return semanales;
  return [...semanales, ...extra].sort((a, b) => inicioEnMinutos(a) - inicioEnMinutos(b));
}

// Turnos de un día que piden el mínimo de personas para abrirse: los marcados «Mín.» del
// horario semanal (`clase.horariosMinimo[dia]`, subconjunto de `clase.horarios[dia]`) y los
// turnos extra creados con el mínimo
export function turnosMinimoDeClase(clase, fecha) {
  if (!abreDias(clase)) return [];
  const dia = nombreDiaSemana(fecha);
  const delDia = normalizarTurnos(clase?.horarios?.[dia]).map(limpiarTurno);
  const semanales = normalizarTurnos(clase?.horariosMinimo?.[dia])
    .map(limpiarTurno)
    .filter((t) => esTurnoConHoras(t) && delDia.includes(t));
  const extra = turnosExtraDeFecha(clase, fecha)
    .filter((e) => e.minimo)
    .map((e) => e.turno);
  return extra.length ? [...semanales, ...extra] : semanales;
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

  const turnos = turnosDelDia(clase, fecha);
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
