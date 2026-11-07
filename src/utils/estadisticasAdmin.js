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
function contarReserva(acc, reserva, fechaClave = "") {
  if (!reserva || typeof reserva !== "object") return;

  acc.reservasTotales += 1;

  if (esReservaValida(reserva)) {
    acc.reservasConfirmadas += 1;
    acc.ingresosEstimados += importeDe(reserva);

    const fecha = reserva.fecha || fechaClave;
    if (fecha === acc.hoy) acc.reservasHoy += 1;
    if (fecha === acc.manana) acc.reservasManana += 1;
  }
}

// reservas/{clase}/{fecha}/{turno}[/{metodo}]/{reservaId}
function contarReservasNormales(acc, reservasSnap) {
  if (!reservasSnap?.exists()) return;

  reservasSnap.forEach((claseSnap) => {
    claseSnap.forEach((fechaSnap) => {
      const fechaClave = fechaSnap.key;
      fechaSnap.forEach((turnoSnap) => {
        turnoSnap.forEach((nivelSnap) => {
          const nivelVal = nivelSnap.val();
          if (!nivelVal || typeof nivelVal !== "object") return;

          if (pareceReservaDirecta(nivelVal)) {
            contarReserva(acc, nivelVal, fechaClave);
            return;
          }

          nivelSnap.forEach((reservaSnap) => {
            contarReserva(acc, reservaSnap.val(), fechaClave);
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

    const grupo = grupoSnap.val();
    contarReserva(acc, grupo);
    registrarPagoPendiente(acc, grupoSnap.key, grupo);
  });
}

const ESTADOS_PAGO_CERRADOS = ["pagado", "pagado_manual", "cancelado"];
const HORAS_AVISO_PLAZO = 48;

// Grupos con pago sin completar y plazo vencido o a punto de vencer
function registrarPagoPendiente(acc, id, grupo) {
  if (!grupo || typeof grupo !== "object") return;

  const estado = (grupo.estado || "").toString().toLowerCase();
  const estadoPago = (grupo.estadoPago || "").toString().toLowerCase();
  if (grupo.cancelada || estado === "cancelada" || ESTADOS_PAGO_CERRADOS.includes(estadoPago)) {
    return;
  }

  const limite = new Date(grupo.fechaLimitePago || "");
  if (Number.isNaN(limite.getTime())) return;

  const horasRestantes = (limite - acc.ahora) / 3_600_000;
  if (horasRestantes > HORAS_AVISO_PLAZO) return;

  acc.gruposPagoPendiente.push({
    id,
    nombre: grupo.nombreGrupo || grupo.nombreReserva || grupo.clase || "Grupo",
    fecha: grupo.fecha || "",
    limite: limite.toISOString(),
    vencido: horasRestantes <= 0,
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

// Fecha local en formato YYYY-MM-DD (el de las reservas)
function fechaLocal(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function calcularEstadisticas({
  reservasSnap,
  reservasGruposSnap,
  clasesSnap,
  usuariosSnap,
  ahora = new Date(),
}) {
  const mananaDate = new Date(ahora);
  mananaDate.setDate(mananaDate.getDate() + 1);

  const acc = {
    reservasTotales: 0,
    reservasConfirmadas: 0,
    ingresosEstimados: 0,
    reservasHoy: 0,
    reservasManana: 0,
    gruposPagoPendiente: [],
    ahora,
    hoy: fechaLocal(ahora),
    manana: fechaLocal(mananaDate),
  };

  contarReservasNormales(acc, reservasSnap);
  contarReservasGrupo(acc, reservasGruposSnap);

  acc.gruposPagoPendiente.sort(
    (a, b) => new Date(a.limite) - new Date(b.limite)
  );

  const { ahora: _ahora, hoy: _hoy, manana: _manana, ...resultado } = acc;

  return {
    ...resultado,
    clasesActivas: contarClasesActivas(clasesSnap),
    usuariosTotales: contarHijos(usuariosSnap),
  };
}

export function describirPlazo(limiteISO, ahora = new Date()) {
  const ms = new Date(limiteISO) - ahora;
  if (Number.isNaN(ms)) return "";
  const horas = Math.round(Math.abs(ms) / 3_600_000);
  const texto = horas >= 48 ? `${Math.round(horas / 24)} días` : `${horas} h`;
  return ms <= 0 ? `Vencido hace ${texto}` : `Vence en ${texto}`;
}

export function formatearEuros(importe) {
  return Number(importe || 0).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(Number(importe || 0)) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
