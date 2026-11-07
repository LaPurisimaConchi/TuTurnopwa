// src/utils/estadisticasAdmin.js
// Cálculo de las cifras del panel admin a partir de snapshots de Realtime
// Database. Sin imports de Firebase: solo usa forEach, exists, val y key.
// Ojo: en forEach, devolver un valor verdadero corta la enumeración; por eso
// los callbacks llevan llaves.

import { esReservaValida } from "./plazasOcupadas";

function pareceReservaDirecta(obj) {
  return (
    "fecha" in obj ||
    "estado" in obj ||
    "estadoPago" in obj ||
    "uid" in obj ||
    "orderId" in obj
  );
}

const importeDe = (reserva) =>
  Number(reserva.precioTotal || reserva.precio || 0) || 0;

// Suma una reserva (normal o de grupo) a los acumuladores.
function contarReserva(acc, reserva) {
  if (!reserva || typeof reserva !== "object") return;

  acc.reservasTotales += 1;

  if (esReservaValida(reserva)) {
    acc.reservasConfirmadas += 1;
    acc.ingresosEstimados += importeDe(reserva);
  }
}

// reservas/{clase}/{fecha}/{turno}[/{metodo}]/{reservaId}
function contarReservasNormales(acc, reservasSnap) {
  if (!reservasSnap?.exists()) return;

  reservasSnap.forEach((claseSnap) => {
    claseSnap.forEach((fechaSnap) => {
      fechaSnap.forEach((turnoSnap) => {
        turnoSnap.forEach((nivelSnap) => {
          const nivelVal = nivelSnap.val();
          if (!nivelVal || typeof nivelVal !== "object") return;

          if (pareceReservaDirecta(nivelVal)) {
            contarReserva(acc, nivelVal);
            return;
          }

          nivelSnap.forEach((reservaSnap) => {
            contarReserva(acc, reservaSnap.val());
          });
        });
      });
    });
  });
}

function contarReservasGrupo(acc, gruposSnap) {
  if (!gruposSnap?.exists()) return;

  gruposSnap.forEach((grupoSnap) => {
    if (grupoSnap.key === "placeholder") return;
    contarReserva(acc, grupoSnap.val());
  });
}

function contarClasesActivas(clasesSnap) {
  let activas = 0;
  if (!clasesSnap?.exists()) return activas;

  clasesSnap.forEach((claseSnap) => {
    if (claseSnap.val()?.activa !== false) activas += 1;
  });

  return activas;
}

function contarHijos(snap) {
  if (!snap?.exists()) return 0;
  const valor = snap.val();
  return valor && typeof valor === "object" ? Object.keys(valor).length : 0;
}

export function calcularEstadisticas({
  reservasSnap,
  reservasGruposSnap,
  clasesSnap,
  usuariosSnap,
}) {
  const acc = {
    reservasTotales: 0,
    reservasConfirmadas: 0,
    ingresosEstimados: 0,
  };

  contarReservasNormales(acc, reservasSnap);
  contarReservasGrupo(acc, reservasGruposSnap);

  return {
    ...acc,
    clasesActivas: contarClasesActivas(clasesSnap),
    usuariosTotales: contarHijos(usuariosSnap),
  };
}

export function formatearEuros(importe) {
  return Number(importe || 0).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(Number(importe || 0)) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
