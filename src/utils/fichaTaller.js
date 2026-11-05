// src/utils/fichaTaller.js
// Conversión entre la ficha de un taller en Firebase (clases/{id}) y el
// formulario del panel admin. Son funciones puras, sin acceso a la base de datos.
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
  modalidad: "metodos",
  metodos: { torno: true, "modelado a mano": true, "decoración con esmaltes": false },
  precios: { torno: "", modelado: "", decoracion: "" },
  varianteEtiqueta: "Tipo de pieza",
  variantes: [],
  precioUnico: "",
  maxTotales: "10",
  maxTorno: "6",
  bono: {
    numeroClases: "4",
    duracionClase: "3 horas",
    modalidad: "",
    distribucionClases: "",
    incluyeDecoracion: false,
    extraCambioTorno: "",
  },
  horarios: Object.fromEntries(DIAS.map(([dia]) => [dia, ""])),
  turnos: "",
  estado: "activa",
  enPortada: true,
  regalable: true,
  requiereCuenta: false,
  orden: "",
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
    modalidad,
    metodos: metodosMarcados,
    precios: {
      torno: precios.torno ? String(precios.torno) : "",
      modelado: precios.modelado ? String(precios.modelado) : "",
      decoracion: precios.decoracion ? String(precios.decoracion) : "",
    },
    varianteEtiqueta: clase.variante?.etiqueta || "Tipo de pieza",
    variantes: variantes.map((v) => ({ id: v.id, nombre: v.nombre, precio: String(v.precio || "") })),
    precioUnico: clase.precio ? String(clase.precio) : "",
    maxTotales: String(clase.plazas?.maxTotales || ""),
    maxTorno: String(clase.plazas?.maxTorno || ""),
    bono: {
      numeroClases: String(clase.numeroClases ?? clase.NumeroClases ?? "4"),
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
    // Turnos guardados que no son un horario válido (datos antiguos) se descartan:
    // al guardar se recalculan a partir del horario semanal
    turnos: (() => {
      const guardados = Object.values(clase.turnos || {}).map((t) => String(t).trim());
      return guardados.every((t) => !turnoInvalido(t)) ? guardados.join(", ") : "";
    })(),
    estado: clase.estado || (clase.activa === false ? "oculta" : "activa"),
    enPortada: clase.enPortada !== false,
    regalable: clase.regalable !== false,
    requiereCuenta: exigeCuenta(clase),
    orden: clase.orden != null ? String(clase.orden) : "",
  };
}


export function construirFicha(form, original = {}, categorias = GRUPOS_TALLER) {
  const esBono = form.tipoProducto === "bono";
  const horarios = {};
  DIAS.forEach(([dia]) => {
    const turnos = leerTurnos(form.horarios[dia]);
    if (turnos.length) horarios[dia] = turnos;
  });
  // Turnos que se pueden abrir en fechas especiales: si no se indican, los del horario
  const turnosEspeciales = leerTurnos(form.turnos);
  const turnos = turnosEspeciales.length
    ? turnosEspeciales
    : [...new Set(Object.values(horarios).flat())].sort();

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
    horarios,
    turnos,
    estado: form.estado,
    activa: form.estado === "activa",
    enPortada: !!form.enPortada,
    regalable: !!form.regalable,
    requiereCuenta: esBono || !!form.requiereCuenta,
    orden: form.orden === "" ? 999 : Number(form.orden),
    ...(esBono
      ? {
          numeroClases: Math.round(numeroPositivo(form.bono.numeroClases)),
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
          plazas: {
            maxTotales: Math.round(numeroPositivo(form.maxTotales)),
            ...((conMetodos || conVariantes) &&
            form.metodos.torno &&
            numeroPositivo(form.maxTorno)
              ? { maxTorno: Math.round(numeroPositivo(form.maxTorno)) }
              : {}),
          },
        }),
  };
  }
