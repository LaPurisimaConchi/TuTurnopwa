// api/_limiteIntentos.js
// Límite de intentos por clave (una IP, un código…), contado con una transacción en
// la base de datos. Los nodos (limitesCambioFecha, limitesTarjetaRegalo…) solo los
// toca firebase-admin: las reglas no dejan al navegador leerlos ni escribirlos.
// No cuenta como función de Vercel (empieza por _).
import { createHash } from "node:crypto";

// Suma un intento a `nodo/clave`; false si ya se habían hecho `maximo` en la ventana
export async function consumirIntento(db, nodo, clave, maximo, ventanaMs) {
  const ahora = Date.now();
  const resultado = await db.ref(`${nodo}/${clave}`).transaction((actual) => {
    if (!actual || ahora - Number(actual.desde || 0) > ventanaMs) {
      return { n: 1, desde: ahora };
    }
    if (Number(actual.n || 0) >= maximo) return; // aborta: sin cambios
    return { n: Number(actual.n || 0) + 1, desde: actual.desde };
  });

  return resultado.committed;
}

// ¿Ya se han hecho `maximo` intentos en la ventana? (sin contar uno más)
export async function limiteAlcanzado(db, nodo, clave, maximo, ventanaMs) {
  const snap = await db.ref(`${nodo}/${clave}`).get();
  if (!snap.exists()) return false;
  const { n, desde } = snap.val() || {};
  return Number(n || 0) >= maximo && Date.now() - Number(desde || 0) < ventanaMs;
}

// Nodos de contadores; el cron semanal (api/limpiar-invitados.js) borra los viejos
export const NODOS_LIMITES = ["limitesCambioFecha", "limitesTarjetaRegalo", "limitesDisponibilidad"];

// Borra los contadores que empezaron antes de `antesDeMs` (ya no limitan nada: las
// ventanas son de minutos u horas). Devuelve cuántos son; con soloContar no borra.
export async function limpiarLimites(db, antesDeMs, { soloContar = false } = {}) {
  const borrar = {};
  for (const nodo of NODOS_LIMITES) {
    const snap = await db.ref(nodo).get();
    Object.entries(snap.exists() ? snap.val() || {} : {}).forEach(([clave, valor]) => {
      if (Number(valor?.desde || 0) < antesDeMs) borrar[`${nodo}/${clave}`] = null;
    });
  }
  const total = Object.keys(borrar).length;
  if (!soloContar && total) await db.ref().update(borrar);
  return total;
}

export const hash = (texto) => createHash("sha256").update(String(texto)).digest("hex").slice(0, 32);

export const ipDe = (req) =>
  String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "desconocida")
    .split(",")[0]
    .trim();
