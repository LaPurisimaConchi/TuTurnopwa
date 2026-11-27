// api/_anularTarjeta.js
// Cancelar una tarjeta regalo desde el panel (no cuenta como función de Vercel: empieza
// por _; la llama api/codigo-reserva.js, tipo "cancelarTarjeta"). No se borra: queda
// marcada como cancelada para que no se pueda canjear y se conserve el pago. Si se
// pide, se avisa por correo a quien la compró.
import { enviarCorreoTarjetaCancelada } from "./_correoReserva.js";
import { RECLAMO_CADUCA_MS, tarjetaUsada } from "./_canjeServidor.js";

const ID = /^[A-Za-z0-9_-]{1,60}$/;

export async function cancelarTarjeta(
  db,
  { tarjetaId, enviarCorreo } = {},
  { enviar = enviarCorreoTarjetaCancelada } = {}
) {
  const id = String(tarjetaId || "");
  if (!ID.test(id)) return { status: 400, ok: false, error: "Tarjeta no válida" };

  const ahora = new Date().toISOString();
  let motivoRechazo = "";

  // Con transacción: no puede cruzarse con un canje que esté en marcha
  const { snapshot } = await db.ref(`tarjetasRegalo/${id}`).transaction((t) => {
    // Sin datos en caché: se devuelve tal cual y se repite con los del servidor
    if (t === null) return t;
    motivoRechazo = "";
    if (t.cancelada === true) return t;
    if (tarjetaUsada(t)) {
      motivoRechazo = "Esta tarjeta ya se ha canjeado: no se puede cancelar.";
      return;
    }
    if (t.reclamadaEn && Date.now() - Number(t.reclamadaEn) < RECLAMO_CADUCA_MS) {
      motivoRechazo = "Hay un canje de esta tarjeta en curso. Espera un par de minutos.";
      return;
    }
    return {
      ...t,
      cancelada: true,
      estadoCanje: "cancelada",
      canceladaEn: ahora,
      actualizadoEn: ahora,
      reclamadaEn: null,
      reclamadaPor: null,
    };
  });

  if (motivoRechazo) return { status: 409, ok: false, error: motivoRechazo };

  const tarjeta = snapshot.val();
  if (!tarjeta) return { status: 404, ok: false, error: "Tarjeta no encontrada" };

  // Copia en el perfil de quien la compró
  const uid = String(tarjeta.uidComprador || "");
  const actualizaciones = {};
  if (ID.test(uid)) {
    const copia = await db.ref(`usuarios/${uid}/tarjetasRegalo/${id}`).get();
    if (copia.exists()) {
      ["cancelada", "estadoCanje", "canceladaEn", "actualizadoEn"].forEach((campo) => {
        actualizaciones[`usuarios/${uid}/tarjetasRegalo/${id}/${campo}`] = tarjeta[campo];
      });
    }
  }

  let correo = { estado: "no_solicitado", email: "" };
  if (enviarCorreo) {
    correo = await enviar({ tarjeta, orderId: id });
    if (correo.estado === "enviado") {
      actualizaciones[`tarjetasRegalo/${id}/correoCancelacionEnviadoEn`] = new Date().toISOString();
    }
  }

  if (Object.keys(actualizaciones).length) await db.ref().update(actualizaciones);

  return { status: 200, ok: true, correo: correo.estado, email: correo.email };
}
