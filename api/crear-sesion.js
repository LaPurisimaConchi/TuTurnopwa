// api/crear-sesion.js
import crypto from "crypto";
export const config = { runtime: "nodejs" };

// Sin variables TPV_* / APP_BASE_URL se usan los valores de producción.
// En staging (Preview) se definen para usar el TPV de pruebas de Redsys.
// Nombres nuevos a propósito: los REDSYS_FUC, REDSYS_URL_* antiguos de Vercel no se leen.
const FUC = process.env.TPV_FUC || "368564464";
const TERMINAL = process.env.TPV_TERMINAL || "001";
const CURRENCY = "978";
const REDSYS_SECRET_KEY = process.env.REDSYS_SECRET_KEY;
const TPV_URL = process.env.TPV_URL || "https://sis.redsys.es/sis/realizarPago";
const APP_BASE_URL = (process.env.APP_BASE_URL || "https://app.lapurisimaconchi.com").replace(/\/+$/, "");
// Query opcional para la URL de notificación (p. ej. el bypass de la protección de Vercel en staging)
const NOTIFY_QUERY = process.env.TPV_NOTIFY_QUERY || "";

// ---------- utils ----------
const isHttps = (u) => typeof u === "string" && /^https:\/\//i.test(u);

// Base64 estándar (NO URL) para Ds_MerchantParameters
const jsonToStdB64 = (obj) => Buffer.from(JSON.stringify(obj), "utf8").toString("base64");

// Base64URL para la firma (sin '=')
const toBase64Url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

// ---------- V1: HMAC_SHA256_V1 ----------
function signV1(paramsB64, order) {
  const key = Buffer.from(REDSYS_SECRET_KEY, "base64");
  const iv = Buffer.alloc(8, 0);
  const cipher = crypto.createCipheriv("des-ede3-cbc", key, iv);
  cipher.setAutoPadding(false);

  let orderPadded = order;
  while (orderPadded.length % 8 !== 0) orderPadded += "\0";

  const encrypted = Buffer.concat([
    cipher.update(orderPadded, "utf8"),
    cipher.final()
  ]);

  return crypto
    .createHmac("sha256", encrypted)
    .update(paramsB64)
    .digest("base64");
}

// ---------- V2: AES-128 + HMAC-SHA512 ----------
// function key16FromSecretTxt() {
//   if (!REDSYS_SECRET_KEY) throw new Error("Falta REDSYS_SECRET_KEY (V2)");
//   const txt = REDSYS_SECRET_KEY;
//   const sixteen = txt.slice(0, 16);
//   let k = Buffer.from(sixteen, "utf8");
//   if (k.length < 16) k = Buffer.concat([k, Buffer.alloc(16 - k.length, 0x00)]);
//   if (k.length > 16) k = k.subarray(0, 16);
//   return k;
// }

// function deriveKeyV2(order) {
//   const k16 = key16FromSecretTxt();
//   const iv = Buffer.alloc(16, 0x00); // IV = 0
//   const cipher = crypto.createCipheriv("aes-128-cbc", k16, iv);
//   cipher.setAutoPadding(true);       // PKCS#7
//   return Buffer.concat([cipher.update(String(order), "utf8"), cipher.final()]);
// }

// function signV2(paramsB64, order) {
//   const k = deriveKeyV2(order);
//   const digest = crypto.createHmac("sha512", k).update(paramsB64, "utf8").digest();
//   return toBase64Url(digest); // base64url sin '='
// }

// ---------- handler ----------
export default function handler(req, res) {
  const isGet = req.method === "GET";
  const isPost = req.method === "POST";
  if (!isGet && !isPost) return res.status(405).end();

  const src = isGet ? (req.query || {}) : (req.body || {});

  if (!FUC) return res.status(500).send("Falta REDSYS_FUC");

  try {
    const { orderId, amountCents, amount, okUrl, koUrl, notifyUrl, payMethod, mode } = src;

    // ORDER: numérico 4–12 dígitos → dejamos 12 dígitos
    
let oid = String(orderId ?? Date.now()).replace(/\D/g, "");
if (oid.length < 4) oid = (Date.now() % 1e12).toString();
oid = oid.padStart(12, "0").slice(-12);

    // Importe en céntimos (>=1)
let cents = null;

//  Si ya viene en céntimos
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
   // URLs
const URL_OK = isHttps(okUrl)
  ? okUrl
  : `${APP_BASE_URL}/pago/exito`;

const URL_KO = isHttps(koUrl)
  ? koUrl
  : `${APP_BASE_URL}/pago/error`;

const URL_NOTIFY =
  `${APP_BASE_URL}/api/notificacionTPV${NOTIFY_QUERY ? `?${NOTIFY_QUERY}` : ""}`;

if (!isHttps(URL_OK) || !isHttps(URL_KO)) {
  return res.status(400).send(
    "Faltan okUrl/koUrl https (o define REDSYS_URL_OK/KO)"
  );
}

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
      Ds_Merchant_MerchantURL: URL_NOTIFY
      //...(URL_NOTIFY ? { Ds_Merchant_MerchantURL: URL_NOTIFY } : {}),
      //...(payMethod === "bizum" ? { Ds_Merchant_PayMethods: "z" } : {}),
    };

    // MerchantParameters → Base64 estándar
    const Ds_MerchantParameters = jsonToStdB64(dsJson);

    // Firma (V1)
    const Ds_SignatureVersion = "HMAC_SHA256_V1";
    //const Ds_Signature = signV2(Ds_MerchantParameters, dsJson.Ds_Merchant_Order);
    const Ds_Signature = signV1(Ds_MerchantParameters, dsJson.Ds_Merchant_Order);

    // --- Respuesta JSON para depurar ---
    if ((mode || "").toString().toLowerCase() === "json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(200).json({
        action: TPV_URL,
        Ds_SignatureVersion,
        Ds_MerchantParameters,
        Ds_Signature,
        parsed: dsJson,
      });
    }

    // --- Modo INSPECT: formulario visible para depurar ---
    if ((mode || "").toLowerCase() === "inspect") {
      const short = (s) => (s ? `${s.slice(0, 24)}…${s.slice(-12)} (len ${s.length})` : "");
      const html = `<!doctype html><html lang="es"><meta charset="utf-8">
<title>Debug Redsys</title>
<body style="font-family:sans-serif; max-width:900px; margin:2rem auto">
  <h1>Debug Redsys</h1>
  <p><strong>Action:</strong> ${TPV_URL}</p>

  <h3>Previsualización (solo lectura)</h3>
  <ul>
    <li><b>Ds_SignatureVersion:</b> ${Ds_SignatureVersion}</li>
    <li><b>Ds_MerchantParameters:</b> ${short(Ds_MerchantParameters)}</li>
    <li><b>Ds_Signature:</b> ${short(Ds_Signature)}</li>
  </ul>

  <h3>Formulario que se enviará (POST)</h3>
  <form method="post" action="${TPV_URL}" target="_self" style="display:grid; gap:1rem">
    <label>Ds_SignatureVersion<br>
      <input name="Ds_SignatureVersion" value="${Ds_SignatureVersion}" style="width:100%">
    </label>
    <label>Ds_MerchantParameters<br>
      <textarea name="Ds_MerchantParameters" rows="8" style="width:100%">${Ds_MerchantParameters}</textarea>
    </label>
    <label>Ds_Signature<br>
      <input name="Ds_Signature" value="${Ds_Signature}" style="width:100%">
    </label>
    <button type="submit" style="padding:.6rem 1rem">Enviar al TPV</button>
  </form>

  <hr>
  <p><strong>MerchantParameters (JSON legible):</strong></p>
  <pre>${JSON.stringify(dsJson, null, 2)}</pre>
</body></html>`;
      res.setHeader("Content-Type","text/html; charset=utf-8");
      //console.log("Debug Redsys:", html);
      return res.status(200).send(html);
    }

    // --- HTML auto-submit por defecto ---
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