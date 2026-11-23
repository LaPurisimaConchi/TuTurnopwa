// api/_firmaRedsys.js
// Firma HMAC_SHA256_V1 de Redsys. Es la misma para crear la sesión de pago
// (api/crear-sesion.js) y para comprobar el aviso del TPV (api/notificacionTPV.js):
//   1) clave del pedido = 3DES-CBC (IV a ceros, sin relleno PKCS) del número de
//      pedido completado con \0 hasta un múltiplo de 8, con la clave del comercio;
//   2) firma = HMAC-SHA256 de Ds_MerchantParameters, tal cual llega, con esa clave.
// La firma del aviso llega en base64 URL (-_) y la del formulario va en base64
// normal: se comparan normalizadas. No cuenta como función de Vercel (empieza por _).
import crypto from "crypto";

export function claveComercio(secreto = process.env.REDSYS_SECRET_KEY) {
  const texto = String(secreto || "").trim();
  if (!texto) throw new Error("Falta REDSYS_SECRET_KEY");
  return Buffer.from(texto, "base64");
}

function clavePedido(pedido, clave) {
  let texto = String(pedido);
  while (texto.length % 8 !== 0) texto += "\0";

  const cifrado = crypto.createCipheriv("des-ede3-cbc", clave, Buffer.alloc(8, 0));
  cifrado.setAutoPadding(false);
  return Buffer.concat([cifrado.update(texto, "utf8"), cifrado.final()]);
}

// Firma en base64 normal (la que se manda al TPV)
export function firmarRedsys(merchantParameters, pedido, clave = claveComercio()) {
  return crypto
    .createHmac("sha256", clavePedido(pedido, clave))
    .update(String(merchantParameters), "utf8")
    .digest("base64");
}

const normalizarFirma = (firma) =>
  String(firma || "")
    .trim()
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/=+$/, "");

// ¿La firma recibida es la de estos parámetros? `pedido` es el Ds_Order del aviso.
export function firmaRedsysValida(merchantParameters, pedido, firmaRecibida, clave = claveComercio()) {
  if (!merchantParameters || !pedido || !firmaRecibida) return false;

  const esperada = Buffer.from(normalizarFirma(firmarRedsys(merchantParameters, pedido, clave)));
  const recibida = Buffer.from(normalizarFirma(firmaRecibida));
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
}
