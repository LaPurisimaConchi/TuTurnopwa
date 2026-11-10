// api/correo-reserva.js
// Correo de confirmación de reservas y bonos que no pasan por Redsys (tarjeta regalo):
// la reserva ya queda confirmada en el navegador, así que éste avisa aquí.
import { adminAuth, adminDb } from "./_firebaseAdmin.js";
import { enviarCorreoReserva } from "./_correoReserva.js";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Método no permitido.");

  try {
    const autorizacion = req.headers.authorization || "";
    const coincidencia = autorizacion.match(/^Bearer\s+(.+)$/i);
    if (!coincidencia) return res.status(401).send("Autenticación requerida.");

    const { uid } = await adminAuth.verifyIdToken(coincidencia[1]);

    const orderId = String(req.body?.orderId || "");
    if (!orderId) return res.status(400).send("Falta el identificador del pedido.");

    let reserva = null;
    let tipo = "reserva";

    // Un bono canjeado con tarjeta regalo lleva su primera sesión con el mismo
    // pedido: se avisa del bono, no de una reserva suelta
    const bonoSnap = await adminDb.ref(`usuarios/${uid}/bonos/${orderId}`).get();
    const bono = bonoSnap.exists() ? bonoSnap.val() : null;
    if (bono?.creadaDesde === "tarjeta_regalo" && bono.estadoPago === "pagado") {
      reserva = { ...bono, desdeTarjeta: true };
      tipo = "bono";
    }

    // Si no, una reserva de esta persona, ya confirmada y pagada con tarjeta regalo
    if (!reserva) {
      const lista = await adminDb.ref(`usuarios/${uid}/listaReservas`).get();
      lista.forEach((item) => {
        const valor = item.val();
        if (
          valor?.orderId === orderId &&
          valor.desdeTarjeta === true &&
          valor.estado === "Confirmada" &&
          valor.estadoPago === "pagado"
        ) {
          reserva = valor;
        }
      });
    }
    if (!reserva) return res.status(404).send("No se encontró la reserva.");

    const enviado = await enviarCorreoReserva({ reserva, uid, orderId, tipo });
    return res.status(200).json({ ok: true, enviado });
  } catch (error) {
    console.error("Error en correo-reserva:", error);
    return res.status(500).send("No se pudo enviar el correo.");
  }
}
