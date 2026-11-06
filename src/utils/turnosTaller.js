// src/utils/turnosTaller.js
// Turnos de un taller en una fecha: horario semanal + fechas habilitadas desde
// el admin + reservas de grupo confirmadas (misma lógica que las pantallas de
// reserva de siempre).
import { useEffect, useMemo, useState } from "react";
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

const DIAS_ORDEN = [
  ["lunes", "Lunes"],
  ["martes", "Martes"],
  ["miercoles", "Miércoles"],
  ["jueves", "Jueves"],
  ["viernes", "Viernes"],
  ["sabado", "Sábado"],
  ["domingo", "Domingo"],
];

// Horario semanal para mostrarlo: los días seguidos con los mismos turnos se
// juntan ("Lunes a viernes"). No incluye las fechas habilitadas a mano.
export function resumenHorarios(clase = {}) {
  const filas = [];

  DIAS_ORDEN.forEach(([clave, nombre], indice) => {
    const turnos = normalizarTurnos(clase?.horarios?.[clave]).map(limpiarTurno);
    if (!turnos.length) return;

    const texto = turnos.join(" · ");
    const ultima = filas[filas.length - 1];

    if (ultima && ultima.texto === texto && ultima.indiceFinal === indice - 1) {
      ultima.hasta = nombre;
      ultima.indiceFinal = indice;
    } else {
      filas.push({ desde: nombre, hasta: nombre, texto, indiceInicial: indice, indiceFinal: indice });
    }
  });

  return filas.map((fila) => {
    const dias = fila.indiceFinal - fila.indiceInicial + 1;
    return {
      dias:
        dias === 1
          ? fila.desde
          : dias === 2
          ? `${fila.desde} y ${fila.hasta}`
          : `${fila.desde} a ${fila.hasta}`,
      turnos: fila.texto,
    };
  });
}

// Cómo se marca un día en el calendario: bloqueado desde el panel, sin taller ese
// día (ni horario, ni fecha habilitada, ni grupo) o disponible
export function estadoDiaTaller({
  clase,
  fecha,
  fechasBloqueadas = {},
  fechasHabilitadas = {},
  reservasGrupos = {},
}) {
  const bloqueo = fechasBloqueadas?.[fecha];
  if (bloqueo?.bloqueado) return { estado: "bloqueado", motivo: bloqueo.motivo || "" };

  const turnos = turnosDisponiblesEnFecha({ clase, fecha, fechasHabilitadas, reservasGrupos });
  return { estado: turnos.length ? "disponible" : "sin-taller" };
}

// Fechas bloqueadas, fechas habilitadas y reservas de grupo (solo lectura).
// `cargado` indica que ya llegaron los datos (hasta entonces el calendario no
// debe dejar elegir día). `error` avisa de que no se ha podido leer: sin ellos no
// se sabe qué días están bloqueados, así que la pantalla no debe dejar reservar.
export function useContextoReserva() {
  const [contexto, setContexto] = useState({
    fechasBloqueadas: {},
    fechasHabilitadas: {},
    reservasGrupos: {},
    error: false,
    cargado: false,
  });

  useEffect(() => {
    let cancelado = false;

    cargarContextoReserva()
      .then((datos) => {
        if (!cancelado) setContexto({ ...datos, error: false, cargado: true });
      })
      .catch((error) => {
        console.error("Error al cargar la disponibilidad:", error);
        if (!cancelado) {
          setContexto({
            fechasBloqueadas: {},
            fechasHabilitadas: {},
            reservasGrupos: {},
            error: true,
            cargado: true,
          });
        }
      });

    return () => {
      cancelado = true;
    };
  }, []);

  return contexto;
}

// Lo que se sabe del día elegido en una reserva (talleres y bonos): turnos que se
// ofrecen, si está bloqueado desde el panel, si se habilitó a mano y si no hay taller
export function useDiaDeReserva({
  clase,
  fecha,
  fechasBloqueadas = {},
  fechasHabilitadas = {},
  reservasGrupos = {},
}) {
  const turnosDisponibles = useMemo(
    () => turnosDisponiblesEnFecha({ clase, fecha, fechasHabilitadas, reservasGrupos }),
    [clase, fecha, fechasHabilitadas, reservasGrupos]
  );

  const fechaHabilitadaManual = useMemo(() => {
    if (!fecha) return null;
    const habilitacion = fechasHabilitadas?.[fecha];
    return habilitacion?.habilitada ? habilitacion : null;
  }, [fecha, fechasHabilitadas]);

  const fechaBloqueada = useMemo(() => {
    if (!fecha) return null;
    const bloqueo = fechasBloqueadas?.[fecha];
    return bloqueo?.bloqueado ? bloqueo : null;
  }, [fecha, fechasBloqueadas]);

  const diaNoDisponible = !!fecha && turnosDisponibles.length === 0;

  return { turnosDisponibles, fechaHabilitadaManual, fechaBloqueada, diaNoDisponible };
}
