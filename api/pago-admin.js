import { adminAuth, adminDb } from "./_firebaseAdmin.js";
import { ADMIN_EMAILS } from "../src/utils/administradores.js";

export const config = { runtime: "nodejs" };

const timestamp = () => new Date().toISOString();

function findReservationUpdates(reservations, orderId, basePath = "reservas") {
  if (!reservations || typeof reservations !== "object") return null;

  for (const [key, value] of Object.entries(reservations)) {
    if (!value || typeof value !== "object") continue;

    const path = `${basePath}/${key}`;
    if (value.orderId === orderId) {
      return { path, reservation: value };
    }

    const match = findReservationUpdates(value, orderId, path);
    if (match) return match;
  }

  return null;
}

async function saveReservationToProfile(reservation, uid, orderId, paidAt) {
  if (!uid) return;

  const listRef = adminDb.ref(`usuarios/${uid}/listaReservas`);
  const listSnapshot = await listRef.get();
  let existingKey = null;

  listSnapshot.forEach((item) => {
    if (item.val()?.orderId === orderId) existingKey = item.key;
  });

  if (existingKey) {
    await adminDb.ref(`usuarios/${uid}/listaReservas/${existingKey}`).update({
      estado: "Confirmada",
      estadoPago: "pagado",
      actualizadoEn: paidAt,
    });
  } else {
    await listRef.push({
      clase: reservation.clase || "",
      claseId: reservation.claseId || "",
      fecha: reservation.fecha || "",
      turno: reservation.turno || "",
      metodo: reservation.metodo || "",
      plazas: Number(reservation.plazas || 1),
      precio: Number(reservation.precioTotal ?? reservation.precio ?? 0),
      precioUnitario: Number(reservation.precioUnitario ?? reservation.precio ?? 0),
      precioTotal: Number(reservation.precioTotal ?? reservation.precio ?? 0),
      estado: "Confirmada",
      estadoPago: "pagado",
      orderId,
      timestamp: reservation.timestamp || paidAt,
      actualizadoEn: paidAt,
      desdeTarjeta: !!reservation.desdeTarjeta,
      nombreTipoClase: reservation.nombreTipoClase || "",
      tipoClase: reservation.tipoClase || "",
    });

    const userRef = adminDb.ref(`usuarios/${uid}`);
    const userSnapshot = await userRef.get();
    if (userSnapshot.exists()) {
      await userRef.update({
        reservas: (Number(userSnapshot.val()?.reservas) || 0) + 1,
      });
    }
  }
}

async function confirmIndividualGroupPayment(pedido, paidAt) {
  const { grupoId, pagoIndividualId } = pedido;
  if (!grupoId || !pagoIndividualId) {
    throw new Error("El pedido de grupo no contiene sus identificadores.");
  }

  const grupoRef = adminDb.ref(`reservasGrupos/${grupoId}`);
  const pagoRef = adminDb.ref(
    `reservasGrupos/${grupoId}/pagosIndividuales/${pagoIndividualId}`
  );
  const [grupoSnapshot, pagoSnapshot] = await Promise.all([
    grupoRef.get(),
    pagoRef.get(),
  ]);
  if (!grupoSnapshot.exists() || !pagoSnapshot.exists()) {
    throw new Error("No se encontró el pago individual del grupo.");
  }

  const grupo = grupoSnapshot.val() || {};
  const pago = pagoSnapshot.val() || {};
  if (pago.estadoPago !== "pagado") {
    const plazasPagadas = Number(grupo.plazasPagadas || 0) + 1;
    const totalPagado = Number(grupo.totalPagado || 0) + Number(pago.importe || 0);
    const grupoCompleto = plazasPagadas >= Number(grupo.plazas || 0);

    await adminDb.ref().update({
      [`reservasGrupos/${grupoId}/pagosIndividuales/${pagoIndividualId}/estadoPago`]: "pagado",
      [`reservasGrupos/${grupoId}/pagosIndividuales/${pagoIndividualId}/pagadoEn`]: paidAt,
      [`reservasGrupos/${grupoId}/plazasPagadas`]: plazasPagadas,
      [`reservasGrupos/${grupoId}/plazasPendientes`]: Math.max(
        0,
        Number(grupo.plazas || 0) - plazasPagadas
      ),
      [`reservasGrupos/${grupoId}/totalPagado`]: totalPagado,
      [`reservasGrupos/${grupoId}/totalPendiente`]: Math.max(
        0,
        Number(grupo.precioTotal || 0) - totalPagado
      ),
      [`reservasGrupos/${grupoId}/actualizadoEn`]: paidAt,
      ...(grupoCompleto
        ? {
            [`reservasGrupos/${grupoId}/estado`]: "Confirmada",
            [`reservasGrupos/${grupoId}/estadoPago`]: "pagado",
            [`reservasGrupos/${grupoId}/pagadoEn`]: paidAt,
          }
        : {}),
    });
  }
}

async function confirmGiftCard(orderId, pedido, paidAt) {
  const tarjetaRef = adminDb.ref(`tarjetasRegalo/${orderId}`);
  const current = await tarjetaRef.get();
  if (current.exists()) return;

  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = `REGALO-${Array.from({ length: 6 }, () =>
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join("")}`;
  } while ((await adminDb.ref(`codigosTarjetaRegalo/${code}`).get()).exists());

  const tarjeta = {
    id: orderId,
    orderId,
    codigo: code,
    uidComprador: pedido.uid || "",
    tipo: "tarjeta_regalo",
    clase: pedido.clase || "Tarjeta regalo",
    claseId: pedido.claseId || "",
    subtipo: pedido.subtipo || "",
    precioTotal: Number(pedido.precioTotal || 0),
    precioOriginal: Number(pedido.precioOriginal || 0),
    plazas: Number(pedido.plazas || 1),
    numeroClases: Number(pedido.numeroClases || 0),
    estadoPago: "pagado",
    estadoCanje: "pendiente",
    procesado: true,
    fechaCompra: paidAt,
    creadoEn: pedido.creadoEn || paidAt,
    actualizadoEn: paidAt,
    desdeTarjeta: false,
    emailDestinatario: pedido.emailDestinatario || "",
    nombreDestinatario: pedido.nombreDestinatario || "",
    mensajePersonalizado: pedido.mensajePersonalizado || "",
  };

  const updates = {
    [`tarjetasRegalo/${orderId}`]: tarjeta,
    [`codigosTarjetaRegalo/${code}`]: orderId,
  };
  if (pedido.uid) updates[`usuarios/${pedido.uid}/tarjetasRegalo/${orderId}`] = tarjeta;
  await adminDb.ref().update(updates);
}

async function confirmGroupReservation(orderId, pedido, paidAt) {
  const groupSnapshot = await adminDb.ref("reservasGrupos").get();
  const match = findReservationUpdates(
    groupSnapshot.val(),
    orderId,
    "reservasGrupos"
  );
  if (!match) {
    throw new Error("No se encontró la reserva de grupo que corresponde al pedido.");
  }

  const confirmed = {
    ...match.reservation,
    estadoPago: "pagado",
    estado: "Confirmada",
    procesado: true,
    webhookRecibidoEn: paidAt,
    actualizadoEn: paidAt,
    pagadoEn: paidAt,
  };

  await adminDb.ref(match.path).update({
    estadoPago: confirmed.estadoPago,
    estado: confirmed.estado,
    procesado: confirmed.procesado,
    webhookRecibidoEn: confirmed.webhookRecibidoEn,
    actualizadoEn: confirmed.actualizadoEn,
    pagadoEn: confirmed.pagadoEn,
  });

  await saveReservationToProfile(
    confirmed,
    pedido.uid || confirmed.uid,
    orderId,
    paidAt
  );
}

async function confirmOrder(orderId, pedido) {
  const paidAt = timestamp();

  if (pedido.tipo === "pago_grupo_individual") {
    await confirmIndividualGroupPayment(pedido, paidAt);
  } else if (pedido.tipo === "grupo" || pedido.claseId === "reserva-grupo") {
    await confirmGroupReservation(orderId, pedido, paidAt);
  } else if (pedido.tipo === "tarjeta_regalo") {
    await confirmGiftCard(orderId, pedido, paidAt);
  } else if (pedido.esBono && pedido.datosBono) {
    const bonoRef = adminDb.ref(`usuarios/${pedido.uid}/bonos/${orderId}`);
    const bonoSnapshot = await bonoRef.get();
    if (!bonoSnapshot.exists()) {
      await bonoRef.set({
        bonoId: orderId,
        uid: pedido.uid,
        ...pedido.datosBono,
        orderId,
        estadoPago: "pagado",
        procesado: true,
        creadoEn: pedido.datosBono.creadoEn || pedido.creadoEn || paidAt,
        actualizadoEn: paidAt,
      });
    }
  } else {
    const reservationSnapshot = await adminDb.ref("reservas").get();
    const match = findReservationUpdates(reservationSnapshot.val(), orderId);
    if (!match) throw new Error("No se encontró la reserva que corresponde al pedido.");

    const confirmed = {
      ...match.reservation,
      estadoPago: "pagado",
      estado: "Confirmada",
      procesado: true,
      webhookRecibidoEn: paidAt,
      actualizadoEn: paidAt,
      pagadoEn: paidAt,
    };
    await adminDb.ref(match.path).update({
      estadoPago: confirmed.estadoPago,
      estado: confirmed.estado,
      procesado: confirmed.procesado,
      webhookRecibidoEn: confirmed.webhookRecibidoEn,
      actualizadoEn: confirmed.actualizadoEn,
      pagadoEn: confirmed.pagadoEn,
    });
    await saveReservationToProfile(confirmed, pedido.uid || confirmed.uid, orderId, paidAt);
  }

  await adminDb.ref(`pedidosPendientes/${orderId}`).update({
    estadoPago: "pagado",
    procesado: true,
    simuladoPorAdministrador: true,
    pagadoEn: paidAt,
    actualizadoEn: paidAt,
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Método no permitido.");

  try {
    const authorization = req.headers.authorization || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).send("Autenticación requerida.");

    const decodedToken = await adminAuth.verifyIdToken(match[1]);
    if (!ADMIN_EMAILS.includes(String(decodedToken.email || "").toLowerCase())) {
      return res.status(403).send("Solo los administradores pueden simular pagos.");
    }

    const orderId = String(req.body?.orderId || "");
    if (!orderId) return res.status(400).send("Falta el identificador del pedido.");

    const pedidoRef = adminDb.ref(`pedidosPendientes/${orderId}`);
    const pedidoSnapshot = await pedidoRef.get();
    if (!pedidoSnapshot.exists()) {
      return res.status(404).send("No se encontró el pedido pendiente.");
    }

    const pedido = pedidoSnapshot.val() || {};
    if (pedido.uid !== decodedToken.uid) {
      return res.status(403).send("El pedido no pertenece a este administrador.");
    }
    if (pedido.procesado === true && pedido.estadoPago === "pagado") {
      return res.status(200).json({ ok: true });
    }

    await confirmOrder(orderId, pedido);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error al simular el pago de administrador:", error);
    return res.status(500).send(error.message || "No se pudo confirmar el pago de prueba.");
  }
}
