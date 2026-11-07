// src/catalogoTalleres.js
// Catálogo de talleres para la portada, los listados y las tarjetas regalo.
// Junta los talleres de siempre (con página propia) y los que crea el admin
// desde el panel (clases/{id} con dinamica: true, página genérica /taller/:id).
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";

// Categorías que vienen con la web (definidas aparte para poder usarlas desde scripts)
import { GRUPOS_TALLER } from "./categoriasDeSiempre";

export { GRUPOS_TALLER };

// Grupos que el admin puede elegir para un taller nuevo (los bonos tienen su
// propia lógica de sesiones y siguen necesitando página hecha a medida)
export const GRUPOS_TALLER_NUEVO = GRUPOS_TALLER.filter(
  (grupo) => grupo.id !== "cursos_bonos"
);

// Talleres de siempre (claseId en Firebase). Cada uno guarda:
// - ruta / rutaReserva: sus páginas antiguas (si se migra, redirigen a las genéricas)
// - pathKey: carpeta donde se guardan sus reservas en reservas/{pathKey}
// - aliasRegalo: id con el que aparece en las tarjetas regalo ya vendidas
export const TALLERES_FIJOS = {
  creatupiezafavorita: {
    nombre: "Crea tu pieza favorita desde cero",
    grupo: "crear_piezas",
    ruta: "/crea-tu-pieza-favorita-desde-cero",
    pathKey: "CreaTuPiezaFavorita",
    rutaReserva: "/reserva-crea-tu-pieza-favorita",
    aliasRegalo: "creatupiezafavorita",
  },
  creatubrunchbowl: {
    nombre: "Crea tu brunch bowl",
    grupo: "crear_piezas",
    ruta: "/crea-tu-brunch-bowl",
    pathKey: "CreaTuBrunchBowl",
    rutaReserva: "/reserva-crea-tu-brunch-bowl",
    aliasRegalo: "creatubrunchbowl",
  },
  creatucuencoramen: {
    nombre: "Crea tu cuenco para ramen",
    grupo: "crear_piezas",
    ruta: "/crea-tu-cuenco-ramen",
    pathKey: "CreaTuCuencoRamen",
    rutaReserva: "/reserva-crea-tu-cuenco-ramen",
    aliasRegalo: "creatucuencoramen",
  },
  creatubandejahogar: {
    nombre: "Crea tu bandeja de hogar",
    grupo: "crear_piezas",
    ruta: "/crea-tu-bandeja-hogar",
    pathKey: "CreaTuBandejaHogar",
    rutaReserva: "/reserva-crea-tu-bandeja-hogar",
    aliasRegalo: "creatubandejahogar",
  },
  creatutazafavorita: {
    nombre: "Crea tu taza favorita",
    grupo: "crear_piezas",
    ruta: "/crea-tu-taza-favorita",
    pathKey: "CreaTuTazaFavorita",
    rutaReserva: "/reserva-crea-tu-taza-favorita",
    aliasRegalo: "creatutazafavorita",
  },
  creatumaceta: {
    nombre: "Crea tu maceta",
    grupo: "crear_piezas",
    ruta: "/crea-tu-maceta",
    pathKey: "CreaTuMaceta",
    rutaReserva: "/reserva-crea-tu-maceta",
    aliasRegalo: "creatumaceta",
  },
  creatugrancentrodemesa: {
    nombre: "Crea tu gran centro de mesa",
    grupo: "crear_piezas",
    ruta: "/crea-tu-gran-centro-mesa",
    pathKey: "CreaTuGranCentroMesa",
    rutaReserva: "/reserva-crea-tu-gran-centro-mesa",
    aliasRegalo: "creatugrancentromesa",
  },
  creatujarrajarrongrande: {
    nombre: "Crea tu jarra / jarrón grande",
    grupo: "crear_piezas",
    ruta: "/crea-tu-jarra-jarron-grande",
    pathKey: "CreaTuJarraJarronGrande",
    rutaReserva: "/reserva-crea-tu-jarra-jarron-grande",
    aliasRegalo: "creatujarrajarrongrande",
  },
  setmatcha: {
    nombre: "Crea tu set de matcha",
    grupo: "crear_piezas",
    ruta: "/crea-tu-set-matcha",
    pathKey: "CreaTuSetMatcha",
    rutaReserva: "/reserva-crea-tu-set-matcha",
    aliasRegalo: "creatusetmatcha",
    sesiones: 2,
  },
  setsake: {
    nombre: "Crea tu set de sake",
    grupo: "crear_piezas",
    ruta: "/crea-tu-set-sake",
    pathKey: "CreaTuSetSake",
    rutaReserva: "/reserva-crea-tu-set-sake",
    aliasRegalo: "creatusetsake",
    sesiones: 2,
  },
  tazaescultorica: {
    nombre: "Crea tu taza escultórica",
    grupo: "crear_piezas",
    ruta: "/crea-tu-taza-escultorica",
    pathKey: "CreaTuTazaEscultorica",
    rutaReserva: "/reserva-crea-tu-taza-escultorica",
    aliasRegalo: "creatutazaescultorica",
    sesiones: 2,
  },
  macetaorganica: {
    nombre: "Crea tu maceta orgánica",
    grupo: "crear_piezas",
    ruta: "/crea-tu-maceta-organica",
    pathKey: "CreaTuMacetaOrganica",
    rutaReserva: "/reserva-crea-tu-maceta-organica",
    aliasRegalo: "creatumacetaorganica",
    sesiones: 2,
  },
  pintatupieza: {
    nombre: "Pinta tu pieza de cerámica",
    grupo: "pinta_decora",
    ruta: "/pinta-tu-pieza",
    pathKey: "PintaTuPieza",
    rutaReserva: "/reserva-pinta-tu-pieza",
    aliasRegalo: "pintatupieza",
  },
  especialpintatupieza: {
    nombre: "Especial pinta tu pieza de cerámica",
    grupo: "pinta_decora",
    ruta: "/especial-pinta-tu-pieza",
    pathKey: "EspecialPintaTuPieza",
    rutaReserva: "/reserva-especial-pinta-tu-pieza",
    aliasRegalo: "especialpintatupieza",
  },
  modelamano4clases: {
    nombre: "Modela a mano y decora tus piezas favoritas",
    grupo: "cursos_bonos",
    ruta: "/modela-a-mano-y-decora-tus-piezas-favoritas",
    pathKey: "ModelaAManoYDecoraTusPiezasFavoritas",
    rutaReserva: "/reserva-modela-a-mano-y-decora-tus-piezas-favoritas",
    aliasRegalo: "modelaamanoydecoratuspiezasfavoritas",
  },
  tornodecoracion4clases: {
    nombre: "Torno alfarero y decoración",
    grupo: "cursos_bonos",
    ruta: "/torno-alfarero-y-decoracion",
    pathKey: "TornoAlfareroYDecoracion",
    rutaReserva: "/reserva-torno-alfarero-y-decoracion",
    aliasRegalo: "tornoalfareroydecoracion",
  },
  tornodesdecero4clases: {
    nombre: "Torno alfarero empezar desde cero",
    grupo: "cursos_bonos",
    ruta: "/torno-alfarero-empezar-desde-cero",
    pathKey: "TornoAlfareroEmpezarDesdeCero",
    rutaReserva: "/reserva-torno-alfarero-empezar-desde-cero",
    aliasRegalo: "tornoalfareroempezardesdecero",
  },
  tornoperfeccionamiento6clases: {
    nombre: "Torno alfarero perfecciona lo que ya sabes",
    grupo: "cursos_bonos",
    ruta: "/torno-alfarero-perfecciona-lo-que-ya-sabes",
    pathKey: "TornoAlfareroPerfeccionaLoQueYaSabes",
    rutaReserva: "/reserva-torno-alfarero-perfecciona-lo-que-ya-sabes",
    aliasRegalo: "tornoalfareroperfeccionaloqueyasabes",
  },
  clasesueltacontinuidad: {
    nombre: "Clase suelta con continuidad",
    grupo: "otros",
    ruta: "/talleres/clase-suelta-continuidad",
    pathKey: "ClaseSueltaContinuidad",
    rutaReserva: "/reserva-clase-suelta-continuidad",
  },
};

export const METODOS_TALLER = [
  { id: "torno", clavePrecio: "torno", nombre: "Torno" },
  { id: "modelado a mano", clavePrecio: "modelado", nombre: "Modelado a mano" },
  {
    id: "decoración con esmaltes",
    clavePrecio: "decoracion",
    nombre: "Decoración con esmaltes",
  },
];

export const imagenPorDefecto = (claseId) =>
  TALLERES_FIJOS[claseId] ? `/img/miniaturas/${claseId}.jpg` : "/img/logoPCsin.png";

// Los bonos siempre piden cuenta: se gestionan desde el perfil y, comprados como
// invitado, quedarían en una sesión anónima que no se puede volver a abrir. Un
// taller puede exigirla con la marca requiereCuenta (casilla del formulario).
export function exigeCuenta(clase = {}) {
  return clase.tipoProducto === "bono" || clase.requiereCuenta === true;
}

export function estadoTaller(clase = {}) {
  if (typeof clase.estado === "string" && clase.estado.trim()) {
    return clase.estado.trim().toLowerCase();
  }
  return clase.activa === false ? "oculta" : "activa";
}

// Opciones con precio propio (tipo de pieza, tamaño…): clase.variante
// { etiqueta, campo, campoNombre, opciones: [{ id, nombre }] }; el precio de
// cada opción está en clase.precios[id]. Vacío si el taller no tiene.
export function variantesDelTaller(clase = {}) {
  const opciones = Array.isArray(clase.variante?.opciones)
    ? clase.variante.opciones
    : [];

  return opciones
    .filter((o) => o?.id)
    .map((o) => ({
      id: o.id,
      nombre: o.nombre || o.id,
      precio: Number(clase.precios?.[o.id]) || 0,
    }));
}

// Métodos en los que se imparte (torno, modelado, decoración). Si el taller
// tiene variantes, el precio sale de la variante y el método solo reparte
// las plazas; si no, cada método trae su precio. Vacío = sin método.
export function metodosDelTaller(clase = {}) {
  const precios = clase.precios || {};
  const conVariantes = variantesDelTaller(clase).length > 0;
  const elegidos = Array.isArray(clase.metodos) ? clase.metodos : null;

  return METODOS_TALLER.filter((m) =>
    elegidos
      ? elegidos.includes(m.id)
      : !conVariantes && Number(precios[m.clavePrecio]) > 0
  ).map((m) => ({
    ...m,
    precio: conVariantes ? 0 : Number(precios[m.clavePrecio]) || 0,
  }));
}

// Mínimo de personas para reservar un taller en grupo: el que fija el admin en la
// ficha del taller (minPersonasGrupo) o 5 si no lo ha cambiado
export const MIN_PERSONAS_GRUPO = 5;
export const MAX_PERSONAS_GRUPO = 45;

export function minPersonasGrupo(clase = {}) {
  const n = Math.round(Number(clase.minPersonasGrupo));
  return Number.isFinite(n) && n >= 2 ? Math.min(n, MAX_PERSONAS_GRUPO) : MIN_PERSONAS_GRUPO;
}

export function precioDesde(clase = {}) {
  const positivos = (valores) =>
    valores.map(Number).filter((n) => Number.isFinite(n) && n > 0);

  // Con precios por método o por opción, «desde» es el más bajo de ellos
  // (precio y precioDesde sueltos pueden ser restos de una configuración anterior)
  const deMetodos = positivos(Object.values(clase.precios || {}));
  if (deMetodos.length) return Math.min(...deMetodos);

  const sueltos = positivos([clase.precio, clase.precioDesde]);
  return sueltos.length ? Math.min(...sueltos) : null;
}

export const formatearEuros = (valor) => {
  const n = Number(valor || 0);
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace(".", ",")} €`;
};

// Algunas claves antiguas de Firebase llevan un espacio al final ("orden ")
const leerCampo = (clase, campo) => clase?.[campo] ?? clase?.[`${campo} `];

export function normalizarTaller(id, clase = {}) {
  const fijo = TALLERES_FIJOS[id];
  if (!fijo && !clase.dinamica) return null;

  const orden = Number(leerCampo(clase, "orden"));

  return {
    ...clase,
    id,
    nombre: leerCampo(clase, "nombre") || fijo?.nombre || id,
    grupo: clase.dinamica ? clase.grupo || "otros" : fijo.grupo,
    ruta: clase.dinamica ? `/taller/${id}` : fijo.ruta,
    rutaReserva: clase.dinamica ? `/reservar/${id}` : "",
    sesiones: Number(clase.sesiones || fijo?.sesiones || 1),
    imagen: imagenPorDefecto(id),
    estado: estadoTaller(clase),
    tipoProducto: clase.tipoProducto === "bono" ? "bono" : "taller",
    precioDesde: precioDesde(clase),
    variosPrecios:
      new Set(Object.values(clase.precios || {}).map(Number).filter((n) => n > 0)).size > 1,
    orden: Number.isFinite(orden) ? orden : 999,
    enPortada: clase.enPortada !== false,
    dinamica: !!clase.dinamica,
  };
}

const ordenarTalleres = (a, b) =>
  a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es");

export async function cargarTalleres({ incluirOcultos = false } = {}) {
  const snap = await get(ref(dbRealtime, "clases"));
  const datos = snap.exists() ? snap.val() || {} : {};

  return Object.entries(datos)
    .map(([id, clase]) => normalizarTaller(id, clase))
    .filter(Boolean)
    .filter((t) => incluirOcultos || t.estado === "activa")
    .sort(ordenarTalleres);
}

// Talleres activos de una categoría: los de siempre sin migrar y los del panel
export async function cargarTalleresDeGrupo(grupo) {
  const talleres = await cargarTalleres();
  return talleres.filter((t) => t.grupo === grupo);
}

export async function cargarTalleresDinamicos(grupo) {
  const talleres = await cargarTalleres();
  return talleres.filter((t) => t.dinamica && (!grupo || t.grupo === grupo));
}

// Si las reglas de imagenesClases no están desplegadas, se avisa una vez y
// se usan las imágenes por defecto
let imagenesNoLegibles = false;

// Miniatura subida por el admin, si la hay (si no, la imagen por defecto)
export async function cargarMiniatura(claseId) {
  if (imagenesNoLegibles) return null;

  try {
    const snap = await get(ref(dbRealtime, `imagenesClases/${claseId}/miniatura`));
    return snap.exists() ? snap.val() : null;
  } catch (error) {
    if (/permission/i.test(error?.message || "")) {
      if (!imagenesNoLegibles) {
        console.warn(
          "imagenesClases no se puede leer: despliega database.rules.json. Se usan las imágenes por defecto."
        );
      }
      imagenesNoLegibles = true;
    } else {
      console.error("Error al cargar la imagen del taller:", error);
    }
    return null;
  }
}

export async function cargarGaleria(claseId) {
  const snap = await get(ref(dbRealtime, `imagenesClases/${claseId}/galeria`));
  if (!snap.exists()) return [];

  return Object.entries(snap.val() || {})
    .map(([key, img]) => ({ key, ...img }))
    .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0));
}

// id real de un taller de siempre a partir del id con el que se vendió su
// tarjeta regalo (en algunos difiere: «creatusetmatcha» → «setmatcha»)
export function idRealDeAliasRegalo(aliasId) {
  const entrada = Object.entries(TALLERES_FIJOS).find(
    ([id, taller]) => (taller.aliasRegalo || id) === aliasId
  );
  return entrada ? entrada[0] : "";
}

// Opciones de tarjeta regalo de siempre que siguen valiendo: se quitan las de
// talleres borrados, ocultos o ya migrados (estos salen como opciones nuevas).
// «talleres» = todos, ocultos incluidos; null mientras se cargan.
export function filtrarOpcionesRegaloEstaticas(opciones = [], talleres = null) {
  if (!talleres) return opciones;

  const porId = new Map(talleres.map((t) => [t.id, t]));

  return opciones.filter((opcion) => {
    const id = idRealDeAliasRegalo(opcion.claseId);
    if (!id) return true;

    const taller = porId.get(id);
    return !!taller && !taller.dinamica && taller.estado === "activa";
  });
}

// Opciones de tarjeta regalo para los talleres gestionados desde el admin
// (nuevos y migrados). Con variantes (tipo, tamaño) o métodos con distinto
// precio, una opción por cada uno.
export function opcionesRegaloDinamicas(talleres = []) {
  const opciones = [];

  talleres
    .filter((t) => t.dinamica && t.regalable !== false)
    .forEach((t) => {
      const esBono = t.tipoProducto === "bono";
      const metodos = metodosDelTaller(t);
      const variantes = variantesDelTaller(t).filter((v) => v.precio > 0);

      const base = {
        clase: t.nombre,
        claseId: t.id,
        tipoPieza: "",
        tipoTaller: esBono ? "bono_mensual" : t.grupo,
        rutaReserva: `/reservar/${t.id}`,
        requiereTipoPieza: false,
        dinamica: true,
      };

      if (variantes.length) {
        variantes.forEach((v) => {
          opciones.push({
            ...base,
            id: `taller-${t.id}-${v.id}`,
            label: `${t.nombre} — ${v.nombre} — ${formatearEuros(v.precio)}`,
            subtipo: v.nombre,
            tipoPieza: v.id,
            precio: v.precio,
            requiereMetodo: metodos.length > 0,
            requiereTipoPieza: true,
          });
        });
        return;
      }

      if (!esBono && new Set(metodos.map((m) => m.precio)).size > 1) {
        metodos.forEach((m) => {
          opciones.push({
            ...base,
            id: `taller-${t.id}-${m.clavePrecio}`,
            label: `${t.nombre} — ${m.nombre} — ${formatearEuros(m.precio)}`,
            subtipo: m.nombre,
            precio: m.precio,
            requiereMetodo: true,
          });
        });
        return;
      }

      const precio = esBono
        ? Number(t.precio || 0)
        : metodos[0]?.precio || Number(t.precio || 0);
      if (!(precio > 0)) return;

      const clases = Number(t.numeroClases ?? t.NumeroClases) || 0;
      const subtipo = esBono && clases ? `${clases} clases` : "";

      opciones.push({
        ...base,
        id: `taller-${t.id}`,
        label: `${t.nombre}${subtipo ? ` — ${subtipo}` : ""} — ${formatearEuros(precio)}`,
        subtipo,
        precio,
        requiereMetodo: !esBono && metodos.length > 0,
      });
    });

  return opciones;
}
