// api/crear-sesion.js
// Firma el pago y manda al cliente al TPV de Redsys (HTML que se envía solo), o
// devuelve los datos firmados en JSON con mode=json (ResumenPagoTearium).
import { firmarRedsys } from "./_firmaRedsys.js";

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

// ---------- handler ----------
export default function handler(req, res) {
  const isGet = req.method === "GET";
  const isPost = req.method === "POST";
  if (!isGet && !isPost) return res.status(405).end();

  const src = isGet ? (req.query || {}) : (req.body || {});

  if (!FUC) return res.status(500).send("Falta REDSYS_FUC");

  try {
    const { orderId, amountCents, amount, okUrl, mode } = src;

    // ORDER: numérico 4–12 dígitos → dejamos 12 dígitos
    let oid = String(orderId ?? Date.now()).replace(/\D/g, "");
    if (oid.length < 4) oid = (Date.now() % 1e12).toString();
    oid = oid.padStart(12, "0").slice(-12);

    // Importe en céntimos (>=1)
    let cents = null;

    // Si ya viene en céntimos
    if (amountCents != null) {
      cents = String(parseInt(amountCents, 10));
    }

    // Si viene en euros
    if (!cents && amount != null) {
      const euros = String(amount).replace(",", ".");
      cents = String(Math.round(Number(euros) * 100));
    }

    if (!cents || !/^\d+$/.test(cents) || Number(cents) < 1) {
      return res.status(400).send("amountCents/amount inválido");
    }

    // URLs: las de vuelta, siempre de esta web; la de notificación, siempre la nuestra
    const origen = origenDeVuelta(req, okUrl);
    const URL_OK = `${origen}/pago/exito`;
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
    if ((mode || "").toString().toLowerCase() === "json") {
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
