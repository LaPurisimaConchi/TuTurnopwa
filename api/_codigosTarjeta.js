// api/_codigosTarjeta.js
// Código de una tarjeta regalo: «REGALO-» y 10 caracteres al azar de crypto (sin
// 0/O/1/I), unos 10^15 posibles. Los de antes (6 caracteres) siguen valiendo: se
// buscan igual (api/_canjeServidor.js). No cuenta como función de Vercel (empieza por _).
import { randomInt } from "node:crypto";
import { ALFABETO } from "./_codigosReserva.js";
import { fechaCaducidadTarjeta, normalizarConfigEspacio } from "../src/utils/configEspacio.js";

export const LONGITUD_CODIGO_TARJETA = 10;

export function generarCodigoTarjetaRegalo() {
  let codigo = "REGALO-";
  for (let i = 0; i < LONGITUD_CODIGO_TARJETA; i += 1) codigo += ALFABETO[randomInt(ALFABETO.length)];
  return codigo;
}

// Uno que aún no esté en el índice codigosTarjetaRegalo/{codigo}
export async function generarCodigoTarjetaRegaloUnico(db) {
  for (let intento = 0; intento < 8; intento += 1) {
    const codigo = generarCodigoTarjetaRegalo();
    const existe = await db.ref(`codigosTarjetaRegalo/${codigo}`).get();
    if (!existe.exists()) return codigo;
  }
  throw new Error("No se pudo generar un código de tarjeta regalo único");
}

// Último día de validez de una tarjeta que se compra ahora, según los meses de
// configuracionEspacio. Se guarda en la tarjeta: cambiar los meses no toca las ya vendidas.
export async function caducidadTarjetaNueva(db, fechaCompra) {
  const snap = await db.ref("configuracionEspacio").get();
  const config = normalizarConfigEspacio(snap.exists() ? snap.val() : null);
  return fechaCaducidadTarjeta(fechaCompra, config.mesesCaducidadTarjeta);
}
