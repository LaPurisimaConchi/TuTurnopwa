// src/utils/diasAbiertos.js
// Franjas que abre una reserva con el mínimo de personas del taller en un turno que lo pide.
// Sin React ni Firebase: lo usan las pantallas y las funciones de Vercel.
//
// Un taller del panel marca en su horario semanal los turnos que piden el mínimo de
// personas (`horariosMinimo`). Ese turno solo se reserva si la reserva llega por sí sola
// al mínimo que fija la ficha del taller (`minPersonasGrupo`, 5 por defecto) o si ya está
// abierto. Una reserva (normal o de grupo) con el mínimo de personas en un turno marcado
// lo abre, y con él los turnos marcados de cualquier taller que empiecen dentro de su
// franja (ver `turnoEmpiezaEnFranjas`): entonces cualquiera los reserva con cualquier
// número de personas. No se guarda nada: la franja está abierta mientras haya una reserva
// vigente (confirmada, o pendiente con la plaza aún guardada) con el mínimo de personas
// hecha en un turno marcado de su taller; sin ella, vuelve a estar cerrada. Los turnos
// sin marcar no abren nada ni necesitan abrirse. Una fecha habilitada desde administración
// abre además los turnos marcados que caben en sus franjas (`turnoAbiertoSinMinimo`).
import { minPersonasHabilitar } from "../catalogoBase.js";
import { recorrerOcupacion } from "./aforo.js";
import {
  abreDias,
  conTurnosExtra,
  esTurnoConHoras,
  limpiarTurno,
  turnoEmpiezaEnFranjas,
  turnosDelDia,
  turnosMinimoDeClase,
} from "./turnosFecha.js";

export { abreDias };

// ¿El taller da clase ese día? Cuenta el horario semanal y los turnos extra creados para esa
// fecha: una fecha habilitada desde administración no crea turnos, solo abre los que ya
// piden el mínimo.
export function tallerTieneHorarioEnFecha(clase, fecha) {
  return turnosDelDia(clase, fecha).length > 0;
}

// ¿Puede una reserva de `plazas` personas abrir un turno de este taller que pide el mínimo?
export const puedeAbrirDia = (clase, plazas) =>
  abreDias(clase) && Number(plazas) >= minPersonasHabilitar(clase);

// ¿Este turno se puede reservar con cualquier número de personas porque lo abrió otra
// reserva? Solo si empieza dentro de la franja de alguna que llegó al mínimo.
export const turnoAbiertoEnDia = (diasAbiertos, fecha, turno) => {
  const franjas = diasAbiertos?.[fecha];
  if (!franjas) return false;
  return Array.isArray(franjas) ? turnoEmpiezaEnFranjas(turno, franjas) : true;
};

// Franjas abiertas desde `desde`: { "2026-11-27": ["10:00-14:00"] }, las de las reservas
// que llegaron al mínimo de personas de su taller en un turno marcado (solo esas abren).
// `reservas` y `grupos` son los snapshots de /reservas y /reservasGrupos; `clases`, el
// contenido de /clases. `turnosExtra` es el nodo /turnosExtra: los turnos extra creados con el
// mínimo de personas también abren la franja.
export function calcularDiasAbiertos({
  reservas,
  grupos,
  clases = {},
  turnosExtra = {},
  desde = "",
  ahoraMs = Date.now(),
}) {
  const dias = {};
  const conExtras = new Map();
  const claseDe = (id) => {
    if (!conExtras.has(id)) conExtras.set(id, conTurnosExtra(clases?.[id], turnosExtra?.[id]));
    return conExtras.get(id);
  };

  recorrerOcupacion(
    reservas,
    grupos,
    (e) => {
      if (!e.claseId) return;
      const clase = claseDe(e.claseId);
      if (!abreDias(clase) || e.plazas < minPersonasHabilitar(clase)) return;

      const franja = limpiarTurno(e.turno);
      if (!esTurnoConHoras(franja)) return;
      if (!turnosMinimoDeClase(clase, e.fecha).includes(franja)) return;
      if (!dias[e.fecha]) dias[e.fecha] = [];
      if (!dias[e.fecha].includes(franja)) dias[e.fecha].push(franja);
    },
    { desde, ahoraMs }
  );

  return dias;
}
