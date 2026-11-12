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

const REMITENTE_POR_DEFECTO = "La Purísima Conchi <onboarding@resend.dev>";

const COLOR_MARCA = "#c2410c";
const EMAIL_ESTUDIO = "lapurisimaconchioficial@gmail.com";

function urlBase() {
  const manual = String(process.env.CORREO_URL_BASE || "").trim();
  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "";
  const base = manual || (vercel ? `https://${vercel}` : "");
  return base.replace(/\/+$/, "");
}

const escapar = (valor) =>
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
        ["Para", datos.nombreDestinatario],
        ["Mensaje", datos.mensajePersonalizado],
        ["Importe", importe],
        codigoReserva,
      ],
      nota: "Quien reciba la tarjeta solo tiene que canjear el código de la tarjeta en la app para reservar su plaza.",
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
    nota: "Si necesitas cambiar la fecha de tu reserva, entra en «Gestionar reserva» e introduce tu código de reserva y el email con el que reservaste (con al menos 72 horas de antelación). No hace falta iniciar sesión.",
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
  const { asunto, titulo, intro, filas: todas, nota, enlace } = contenidoPorTipo(tipo, datos);
  const filas = todas.filter(([, valor]) => valor);

  const saludo = nombre ? `Hola ${nombre.split(" ")[0]},` : "Hola,";

  const base = urlBase();
  const logo = base
    ? `<img src="${escapar(base)}/img/logoPCsin.png" alt="La Purísima Conchi" height="64" style="display:block;margin:0 auto 16px;height:64px;width:auto;">`
    : `<div style="text-align:center;font-size:18px;font-weight:bold;color:${COLOR_MARCA};margin-bottom:16px;">La Purísima Conchi</div>`;
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
        ${botonPerfil}
        <div style="margin-top:24px;padding:14px 16px;background:#fff7ed;border-radius:8px;font-size:13px;line-height:1.5;">
          <strong style="color:${COLOR_MARCA};">Cambios y cancelaciones</strong><br>
          No se realizan devoluciones de dinero. Si no puedes venir, puedes reprogramar tu clase avisando con al menos <strong>72 horas de antelación</strong> o ceder tu plaza a otra persona sin coste.
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
    "",
    "Cambios y cancelaciones: no se realizan devoluciones. Puedes reprogramar avisando con al menos 72 horas de antelación o ceder tu plaza sin coste.",
    "",
    "La Purísima Conchi · C/ Israel, local 5, 14009 Córdoba",
    `+34 644 67 16 64 · ${EMAIL_ESTUDIO}`,
  ].join("\n");

  return { asunto, html, texto };
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

    const { asunto, html, texto } = construirCorreo({
      tipo,
      datos: { ...reserva, orderId, codigoReserva },
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
