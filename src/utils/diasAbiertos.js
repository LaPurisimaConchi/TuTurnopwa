// src/utils/diasAbiertos.js
// Franjas de días sin horario que se abren con una reserva del mínimo de personas del taller.
// Sin React ni Firebase: lo usan las pantallas y las funciones de Vercel.
//
// Un taller del panel no tiene taller un día sin horario semanal (ni fecha habilitada
// a mano). Ese día se puede abrir: una reserva (normal o de grupo) con, al menos, el
// mínimo de personas que fija la ficha del taller (`minPersonasGrupo`, 5 por defecto)
// lo abre, pero solo su franja (el turno de esa reserva): cualquier taller sin horario
// ese día se puede reservar, con cualquier número de personas, en los «turnos de días
// abiertos» de su ficha que empiecen dentro de alguna franja abierta. Los demás turnos
// solo se reservan si la reserva llega por sí misma al mínimo (y abre su franja). No se
// guarda nada: la franja está abierta mientras haya una reserva vigente (confirmada, o
// pendiente con la plaza aún guardada) con el mínimo de personas hecha en un día sin
// horario de su taller; sin ella, vuelve a estar cerrada.
import { minPersonasHabilitar } from "../catalogoBase.js";
import { recorrerOcupacion } from "./aforo.js";
import {
  esTurnoConHoras,
  limpiarTurno,
  nombreDiaSemana,
  normalizarTurnos,
  turnoEmpiezaEnFranjas,
  turnosDiasAbiertos,
} from "./turnosFecha.js";

// ¿El taller tiene horario ese día (semanal, o fecha habilitada desde el panel)?
export function tallerTieneHorarioEnFecha(clase, fecha, fechasHabilitadas = {}) {
  if (fechasHabilitadas?.[fecha]?.habilitada) return true;
  return normalizarTurnos(clase?.horarios?.[nombreDiaSemana(fecha)]).length > 0;
}

// Solo los talleres del panel con horario semanal abren días: los de siempre sin
// migrar, los monográficos (fechas fijas) y los bonos no.
export const abreDias = (clase) =>
  !!clase && clase.dinamica === true && clase.monografico !== true && clase.tipoProducto !== "bono";

// ¿Puede una reserva de `plazas` personas abrir un día cerrado de este taller?
export const puedeAbrirDia = (clase, plazas) =>
  abreDias(clase) &&
  turnosDiasAbiertos(clase).length > 0 &&
  Number(plazas) >= minPersonasHabilitar(clase);

// ¿Este turno se puede reservar en un día sin horario, sin llegar por sí mismo al
// mínimo? Solo si empieza dentro de la franja de alguna reserva que abrió el día.
export const turnoAbiertoEnDia = (diasAbiertos, fecha, turno) => {
  const franjas = diasAbiertos?.[fecha];
  if (!franjas) return false;
  return Array.isArray(franjas) ? turnoEmpiezaEnFranjas(turno, franjas) : true;
};

// Días abiertos desde `desde`: { "2026-11-27": ["10:00-14:00"] }, con las franjas de las
// reservas que llegaron al mínimo de personas de su taller (solo esas abren).
// Un turno de otro taller queda abierto si empieza dentro de alguna franja. `reservas` y `grupos` son los
// snapshots de /reservas y /reservasGrupos; `clases`, el contenido de /clases.
export function calcularDiasAbiertos({
  reservas,
  grupos,
  clases = {},
  fechasHabilitadas = {},
  desde = "",
  ahoraMs = Date.now(),
}) {
  const dias = {};

  recorrerOcupacion(
    reservas,
    grupos,
    (e) => {
      if (!e.claseId) return;
      const clase = clases?.[e.claseId];
      if (!abreDias(clase) || e.plazas < minPersonasHabilitar(clase)) return;
      if (tallerTieneHorarioEnFecha(clase, e.fecha, fechasHabilitadas)) return;

      const franja = limpiarTurno(e.turno);
      if (!esTurnoConHoras(franja)) return;
      if (!dias[e.fecha]) dias[e.fecha] = [];
      if (!dias[e.fecha].includes(franja)) dias[e.fecha].push(franja);
    },
    { desde, ahoraMs }
  );

  return dias;
}
