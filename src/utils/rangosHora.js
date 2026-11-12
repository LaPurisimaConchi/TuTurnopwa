// src/utils/rangosHora.js
// Rangos de hora ("11:30-14:30") y bloqueos parciales de un día. Sin React ni
// Firebase: lo usan las pantallas y las funciones de Vercel.
import { normalizarTurnos } from "./turnosFecha.js";

const aMinutos = (hora) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hora).trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

// "11:30-14:30" → [690, 870]; null si no es un horario con horas
export function rangoDeTurno(turno) {
  const [desde, hasta] = String(turno || "").split("-");
  const a = aMinutos(desde);
  const b = aMinutos(hasta);
  return a !== null && b !== null && b > a ? [a, b] : null;
}

// Dos rangos se solapan si comparten algún minuto (rozarse en el borde no cuenta)
export function turnosSeSolapan(a, b) {
  const ra = rangoDeTurno(a);
  const rb = rangoDeTurno(b);
  if (!ra || !rb) return false;
  return ra[0] < rb[1] && rb[0] < ra[1];
}

// Rangos que bloquea un día: vacío = el día entero
export const rangosBloqueados = (bloqueo) => normalizarTurnos(bloqueo?.turnosBloqueados);

export const bloqueoEsParcial = (bloqueo) =>
  !!bloqueo?.bloqueado && rangosBloqueados(bloqueo).length > 0;

// ¿Este bloqueo impide reservar este turno? Un bloqueo sin rangos cierra el día.
// Un turno sin horas («Horario a consultar») se considera afectado por cualquier
// bloqueo, para no dejar reservar de más.
export function bloqueoAfectaTurno(bloqueo, turno) {
  if (!bloqueo?.bloqueado) return false;

  const rangos = rangosBloqueados(bloqueo);
  if (!rangos.length) return true;
  if (!rangoDeTurno(turno)) return true;

  return rangos.some((rango) => turnosSeSolapan(rango, turno));
}
