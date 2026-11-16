// src/migracion/parcheTalleres.js
// Lo que convierte la ficha de un taller de siempre en una del panel, sin Firebase:
// lo usa la migración (src/migracion/migrarTalleres.js) y también el servidor, que
// cobra un taller de siempre aún sin migrar con la ficha que tendría al migrarlo
// (api/_pedidoServidor.js): sus páginas antiguas usan los mismos precios.
import { GRUPOS_TALLER, TALLERES_FIJOS, estadoTaller } from "../catalogoBase.js";

const AMBOS = ["torno", "modelado a mano"];

// Lo que las páginas antiguas llevaban fijo en el código y no estaba en Firebase
export const CONFIG = {
  creatupiezafavorita: {
    metodos: AMBOS,
    variante: {
      etiqueta: "Tipo de pieza",
      campo: "tipoPieza",
      campoNombre: "nombreTipoPieza",
      opciones: [
        { id: "cuenco_taza", nombre: "Cuenco o taza" },
        { id: "frutero_grande", nombre: "Frutero / cuenco grande" },
        { id: "jarron_grande", nombre: "Jarrón grande" },
      ],
    },
  },
  creatubrunchbowl: { metodos: AMBOS },
  creatucuencoramen: { metodos: AMBOS },
  creatubandejahogar: { metodos: AMBOS },
  creatutazafavorita: { metodos: AMBOS },
  creatumaceta: {
    metodos: AMBOS,
    variante: {
      etiqueta: "Tamaño",
      campo: "tamanoMaceta",
      campoNombre: "nombreTamano",
      opciones: [
        { id: "estandar", nombre: "Estándar hasta 12 cm" },
        { id: "mediana", nombre: "Mediana hasta 20 cm" },
        { id: "grande", nombre: "Grande hasta 30 cm" },
      ],
    },
  },
  creatugrancentrodemesa: { metodos: AMBOS },
  creatujarrajarrongrande: { metodos: AMBOS },
  setmatcha: { metodos: AMBOS, sesiones: 2 },
  setsake: { metodos: AMBOS, sesiones: 2 },
  tazaescultorica: { metodos: AMBOS, sesiones: 2 },
  macetaorganica: { metodos: AMBOS, sesiones: 2 },
  pintatupieza: { precio: 25 },
  especialpintatupieza: { precio: 35 },
  clasesueltacontinuidad: {
    metodos: ["torno", "modelado a mano", "decoración con esmaltes"],
    regalable: false,
  },
  modelamano4clases: {
    bono: {
      precio: 79,
      numeroClases: 4,
      duracionClase: "3 horas",
      modalidad: "modelado a mano",
      subtipo: "4_clases_3h_mes",
      extraCambioTorno: 10,
      permiteCambioTorno: true,
    },
  },
  tornodecoracion4clases: {
    bono: {
      precio: 99,
      numeroClases: 4,
      duracionClase: "3 horas",
      modalidad: "torno y decoración",
      subtipo: "4_clases_3h_mes",
      distribucionClases: "2 torno + 2 decoración",
    },
  },
  tornodesdecero4clases: {
    bono: {
      precio: 120,
      numeroClases: 4,
      duracionClase: "3 horas",
      modalidad: "torno",
      subtipo: "4_clases_3h_torno",
      incluyeDecoracion: false,
    },
  },
  tornoperfeccionamiento6clases: {
    bono: {
      precio: 145,
      numeroClases: 6,
      duracionClase: "3 horas",
      modalidad: "torno",
      subtipo: "6_clases_3h_torno",
      incluyeDecoracion: false,
    },
  },
};

export const IDS_MIGRABLES = Object.keys(TALLERES_FIJOS);

const vacio = (valor) =>
  valor == null || (typeof valor === "string" && !valor.trim());

export const primero = (...valores) => valores.find((v) => !vacio(v));

const tituloGrupo = (grupoId, categorias = GRUPOS_TALLER) =>
  categorias.find((g) => g.id === grupoId)?.titulo || "";

// Cambios (rutas de Firebase → valor) que migran un taller. Es una función
// pura: recibe la ficha actual y el contenido de la página antigua.
export function construirParche(id, actual, contenido, categorias = GRUPOS_TALLER) {
  const fijo = TALLERES_FIJOS[id];
  const config = CONFIG[id];
  const bono = config.bono;
  const patch = {};

  const poner = (campo, valor) => {
    patch[`clases/${id}/${campo}`] = valor;
  };
  const ponerSiFalta = (campo, valor) => {
    if (valor !== undefined && vacio(actual[campo])) poner(campo, valor);
  };

  poner("dinamica", true);
  poner("migrado", true);
  poner("grupo", fijo.grupo);
  poner("reservasPath", fijo.pathKey);
  poner("tipoProducto", bono ? "bono" : "taller");
  ponerSiFalta("slug", id);
  ponerSiFalta("categoria", tituloGrupo(fijo.grupo, categorias));

  // Algunas fichas antiguas tienen claves con un espacio al final
  poner("nombre", primero(actual.nombre, actual["nombre "], contenido.nombre));
  if ("nombre " in actual) poner("nombre ", null);

  const orden = Number(primero(actual.orden, actual["orden "]));
  if (Number.isFinite(orden)) poner("orden", orden);
  if ("orden " in actual) poner("orden ", null);

  const estado = estadoTaller(actual);
  poner("estado", estado);
  poner("activa", estado === "activa");
  if (actual.enPortada === undefined) poner("enPortada", true);
  if (actual.regalable === undefined) poner("regalable", config.regalable ?? true);

  // Textos: si ya están en Firebase se respetan
  ponerSiFalta("descripcionCorta", contenido.descripcionCorta);
  ponerSiFalta("descripcionLarga", contenido.descripcionLarga);
  ponerSiFalta("notaImportante", contenido.notaImportante);
  poner("mostrarAvisos", contenido.mostrarAvisos !== false);

  if (!Array.isArray(actual.secciones)) {
    const incluye = Array.isArray(actual.incluye)
      ? actual.incluye.filter(Boolean)
      : [];

    poner(
      "secciones",
      contenido.secciones.map((seccion) =>
        incluye.length && /incluye/i.test(seccion.titulo)
          ? { ...seccion, items: incluye }
          : seccion
      )
    );
  }

  if (bono) {
    ponerSiFalta("precio", bono.precio);
    poner(
      "numeroClases",
      Number(primero(actual.numeroClases, actual.NumeroClases, bono.numeroClases))
    );
    ponerSiFalta("duracionClase", bono.duracionClase);
    ponerSiFalta("modalidad", bono.modalidad);
    ponerSiFalta("subtipo", bono.subtipo);
    ponerSiFalta("distribucionClases", bono.distribucionClases);
    if (bono.incluyeDecoracion !== undefined && actual.incluyeDecoracion === undefined) {
      poner("incluyeDecoracion", bono.incluyeDecoracion);
    }
    if (bono.permiteCambioTorno) {
      poner("permiteCambioTorno", true);
      poner(
        "extraCambioTorno",
        Number(primero(actual.extraCambioTorno, actual.ExtraCambioTorno, bono.extraCambioTorno))
      );
    }
  } else {
    poner("sesiones", config.sesiones || 1);
    if (config.metodos) poner("metodos", config.metodos);
    if (config.variante) poner("variante", config.variante);
    if (config.precio !== undefined) ponerSiFalta("precio", config.precio);

    // Mismos límites que usaban las páginas antiguas si faltaban
    if (!Number(actual.plazas?.maxTotales)) poner("plazas/maxTotales", 45);
    if (config.metodos?.includes("torno") && !Number(actual.plazas?.maxTorno)) {
      poner("plazas/maxTorno", 12);
    }
  }

  return patch;
}

// La ficha tal como quedaría tras aplicar el parche (para comprobarla sin escribir)
export function claseTrasMigrar(id, actual, contenido) {
  const resultado = JSON.parse(JSON.stringify(actual));
  const prefijo = `clases/${id}/`;

  Object.entries(construirParche(id, actual, contenido)).forEach(([ruta, valor]) => {
    const claves = ruta.slice(prefijo.length).split("/");
    const ultima = claves.pop();
    const destino = claves.reduce((obj, clave) => (obj[clave] ??= {}), resultado);

    if (valor === null) delete destino[ultima];
    else destino[ultima] = valor;
  });

  return resultado;
}

// Ficha con la que se cobra un taller: la de la base de datos si ya es del panel y,
// si es de siempre y aún no se ha migrado, la que tendría al migrarlo (métodos,
// variantes, precio por defecto, datos del bono). null si no existe.
export function fichaParaCobrar(id, actual) {
  if (!actual || typeof actual !== "object") return null;
  if (actual.dinamica || !TALLERES_FIJOS[id] || !CONFIG[id]) return actual;
  return claseTrasMigrar(id, actual, { secciones: [] });
}
