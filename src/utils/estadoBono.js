// src/utils/estadoBono.js
// Estado visible de un bono y campos de su primera sesión, sin SDK de Firebase:
// los usan el navegador (utils/bonos.js) y el servidor (api/_canjeServidor.js).

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
// una clase usada (igual que al reservar las demás con el bono, api/_canjeServidor.js)
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
