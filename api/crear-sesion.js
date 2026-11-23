// api/crear-sesion.js
// Firma el pago de un pedido y manda al cliente al TPV de Redsys (HTML que se envía
// solo), o devuelve los datos firmados en JSON con mode=json.
// Solo firma pedidos que ha preparado el servidor (api/_pedidoServidor.js, tipo
// "prepararPago" de api/codigo-reserva.js) y con su importe: lo que mande el
// navegador (amountCents, amount) no cuenta.
import { adminDb } from "./_firebaseAdmin.js";
import { firmarRedsys } from "./_firmaRedsys.js";
import { PEDIDO_PAGO } from "./_pedidoServidor.js";

export const config = { runtime: "nodejs" };

// Sin variables TPV_* / APP_BASE_URL se usan los valores de producción.
// En staging (Preview) se definen para usar el TPV de pruebas de Redsys.
// Nombres nuevos a propósito: los REDSYS_FUC, REDSYS_URL_* antiguos de Vercel no se leen.
const FUC = process.env.TPV_FUC || "368564464";
const TERMINAL = process.env.TPV_TERMINAL || "001";
const CURRENCY = "978";
const TPV_URL = process.env.TPV_URL || "https://sis.redsys.es/sis/realizarPago";
const APP_BASE_URL = (process.env.APP_BASE_URL || "https://app.lapurisimaconchi.com").replace(/\/+$/, "");
// Query opcional para la URL de notificación (p. ej. el bypass de la protección de Vercel en staging)
const NOTIFY_QUERY = process.env.TPV_NOTIFY_QUERY || "";

// ---------- utils ----------
// Base64 estándar (NO URL) para Ds_MerchantParameters
const jsonToStdB64 = (obj) => Buffer.from(JSON.stringify(obj), "utf8").toString("base64");

// Web a la que vuelve el cliente al terminar en el TPV. Nunca una ajena: la del
// navegador solo se acepta si es el mismo dominio que recibe esta petición (un
// Preview de Vercel, por ejemplo); si no, la de APP_BASE_URL.
function origenDeVuelta(req, urlCliente) {
  const host = String(req.headers?.host || "").toLowerCase();
  try {
    const url = new URL(String(urlCliente || ""));
    if (url.protocol === "https:" && host && url.host.toLowerCase() === host) return `https://${host}`;
  } catch {
    // URL no válida: se usa la de siempre
  }
  return APP_BASE_URL;
}

// Si no se puede pagar: página sencilla (o JSON con mode=json). Los mensajes son fijos.
function noSePuedePagar(res, status, mensaje, comoJson) {
  if (comoJson) return res.status(status).json({ ok: false, error: mensaje });
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(status).send(`<!doctype html><html lang="es"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>No se ha podido iniciar el pago</title>
<body style="font-family:sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;color:#333">
  <h1 style="font-size:1.3rem">No se ha podido iniciar el pago</h1>
  <p>${mensaje}</p>
  <p><a href="/">Volver a la web</a></p>
</body></html>`);
}

// ---------- handler ----------
export default async function handler(req, res) {
  const isGet = req.method === "GET";
  const isPost = req.method === "POST";
  if (!isGet && !isPost) return res.status(405).end();

  const src = isGet ? (req.query || {}) : (req.body || {});
  const comoJson = String(src.mode || "").toLowerCase() === "json";

  if (!FUC) return res.status(500).send("Falta REDSYS_FUC");

  try {
    const { okUrl } = src;
    const oid = String(src.orderId || "");
    if (!PEDIDO_PAGO.test(oid)) {
      return noSePuedePagar(res, 400, "El número de pedido no es válido.", comoJson);
    }

    // El importe es el del pedido que preparó el servidor
    const snap = await adminDb.ref(`pedidosPendientes/${oid}`).get();
    const pedido = snap.exists() ? snap.val() || {} : null;
    if (!pedido || pedido.importeServidor !== true) {
      return noSePuedePagar(res, 409, "No se ha encontrado este pedido. Vuelve a hacer la reserva.", comoJson);
    }
    if (pedido.procesado === true || String(pedido.estadoPago || "") !== "pendiente") {
      return noSePuedePagar(res, 409, "Este pedido ya está pagado o cerrado.", comoJson);
    }

    const centimos = Math.round(Number(pedido.precioTotal) * 100);
    if (!Number.isInteger(centimos) || centimos < 1) {
      return noSePuedePagar(res, 409, "Este pedido no tiene importe.", comoJson);
    }
    const cents = String(centimos);

    // URLs: las de vuelta, siempre de esta web; la de notificación, siempre la nuestra
    const origen = origenDeVuelta(req, okUrl);
    // La pantalla de éxito necesita saber qué pedido es para comprobar que está pagado
    const URL_OK = `${origen}/pago/exito?pedido=${encodeURIComponent(oid)}`;
    const URL_KO = `${origen}/pago/error`;
    const URL_NOTIFY = `${APP_BASE_URL}/api/notificacionTPV${NOTIFY_QUERY ? `?${NOTIFY_QUERY}` : ""}`;

    // Parámetros Redsys (usar camel-case EXACTO)
    const dsJson = {
      Ds_Merchant_Amount: cents,
      Ds_Merchant_Order: oid,
      Ds_Merchant_MerchantCode: String(FUC),
      Ds_Merchant_Terminal: TERMINAL,
      Ds_Merchant_Currency: CURRENCY,
      Ds_Merchant_TransactionType: "0",
      Ds_Merchant_UrlOK: URL_OK,
      Ds_Merchant_UrlKO: URL_KO,
      Ds_Merchant_PayMethods: "0",
      Ds_Merchant_MerchantURL: URL_NOTIFY,
    };

    // MerchantParameters → Base64 estándar
    const Ds_MerchantParameters = jsonToStdB64(dsJson);

    // Firma (V1)
    const Ds_SignatureVersion = "HMAC_SHA256_V1";
    const Ds_Signature = firmarRedsys(Ds_MerchantParameters, dsJson.Ds_Merchant_Order);

    // --- Datos firmados en JSON (el navegador monta el formulario) ---
    if (comoJson) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(200).json({
        action: TPV_URL,
        Ds_SignatureVersion,
        Ds_MerchantParameters,
        Ds_Signature,
      });
    }

    // --- HTML auto-submit por defecto ---
    // Todo lo que se pinta es base64 o valores fijos de la configuración
    const html = `<!doctype html><html lang="es"><meta charset="utf-8">
<title>Conectando con el banco…</title>
<body onload="document.forms[0].submit()" style="font-family:sans-serif">
  <p>Redirigiendo al TPV…</p>
  <form method="post" action="${TPV_URL}">
    <input type="hidden" name="Ds_SignatureVersion" value="${Ds_SignatureVersion}" autocomplete="off">
    <input type="hidden" name="Ds_MerchantParameters" value="${Ds_MerchantParameters}" autocomplete="off">
    <input type="hidden" name="Ds_Signature" value="${Ds_Signature}" autocomplete="off">
    <noscript><button type="submit">Continuar al pago</button></noscript>
  </form>
</body></html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Error creando sesión TPV");
  }
}
