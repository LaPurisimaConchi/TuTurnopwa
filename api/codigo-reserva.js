// api/codigo-reserva.js
// Código de reserva de quien acaba de reservar: lo crea si aún no existe y lo
// devuelve para enseñárselo en pantalla (el aviso del TPV puede tardar unos
// segundos y los grupos con pago individual no pasan por él al reservar).
//
// POST Authorization: Bearer <idToken de Firebase>
//      { tipo: "grupo", grupoId }  |  { tipo: "pedido", orderId }
// "pedido" sirve tanto para una reserva individual como para un grupo pagado de una vez.
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

      return res.status(404).json({ ok: false, error: "Reserva no encontrada" });
    }

    return res.status(400).json({ ok: false, error: "Tipo no válido" });
  } catch (error) {
    console.error("Error en /api/codigo-reserva:", error);
    return res.status(500).json({ ok: false, error: "No se pudo obtener el código" });
  }
}
