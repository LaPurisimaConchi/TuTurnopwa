// api/_correoVerificacion.js
// Correo para confirmar el email de una cuenta nueva, con el mismo estilo que los de
// reserva (api/_correoReserva.js) y enviado con Resend. El enlace lo genera
// firebase-admin: al abrirlo Firebase marca el email como verificado y vuelve a /login.
// Variables de entorno: las mismas que el correo de reserva (RESEND_API_KEY, CORREO_REMITENTE…).
import { adminAuth, adminDb } from "./_firebaseAdmin.js";
import { consumirIntento, hash } from "./_limiteIntentos.js";
import {
  COLOR_MARCA,
  EMAIL_ESTUDIO,
  REMITENTE_POR_DEFECTO,
  escapar,
  urlBase,
} from "./_correoReserva.js";

const CONTENIDO = {
  verificacion: {
    asunto: "Confirma tu correo en La Purísima Conchi",
    titulo: "Confirma tu correo",
    intro:
      "gracias por crear tu cuenta en La Purísima Conchi. Pulsa el botón para confirmar tu correo y activarla.",
    boton: "Confirmar mi correo",
    aviso: "Si no has creado tú esta cuenta, puedes ignorar este correo.",
  },
  restablecer: {
    asunto: "Restablece tu contraseña de La Purísima Conchi",
    titulo: "Restablece tu contraseña",
    intro:
      "hemos recibido una solicitud para cambiar la contraseña de tu cuenta. Pulsa el botón para elegir una nueva.",
    boton: "Cambiar mi contraseña",
    aviso:
      "Si no lo has pedido tú, puedes ignorar este correo: tu contraseña no cambiará. El enlace caduca en una hora.",
  },
};

export function construirCorreoVerificacion({ nombre, enlace }) {
  return construirCorreoAccion({ tipo: "verificacion", nombre, enlace });
}

export function construirCorreoAccion({ tipo, nombre, enlace }) {
  const { asunto, titulo, intro, boton, aviso } = CONTENIDO[tipo];
  const saludo = nombre ? `Hola ${nombre.split(" ")[0]},` : "Hola,";

  const base = urlBase();
  const logo = base
    ? `<img src="${escapar(base)}/img/logoPCsin.png" alt="La Purísima Conchi" height="64" style="display:block;margin:0 auto 16px;height:64px;width:auto;">`
    : `<div style="text-align:center;font-size:18px;font-weight:bold;color:${COLOR_MARCA};margin-bottom:16px;">La Purísima Conchi</div>`;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#fffef4;font-family:Arial,Helvetica,sans-serif;color:#2d2a26;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #f1e7d8;border-radius:12px;padding:28px;">
      <tr><td>
        ${logo}
        <h1 style="margin:0 0 12px;font-size:22px;text-align:center;color:${COLOR_MARCA};">${titulo}</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${escapar(saludo)} ${escapar(intro)}</p>
        <p style="text-align:center;margin:24px 0;"><a href="${escapar(enlace)}" style="display:inline-block;background:${COLOR_MARCA};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:15px;font-weight:bold;">${escapar(boton)}</a></p>
        <p style="margin:0;font-size:13px;line-height:1.5;color:#7a736a;">${escapar(aviso)}</p>
        <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#7a736a;text-align:center;">
          La Purísima Conchi · C/ Israel, local 5, 14009 Córdoba<br>
          +34 644 67 16 64 · <a href="mailto:${EMAIL_ESTUDIO}" style="color:${COLOR_MARCA};">${EMAIL_ESTUDIO}</a>
        </p>
      </td></tr>
    </table>
  </body>
</html>`;

  const texto = [
    titulo,
    "",
    `${saludo} ${intro}`,
    "",
    enlace,
    "",
    aviso,
    "",
    "La Purísima Conchi · C/ Israel, local 5, 14009 Córdoba",
    `+34 644 67 16 64 · ${EMAIL_ESTUDIO}`,
  ].join("\n");

  return { asunto, html, texto };
}

// Envío con Resend. Devuelve true si Resend lo acepta.
async function enviarConResend({ clave, para, asunto, html, texto }) {
  const responderA = String(process.env.CORREO_RESPONDER_A || "").trim();
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: String(process.env.CORREO_REMITENTE || "").trim() || REMITENTE_POR_DEFECTO,
      to: [para],
      ...(responderA ? { reply_to: responderA } : {}),
      subject: asunto,
      html,
      text: texto,
    }),
  });
  if (!respuesta.ok) {
    console.error("Correo de cuenta: Resend rechazó el envío:", respuesta.status, await respuesta.text().catch(() => ""));
    return false;
  }
  return true;
}

// El enlace lleva a nuestra página (src/AccionCuenta.jsx), no a la de Firebase en inglés:
// solo se aprovecha el código del enlace que genera firebase-admin. Se pide con la
// redirección (así funciona si el dominio está autorizado) y, si Firebase la rechaza,
// sin ella; el código vale igual.
async function enlaceDeAccion(generar, modo, web) {
  let enlaceFirebase;
  try {
    enlaceFirebase = await generar(web ? { url: `${web}/login` } : undefined);
  } catch (error) {
    console.warn("Correo de cuenta: enlace con redirección fallido:", error.message);
    enlaceFirebase = await generar(undefined);
  }
  const oobCode = new URL(enlaceFirebase).searchParams.get("oobCode");
  if (!oobCode) return "";
  return `${web}/auth/accion?mode=${modo}&oobCode=${encodeURIComponent(oobCode)}`;
}

/**
 * Envía el correo de confirmación a la cuenta `uid`. `origen` es la web desde la que se pide
 * (https://dominio), para que el enlace vuelva a ella: en staging debe ir a staging.
 * Devuelve { status, ok, error? }. Máximo 5 envíos por hora y cuenta.
 */
export async function enviarCorreoVerificacion(uid, { origen = "" } = {}) {
  const clave = String(process.env.RESEND_API_KEY || "").trim();
  if (!clave) return { status: 503, ok: false, error: "Correo no configurado" };

  const cuenta = await adminAuth.getUser(uid);
  if (!cuenta.email || cuenta.emailVerified) {
    return { status: 200, ok: true, yaVerificado: !!cuenta.emailVerified };
  }

  if (!(await consumirIntento(adminDb, "limitesVerificacionEmail", uid, 5, 60 * 60_000))) {
    return { status: 429, ok: false, error: "Demasiados envíos. Espera un rato e inténtalo de nuevo." };
  }

  const web = origen || urlBase();
  const enlace = await enlaceDeAccion(
    (opciones) => adminAuth.generateEmailVerificationLink(cuenta.email, opciones),
    "verifyEmail",
    web
  );
  if (!enlace) return { status: 502, ok: false, error: "No se pudo generar el enlace" };

  const { asunto, html, texto } = construirCorreoVerificacion({
    nombre: cuenta.displayName || "",
    enlace,
  });
  if (!(await enviarConResend({ clave, para: cuenta.email, asunto, html, texto }))) {
    return { status: 502, ok: false, error: "No se pudo enviar el correo" };
  }
  return { status: 200, ok: true };
}

/**
 * Correo de «¿Has olvidado tu contraseña?». No hay sesión: quien lo pide puede no tener
 * cuenta, y la respuesta es siempre la misma para no revelar qué correos están registrados.
 * Límites: 10 peticiones por hora y por IP, y 3 correos por hora y por cuenta.
 */
export async function enviarCorreoRestablecer(email, { origen = "", ip = "" } = {}) {
  const clave = String(process.env.RESEND_API_KEY || "").trim();
  if (!clave) return { status: 503, ok: false, error: "Correo no configurado" };

  const correo = String(email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(correo) || correo.length > 254) {
    return { status: 400, ok: false, error: "Correo no válido" };
  }

  const NODO = "limitesRestablecerContrasena";
  if (!(await consumirIntento(adminDb, NODO, `ip_${hash(ip)}`, 10, 60 * 60_000))) {
    return { status: 429, ok: false, error: "Demasiados intentos. Espera un rato e inténtalo de nuevo." };
  }

  let cuenta;
  try {
    cuenta = await adminAuth.getUserByEmail(correo);
  } catch (error) {
    if (error?.code !== "auth/user-not-found") throw error;
    return { status: 200, ok: true }; // no se revela que no existe
  }
  if (!(await consumirIntento(adminDb, NODO, `correo_${hash(correo)}`, 3, 60 * 60_000))) {
    return { status: 200, ok: true }; // ya se envió hace poco
  }

  const web = origen || urlBase();
  const enlace = await enlaceDeAccion(
    (opciones) => adminAuth.generatePasswordResetLink(correo, opciones),
    "resetPassword",
    web
  );
  if (!enlace) return { status: 502, ok: false, error: "No se pudo generar el enlace" };

  const { asunto, html, texto } = construirCorreoAccion({
    tipo: "restablecer",
    nombre: cuenta.displayName || "",
    enlace,
  });
  if (!(await enviarConResend({ clave, para: correo, asunto, html, texto }))) {
    return { status: 502, ok: false, error: "No se pudo enviar el correo" };
  }
  return { status: 200, ok: true };
}
