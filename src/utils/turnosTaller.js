// src/utils/turnosTaller.js
// Turnos de un taller en una fecha: horario semanal + fechas habilitadas desde
// el admin + reservas de grupo confirmadas (misma lógica que las pantallas de
// reserva de siempre).
import { useEffect, useMemo, useState } from "react";
import { minPersonasHabilitar } from "../catalogoTalleres";
import { abreDias } from "./diasAbiertos";
import { bloqueoAfectaTurno, bloqueoEsParcial } from "./rangosHora";
import { cargarContextoReserva } from "./disponibilidad";
import { turnoYaEmpezado } from "./cambioFecha";
import {
  esTurnoConsulta,
  limpiarTurno,
  nombreDiaSemana,
  normalizarTurnos,
  turnosDiasAbiertos,
  turnosDisponiblesEnFecha,
} from "./turnosFecha";

// Siguen exportándose desde aquí para no tocar a quien ya los importa
export {
  esTurnoConsulta,
  limpiarTurno,
  nombreDiaSemana,
  normalizarTurnos,
  turnosDiasAbiertos,
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
// "solo-grupo" (día sin horario y cerrado: se abre con una reserva del mínimo de
// personas del taller). `diasAbiertos` son los días sin horario ya abiertos por otra
// reserva; `permiteAbrir` indica que esta pantalla puede abrir días sin horario con una reserva del mínimo de personas del taller (los bonos no abren días).
export function estadoDiaTaller({
  clase,
  fecha,
  fechasBloqueadas = {},
  fechasHabilitadas = {},
  permiteAbrir = false,
  diasAbiertos = {},
}) {
  const bloqueo = fechasBloqueadas?.[fecha];
  const parcial = bloqueoEsParcial(bloqueo);
  if (bloqueo?.bloqueado && !parcial) return { estado: "bloqueado", motivo: bloqueo.motivo || "" };

  // Un bloqueo por horas solo cierra el día si deja sin ningún turno
  const turnosDelDia = turnosDisponiblesEnFecha({
    clase,
    fecha,
    fechasHabilitadas,
    diaAbierto: !!diasAbiertos?.[fecha],
  });
  const sinBloqueo = parcial ? turnosDelDia.filter((t) => !bloqueoAfectaTurno(bloqueo, t)) : turnosDelDia;
  if (parcial && turnosDelDia.length && !sinBloqueo.length) {
    return { estado: "bloqueado", motivo: bloqueo.motivo || "" };
  }
  // Hoy, los turnos que ya han empezado no se ofrecen
  const turnos = sinBloqueo.filter((t) => !turnoYaEmpezado(fecha, t));
  if (turnos.length) return { estado: "disponible" };
  if (sinBloqueo.length) return { estado: "sin-taller" };

  // Día sin horario y cerrado: solo lo abre un taller con turnos de días abiertos
  const turnosAbrir = permiteAbrir && abreDias(clase) ? turnosDiasAbiertos(clase) : [];
  if (!turnosAbrir.length) return { estado: "sin-taller" };
  if (turnosAbrir.every((t) => turnoYaEmpezado(fecha, t))) return { estado: "sin-taller" };
  if (parcial && turnosAbrir.every((t) => bloqueoAfectaTurno(bloqueo, t))) {
    return { estado: "bloqueado", motivo: bloqueo.motivo || "" };
  }

  return { estado: "solo-grupo", minimo: minPersonasHabilitar(clase) };
}

// Fechas bloqueadas, fechas habilitadas, reservas de grupo y días abiertos (solo lectura).
// `cargado` indica que ya llegaron los datos (hasta entonces el calendario no
// debe dejar elegir día). `error` avisa de que no se ha podido leer: sin ellos no
// se sabe qué días están bloqueados, así que la pantalla no debe dejar reservar.
export function useContextoReserva() {
  const [contexto, setContexto] = useState({
    fechasBloqueadas: {},
    fechasHabilitadas: {},
    reservasGrupos: {},
    diasAbiertos: {},
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
            diasAbiertos: {},
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
  permiteAbrir = false,
  diasAbiertos = {},
}) {
  const diaAbierto = !!fecha && !!diasAbiertos?.[fecha];
  const turnosBase = useMemo(
    () => turnosDisponiblesEnFecha({ clase, fecha, fechasHabilitadas, diaAbierto }),
    [clase, fecha, fechasHabilitadas, diaAbierto]
  );
  // Turnos con los que un taller abre un día sin horario (solo donde se puede abrir)
  const turnosAbrir = useMemo(
    () => (permiteAbrir && abreDias(clase) ? turnosDiasAbiertos(clase) : []),
    [clase, permiteAbrir]
  );

  const fechaHabilitadaManual = useMemo(() => {
    if (!fecha) return null;
    const habilitacion = fechasHabilitadas?.[fecha];
    return habilitacion?.habilitada ? habilitacion : null;
  }, [fecha, fechasHabilitadas]);

  const bloqueo = fecha ? fechasBloqueadas?.[fecha] : null;
  const bloqueoParcial = bloqueoEsParcial(bloqueo) ? bloqueo : null;
  const libre = (turno) => !bloqueoAfectaTurno(bloqueo, turno);
  // Hoy, los turnos que ya han empezado no se ofrecen
  const aTiempo = (turno) => !turnoYaEmpezado(fecha, turno);

  // Con un bloqueo por horas, los turnos que se cruzan con él no se ofrecen
  const turnosDelDia = bloqueoParcial ? turnosBase.filter(libre) : turnosBase;
  const turnosDisponibles = turnosDelDia.filter(aTiempo);

  // Todo el día bloqueado, o un bloqueo por horas que deja el día sin turnos
  const fechaBloqueada = useMemo(() => {
    if (!fecha || !bloqueo?.bloqueado) return null;
    if (!bloqueoParcial) return bloqueo;
    if (turnosBase.length) return turnosBase.some(libre) ? null : bloqueo;
    return turnosAbrir.length && turnosAbrir.every((t) => !libre(t)) ? bloqueo : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, bloqueo, bloqueoParcial, turnosBase, turnosAbrir]);

  // Día sin horario y cerrado: se abre reservando con el mínimo de personas del taller
  const diaSoloGrupo = turnosAbrir.length > 0 && !!fecha && !fechaBloqueada && turnosDelDia.length === 0;
  const diaNoDisponible = !!fecha && !fechaBloqueada && turnosDisponibles.length === 0 && !diaSoloGrupo;

  return {
    turnosDisponibles: diaSoloGrupo ? turnosAbrir.filter((t) => libre(t) && aTiempo(t)) : turnosDisponibles,
    fechaHabilitadaManual,
    fechaBloqueada,
    bloqueoParcial,
    diaNoDisponible,
    diaSoloGrupo,
  };
}
