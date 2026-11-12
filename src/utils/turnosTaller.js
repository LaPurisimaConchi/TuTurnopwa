// src/utils/turnosTaller.js
// Turnos de un taller en una fecha: horario semanal + fechas habilitadas desde
// el admin + reservas de grupo confirmadas (misma lógica que las pantallas de
// reserva de siempre).
import { useEffect, useMemo, useState } from "react";
import { minPersonasHabilitar } from "../catalogoTalleres";
import { bloqueoAfectaTurno, bloqueoEsParcial } from "./rangosHora";
import { cargarContextoReserva } from "./disponibilidad";
import {
  esTurnoConsulta,
  limpiarTurno,
  nombreDiaSemana,
  normalizarTurnos,
  TURNOS_GRUPO,
  turnosDisponiblesEnFecha,
} from "./turnosFecha";

// Siguen exportándose desde aquí para no tocar a quien ya los importa
export {
  esTurnoConsulta,
  limpiarTurno,
  nombreDiaSemana,
  normalizarTurnos,
  TURNOS_GRUPO,
  turnosDisponiblesEnFecha,
};

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

// Cómo se marca un día en el calendario: bloqueado desde el panel, disponible, o
// "solo-grupo" (sin horario individual: solo se reserva con el mínimo de personas)
export function estadoDiaTaller({
  clase,
  fecha,
  fechasBloqueadas = {},
  fechasHabilitadas = {},
  reservasGrupos = {},
  conGrupo = false,
  ocupacion = {},
}) {
  const bloqueo = fechasBloqueadas?.[fecha];
  const parcial = bloqueoEsParcial(bloqueo);
  if (bloqueo?.bloqueado && !parcial) return { estado: "bloqueado", motivo: bloqueo.motivo || "" };

  // Un bloqueo por horas solo cierra el día si deja sin ningún turno
  const turnosDelDia = turnosDisponiblesEnFecha({ clase, fecha, fechasHabilitadas, reservasGrupos });
  const turnos = parcial ? turnosDelDia.filter((t) => !bloqueoAfectaTurno(bloqueo, t)) : turnosDelDia;
  if (parcial && turnosDelDia.length && !turnos.length) {
    return { estado: "bloqueado", motivo: bloqueo.motivo || "" };
  }
  if (turnos.length) return { estado: "disponible" };

  if (parcial && conGrupo && TURNOS_GRUPO.every((t) => bloqueoAfectaTurno(bloqueo, t))) {
    return { estado: "bloqueado", motivo: bloqueo.motivo || "" };
  }

  // Un día de grupo que ya tiene alguna reserva está abierto a cualquiera
  if (conGrupo && ocupacion?.[fecha]?.length) return { estado: "disponible" };

  // Sin turno individual, pero un grupo sí puede reservar (cualquier día no cerrado)
  return conGrupo
    ? { estado: "solo-grupo", minimo: minPersonasHabilitar(clase) }
    : { estado: "sin-taller" };
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
  conGrupo = false,
  ocupacion = {},
}) {
  const turnosBase = useMemo(
    () => turnosDisponiblesEnFecha({ clase, fecha, fechasHabilitadas, reservasGrupos }),
    [clase, fecha, fechasHabilitadas, reservasGrupos]
  );

  const fechaHabilitadaManual = useMemo(() => {
    if (!fecha) return null;
    const habilitacion = fechasHabilitadas?.[fecha];
    return habilitacion?.habilitada ? habilitacion : null;
  }, [fecha, fechasHabilitadas]);

  const bloqueo = fecha ? fechasBloqueadas?.[fecha] : null;
  const bloqueoParcial = bloqueoEsParcial(bloqueo) ? bloqueo : null;
  const libre = (turno) => !bloqueoAfectaTurno(bloqueo, turno);

  // Con un bloqueo por horas, los turnos que se cruzan con él no se ofrecen
  const turnosDisponibles = bloqueoParcial ? turnosBase.filter(libre) : turnosBase;

  // Todo el día bloqueado, o un bloqueo por horas que deja el día sin turnos
  const fechaBloqueada = useMemo(() => {
    if (!fecha || !bloqueo?.bloqueado) return null;
    if (!bloqueoParcial) return bloqueo;
    if (turnosBase.length) return turnosBase.some(libre) ? null : bloqueo;
    return conGrupo && TURNOS_GRUPO.every((t) => !libre(t)) ? bloqueo : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, bloqueo, bloqueoParcial, turnosBase, conGrupo]);

  // Día sin horario individual y no cerrado: solo se puede reservar en grupo
  const diaSoloGrupo = conGrupo && !!fecha && !fechaBloqueada && turnosDisponibles.length === 0;
  const diaNoDisponible = !!fecha && !fechaBloqueada && turnosDisponibles.length === 0 && !diaSoloGrupo;

  return {
    turnosDisponibles: diaSoloGrupo
      ? [...TURNOS_GRUPO, ...(ocupacion?.[fecha] || []).filter((t) => !TURNOS_GRUPO.includes(t))].filter(libre)
      : turnosDisponibles,
    // Turnos de un día de grupo que ya tienen reserva: ahí no hace falta mínimo
    turnosAbiertos: diaSoloGrupo ? ocupacion?.[fecha] || [] : [],
    fechaHabilitadaManual,
    fechaBloqueada,
    bloqueoParcial,
    diaNoDisponible,
    diaSoloGrupo,
  };
}
