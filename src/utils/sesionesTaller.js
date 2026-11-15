// src/utils/sesionesTaller.js
// Talleres de dos o más sesiones (campo `sesiones` de la ficha, sin ser monográficos):
// se pueden reservar todas las sesiones de una vez, cada una en su día y turno, con un
// mínimo de días entre ellas. Sin SDK: lo usan el navegador y las funciones de api/.
import { esMonografico } from "./monografico.js";

// Días mínimos entre una sesión y la siguiente si el taller no fija otros
export const DIAS_ENTRE_SESIONES = 28;

const diaValido = (valor) => {
  const n = Math.round(Number(valor));
  return Number.isFinite(n) && n >= 1 && n <= 365 ? n : 0;
};

// Días mínimos entre cada sesión y la siguiente, según la ficha (`diasEntreSesiones`):
// una lista [entre la 1 y la 2, entre la 2 y la 3…] o, en fichas anteriores, un solo número
// para todas. Lo que falte son los 28 de siempre. Devuelve una lista de `n - 1` huecos.
export function diasEntreSesionesDe(clase = {}, sesiones = 0) {
  const total = sesiones || Math.max(Math.round(Number(clase.sesiones)) || 1, 1);
  const guardado = clase.diasEntreSesiones;
  const lista = Array.isArray(guardado) ? guardado : guardado && typeof guardado === "object" ? Object.values(guardado) : [guardado];

  return Array.from({ length: Math.max(total - 1, 0) }, (_, i) => {
    const propio = diaValido(lista[i]);
    if (propio) return propio;
    // Un solo número vale para todos los huecos
    return lista.length === 1 ? diaValido(lista[0]) || DIAS_ENTRE_SESIONES : DIAS_ENTRE_SESIONES;
  });
}

export function sumarDias(fechaISO, dias) {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Primer día en que puede caer la sesión siguiente a una fecha
export const fechaMinimaSiguiente = (fechaISO, dias = DIAS_ENTRE_SESIONES) => sumarDias(fechaISO, dias);

// «4 semanas», «10 días»…
export const textoDias = (dias) =>
  dias % 7 === 0 ? `${dias / 7} semana${dias === 7 ? "" : "s"}` : `${dias} día${dias === 1 ? "" : "s"}`;

// Número de sesiones del taller que se reservan de una vez (1 si no es de varias)
export function sesionesDeTaller(clase = {}) {
  const n = Math.round(Number(clase.sesiones));
  return n > 1 && !esMonografico(clase) ? n : 1;
}

// Comprueba las fechas de las sesiones, en orden: [{ fecha, turno }]. Devuelve el
// motivo del error o "" si están bien.
export function motivoSesionesNoValidas(sesiones, dias = []) {
  for (let i = 1; i < sesiones.length; i += 1) {
    const hueco = Array.isArray(dias) ? dias[i - 1] || DIAS_ENTRE_SESIONES : dias;
    const minimo = fechaMinimaSiguiente(sesiones[i - 1].fecha, hueco);
    if (sesiones[i].fecha < minimo) {
      return `Entre la sesión ${i} y la ${i + 1} tienen que pasar al menos ${hueco} días.`;
    }
  }
  return "";
}
