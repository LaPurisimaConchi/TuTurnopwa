import { ref, push, get, update } from "firebase/database";
import { dbRealtime } from "../firebase";

export const obtenerEstadoVisibleBono = (bono) => {
  if (!bono) return "—";

  const restantes = Number(bono.clasesRestantes || 0);
  const estadoGuardado = String(
    bono.estadoBono || bono.estado || ""
  ).toLowerCase();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let fechaCaducidad = null;
  if (bono.fechaCaducidadBono) {
    fechaCaducidad = new Date(`${bono.fechaCaducidadBono}T00:00:00`);
  }

  const estaCaducado =
    fechaCaducidad instanceof Date &&
    !isNaN(fechaCaducidad.getTime()) &&
    hoy > fechaCaducidad;

  if (estadoGuardado === "caducado" || estaCaducado) {
    return "Caducado";
  }

  if (
    estadoGuardado === "agotado" ||
    estadoGuardado === "completado" ||
    restantes <= 0
  ) {
    return "Agotado";
  }

  return "Activo";
};

// Campos del bono cuando su primera sesión se reserva con la compra: cuenta como
// una clase usada (igual que usarSesionDeBono al reservar las demás)
export const datosPrimeraSesionBono = ({
  numeroClases,
  fecha,
  turno,
  taller,
  clase = "",
  reservaId = "",
  timestamp = new Date().toISOString(),
  clave = "primeraSesion",
}) => {
  const restantes = Math.max(Number(numeroClases || 0) - 1, 0);

  return {
    clasesConsumidas: 1,
    clasesRestantes: restantes,
    estadoBono: restantes === 0 ? "agotado" : "activo",
    ultimaSesionReservada: fecha,
    sesionesConsumidas: {
      [clave]: {
        fecha,
        turno,
        taller,
        clase: clase || taller,
        reservaId,
        timestamp,
        primeraSesion: true,
      },
    },
  };
};

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

export const crearBonoActivo = async ({
  uid,
  clase,
  claseId = "",
  tipoTaller = "bono_mensual",
  subtipo = "",
  numeroClases = 0,
  fechaInicio = "",
  fechaFinMes = "",
  fechaCaducidadBono = "",
  turno = "",
  orderId = "",
  datosExtra = {},
}) => {
  const orderIdLimpio = String(orderId || "").trim();
  const tarjetaRegaloId = String(datosExtra?.tarjetaRegaloId || "").trim();
  const bonosRef = ref(dbRealtime, `usuarios/${uid}/bonos`);

  if (orderIdLimpio) {
    const bonoPorOrderRef = ref(
      dbRealtime,
      `usuarios/${uid}/bonos/${orderIdLimpio}`
    );
    const bonoPorOrderSnap = await get(bonoPorOrderRef);

    if (bonoPorOrderSnap.exists()) {
      return orderIdLimpio;
    }
  }

  if (tarjetaRegaloId) {
    const bonosSnap = await get(bonosRef);

    if (bonosSnap.exists()) {
      for (const [bonoId, bono] of Object.entries(bonosSnap.val() || {})) {
        if (bono?.tarjetaRegaloId === tarjetaRegaloId) {
          return bonoId;
        }
      }
    }
  }

  const camposProtegidos = new Set([
    "clasesConsumidas",
    "clasesRestantes",
    "sesionesConsumidas",
    "estadoPago",
    "estadoBono",
    "uid",
    "bonoId",
    "orderId",
  ]);

  const datosExtraSeguros = {};
  Object.entries(datosExtra || {}).forEach(([key, value]) => {
    if (!camposProtegidos.has(key)) {
      datosExtraSeguros[key] = value;
    }
  });

  const nuevoBonoRef = orderIdLimpio
    ? ref(dbRealtime, `usuarios/${uid}/bonos/${orderIdLimpio}`)
    : push(bonosRef);

  const bonoId = orderIdLimpio ? orderIdLimpio : nuevoBonoRef.key;
  const timestamp = new Date().toISOString();

  const bonoData = {
    ...datosExtraSeguros,
    bonoId,
    uid,
    clase,
    claseId,
    tipo: "bono",
    tipoTaller,
    subtipo,
    numeroClases,
    clasesConsumidas: 0,
    clasesRestantes: numeroClases,
    fechaInicio,
    fechaFinMes,
    fechaCaducidadBono,
    turnoHabitual: turno,
    estadoBono: "activo",
    estadoPago: "pagado",
    orderId: orderIdLimpio || bonoId,
    creadoEn: timestamp,
    actualizadoEn: timestamp,
    sesionesConsumidas: {},
  };

  await update(nuevoBonoRef, bonoData);

  return bonoId;
};
export const usarSesionDeBono = async ({
  uid,
  bonoId,
  fechaSesion,
  turno,
  taller,
  reservaId = "",
  clase = "",
}) => {
  const bonoRef = ref(dbRealtime, `usuarios/${uid}/bonos/${bonoId}`);
  const snapshot = await get(bonoRef);

  if (!snapshot.exists()) {
    throw new Error("Bono no encontrado.");
  }

  const bono = snapshot.val();
  const estado = obtenerEstadoVisibleBono(bono);

  if (estado === "Caducado") {
    throw new Error("Tu bono está caducado.");
  }

  if (estado === "Agotado") {
    throw new Error("No quedan clases disponibles en este bono.");
  }

  const nuevasConsumidas = Number(bono.clasesConsumidas || 0) + 1;
  const nuevasRestantes = Math.max(Number(bono.clasesRestantes || 0) - 1, 0);

  await update(bonoRef, {
    clasesConsumidas: nuevasConsumidas,
    clasesRestantes: nuevasRestantes,
    estadoBono: nuevasRestantes === 0 ? "agotado" : "activo",
    ultimaSesionReservada: fechaSesion,
    actualizadoEn: new Date().toISOString(),
  });

  const sesionesRef = ref(
    dbRealtime,
    `usuarios/${uid}/bonos/${bonoId}/sesionesConsumidas`
  );

  await push(sesionesRef, {
    fecha: fechaSesion,
    turno,
    taller,
    clase,
    reservaId,
    timestamp: new Date().toISOString(),
  });
};