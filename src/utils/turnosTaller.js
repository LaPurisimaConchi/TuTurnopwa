// src/utils/turnosTaller.js
// Turnos de un taller en una fecha: horario semanal + fechas habilitadas desde
// el admin + reservas de grupo confirmadas (misma lógica que las pantallas de
// reserva de siempre).
import { useEffect, useState } from "react";
import { cargarContextoReserva } from "./disponibilidad";

const DIAS_SEMANA = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

export const normalizarTurnos = (turnosRaw) => {
  if (!turnosRaw) return [];
  if (Array.isArray(turnosRaw)) {
    return turnosRaw.map((t) => String(t || "").trim()).filter(Boolean);
  }
  if (typeof turnosRaw === "object") {
    return Object.values(turnosRaw).map((t) => String(t || "").trim()).filter(Boolean);
  }
  if (typeof turnosRaw === "string") return [turnosRaw.trim()].filter(Boolean);
  return [];
};

// "17:30 a 20:30" → "17:30-20:30"; los turnos «a consultar» no se tocan
export const limpiarTurno = (turno) =>
  String(turno)
    .replace(/(\d{1,2}:\d{2})\s+a\s+(\d{1,2}:\d{2})/i, "$1-$2")
    .trim();

export const nombreDiaSemana = (fechaISO) => {
  if (!fechaISO) return "";
  const [year, month, day] = fechaISO.split("-").map(Number);
  return DIAS_SEMANA[new Date(year, month - 1, day).getDay()] || "";
};

export const esTurnoConsulta = (turnos = []) =>
  turnos.length === 1 && turnos[0].toLowerCase().includes("consultar");

export function turnosDisponiblesEnFecha({
  clase,
  fecha,
  fechasHabilitadas = {},
  reservasGrupos = {},
}) {
  if (!fecha) return [];

  const turnos = normalizarTurnos(clase?.horarios?.[nombreDiaSemana(fecha)]).map(
    limpiarTurno
  );

  const habilitacion = fechasHabilitadas?.[fecha];
  if (habilitacion?.habilitada) {
    const configurados =
      habilitacion.turnosHabilitados || habilitacion.turnosDisponibles;
    const permitidos = configurados
      ? normalizarTurnos(configurados)
      : normalizarTurnos(clase?.turnos);

    permitidos.map(limpiarTurno).forEach((t) => {
      if (!turnos.includes(t)) turnos.push(t);
    });
  }

  Object.values(reservasGrupos || {}).forEach((grupo) => {
    if (
      grupo?.fecha === fecha &&
      grupo?.estado === "Confirmada" &&
      Number(grupo?.plazas || 0) >= 5 &&
      grupo?.turno &&
      !turnos.includes(grupo.turno)
    ) {
      turnos.push(grupo.turno);
    }
  });

  return turnos;
}

// Fechas bloqueadas, fechas habilitadas y reservas de grupo (solo lectura).
// `error` avisa de que no se ha podido leer: sin estos datos no se sabe qué días
// están bloqueados, así que la pantalla no debe dejar reservar.
export function useContextoReserva() {
  const [contexto, setContexto] = useState({
    fechasBloqueadas: {},
    fechasHabilitadas: {},
    reservasGrupos: {},
    error: false,
  });

  useEffect(() => {
    let cancelado = false;

    cargarContextoReserva()
      .then((datos) => {
        if (!cancelado) setContexto({ ...datos, error: false });
      })
      .catch((error) => {
        console.error("Error al cargar la disponibilidad:", error);
        if (!cancelado) {
          setContexto({
            fechasBloqueadas: {},
            fechasHabilitadas: {},
            reservasGrupos: {},
            error: true,
          });
        }
      });

    return () => {
      cancelado = true;
    };
  }, []);

  return contexto;
}
