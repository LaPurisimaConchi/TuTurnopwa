// api/_primeraSesionBono.js
// Al pagar un bono se confirma la reserva de su primera sesión. La pantalla de
// compra la deja pendiente en reservas/… con el mismo orderId que el pedido y la
// marca desdeBono. Es idempotente (Redsys puede repetir el aviso) y, si no hay
// reserva (pedidos hechos antes de existir), no hace nada.
import { adminDb } from "./_firebaseAdmin.js";
import { bonoSinSesion } from "../src/utils/estadoBono.js";

// La reserva de la primera sesión ya no existe (se borró al caducar la plaza antes de
// que llegara el pago): la clase vuelve al bono, para que no quede una sesión sin
// reserva, y una nota interna lo explica. Idempotente: si la sesión ya no está, no hace nada.
async function devolverPrimeraSesion(db, uid, orderId, ruta, paidAt) {
  const reservaId = String(ruta || "").split("/").pop();
  if (!uid || !reservaId) return;

  const bonoRef = db.ref(`usuarios/${uid}/bonos/${orderId}`);
  let devuelta = null;
  const resultado = await bonoRef.transaction((bono) => {
    if (bono === null) return bono; // primera pasada sin datos: Firebase repite con el valor real
    const sesiones = bono?.sesionesConsumidas || {};
    const clave = Object.keys(sesiones).find((k) => String(sesiones[k]?.reservaId || "") === reservaId);
    const nuevo = clave ? bonoSinSesion(bono, clave, paidAt) : null;
    if (!nuevo) return; // nada que devolver: no se escribe
    devuelta = sesiones[clave];
    return nuevo;
  });
  if (!resultado.committed || !devuelta) return;

  await bonoRef.child("notasInternas").push({
    texto: `La reserva de la primera sesión (${devuelta.fecha || "—"} · ${devuelta.turno || "—"}) ya no existía al confirmarse el pago: la clase ha vuelto al bono para reservarla desde el perfil.`,
    fecha: paidAt,
  });
  console.warn("Primera sesión de bono sin reserva: clase devuelta al bono", { orderId, ruta });
}

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
    } else if (ruta && !snap?.exists()) {
      await devolverPrimeraSesion(db, uid, String(orderId), ruta, paidAt);
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
