// api/codigo-reserva.js
// Código de reserva de quien acaba de reservar: lo crea si aún no existe y lo
// devuelve para enseñárselo en pantalla (el aviso del TPV puede tardar unos
// segundos y los grupos con pago individual no pasan por él al reservar).
//
// POST Authorization: Bearer <idToken de Firebase>
//      { tipo: "grupo", grupoId }  |  { tipo: "pedido", orderId }  |  { tipo: "correo", orderId }
//      { tipo: "reservar", claseId, items: [{ fecha, turno, metodo, plazas, reserva }], edicionId? }
// "pedido" sirve tanto para una reserva individual como para un grupo pagado de una vez.
// "correo" pide el correo de confirmación de una reserva o un bono ya confirmados con
// tarjeta regalo (se confirman en el navegador, sin pasar por el aviso del TPV). Vive
// aquí y no en una función propia porque Vercel limita a 12 funciones por proyecto.
// "reservar" crea la reserva pendiente comprobando el aforo real (api/_reservarServidor.js).
//
// Solo responde al dueño de la reserva (uid del token = uid de la reserva).
import { adminAuth, adminDb } from "./_firebaseAdmin.js";
import { applyCors } from "./_cors.js";
import {
  asegurarCodigo,
  buscarGrupoPorOrderId,
  buscarReservaIndividual,
  formatearCodigo,
} from "./_codigosReserva.js";
import { esReservaValida } from "../src/utils/plazasOcupadas.js";
import { enviarCorreoReserva } from "./_correoReserva.js";
import { reservarConAforo } from "./_reservarServidor.js";

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const token = String(req.headers.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return res.status(401).json({ ok: false, error: "Autenticación requerida" });

    const { uid } = await adminAuth.verifyIdToken(token);
    const cuerpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

    if (cuerpo.tipo === "reservar") {
      const resultado = await reservarConAforo(adminDb, uid, cuerpo.claseId, cuerpo.items, {
        edicionId: cuerpo.edicionId,
      });
      const { status, ...resto } = resultado;
      return res.status(status).json(resto);
    }

    if (cuerpo.tipo === "grupo") {
      const grupoId = String(cuerpo.grupoId || "");
      if (!/^[A-Za-z0-9_-]{10,40}$/.test(grupoId)) {
        return res.status(400).json({ ok: false, error: "Reserva no válida" });
      }

      const grupo = await adminDb.ref(`reservasGrupos/${grupoId}`).get();
      if (!grupo.exists() || grupo.val()?.uid !== uid) {
        return res.status(404).json({ ok: false, error: "Reserva no encontrada" });
      }

      const codigo = await asegurarCodigo(adminDb, {
        clave: `grupo_${grupoId}`,
        datos: { tipo: "grupo", grupoId, uid },
      });
      await adminDb.ref(`reservasGrupos/${grupoId}/codigoReserva`).set(codigo);

      return res.status(200).json({ ok: true, codigo: formatearCodigo(codigo) });
    }

    if (cuerpo.tipo === "pedido") {
      const orderId = String(cuerpo.orderId || "");
      if (!/^\d{4,20}$/.test(orderId)) {
        return res.status(400).json({ ok: false, error: "Reserva no válida" });
      }

      const encontrada = await buscarReservaIndividual(adminDb, orderId);

      // Solo reservas ya pagadas: una pendiente aún no puede cambiarse
      if (encontrada && encontrada.reserva.uid === uid && esReservaValida(encontrada.reserva)) {
        const ruta = encontrada.segmentos.join("/");
        const codigo = await asegurarCodigo(adminDb, {
          clave: orderId,
          datos: { tipo: "individual", orderId, ruta, uid },
        });
        await adminDb.ref(`${ruta}/codigoReserva`).set(codigo);

        return res.status(200).json({ ok: true, codigo: formatearCodigo(codigo) });
      }

      const grupo = await buscarGrupoPorOrderId(adminDb, orderId);
      if (grupo && grupo.grupo.uid === uid) {
        const codigo = await asegurarCodigo(adminDb, {
          clave: `grupo_${grupo.id}`,
          datos: { tipo: "grupo", grupoId: grupo.id, uid },
        });
        await adminDb.ref(`reservasGrupos/${grupo.id}/codigoReserva`).set(codigo);

        return res.status(200).json({ ok: true, codigo: formatearCodigo(codigo) });
      }

      // Tarjeta regalo comprada: el mismo código que lleva su correo de confirmación
      const tarjeta = await adminDb.ref(`tarjetasRegalo/${orderId}`).get();
      if (tarjeta.exists() && tarjeta.val()?.uidComprador === uid && tarjeta.val()?.estadoPago === "pagado") {
        const codigo = await asegurarCodigo(adminDb, {
          clave: orderId,
          datos: { tipo: "tarjeta_regalo", orderId, uid },
        });

        return res.status(200).json({ ok: true, codigo: formatearCodigo(codigo) });
      }

      return res.status(404).json({ ok: false, error: "Reserva no encontrada" });
    }

    if (cuerpo.tipo === "correo") {
      const orderId = String(cuerpo.orderId || "");
      if (!/^\d{4,20}$/.test(orderId)) {
        return res.status(400).json({ ok: false, error: "Reserva no válida" });
      }

      let reserva = null;
      let tipoCorreo = "reserva";

      // Un bono canjeado con tarjeta regalo lleva su primera sesión con el mismo
      // pedido: se avisa del bono, no de una reserva suelta
      const bonoSnap = await adminDb.ref(`usuarios/${uid}/bonos/${orderId}`).get();
      const bono = bonoSnap.exists() ? bonoSnap.val() : null;
      if (bono?.creadaDesde === "tarjeta_regalo" && bono.estadoPago === "pagado") {
        reserva = { ...bono, desdeTarjeta: true };
        tipoCorreo = "bono";
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
      if (!reserva) return res.status(404).json({ ok: false, error: "Reserva no encontrada" });

      const enviado = await enviarCorreoReserva({ reserva, uid, orderId, tipo: tipoCorreo });
      return res.status(200).json({ ok: true, enviado });
    }

    return res.status(400).json({ ok: false, error: "Tipo no válido" });
  } catch (error) {
    console.error("Error en /api/codigo-reserva:", error);
    return res.status(500).json({ ok: false, error: "No se pudo obtener el código" });
  }
}
