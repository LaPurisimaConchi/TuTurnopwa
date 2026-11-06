// api/_primeraSesionBono.js
// Al pagar un bono se confirma la reserva de su primera sesión. La pantalla de
// compra la deja pendiente en reservas/… con el mismo orderId que el pedido y la
// marca desdeBono. Es idempotente (Redsys puede repetir el aviso) y, si no hay
// reserva (pedidos hechos antes de existir), no hace nada.
import { adminDb } from "./_firebaseAdmin.js";

function buscarReserva(nodo, orderId, ruta = "reservas") {
  if (!nodo || typeof nodo !== "object") return null;

  for (const [clave, valor] of Object.entries(nodo)) {
    if (!valor || typeof valor !== "object") continue;

    const rutaHija = `${ruta}/${clave}`;
    if (valor.orderId === orderId && valor.desdeBono) {
      return { ruta: rutaHija, reserva: valor };
    }

    const hallada = buscarReserva(valor, orderId, rutaHija);
    if (hallada) return hallada;
  }

  return null;
}

export async function confirmarPrimeraSesionBono({ orderId, uid, paidAt, db = adminDb }) {
  const snapshot = await db.ref("reservas").get();
  const hallada = buscarReserva(snapshot.val(), String(orderId));
  if (!hallada) return null;

  const { ruta, reserva } = hallada;

  await db.ref(ruta).update({
    estado: "Confirmada",
    estadoPago: "pagado",
    procesado: true,
    webhookRecibidoEn: paidAt,
    actualizadoEn: paidAt,
    pagadoEn: paidAt,
  });

  const propietario = uid || reserva.uid;
  if (propietario) {
    const lista = db.ref(`usuarios/${propietario}/listaReservas`);
    const enPerfil = await lista.get();
    let existente = "";

    enPerfil.forEach((item) => {
      if (item.val()?.orderId === String(orderId)) existente = item.key;
    });

    if (existente) {
      await db.ref(`usuarios/${propietario}/listaReservas/${existente}`).update({
        estado: "Confirmada",
        estadoPago: "pagado",
        actualizadoEn: paidAt,
      });
    } else {
      await lista.push({
        ...reserva,
        uid: propietario,
        reservaId: ruta.split("/").pop(),
        estado: "Confirmada",
        estadoPago: "pagado",
        actualizadoEn: paidAt,
      });
    }
  }

  return { ruta, reserva };
}
