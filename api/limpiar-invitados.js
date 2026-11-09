// api/limpiar-invitados.js
// Limpieza de las sesiones de invitado (Firebase Auth anónimo) que se crean en
// cada compra sin cuenta. Borra el usuario de Auth y su registro usuarios/{uid}
// cuando ya no sirven: anónimo, sin tocar en DIAS_MINIMOS días y sin ninguna
// reserva, grupo, pedido pendiente, bono, tarjeta regalo ni nota de admin.
//
// Lo lanza el cron de Vercel (vercel.json) con  Authorization: Bearer CRON_SECRET.
// GET ?dry=1 solo cuenta lo que borraría, sin borrar nada.
import { adminAuth, adminDb } from "./_firebaseAdmin.js";

export const config = { runtime: "nodejs" };

const DIAS_MINIMOS = 30;
const TOPE_POR_EJECUCION = 1000;

// Todos los uid que aparecen en cualquier nivel de un árbol de datos
function recogerUids(valor, destino) {
  if (!valor || typeof valor !== "object") return;

  for (const [clave, hijo] of Object.entries(valor)) {
    if ((clave === "uid" || clave === "uidComprador") && typeof hijo === "string") {
      destino.add(hijo);
    } else {
      recogerUids(hijo, destino);
    }
  }
}

async function uidsReferenciados() {
  const uids = new Set();
  const arboles = ["reservas", "reservasGrupos", "pedidosPendientes", "tarjetasRegalo"];
  const snaps = await Promise.all(arboles.map((r) => adminDb.ref(r).get()));
  snaps.forEach((snap) => snap.exists() && recogerUids(snap.val(), uids));
  return uids;
}

const tieneDatosDeCompra = (usuario = {}) =>
  ["listaReservas", "bonos", "tarjetasRegalo"].some((campo) => {
    const valor = usuario[campo];
    return valor && typeof valor === "object" && Object.keys(valor).length > 0;
  });

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const secreto = process.env.CRON_SECRET;
  const recibido = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!secreto || recibido !== secreto) {
    return res.status(401).json({ ok: false, error: "No autorizado" });
  }

  const soloContar = req.query?.dry === "1";
  const limite = Date.now() - DIAS_MINIMOS * 24 * 60 * 60 * 1000;

  try {
    const [referenciados, notasSnap] = await Promise.all([
      uidsReferenciados(),
      adminDb.ref("usuariosNotas").get(),
    ]);
    const conNotas = new Set(notasSnap.exists() ? Object.keys(notasSnap.val() || {}) : []);

    const aBorrar = [];
    let revisados = 0;
    let pagina = await adminAuth.listUsers(1000);

    while (true) {
      for (const user of pagina.users) {
        revisados += 1;

        // Cuentas reales (email, Google…) tienen proveedor; las anónimas no
        if (user.providerData.length > 0) continue;

        const ultimaVez = Math.max(
          Date.parse(user.metadata.lastSignInTime) || 0,
          Date.parse(user.metadata.creationTime) || 0
        );
        if (!ultimaVez || ultimaVez > limite) continue;
        if (referenciados.has(user.uid) || conNotas.has(user.uid)) continue;

        const usuarioSnap = await adminDb.ref(`usuarios/${user.uid}`).get();
        if (usuarioSnap.exists() && tieneDatosDeCompra(usuarioSnap.val())) continue;

        aBorrar.push(user.uid);
        if (aBorrar.length >= TOPE_POR_EJECUCION) break;
      }

      if (aBorrar.length >= TOPE_POR_EJECUCION || !pagina.pageToken) break;
      pagina = await adminAuth.listUsers(1000, pagina.pageToken);
    }

    if (!soloContar && aBorrar.length > 0) {
      const borrados = {};
      aBorrar.forEach((uid) => {
        borrados[`usuarios/${uid}`] = null;
      });

      // Primero la base de datos: si Auth falla, el siguiente cron reintenta
      await adminDb.ref().update(borrados);
      await adminAuth.deleteUsers(aBorrar);
    }

    return res.status(200).json({
      ok: true,
      dry: soloContar,
      revisados,
      invitadosBorrados: aBorrar.length,
    });
  } catch (error) {
    console.error("Error limpiando invitados:", error);
    return res.status(500).json({ ok: false, error: "No se pudo completar la limpieza" });
  }
}
