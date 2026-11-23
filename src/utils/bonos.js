import { ref, get } from "firebase/database";
import { dbRealtime } from "../firebase";

// Sin SDK: compartidas con el servidor (api/_canjeServidor.js)
export { obtenerEstadoVisibleBono, datosPrimeraSesionBono } from "./estadoBono.js";
import { obtenerEstadoVisibleBono } from "./estadoBono.js";

export const obtenerBonosUsuario = async (uid) => {
  if (!uid) return [];

  const bonosRef = ref(dbRealtime, `usuarios/${uid}/bonos`);
  const snap = await get(bonosRef);

  if (!snap.exists()) return [];

  return Object.entries(snap.val() || {}).map(([bonoId, bono]) => ({
    bonoId,
    ...bono,
  }));
};

export const buscarBonoActivoPorClase = async ({ uid, claseId }) => {
  if (!uid || !claseId) return null;

  const bonos = await obtenerBonosUsuario(uid);

  const bonosClase = bonos
    .filter((bono) => bono?.claseId === claseId)
    .filter(
      (bono) => String(bono?.estadoPago || "").toLowerCase() === "pagado"
    )
    .sort((a, b) => {
      const fechaA = new Date(a.actualizadoEn || a.creadoEn || 0);
      const fechaB = new Date(b.actualizadoEn || b.creadoEn || 0);
      return fechaB - fechaA;
    });

  const bonoValido = bonosClase.find(
    (bono) => obtenerEstadoVisibleBono(bono) === "Activo"
  );

  return bonoValido || null;
};

export const validarUsoBono = async ({ uid, claseId }) => {
  const bono = await buscarBonoActivoPorClase({ uid, claseId });

  if (!bono) {
    return {
      ok: false,
      motivo: "No tienes un bono activo disponible para esta clase.",
      bono: null,
    };
  }

  const estado = obtenerEstadoVisibleBono(bono);

  if (estado === "Caducado") {
    return {
      ok: false,
      motivo: "Tu bono está caducado.",
      bono,
    };
  }

  if (estado === "Agotado") {
    return {
      ok: false,
      motivo: "Tu bono ya no tiene clases disponibles.",
      bono,
    };
  }

  return {
    ok: true,
    motivo: "",
    bono,
  };
};

// Los bonos los crea y descuenta el servidor (api/_canjeServidor.js, api/notificacionTPV.js):
// las reglas no dejan al navegador escribir en usuarios/{uid}/bonos.
