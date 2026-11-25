// src/utils/turnosExtra.js
// Crear turnos para fechas concretas desde el panel («Abrir días» y el calendario). Sin React
// ni Firebase: lo usan las pantallas del panel y las funciones de Vercel.
//
//   turnosExtra/{claseId}/{fecha}/{inicio} = { turno: "10:00-13:00", minimo: false, motivo?, creadoEn }
//
// Es un turno más de ese taller ese día, además de los de su horario semanal (aunque el taller
// no dé clase ese día de la semana). La hora de fin sale de la duración de cada taller al
// crearlo y es la clave de las reservas, como en el horario semanal. Con `minimo` pide el
// mínimo de personas del taller, igual que un turno «Mín.» del horario. Cómo se suman al
// horario: `conTurnosExtra`, `turnosDelDia` y `turnosMinimoDeClase` en `turnosFecha.js`.
import { duracionDeFicha, inicioDeTurno, turnoDesdeInicio } from "./duracionTurno.js";
import { abreDias, limpiarTurno, nombreDiaSemana, normalizarTurnos } from "./turnosFecha.js";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const comoObjeto = (valor) => (valor && typeof valor === "object" && !Array.isArray(valor) ? valor : {});

// Todas las fechas AAAA-MM-DD entre inicio y fin, ambas incluidas ([] si no valen)
export function fechasDeRango(inicio, fin) {
  if (!FECHA.test(inicio || "") || !FECHA.test(fin || "") || fin < inicio) return [];
  const fechas = [];
  const actual = new Date(`${inicio}T12:00:00`);
  const final = new Date(`${fin}T12:00:00`);
  while (actual <= final && fechas.length < 400) {
    const mm = String(actual.getMonth() + 1).padStart(2, "0");
    const dd = String(actual.getDate()).padStart(2, "0");
    fechas.push(`${actual.getFullYear()}-${mm}-${dd}`);
    actual.setDate(actual.getDate() + 1);
  }
  return fechas;
}

// Solo los turnos extra de hoy en adelante: los de días pasados no sirven y la lectura pública
// no tiene por qué cargarlos. { claseId: { fecha: { inicio: {...} } } }
export function turnosExtraDesde(nodo, desde = "") {
  const resultado = {};
  for (const [claseId, fechas] of Object.entries(comoObjeto(nodo))) {
    const futuras = Object.fromEntries(
      Object.entries(comoObjeto(fechas)).filter(([fecha]) => FECHA.test(fecha) && (!desde || fecha >= desde))
    );
    if (Object.keys(futuras).length) resultado[claseId] = futuras;
  }
  return resultado;
}

// Lo que necesita quien reserva de cada turno extra: el turno y si pide el mínimo de personas.
// El motivo y la fecha de creación son del panel y no salen en la API pública.
export function turnosExtraPublicos(nodo, desde = "") {
  const publico = {};
  for (const [claseId, porFecha] of Object.entries(turnosExtraDesde(nodo, desde))) {
    publico[claseId] = {};
    for (const [fecha, entradas] of Object.entries(porFecha)) {
      const limpias = {};
      for (const [inicio, e] of Object.entries(comoObjeto(entradas))) {
        if (typeof e?.turno === "string") limpias[inicio] = { turno: e.turno, minimo: e.minimo === true };
      }
      if (Object.keys(limpias).length) publico[claseId][fecha] = limpias;
    }
    if (!Object.keys(publico[claseId]).length) delete publico[claseId];
  }
  return publico;
}

// Talleres y bonos del panel a los que se les puede crear un turno: los que tienen horario
// semanal. Los monográficos (fechas fijas por edición) y los de siempre sin migrar no.
// [{ id, nombre, duracion, bono }]
export function clasesConTurnos(clases = {}) {
  return Object.entries(comoObjeto(clases))
    .filter(([, clase]) => abreDias(clase))
    .map(([id, clase]) => ({
      id,
      nombre: String(clase.nombre || clase["nombre "] || id),
      duracion: duracionDeFicha(clase),
      bono: clase.tipoProducto === "bono",
      oculta: clase.estado === "oculta" || clase.activa === false,
    }))
    .sort((a, b) => Number(a.bono) - Number(b.bono) || a.nombre.localeCompare(b.nombre, "es"));
}

// Qué se crea y qué se deja como está al crear turnos nuevos.
//   claseIds: talleres elegidos; fechas: días (AAAA-MM-DD); turnos: [{ inicio: "10:00", minimo }]
//   extrasActuales: el nodo /turnosExtra tal como está ahora
// Si un taller ya tiene un turno con esa hora de inicio ese día —en su horario semanal o como
// turno extra— no se crea y se deja el que estaba. Tampoco se crean en días pasados ni si la
// clase acabaría pasada la medianoche con la duración de ese taller.
// Devuelve { cambios, creados, omitidos } con `cambios` listo para `update(ref(db), cambios)`.
export function planificarTurnosExtra({
  clases = {},
  claseIds = [],
  fechas = [],
  turnos = [],
  extrasActuales = {},
  motivo = "",
  hoy = "",
  creadoEn = Date.now(),
}) {
  const cambios = {};
  const creados = [];
  const omitidos = [];

  const pedidos = [];
  for (const t of turnos) {
    const inicio = inicioDeTurno(t?.inicio);
    if (inicio && !pedidos.some((p) => p.inicio === inicio)) pedidos.push({ inicio, minimo: t?.minimo === true });
  }

  for (const claseId of claseIds) {
    const clase = clases?.[claseId];
    if (!abreDias(clase)) continue;
    const duracion = duracionDeFicha(clase);

    for (const fecha of fechas) {
      if (hoy && fecha < hoy) {
        omitidos.push({ claseId, fecha, motivo: "pasado" });
        continue;
      }

      const delHorario = new Set(
        normalizarTurnos(clase.horarios?.[nombreDiaSemana(fecha)])
          .map((t) => inicioDeTurno(limpiarTurno(t)))
          .filter(Boolean)
      );

      for (const { inicio, minimo } of pedidos) {
        const turno = turnoDesdeInicio(inicio, duracion);
        if (!turno) omitidos.push({ claseId, fecha, inicio, motivo: "medianoche" });
        else if (delHorario.has(inicio)) omitidos.push({ claseId, fecha, inicio, motivo: "horario" });
        else if (comoObjeto(comoObjeto(comoObjeto(extrasActuales)[claseId])[fecha])[inicio]) {
          omitidos.push({ claseId, fecha, inicio, motivo: "extra" });
        } else {
          cambios[`turnosExtra/${claseId}/${fecha}/${inicio}`] = {
            turno,
            minimo,
            ...(motivo ? { motivo } : {}),
            creadoEn,
          };
          creados.push({ claseId, fecha, inicio, turno, minimo });
        }
      }
    }
  }

  return { cambios, creados, omitidos };
}

// Los turnos extra de hoy en adelante agrupados por fecha, hora de inicio y «Mín.»:
// [{ fecha, inicio, minimo, motivo, talleres: [claseId…] }], por fecha y hora.
// Con `fechas` (lista) solo las de esos días.
export function agruparTurnosExtra(nodo, { desde = "", fechas = null } = {}) {
  const grupos = new Map();
  for (const [claseId, porFecha] of Object.entries(turnosExtraDesde(nodo, desde))) {
    for (const [fecha, entradas] of Object.entries(porFecha)) {
      if (fechas && !fechas.includes(fecha)) continue;
      for (const [inicio, e] of Object.entries(comoObjeto(entradas))) {
        const minimo = e?.minimo === true;
        const clave = `${fecha}|${inicio}|${minimo}`;
        if (!grupos.has(clave)) grupos.set(clave, { fecha, inicio, minimo, motivo: "", talleres: [] });
        const grupo = grupos.get(clave);
        grupo.talleres.push(claseId);
        if (!grupo.motivo && e?.motivo) grupo.motivo = String(e.motivo);
      }
    }
  }
  return [...grupos.values()].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.inicio.localeCompare(b.inicio) || Number(a.minimo) - Number(b.minimo)
  );
}

// Cambios para quitar un grupo (o parte de él: `talleres`) de turnosExtra
export const cambiosParaQuitar = (grupo, talleres = grupo.talleres) =>
  Object.fromEntries(talleres.map((claseId) => [`turnosExtra/${claseId}/${grupo.fecha}/${grupo.inicio}`, null]));

const MOTIVOS = {
  horario: "ya tenía ese turno en su horario",
  extra: "ya tenía ese turno creado",
  medianoche: "la clase acabaría pasada la medianoche",
  pasado: "el día ya pasó",
};

// Texto para el aviso tras crear: cuántos talleres reciben el turno y cuáles se dejan como estaban
export function resumenPlan(plan, clases = {}) {
  const talleresCon = (lista) => new Set(lista.map((o) => o.claseId));
  const nombre = (id) => String(clases?.[id]?.nombre || clases?.[id]?.["nombre "] || id);
  const partes = [];

  const talleresCreados = talleresCon(plan.creados);
  if (plan.creados.length) {
    partes.push(
      `Turno creado en ${talleresCreados.size} ${talleresCreados.size === 1 ? "taller" : "talleres"} (${plan.creados.length} ${
        plan.creados.length === 1 ? "turno" : "turnos"
      }).`
    );
  }

  for (const motivo of ["horario", "extra", "medianoche", "pasado"]) {
    const lista = plan.omitidos.filter((o) => o.motivo === motivo);
    if (!lista.length) continue;
    const talleres = [...talleresCon(lista)];
    const ejemplo = talleres.slice(0, 3).map(nombre).join(", ");
    const resto = talleres.length > 3 ? ` y ${talleres.length - 3} más` : "";
    partes.push(
      motivo === "pasado"
        ? "No se crearon turnos en días que ya pasaron."
        : `${talleres.length} ${talleres.length === 1 ? "taller" : "talleres"} sin cambios, ${MOTIVOS[motivo]}: ${ejemplo}${resto}.` +
            (motivo === "horario" || motivo === "extra" ? " Se dejó el que estaba." : "")
    );
  }

  return partes.join(" ");
}
