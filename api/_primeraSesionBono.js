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

// `rutas` (Set): las reservas que apuntó el servidor al preparar el pago; solo se
// confirma la de ahí. Sin `rutas` (pedidos de antes) se busca por número de pedido.
export async function confirmarPrimeraSesionBono({ orderId, uid, paidAt, rutas = null, db = adminDb }) {
  let hallada = null;
  if (rutas) {
    const ruta = [...rutas][0];
    const snap = ruta ? await db.ref(ruta).get() : null;
    const reserva = snap?.exists() ? snap.val() : null;
    if (reserva && String(reserva.orderId || "") === String(orderId) && reserva.desdeBono) {
      hallada = { ruta, reserva };
    }
  } else {
    const snapshot = await db.ref("reservas").get();
    hallada = buscarReserva(snapshot.val(), String(orderId));
  }
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
