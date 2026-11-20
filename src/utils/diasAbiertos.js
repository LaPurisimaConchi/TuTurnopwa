// src/utils/diasAbiertos.js
// Días sin horario que se abren con una reserva del mínimo de personas del taller.
// Sin React ni Firebase: lo usan las pantallas y las funciones de Vercel.
//
// Un taller del panel no tiene taller un día sin horario semanal (ni fecha habilitada
// a mano). Ese día se puede abrir: una reserva (normal o de grupo) con, al menos, el
// mínimo de personas que fija la ficha del taller (`minPersonasGrupo`, 5 por defecto)
// lo abre, y entonces cualquiera puede reservar cualquier taller con los «turnos de
// días abiertos» de su ficha. No se guarda nada: el día está abierto mientras haya
// alguna reserva vigente (confirmada, o pendiente con la plaza aún guardada) que se
// hizo en un día sin horario de su taller; sin ella, vuelve a estar cerrado.
import { minPersonasHabilitar } from "../catalogoBase.js";
import { recorrerOcupacion } from "./aforo.js";
import { nombreDiaSemana, normalizarTurnos, turnosDiasAbiertos } from "./turnosFecha.js";

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

// Días abiertos desde `desde`: { "2026-11-27": true }. `reservas` y `grupos` son los
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
      if (dias[e.fecha] || !e.claseId) return;
      const clase = clases?.[e.claseId];
      if (!abreDias(clase)) return;
      if (!tallerTieneHorarioEnFecha(clase, e.fecha, fechasHabilitadas)) dias[e.fecha] = true;
    },
    { desde, ahoraMs }
  );

  return dias;
}
