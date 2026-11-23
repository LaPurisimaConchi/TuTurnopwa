// api/_correoReserva.js
// Correo de confirmación cuando una persona reserva un taller o compra un bono o una tarjeta regalo.
// Se envía con Resend (API REST, sin dependencias). Variables de entorno:
//   RESEND_API_KEY         clave de Resend. Sin ella no se envía nada (solo se avisa en el log)
//   CORREO_REMITENTE       p. ej. "La Purísima Conchi <reservas@tudominio.es>" (dominio verificado en Resend)
//   CORREO_COPIA_ADMIN     (opcional) email del estudio que recibe copia oculta de cada reserva
//   CORREO_RESPONDER_A     (opcional) dirección a la que responde el cliente
//   CORREO_URL_BASE        (opcional) web pública para el logo y el enlace al perfil; si falta se usa la de Vercel
// Enviar el correo nunca debe romper el pago ni la reserva: todo error se registra y se traga.
import { adminAuth, adminDb } from "./_firebaseAdmin.js";
import { asegurarCodigo, formatearCodigo } from "./_codigosReserva.js";
import { horasAntelacionDe } from "../src/utils/cambioFecha.js";
import { normalizarConfigEspacio } from "../src/utils/configEspacio.js";
import { listarPlantillas, PLANTILLAS_POR_DEFECTO } from "../src/utils/plantillasTarjetaRegalo.js";

export const REMITENTE_POR_DEFECTO = "La Purísima Conchi <onboarding@resend.dev>";

export const COLOR_MARCA = "#c2410c";
export const EMAIL_ESTUDIO = "lapurisimaconchioficial@gmail.com";

export function urlBase() {
  const manual = String(process.env.CORREO_URL_BASE || "").trim();
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "";
  const base = manual || (vercel ? `https://${vercel}` : "");
  return base.replace(/\/+$/, "");
}

export const escapar = (valor) =>
  String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function formatearFecha(fecha) {
  const [anio, mes, dia] = String(fecha || "").split("-").map(Number);
  if (!anio || !mes || !dia) return String(fecha || "");
  const texto = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, mes - 1, dia)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const formatearImporte = (valor) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    Number(valor) || 0
  );

// Nombre y email de quien reserva: perfil en la base de datos y, si no, la cuenta de Auth
async function datosDelCliente(uid) {
  if (!uid) return { nombre: "", email: "" };

  let perfil = {};
  try {
    const snap = await adminDb.ref(`usuarios/${uid}`).get();
    perfil = snap.exists() ? snap.val() || {} : {};
  } catch (error) {
    console.warn("Correo reserva: no se pudo leer el perfil:", error.message);
  }

  let email = String(perfil.email || "").trim();
  let nombre = String(perfil.nombre || "").trim();

  if (!email || !nombre) {
    try {
      const cuenta = await adminAuth.getUser(uid);
      email = email || cuenta.email || "";
      nombre = nombre || cuenta.displayName || "";
    } catch {
      // La cuenta de invitado puede no existir ya; no pasa nada
    }
  }

  return { nombre, email };
}

// Filas, título y asunto según lo que se ha comprado. El código de reserva (número
// de pedido) sale siempre: es con lo que el estudio localiza la compra.
function contenidoPorTipo(tipo, datos) {
  // Con tarjeta regalo no se enseña ningún precio en reservas ni bonos
  const importe = datos.desdeTarjeta
    ? ""
    : formatearImporte(
        datos.precioTotal ?? datos.precio ?? datos.precioUnitario ?? 0
      );
  const codigoReserva = ["Código de reserva", formatearCodigo(datos.codigoReserva) || datos.orderId];

  if (tipo === "bono") {
    const sesiones = Number(datos.numeroClases || 0);
    return {
      asunto: `Bono confirmado: ${datos.clase || "Bono"}`,
      titulo: "¡Bono confirmado!",
      intro: "hemos recibido la compra de tu bono en La Purísima Conchi. Estos son los datos:",
      filas: [
        ["Bono", datos.clase || "Bono"],
        ["Tipo", datos.subtipo],
        ["Clases incluidas", sesiones ? String(sesiones) : ""],
        ["Primera sesión", datos.fechaInicio ? formatearFecha(datos.fechaInicio) : ""],
        ["Horario", datos.turnoHabitual || datos.turno],
        ["Válido hasta", datos.fechaCaducidadBono ? formatearFecha(datos.fechaCaducidadBono) : ""],
        ["Importe", importe],
        codigoReserva,
      ],
      nota: "Las demás clases de tu bono las reservas desde tu perfil en la app.",
    };
  }

  if (tipo === "tarjeta_regalo") {
    const plazas = Number(datos.plazas || 1);
    return {
      asunto: `Tarjeta regalo confirmada: ${datos.clase || "Tarjeta regalo"}`,
      titulo: "¡Tarjeta regalo confirmada!",
      intro: "hemos recibido la compra de tu tarjeta regalo. Estos son los datos:",
      filas: [
        ["Código de la tarjeta", datos.codigo],
        ["Regalo", datos.clase + (datos.subtipo ? ` · ${datos.subtipo}` : "")],
        ["Plazas", String(plazas)],
        ["Válida hasta", datos.fechaCaducidad ? formatearFecha(datos.fechaCaducidad) : ""],
        ["Para", datos.nombreDestinatario],
        ["Mensaje", datos.mensajePersonalizado],
        ["Importe", importe],
        codigoReserva,
      ],
      nota: `${datos.pdfs?.length ? "Descarga la tarjeta en PDF con los botones de abajo, imprímela y escribe a mano el código. " : ""}Quien reciba la tarjeta solo tiene que canjear el código de la tarjeta en «Gestionar reserva» (pestaña «Canjear tarjeta regalo») para reservar su plaza.`,
      enlace: { ruta: "/gestionar-reserva?tab=tarjeta", texto: "Canjear tarjeta regalo" },
    };
  }

  const detalle = datos.nombreTipoClase || datos.nombreTipoPieza || "";
  const taller = datos.clase || "Taller";
  return {
    asunto: `Reserva confirmada: ${taller}`,
    titulo: "¡Reserva confirmada!",
    intro: "hemos recibido tu reserva en La Purísima Conchi. Estos son los datos:",
    filas: [
      ["Taller", taller + (detalle ? ` · ${detalle}` : "")],
      ...(Array.isArray(datos.fechasEdicion) && datos.fechasEdicion.length > 1
        ? datos.fechasEdicion.map((d, i) => [
            `Sesión ${i + 1}`,
            `${formatearFecha(d.fecha)} · ${d.turno}`,
          ])
        : [
            ["Fecha", formatearFecha(datos.fecha)],
            ["Horario", datos.turno],
          ]),
      ["Plazas", String(Number(datos.plazas || 1))],
      ["Importe", importe],
      codigoReserva,
    ],
    nota: `Si necesitas cambiar la fecha de tu reserva, entra en «Gestionar reserva» e introduce tu código de reserva y el email con el que reservaste (con al menos ${datos.horasAntelacion ?? 24} horas de antelación). No hace falta iniciar sesión.`,
    enlace: { ruta: "/gestionar-reserva", texto: "Cambiar la fecha" },
  };
}

// Código de reserva corto (K7M3-9QXP, api/_codigosReserva.js). Las reservas de talleres
// ya lo traen; los bonos y las tarjetas regalo se lo asignan aquí. El del bono lleva a
// su primera sesión (mismo pedido) y el de la tarjeta solo identifica la compra.
async function codigoDeLaCompra({ tipo, reserva, orderId, uid }) {
  if (reserva.codigoReserva) return String(reserva.codigoReserva);

  try {
    if (tipo === "reserva") {
      // Un grupo ya pagado de una vez guarda su código por el id del grupo
      const claves = [orderId, ...(reserva.id ? [`grupo_${reserva.id}`] : [])];
      for (const clave of claves) {
        const previo = await adminDb.ref(`codigosPorPedido/${clave}`).get();
        if (previo.exists()) return String(previo.val());
      }
    }

    return await asegurarCodigo(adminDb, {
      clave: orderId,
      datos: {
        tipo: tipo === "tarjeta_regalo" ? "tarjeta_regalo" : "individual",
        orderId,
        uid: uid || reserva.uid || "",
      },
    });
  } catch (error) {
    console.error("Correo reserva: no se pudo obtener el código de reserva:", error);
    return "";
  }
}

export function construirCorreo({ tipo = "reserva", datos, nombre }) {
  const horasAntelacion = Number.isFinite(Number(datos.horasAntelacion)) ? Number(datos.horasAntelacion) : 24;
  const { asunto, titulo, intro, filas: todas, nota, enlace } = contenidoPorTipo(tipo, datos);
  const filas = todas.filter(([, valor]) => valor);

  const saludo = nombre ? `Hola ${nombre.split(" ")[0]},` : "Hola,";

  const base = urlBase();
  const logo = base
    ? `<img src="${escapar(base)}/img/logoPCsin.png" alt="La Purísima Conchi" height="64" style="display:block;margin:0 auto 16px;height:64px;width:auto;">`
    : `<div style="text-align:center;font-size:18px;font-weight:bold;color:${COLOR_MARCA};margin-bottom:16px;">La Purísima Conchi</div>`;
  // Botones de PDF en horizontal (inline-block con margen: se apilan solos en pantallas estrechas)
  const botonesPdf = (datos.pdfs || []).length
    ? `<p style="text-align:center;margin:16px 0 0;">${datos.pdfs
        .map(
          (pdf) =>
            `<a href="${escapar(pdf.url)}" style="display:inline-block;background:#ffffff;color:${COLOR_MARCA};text-decoration:none;padding:11px 22px;margin:4px;border:2px solid ${COLOR_MARCA};border-radius:999px;font-size:15px;font-weight:bold;">${escapar(pdf.nombre)}</a>`
        )
        .join("")}</p>`
    : "";
  const destino = enlace || { ruta: "/perfil", texto: "Ver mis reservas" };
  const botonPerfil = base
    ? `<p style="text-align:center;margin:24px 0 0;"><a href="${escapar(base)}${destino.ruta}" style="display:inline-block;background:${COLOR_MARCA};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:15px;font-weight:bold;">${escapar(destino.texto)}</a></p>`
    : "";

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#fffef4;font-family:Arial,Helvetica,sans-serif;color:#2d2a26;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #f1e7d8;border-radius:12px;padding:28px;">
      <tr><td>
        ${logo}
        <h1 style="margin:0 0 12px;font-size:22px;text-align:center;color:${COLOR_MARCA};">${escapar(titulo)}</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${escapar(saludo)} ${escapar(intro)}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:15px;border-top:1px solid #eee;">
          ${filas
            .map(
              ([etiqueta, valor]) =>
                `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#7a736a;width:38%;">${escapar(etiqueta)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:bold;">${escapar(valor)}</td></tr>`
            )
            .join("")}
        </table>
        ${nota ? `<p style="margin:16px 0 0;font-size:14px;line-height:1.5;">${escapar(nota)}</p>` : ""}
        ${botonesPdf}
        ${botonPerfil}
        <div style="margin-top:24px;padding:14px 16px;background:#fff7ed;border-radius:8px;font-size:13px;line-height:1.5;">
          <strong style="color:${COLOR_MARCA};">Cambios y cancelaciones</strong><br>
          No se realizan devoluciones de dinero. Si no puedes venir, puedes reprogramar tu clase avisando con al menos <strong>${horasAntelacion} horas de antelación</strong> o ceder tu plaza a otra persona sin coste.
        </div>
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
    ...filas.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`),
    ...(nota ? ["", nota] : []),
    ...(datos.pdfs || []).map((pdf) => `\nDescargar PDF (${pdf.nombre}): ${pdf.url}`),
    "",
    `Cambios y cancelaciones: no se realizan devoluciones. Puedes reprogramar avisando con al menos ${horasAntelacion} horas de antelación o ceder tu plaza sin coste.`,
    "",
    "La Purísima Conchi · C/ Israel, local 5, 14009 Córdoba",
    `+34 644 67 16 64 · ${EMAIL_ESTUDIO}`,
  ].join("\n");

  return { asunto, html, texto };
}

// PDF de tarjeta regalo que enlaza el correo de compra: los marcados «Adjuntar al correo» en el
// panel (plantillasTarjetaRegalo) llevan a /tarjeta-regalo-pdf/{id}; sin ninguno gestionado, se
// enlazan los PDF por defecto de /public. Nunca lanza: si algo falla, el correo sale sin botones.
const MAX_ENLACES_PDF = 4;

async function enlacesPdfTarjetaRegalo() {
  const base = urlBase();
  if (!base) return [];
  try {
    const metaSnap = await adminDb.ref("plantillasTarjetaRegalo").get();
    if (metaSnap.exists()) {
      return listarPlantillas(metaSnap.val())
        .filter((p) => p.enCorreo)
        .slice(0, MAX_ENLACES_PDF)
        .map((p) => ({ nombre: p.nombre, url: `${base}/tarjeta-regalo-pdf/${encodeURIComponent(p.id)}` }));
    }
    return PLANTILLAS_POR_DEFECTO.filter((p) => p.enCorreo).map((p) => ({
      nombre: p.nombre,
      url: `${base}${encodeURI(p.url)}`,
    }));
  } catch (error) {
    console.error("Correo reserva: no se pudieron preparar los PDF de la tarjeta regalo:", error);
    return [];
  }
}

/**
 * Envía el correo de confirmación de una reserva, una sola vez por pedido.
 * Devuelve true si se envió. No lanza nunca.
 */
export async function enviarCorreoReserva({ reserva, uid, orderId, tipo = "reserva" }) {
  try {
    const clave = String(process.env.RESEND_API_KEY || "").trim();
    if (!clave) {
      console.warn("Correo reserva: falta RESEND_API_KEY, no se envía.", { orderId });
      return false;
    }
    if (!reserva || !orderId) return false;

    // Reclama el envío antes de mandarlo: si Redsys repite el aviso, no se duplica
    const marca = adminDb.ref(`correosEnviados/${orderId}`);
    const reclamo = await marca.transaction((actual) =>
      actual ? undefined : { estado: "enviando", iniciadoEn: new Date().toISOString() }
    );
    if (!reclamo.committed) return false;

    const { nombre, email } = await datosDelCliente(uid || reserva.uid);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      console.warn("Correo reserva: la persona no tiene email.", { orderId });
      await marca.remove();
      return false;
    }

    const codigoReserva = await codigoDeLaCompra({ tipo, reserva, orderId, uid });

    const espacio = await adminDb.ref("configuracionEspacio").get();
    const horasAntelacion = horasAntelacionDe(
      { ...reserva, desdeBono: reserva.desdeBono || tipo === "bono" },
      normalizarConfigEspacio(espacio.exists() ? espacio.val() : null)
    );

    const pdfs = tipo === "tarjeta_regalo" ? await enlacesPdfTarjetaRegalo() : [];

    const { asunto, html, texto } = construirCorreo({
      tipo,
      datos: { ...reserva, orderId, codigoReserva, horasAntelacion, pdfs },
      nombre,
    });

    const copia = String(process.env.CORREO_COPIA_ADMIN || "").trim();
    const responderA = String(process.env.CORREO_RESPONDER_A || "").trim();

    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: String(process.env.CORREO_REMITENTE || "").trim() || REMITENTE_POR_DEFECTO,
        to: [email],
        ...(copia ? { bcc: [copia] } : {}),
        ...(responderA ? { reply_to: responderA } : {}),
        subject: asunto,
        html,
        text: texto,
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => "");
      console.error("Correo reserva: Resend rechazó el envío:", respuesta.status, detalle);
      // Se libera la marca para que un reintento (p. ej. otro aviso de Redsys) pueda volver a probar
      await marca.remove();
      return false;
    }

    await marca.set({ estado: "enviado", enviadoEn: new Date().toISOString(), email });
    return true;
  } catch (error) {
    console.error("Correo reserva: error inesperado:", error);
    return false;
  }
}

// --- Cancelación por el estudio -----------------------------------------------
// Correo que avisa de que el estudio ha cancelado una reserva, con el motivo y el
// código para volver a reservar sin coste (api/cambiar-fecha.js la recupera).
// Con cuenta, el botón lleva al perfil; sin cuenta, a «Gestionar reserva».
const COLOR_TERRACOTA = "#b36a4a";

export function construirCorreoCancelacion({ datos, nombre, motivo, codigo, hasta, conCuenta, conReprogramacion = true }) {
  const saludo = nombre ? `Hola ${nombre.split(" ")[0]},` : "Hola,";
  const titulo = "Hemos cancelado tu reserva";
  const intro = conReprogramacion
    ? "lamentamos informarte de que hemos tenido que cancelar tu reserva. No pierdes tu plaza: puedes volver a reservar con tu código, sin coste."
    : "lamentamos informarte de que hemos tenido que cancelar tu reserva. Si tienes cualquier duda, escríbenos y te ayudamos.";

  const filas = [
    ["Taller", datos.clase || ""],
    ["Fecha cancelada", datos.fecha ? formatearFecha(datos.fecha) : ""],
    ["Turno", datos.turno || ""],
    ["Plazas", datos.plazas ? String(datos.plazas) : ""],
  ].filter(([, valor]) => valor);

  const codigoTexto = formatearCodigo(codigo);
  const limite = hasta ? formatearFecha(hasta).replace(/^\S+,\s*/, "") : "";
  const nota = !conReprogramacion
    ? ""
    : conCuenta
    ? `Entra en tu perfil, en «Mis reservas», y pulsa «Elegir nueva fecha». ${limite ? `Puedes volver a reservar hasta el ${limite}.` : ""}`
    : `Para elegir una nueva fecha, entra en «Gestionar reserva» e introduce este código y el email con el que reservaste. No hace falta iniciar sesión. ${limite ? `Puedes volver a reservar hasta el ${limite}.` : ""}`;
  const enlace = !conReprogramacion
    ? null
    : conCuenta
    ? { ruta: "/perfil", texto: "Ver mi reserva" }
    : { ruta: "/gestionar-reserva", texto: "Elegir nueva fecha" };

  const base = urlBase();
  const logo = base
    ? `<img src="${escapar(base)}/img/logoPCsin.png" alt="La Purísima Conchi" height="64" style="display:block;margin:0 auto 16px;height:64px;width:auto;">`
    : `<div style="text-align:center;font-size:18px;font-weight:bold;color:${COLOR_TERRACOTA};margin-bottom:16px;">La Purísima Conchi</div>`;
  const boton = base && enlace
    ? `<p style="text-align:center;margin:20px 0 0;"><a href="${escapar(base)}${enlace.ruta}" style="display:inline-block;background:${COLOR_TERRACOTA};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:15px;font-weight:bold;">${escapar(enlace.texto)}</a></p>`
    : "";
  const bloqueMotivo = motivo
    ? `<div style="background:#f6efe6;border-radius:8px;padding:12px 14px;font-size:14px;line-height:1.5;margin:0 0 16px;"><span style="display:block;color:#7a6858;font-size:12px;margin-bottom:2px;">Motivo de la cancelación</span>${escapar(motivo)}</div>`
    : "";

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:24px;background:#fdfaf5;font-family:Arial,Helvetica,sans-serif;color:#2d2a26;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #eadfd2;border-radius:12px;padding:28px;">
      <tr><td>
        ${logo}
        <h1 style="margin:0 0 12px;font-size:22px;text-align:center;color:${COLOR_TERRACOTA};">${titulo}</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${escapar(saludo)} ${escapar(intro)}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:15px;border-top:1px solid #eee;margin-bottom:16px;">
          ${filas
            .map(
              ([etiqueta, valor]) =>
                `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#7a736a;width:38%;">${escapar(etiqueta)}</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:bold;">${escapar(valor)}</td></tr>`
            )
            .join("")}
        </table>
        ${bloqueMotivo}
        ${
          conReprogramacion
            ? `<div style="background:#f9ece6;border:1px dashed ${COLOR_TERRACOTA};border-radius:10px;padding:14px;text-align:center;margin:0 0 14px;">
          <span style="display:block;font-size:12px;color:#7a6858;">Tu código de reserva (guárdalo)</span>
          <strong style="display:block;font-size:26px;letter-spacing:3px;color:#9a5638;margin-top:4px;font-family:monospace;">${escapar(codigoTexto)}</strong>
        </div>
        <p style="margin:0;font-size:14px;line-height:1.5;color:#5b4f45;">${escapar(nota.trim())}</p>`
            : ""
        }
        ${boton}
        <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#7a736a;text-align:center;">
          La Purísima Conchi · C/ Israel, local 5, 14009 Córdoba<br>
          +34 644 67 16 64 · <a href="mailto:${EMAIL_ESTUDIO}" style="color:${COLOR_TERRACOTA};">${EMAIL_ESTUDIO}</a>
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
    ...filas.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`),
    ...(motivo ? ["", `Motivo de la cancelación: ${motivo}`] : []),
    ...(conReprogramacion ? ["", `Tu código de reserva: ${codigoTexto}`, nota.trim()] : []),
    "",
    "La Purísima Conchi · C/ Israel, local 5, 14009 Córdoba",
    `+34 644 67 16 64 · ${EMAIL_ESTUDIO}`,
  ].join("\n");

  return { asunto: `Hemos cancelado tu reserva${datos.clase ? ` · ${datos.clase}` : ""}`, html, texto };
}

/**
 * Envía el aviso de cancelación. Devuelve { estado, email }:
 *   "enviado" | "sin_clave" (falta RESEND_API_KEY) | "sin_email" | "rechazado" | "error"
 * No lanza nunca.
 */
export async function enviarCorreoCancelacion({ reserva, orderId, motivo, codigo, hasta, conReprogramacion = true }) {
  try {
    const clave = String(process.env.RESEND_API_KEY || "").trim();
    if (!clave) {
      console.warn("Correo cancelación: falta RESEND_API_KEY, no se envía.", { orderId });
      return { estado: "sin_clave", email: "" };
    }

    const { nombre, email: emailPerfil } = await datosDelCliente(reserva.uid);
    const email = emailPerfil || String(reserva.email || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      console.warn("Correo cancelación: la persona no tiene email.", { orderId });
      return { estado: "sin_email", email: "" };
    }

    // Con cuenta propia (no invitado anónimo) el botón lleva al perfil
    let conCuenta = false;
    try {
      const cuenta = await adminAuth.getUser(reserva.uid);
      conCuenta = cuenta.providerData.length > 0;
    } catch {
      conCuenta = false;
    }

    const { asunto, html, texto } = construirCorreoCancelacion({
      datos: reserva,
      nombre,
      motivo,
      codigo,
      hasta,
      conCuenta,
      conReprogramacion,
    });

    const copia = String(process.env.CORREO_COPIA_ADMIN || "").trim();
    const responderA = String(process.env.CORREO_RESPONDER_A || "").trim();

    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: String(process.env.CORREO_REMITENTE || "").trim() || REMITENTE_POR_DEFECTO,
        to: [email],
        ...(copia ? { bcc: [copia] } : {}),
        ...(responderA ? { reply_to: responderA } : {}),
        subject: asunto,
        html,
        text: texto,
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text().catch(() => "");
      console.error("Correo cancelación: Resend rechazó el envío:", respuesta.status, detalle);
      return { estado: "rechazado", email };
    }

    return { estado: "enviado", email };
  } catch (error) {
    console.error("Correo cancelación: error inesperado:", error);
    return { estado: "error", email: "" };
  }
}
