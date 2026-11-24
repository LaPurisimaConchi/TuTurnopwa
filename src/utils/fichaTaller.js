// src/utils/fichaTaller.js
// Conversión entre la ficha de un taller en Firebase (clases/{id}) y el
// formulario del panel admin. Son funciones puras, sin acceso a la base de datos.
import { edicionesDeClase } from "./monografico";
import { diasEntreSesionesDe } from "./sesionesTaller";
import {
  GRUPOS_TALLER,
  METODOS_TALLER,
  exigeCuenta,
  metodosDelTaller,
  variantesDelTaller,
} from "../catalogoTalleres";

export const DIAS = [
  ["lunes", "Lunes"],
  ["martes", "Martes"],
  ["miercoles", "Miércoles"],
  ["jueves", "Jueves"],
  ["viernes", "Viernes"],
  ["sabado", "Sábado"],
  ["domingo", "Domingo"],
];

export const GRUPO_BONOS = "cursos_bonos";

export const FORMULARIO_VACIO = {
  nombre: "",
  id: "",
  tipoProducto: "taller",
  grupo: "crear_piezas",
  descripcionCorta: "",
  descripcionLarga: "",
  notaImportante: "",
  mostrarAvisos: true,
  secciones: [],
  sesiones: "1",
  diasEntreSesiones: [], // días mínimos entre sesiones: [entre la 1 y la 2, entre la 2 y la 3…]
  modalidad: "metodos",
  metodos: { torno: true, "modelado a mano": true, "decoración con esmaltes": false },
  precios: { torno: "", modelado: "", decoracion: "" },
  varianteEtiqueta: "Tipo de pieza",
  variantes: [],
  extrasMetodo: { torno: "", modelado: "" },
  precioUnico: "",
  maxTotales: "10",
  maxTorno: "6",
  minPersonasGrupo: "5",
  bono: {
    numeroClases: "4",
    diasCaducidad: "31",
    duracionClase: "3 horas",
    modalidad: "",
    distribucionClases: "",
    incluyeDecoracion: false,
    extraCambioTorno: "",
  },
  horarios: Object.fromEntries(DIAS.map(([dia]) => [dia, ""])),
  // Turnos de cada día que piden el mínimo de personas para abrirse (subconjunto del horario)
  horariosMinimo: Object.fromEntries(DIAS.map(([dia]) => [dia, ""])),
  // Usa los horarios por defecto de «Espacio»: «Aplicar a todos los talleres» solo cambia
  // los talleres que lo tienen marcado
  horariosPorDefecto: true,
  estado: "activa",
  enPortada: true,
  regalable: true,
  requiereCuenta: false,
  orden: "",
  // Monográfico: solo en fechas concretas, agrupadas en ediciones
  monografico: false,
  sesionesCurso: "1",
  ediciones: [],
};

// "Taller de Esmaltes" → "tallerdeesmaltes" (mismo estilo que los ids actuales)
export const generarId = (texto = "") =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 40);

// Acepta "17:30 - 20:30" y "17:30 a 20:30"
export const normalizarTurno = (turno) =>
  turno.replace(/\s+a\s+/gi, "-").replace(/\s+/g, "");
export const TURNO_VALIDO = /^\d{1,2}:\d{2}-\d{1,2}:\d{2}$/;

export const leerTurnos = (texto = "") =>
  texto
    .split(/[,;\n]/)
    .map((t) => normalizarTurno(t.trim()))
    .filter(Boolean);

// Los turnos «a consultar» (sin hora) se admiten tal cual
export const turnoInvalido = (turno) =>
  !TURNO_VALIDO.test(turno) && !/consultar/i.test(turno);

export const numeroPositivo = (valor) => {
  const n = Number(String(valor ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const lineas = (texto = "") =>
  String(texto)
    .split("\n")
    .map((linea) => linea.replace(/^[•\-*]\s*/, "").trim())
    .filter(Boolean);


// Secciones guardadas → formulario. Las fichas anteriores a las secciones
// llevaban «incluye» y «duracion» sueltos: se convierten en secciones.
export function seccionesDesdeClase(clase = {}) {
  if (Array.isArray(clase.secciones)) {
    return clase.secciones.map((s) => ({
      titulo: s.titulo || "",
      texto: s.texto || "",
      items: Array.isArray(s.items) ? s.items.join("\n") : "",
      destacada: !!s.destacada,
    }));
  }

  const secciones = [];
  if (Array.isArray(clase.incluye) && clase.incluye.length) {
    secciones.push({
      titulo: "Qué incluye",
      texto: "",
      items: clase.incluye.join("\n"),
      destacada: false,
    });
  }
  if (typeof clase.duracion === "string" && clase.duracion.trim()) {
    secciones.push({ titulo: "Duración", texto: clase.duracion, items: "", destacada: false });
  }
  return secciones;
}

export function formularioDesdeClase(id, clase = {}) {
  const precios = clase.precios || {};
  const esBono = clase.tipoProducto === "bono";
  const variantes = variantesDelTaller(clase);
  const metodosActivos = metodosDelTaller(clase).map((m) => m.id);
  const horarios = clase.horarios || {};

  const modalidad = esBono
    ? "unico"
    : variantes.length
    ? "variante"
    : metodosActivos.length
    ? "metodos"
    : "unico";

  const metodosMarcados = Object.fromEntries(
    METODOS_TALLER.map((m) => [m.id, metodosActivos.includes(m.id)])
  );

  return {
    ...FORMULARIO_VACIO,
    nombre: clase.nombre || clase["nombre "] || "",
    id,
    tipoProducto: esBono ? "bono" : "taller",
    grupo: clase.grupo || "otros",
    descripcionCorta: clase.descripcionCorta || "",
    descripcionLarga: clase.descripcionLarga || "",
    notaImportante: clase.notaImportante || "",
    mostrarAvisos: clase.mostrarAvisos !== false,
    secciones: seccionesDesdeClase(clase),
    sesiones: String(clase.sesiones || 1),
    diasEntreSesiones: diasEntreSesionesDe(clase).map(String),
    modalidad,
    metodos: metodosMarcados,
    precios: {
      torno: precios.torno ? String(precios.torno) : "",
      modelado: precios.modelado ? String(precios.modelado) : "",
      decoracion: precios.decoracion ? String(precios.decoracion) : "",
    },
    varianteEtiqueta: clase.variante?.etiqueta || "Tipo de pieza",
    variantes: variantes.map((v) => ({ id: v.id, nombre: v.nombre, precio: String(v.precio || "") })),
    extrasMetodo: {
      torno: clase.extrasMetodo?.torno ? String(clase.extrasMetodo.torno) : "",
      modelado: clase.extrasMetodo?.modelado ? String(clase.extrasMetodo.modelado) : "",
    },
    precioUnico: clase.precio ? String(clase.precio) : "",
    maxTotales: String(clase.plazas?.maxTotales || ""),
    maxTorno: String(clase.plazas?.maxTorno || ""),
    minPersonasGrupo: String(clase.minPersonasGrupo || 5),
    bono: {
      numeroClases: String(clase.numeroClases ?? clase.NumeroClases ?? "4"),
      diasCaducidad: String(clase.diasCaducidad ?? 31),
      duracionClase: clase.duracionClase || clase.duracion || "",
      modalidad: clase.modalidad || "",
      distribucionClases: clase.distribucionClases || "",
      incluyeDecoracion: !!clase.incluyeDecoracion,
      extraCambioTorno: clase.permiteCambioTorno
        ? String(clase.extraCambioTorno ?? clase.ExtraCambioTorno ?? "")
        : "",
    },
    horarios: Object.fromEntries(
      DIAS.map(([dia]) => [
        dia,
        Array.isArray(horarios[dia]) ? horarios[dia].join(", ") : String(horarios[dia] || ""),
      ])
    ),
    // Los talleres anteriores a esta casilla cuentan como marcados
    horariosPorDefecto: clase.horariosPorDefecto !== false,
    horariosMinimo: Object.fromEntries(
      DIAS.map(([dia]) => {
        const valor = clase.horariosMinimo?.[dia];
        return [dia, Array.isArray(valor) ? valor.join(", ") : String(valor || "")];
      })
    ),
    estado: clase.estado || (clase.activa === false ? "oculta" : "activa"),
    enPortada: clase.enPortada !== false,
    regalable: clase.regalable !== false,
    requiereCuenta: exigeCuenta(clase),
    orden: clase.orden != null ? String(clase.orden) : "",
    monografico: clase.monografico === true,
    sesionesCurso: String(clase.sesionesCurso || 1),
    ediciones: edicionesDeClase(clase).map((edicion) => ({
      id: edicion.id,
      fechas: edicion.fechas.map((f) => ({ fecha: f.fecha, turno: f.turno, torno: !!f.torno })),
    })),
  };
}


// Horario semanal escrito en el formulario → lo que se guarda en la ficha: `horarios` y
// `horariosMinimo` por día, y `turnos` (todos los del horario, que leen las pantallas de
// siempre). Solo valen como «mínimo» los turnos del día que tienen horas.
export function horariosDesdeTexto(horariosTexto = {}, minimoTexto = {}) {
  const horarios = {};
  const horariosMinimo = {};
  DIAS.forEach(([dia]) => {
    const turnos = leerTurnos(horariosTexto[dia]);
    if (turnos.length) horarios[dia] = turnos;
    const marcados = leerTurnos(minimoTexto?.[dia]).filter((t) => TURNO_VALIDO.test(t) && turnos.includes(t));
    if (marcados.length) horariosMinimo[dia] = marcados;
  });
  const turnos = [...new Set(Object.values(horarios).flat())].sort();
  return { horarios, horariosMinimo, turnos };
}

export function construirFicha(form, original = {}, categorias = GRUPOS_TALLER) {
  const esBono = form.tipoProducto === "bono";
  const { horarios, horariosMinimo, turnos } = horariosDesdeTexto(form.horarios, form.horariosMinimo);

  const conMetodos = !esBono && form.modalidad === "metodos";
  const conVariantes = !esBono && form.modalidad === "variante";
  const metodosElegidos = METODOS_TALLER.filter((m) => form.metodos[m.id]);

  let precios = null;
  if (conMetodos) {
    precios = Object.fromEntries(
      metodosElegidos.map((m) => [m.clavePrecio, numeroPositivo(form.precios[m.clavePrecio])])
    );
  } else if (conVariantes) {
    precios = Object.fromEntries(
      form.variantes.map((v) => [v.id || generarId(v.nombre), numeroPositivo(v.precio)])
    );
  }

  const precio = numeroPositivo(form.precioUnico);
  const precioDesde = precios ? Math.min(...Object.values(precios)) : precio;
  const grupo = categorias.find((g) => g.id === (esBono ? GRUPO_BONOS : form.grupo));
  const extraTorno = numeroPositivo(form.bono.extraCambioTorno);

  return {
    nombre: form.nombre.trim(),
    dinamica: true,
    tipoProducto: esBono ? "bono" : "taller",
    grupo: grupo?.id || form.grupo,
    categoria: grupo?.titulo || "",
    slug: original.slug || form.id,
    descripcionCorta: form.descripcionCorta.trim(),
    descripcionLarga: form.descripcionLarga.trim(),
    notaImportante: form.notaImportante.trim(),
    mostrarAvisos: !!form.mostrarAvisos,
    secciones: form.secciones
      .map((s) => ({
        titulo: s.titulo.trim(),
        texto: s.texto.trim(),
        items: lineas(s.items),
        destacada: !!s.destacada,
      }))
      .filter((s) => s.titulo || s.texto || s.items.length),
    precios,
    // Con precios por método u opción, el «precio» suelto no se toca
    ...(precios ? {} : { precio }),
    precioDesde,
    metodos: conMetodos || conVariantes ? metodosElegidos.map((m) => m.id) : null,
    variante: conVariantes
      ? {
          etiqueta: form.varianteEtiqueta.trim() || "Opción",
          campo: original.variante?.campo || "tipoPieza",
          campoNombre: original.variante?.campoNombre || "nombreTipoPieza",
          opciones: form.variantes.map((v) => ({
            id: v.id || generarId(v.nombre),
            nombre: v.nombre.trim(),
          })),
        }
      : null,
    // Extra por método (solo con precio por tipo o tamaño): se suma al precio de la opción
    extrasMetodo: conVariantes
      ? Object.fromEntries(
          METODOS_TALLER.filter((m) => form.metodos[m.id] && numeroPositivo(form.extrasMetodo?.[m.clavePrecio]) > 0).map(
            (m) => [m.clavePrecio, numeroPositivo(form.extrasMetodo[m.clavePrecio])]
          )
        )
      : null,
    horarios,
    horariosMinimo,
    horariosPorDefecto: !!form.horariosPorDefecto,
    turnos,
    estado: form.estado,
    activa: form.estado === "activa",
    enPortada: !!form.enPortada,
    regalable: !!form.regalable,
    requiereCuenta: esBono || !!form.requiereCuenta,
    orden: form.orden === "" ? 999 : Number(form.orden),
    ...(!esBono && form.monografico
      ? {
          monografico: true,
          sesionesCurso: Math.max(1, Math.round(numeroPositivo(form.sesionesCurso) || 1)),
          ediciones: form.ediciones
            .map((edicion, indice) => ({
              id: edicion.id || `ed${indice + 1}`,
              fechas: edicion.fechas
                .filter((f) => f.fecha)
                .map((f) => ({ fecha: f.fecha, turno: normalizarTurno(f.turno || ""), torno: !!f.torno }))
                .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.turno.localeCompare(b.turno)),
            }))
            .filter((edicion) => edicion.fechas.length),
        }
      : { monografico: null, sesionesCurso: null, ediciones: null }),
    ...(esBono
      ? {
          numeroClases: Math.round(numeroPositivo(form.bono.numeroClases)),
          diasCaducidad: Math.round(numeroPositivo(form.bono.diasCaducidad)) || 31,
          duracionClase: form.bono.duracionClase.trim(),
          modalidad: form.bono.modalidad.trim(),
          distribucionClases: form.bono.distribucionClases.trim() || null,
          ...(form.bono.incluyeDecoracion || original.incluyeDecoracion !== undefined
            ? { incluyeDecoracion: !!form.bono.incluyeDecoracion }
            : {}),
          ...(extraTorno > 0
            ? { permiteCambioTorno: true, extraCambioTorno: extraTorno }
            : original.permiteCambioTorno
            ? { permiteCambioTorno: false, extraCambioTorno: null }
            : {}),
          subtipo: original.subtipo || `${Math.round(numeroPositivo(form.bono.numeroClases))}_clases`,
        }
      : {
          sesiones: Math.max(1, Math.round(numeroPositivo(form.sesiones) || 1)),
          // Días mínimos entre sesiones (solo con varias sesiones)
          diasEntreSesiones:
            Math.round(numeroPositivo(form.sesiones)) > 1
              ? Array.from({ length: Math.round(numeroPositivo(form.sesiones)) - 1 }, (_, i) =>
                  Math.min(365, Math.max(1, Math.round(numeroPositivo(form.diasEntreSesiones?.[i])) || 28))
                )
              : null,
          minPersonasGrupo: numeroPositivo(form.minPersonasGrupo)
            ? Math.round(numeroPositivo(form.minPersonasGrupo))
            : null,
        }),
  };
  }
