// src/utils/turnosTaller.js
// Turnos de un taller en una fecha: horario semanal + fechas habilitadas desde
// el admin + reservas de grupo confirmadas (misma lógica que las pantallas de
// reserva de siempre).
import { useCallback, useEffect, useMemo, useState } from "react";
import { minPersonasHabilitar } from "../catalogoTalleres";
import { bloqueoAfectaTurno, bloqueoEsParcial } from "./rangosHora";
import { cargarContextoReserva, cargarFranjas } from "./disponibilidad";
import { aforoDeFranja, sumarSolapadas } from "./aforo";
import { turnoYaEmpezado } from "./cambioFecha";
import {
  conTurnosExtra,
  esTurnoConsulta,
  limpiarTurno,
  nombreDiaSemana,
  normalizarTurnos,
  turnosConMinimoEnFecha,
  turnosDelDia,
  turnosDisponiblesEnFecha,
} from "./turnosFecha";

// Siguen exportándose desde aquí para no tocar a quien ya los importa
export {
  esTurnoConsulta,
  limpiarTurno,
  nombreDiaSemana,
  normalizarTurnos,
  turnosConMinimoEnFecha,
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
// "solo-grupo" (todos sus turnos piden el mínimo de personas del taller y están cerrados).
// `diasAbiertos` son las franjas abiertas por otras reservas; `permiteAbrir` indica que esta
// pantalla puede abrir turnos con una reserva del mínimo de personas (los bonos no abren).
export function estadoDiaTaller({
  clase,
  fecha,
  fechasBloqueadas = {},
  fechasHabilitadas = {},
  permiteAbrir = false,
  diasAbiertos = {},
  sinNumeroMinimo = false, // bonos: el mínimo lo marca el taller que abre el turno, no el bono
  completo = null, // (fecha, turno) → true si el turno no tiene plazas (useContextoReserva)
}) {
  const bloqueo = fechasBloqueadas?.[fecha];
  const parcial = bloqueoEsParcial(bloqueo);
  if (bloqueo?.bloqueado && !parcial) return { estado: "bloqueado", motivo: bloqueo.motivo || "" };

  const contexto = { clase, fecha, fechasHabilitadas, diaAbierto: diasAbiertos?.[fecha] || false };
  const libres = turnosDisponiblesEnFecha(contexto);
  const conMinimo = permiteAbrir ? turnosConMinimoEnFecha(contexto) : [];

  // Un bloqueo por horas solo cierra el día si deja sin ningún turno
  const delDia = [...libres, ...conMinimo];
  const sinBloqueo = parcial ? delDia.filter((t) => !bloqueoAfectaTurno(bloqueo, t)) : delDia;
  if (parcial && delDia.length && !sinBloqueo.length) {
    return { estado: "bloqueado", motivo: bloqueo.motivo || "" };
  }

  // Hoy, los turnos que ya han empezado no se ofrecen
  const aTiempoTodos = sinBloqueo.filter((t) => !turnoYaEmpezado(fecha, t));
  // Los turnos sin plazas no cuentan: si no queda ninguno con hueco, el día está completo
  const aTiempo = completo ? aTiempoTodos.filter((t) => !completo(fecha, t)) : aTiempoTodos;
  if (aTiempoTodos.length && !aTiempo.length) return { estado: "completo" };
  if (aTiempo.some((t) => libres.includes(t))) return { estado: "disponible" };
  if (aTiempo.length) return { estado: "solo-grupo", minimo: sinNumeroMinimo ? 0 : minPersonasHabilitar(clase) };
  return { estado: "sin-taller" };
}

// La ficha de un taller con sus turnos extra (los creados desde el panel para fechas concretas),
// que es lo que hay que pasar a `useDiaDeReserva`, `estadoDiaTaller` y las reglas de turnos.
// `turnosExtra` es el del contexto de reserva (todos los talleres).
export function useClaseConTurnosExtra(clase, claseId, turnosExtra) {
  const delTaller = claseId ? turnosExtra?.[claseId] : null;
  return useMemo(() => conTurnosExtra(clase, delTaller), [clase, delTaller]);
}

// Fechas bloqueadas, fechas habilitadas, turnos extra, reservas de grupo y días abiertos (solo lectura).
// `cargado` indica que ya llegaron los datos (hasta entonces el calendario no
// debe dejar elegir día). `error` avisa de que no se ha podido leer: sin ellos no
// se sabe qué días están bloqueados, así que la pantalla no debe dejar reservar.
export function useContextoReserva() {
  const [contexto, setContexto] = useState({
    fechasBloqueadas: {},
    fechasHabilitadas: {},
    reservasGrupos: {},
    diasAbiertos: {},
    turnosExtra: {},
    error: false,
    cargado: false,
  });
  // Plazas ocupadas de cada franja y cupos, para marcar lo que está completo (si no llegan, no se marca nada)
  const [franjas, setFranjas] = useState(null);

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
            turnosExtra: {},
            error: true,
            cargado: true,
          });
        }
      });

    cargarFranjas()
      .then((datos) => {
        if (!cancelado) setFranjas(datos);
      })
      .catch((error) => console.error("Error al cargar las plazas de las franjas:", error));

    return () => {
      cancelado = true;
    };
  }, []);

  // ¿Se ha llenado el turno (sumando los que se solapan, con su cupo si lo hay)?
  const completo = useCallback(
    (fecha, turno) => {
      if (!franjas || !fecha || !turno) return false;
      const tope = aforoDeFranja(franjas.aforoTotal, franjas.cupos?.[fecha], turno);
      return sumarSolapadas(franjas.franjas?.[fecha], turno).total >= tope;
    },
    [franjas]
  );

  return { ...contexto, completo };
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
  const diaAbierto = (fecha && diasAbiertos?.[fecha]) || false;
  const turnosLibresBase = useMemo(
    () => turnosDisponiblesEnFecha({ clase, fecha, fechasHabilitadas, diaAbierto }),
    [clase, fecha, fechasHabilitadas, diaAbierto]
  );
  // Turnos que piden el mínimo de personas y siguen cerrados (solo donde se puede abrir)
  const turnosMinimoBase = useMemo(
    () => (permiteAbrir ? turnosConMinimoEnFecha({ clase, fecha, fechasHabilitadas, diaAbierto }) : []),
    [clase, fecha, fechasHabilitadas, diaAbierto, permiteAbrir]
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
  const sinBloqueo = (turnos) => (bloqueoParcial ? turnos.filter(libre) : turnos);
  const turnosLibresDelDia = sinBloqueo(turnosLibresBase);
  const turnosDisponibles = turnosLibresDelDia.filter(aTiempo);
  const turnosMinimo = sinBloqueo(turnosMinimoBase).filter(aTiempo);

  // Todo el día bloqueado, o un bloqueo por horas que deja el día sin turnos
  const fechaBloqueada = useMemo(() => {
    if (!fecha || !bloqueo?.bloqueado) return null;
    if (!bloqueoParcial) return bloqueo;
    const todos = [...turnosLibresBase, ...turnosMinimoBase];
    return todos.length && todos.every((t) => !libre(t)) ? bloqueo : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha, bloqueo, bloqueoParcial, turnosLibresBase, turnosMinimoBase]);

  // Día en el que todos los turnos piden el mínimo de personas del taller y están cerrados
  const diaSoloGrupo = !!fecha && !fechaBloqueada && turnosLibresDelDia.length === 0 && turnosMinimo.length > 0;
  const diaNoDisponible = !!fecha && !fechaBloqueada && turnosDisponibles.length === 0 && !diaSoloGrupo;

  // Los turnos se ofrecen en el orden del horario, mezclados los libres y los azules
  const ofrecidos = new Set([...turnosDisponibles, ...turnosMinimo]);
  const turnosOfrecidos = turnosDelDia(clase, fecha).filter((t) => ofrecidos.has(t));

  return {
    turnosDisponibles: turnosOfrecidos,
    turnosMinimo,
    fechaHabilitadaManual,
    fechaBloqueada,
    bloqueoParcial,
    diaNoDisponible,
    diaSoloGrupo,
  };
}
