// api/_codigosReserva.js
// Código de reserva: lo que el cliente guarda para volver a su reserva (individual
// o de grupo) sin iniciar sesión. 8 caracteres al azar, sin 0/O/1/I; se enseña como
// K7M3-9QXP. A diferencia del orderId (correlativo y visible en el TPV) no se puede
// adivinar.
//
//   codigosReserva/{CODIGO}      { tipo, orderId | grupoId, ruta?, uid, creadoEn }
//   codigosPorPedido/{clave}     CODIGO   (clave = orderId, o "grupo_{grupoId}")
//
// Los dos nodos solo los lee y escribe firebase-admin (las reglas cierran la raíz).
import { randomInt } from "node:crypto";
import { buscarReservaEnArbol } from "../src/utils/cambioFecha.js";

export const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LONGITUD = 8;
const CODIGO = new RegExp(`^[${ALFABETO}]{${LONGITUD}}$`);

export const normalizarCodigo = (valor = "") =>
  String(valor || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export const esCodigoValido = (valor) => CODIGO.test(normalizarCodigo(valor));

export const formatearCodigo = (codigo = "") => {
  const limpio = normalizarCodigo(codigo);
  return limpio.length === LONGITUD ? `${limpio.slice(0, 4)}-${limpio.slice(4)}` : limpio;
};

export function generarCodigo() {
  let codigo = "";
  for (let i = 0; i < LONGITUD; i += 1) codigo += ALFABETO[randomInt(ALFABETO.length)];
  return codigo;
}

// Devuelve el código de la reserva y lo crea si aún no tiene. `clave` identifica el
// pedido (para que repetir la llamada, p. ej. un reintento del TPV, no cree otro).
export async function asegurarCodigo(db, { clave, datos }) {
  const previo = await db.ref(`codigosPorPedido/${clave}`).get();
  if (previo.exists()) return String(previo.val());

  for (let intento = 0; intento < 8; intento += 1) {
    const codigo = generarCodigo();
    const resultado = await db
      .ref(`codigosReserva/${codigo}`)
      .transaction((actual) => (actual ? undefined : { ...datos, creadoEn: new Date().toISOString() }));

    if (resultado.committed) {
      await db.ref(`codigosPorPedido/${clave}`).set(codigo);
      return codigo;
    }
  }

  throw new Error("No se pudo generar un código de reserva único");
}

// Reserva individual por número de pedido. Primero por el código guardado (que lleva
// la ruta) y, si no está o quedó viejo (el panel movió la reserva), recorriendo
// /reservas.
export async function buscarReservaIndividual(db, orderId) {
  const codigo = await db.ref(`codigosPorPedido/${orderId}`).get();

  if (codigo.exists()) {
    const entrada = await db.ref(`codigosReserva/${codigo.val()}`).get();
    const ruta = String(entrada.val()?.ruta || "");

    if (ruta.startsWith("reservas/")) {
      const nodo = await db.ref(ruta).get();
      if (nodo.exists() && nodo.val()?.orderId === orderId) {
        return { segmentos: ruta.split("/"), reserva: nodo.val() };
      }
    }
  }

  const todas = await db.ref("reservas").get();
  return buscarReservaEnArbol(todas.val(), orderId);
}

// Si el panel movió la reserva, el código sigue apuntando a la ruta antigua
export async function actualizarRutaCodigo(db, codigo, ruta) {
  if (!codigo) return;
  await db.ref(`codigosReserva/${normalizarCodigo(codigo)}/ruta`).set(ruta);
}

// Reserva de grupo por número de pedido (solo para quien aún no tiene código)
export async function buscarGrupoPorOrderId(db, orderId) {
  const grupos = await db.ref("reservasGrupos").get();
  let encontrado = null;

  grupos.forEach((grupo) => {
    if (!encontrado && grupo.val()?.orderId === orderId) {
      encontrado = { id: grupo.key, grupo: grupo.val() };
    }
  });

  return encontrado;
}
