// src/utils/monografico.js
// Talleres monográficos: solo se dan en fechas concretas, agrupadas en ediciones.
// Cada edición es un conjunto de sesiones (el curso tiene `sesionesCurso`), cada una con su fecha y turno; un mismo día puede tener dos sesiones
// cada uno, y se reserva entera. Sin React ni Firebase: lo usan las pantallas y las
// funciones de Vercel.
//
//   clases/{id}: { monografico: true, sesionesCurso: 3,
//                  ediciones: [{ id, fechas: [{ fecha: "2026-04-24", turno: "17:30-20:30", torno: false }] }] }

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const esMonografico = (clase) => clase?.monografico === true;

const comoLista = (valor) =>
  Array.isArray(valor) ? valor : valor && typeof valor === "object" ? Object.values(valor) : [];

// Ediciones guardadas → [{ id, fechas: [{ fecha, turno }] }], con las sesiones en orden
// y sin los que no tienen fecha válida. Las ediciones van por su primer día.
export function edicionesDeClase(clase) {
  return comoLista(clase?.ediciones)
    .map((edicion, indice) => ({
      id: String(edicion?.id || `ed${indice + 1}`),
      fechas: comoLista(edicion?.fechas)
        .map((f) => ({ fecha: String(f?.fecha || ""), turno: String(f?.turno || ""), torno: f?.torno === true }))
        .filter((f) => FECHA.test(f.fecha))
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.turno.localeCompare(b.turno)),
    }))
    .filter((edicion) => edicion.fechas.length)
    .sort((a, b) => a.fechas[0].fecha.localeCompare(b.fechas[0].fecha));
}

export const primeraFecha = (edicion) => edicion?.fechas?.[0]?.fecha || "";
export const ultimaFecha = (edicion) => edicion?.fechas?.[edicion.fechas.length - 1]?.fecha || "";

// Se puede reservar una edición hasta el día de su primera fecha (incluido)
export const edicionReservable = (edicion, hoy) => !!edicion && primeraFecha(edicion) >= hoy;

export const edicionesReservables = (clase, hoy) =>
  edicionesDeClase(clase).filter((edicion) => edicionReservable(edicion, hoy));

// El taller se ve mientras quede alguna edición por empezar; al pasar la primera
// fecha de la última se oculta, y reaparece si se añade una edición futura
export const monograficoVisible = (clase, hoy) =>
  !esMonografico(clase) || edicionesReservables(clase, hoy).length > 0;

export const edicionPorId = (clase, id) =>
  edicionesDeClase(clase).find((edicion) => edicion.id === id) || null;
