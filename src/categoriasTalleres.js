// src/categoriasTalleres.js
// Categorías de talleres.
// - Las de siempre vienen en el código (GRUPOS_TALLER) hasta que se migran.
// - Las que se gestionan desde el panel viven en categoriasTalleres/{id}: las
//   que crea el admin y las de siempre ya migradas (mismo id, migrada: true).
//   Se editan, ordenan, ocultan y borran; todas se ven en /categoria/:id.
// Una de siempre borrada deja un registro con eliminada: true para que no
// vuelva a salir del código. La migración es de ida: no hay vuelta atrás.
import { ref, get, set, update, remove } from "firebase/database";
import { dbRealtime } from "./firebase";
import { cargarTalleres } from "./catalogoTalleres";
import {
  DESCRIPCION_DE_SIEMPRE,
  GRUPOS_TALLER,
  ordenDeSiempre,
  registrosDeMigracion,
} from "./categoriasDeSiempre";
import { generarId } from "./utils/fichaTaller";

export const rutaCategoria = (id) => `/categoria/${id}`;

// Los bonos nuevos van siempre aquí: se puede ocultar, pero no borrar
export const CATEGORIAS_DEL_SISTEMA = ["cursos_bonos"];

// Ids que no puede usar una categoría nueva: las de siempre y «todos» (filtro de la portada)
const IDS_RESERVADOS = new Set([
  "todos",
  ...GRUPOS_TALLER.flatMap((g) => [g.id, g.id.replace(/_/g, "")]),
]);

export const esCategoriaDeSiempre = (id) => GRUPOS_TALLER.some((g) => g.id === id);

const sinTildes = (texto = "") =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();

const porOrden = (a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo, "es");

// Las de siempre, con el orden que tenían (antes que las nuevas, que empiezan en 1)
export const categoriasDeSiempre = () =>
  GRUPOS_TALLER.map((g, i) => ({
    ...g,
    descripcion: DESCRIPCION_DE_SIEMPRE[g.id] || "",
    orden: ordenDeSiempre(i),
    estado: "activa",
    propia: false,
    deSiempre: true,
  }));

const normalizarCategoria = (id, datos = {}) => {
  const base = categoriasDeSiempre().find((c) => c.id === id);
  const orden = Number(datos.orden);

  return {
    id,
    titulo: String(datos.titulo || "").trim() || base?.titulo || id,
    descripcion: String(datos.descripcion ?? base?.descripcion ?? "").trim(),
    orden: Number.isFinite(orden) ? orden : base?.orden ?? 999,
    estado: datos.estado === "oculta" ? "oculta" : "activa",
    ruta: rutaCategoria(id),
    propia: true,
    deSiempre: !!base,
    eliminada: !!datos.eliminada,
  };
};

// Registros de categoriasTalleres (también las eliminadas), sin ordenar
function registrosDe(datos = {}) {
  return Object.entries(datos).map(([id, c]) => normalizarCategoria(id, c));
}

// Las de siempre sin migrar + las del panel, todas ordenadas. Las ocultas se
// incluyen (el que llama las filtra); las eliminadas no salen.
export function unirCategorias(registros = []) {
  const porId = new Map(categoriasDeSiempre().map((c) => [c.id, c]));

  registros.forEach((r) => {
    if (r.eliminada) porId.delete(r.id);
    else porId.set(r.id, r);
  });

  return [...porId.values()].sort(porOrden);
}

// Si las reglas de categoriasTalleres no están desplegadas, se avisa una vez y
// se siguen usando solo las categorías de siempre
let reglasSinDesplegar = false;

export const esErrorDePermisos = (error) =>
  /permission/i.test(error?.message || "") || error?.code === "PERMISSION_DENIED";

// Todos los registros de categoriasTalleres, eliminadas incluidas
export async function cargarRegistrosCategorias() {
  if (reglasSinDesplegar) return [];

  try {
    const snap = await get(ref(dbRealtime, "categoriasTalleres"));
    return registrosDe(snap.exists() ? snap.val() || {} : {});
  } catch (error) {
    if (esErrorDePermisos(error)) {
      if (!reglasSinDesplegar) {
        console.warn(
          "categoriasTalleres no se puede leer: despliega database.rules.json. Solo se usan las categorías de siempre."
        );
      }
      reglasSinDesplegar = true;
    } else {
      console.error("Error al cargar las categorías de talleres:", error);
    }
    return [];
  }
}

// Categorías gestionadas desde el panel: las nuevas y las de siempre ya migradas
export async function cargarCategoriasPropias() {
  const registros = await cargarRegistrosCategorias();
  return registros.filter((r) => !r.eliminada).sort(porOrden);
}

// Todas las categorías vigentes (de siempre sin migrar + del panel), en orden.
// Las ocultas solo salen si se piden.
export async function cargarCategorias({ incluirOcultas = false } = {}) {
  const registros = await cargarRegistrosCategorias();

  return unirCategorias(registros).filter((c) => incluirOcultas || c.estado === "activa");
}

// Qué le pasa a cada categoría de siempre: sinMigrar | migrada | eliminada
export function estadoDeSiempre(id, registros = []) {
  const registro = registros.find((r) => r.id === id);
  if (!registro) return "sinMigrar";
  return registro.eliminada ? "eliminada" : "migrada";
}

// Crea una categoría nueva (al final de la lista) y la devuelve
export async function crearCategoria({ titulo = "", descripcion = "" }) {
  const nombre = titulo.trim();
  const id = generarId(nombre);

  if (!id) throw new Error("Escribe un nombre para la categoría (con letras o números).");

  const registros = await cargarRegistrosCategorias();
  const existentes = unirCategorias(registros);

  if (
    IDS_RESERVADOS.has(id) ||
    registros.some((r) => r.id === id) ||
    existentes.some((c) => sinTildes(c.titulo) === sinTildes(nombre))
  ) {
    throw new Error("Ya existe una categoría con ese nombre.");
  }

  const orden = Math.max(0, ...registros.map((r) => (r.orden < 999 ? r.orden : 0))) + 1;
  const datos = {
    titulo: nombre,
    descripcion: descripcion.trim(),
    orden,
    estado: "activa",
    creadoEn: new Date().toISOString(),
  };

  await set(ref(dbRealtime, `categoriasTalleres/${id}`), datos);
  return normalizarCategoria(id, datos);
}

// Cambia nombre, descripción o visibilidad. Si cambia el nombre, los talleres
// de la categoría guardan el nuevo (clases/{id}/categoria se muestra en el panel).
export async function actualizarCategoria(id, { titulo, descripcion, estado }) {
  const cambios = { actualizadoEn: new Date().toISOString() };

  if (titulo !== undefined) {
    const nombre = titulo.trim();
    if (!nombre) throw new Error("El nombre no puede quedar vacío.");

    const otras = unirCategorias(await cargarRegistrosCategorias()).filter((c) => c.id !== id);
    if (otras.some((c) => sinTildes(c.titulo) === sinTildes(nombre))) {
      throw new Error("Ya existe una categoría con ese nombre.");
    }
    cambios.titulo = nombre;
  }
  if (descripcion !== undefined) cambios.descripcion = descripcion.trim();
  if (estado !== undefined) cambios.estado = estado === "oculta" ? "oculta" : "activa";

  const rutas = {};
  Object.entries(cambios).forEach(([campo, valor]) => {
    rutas[`categoriasTalleres/${id}/${campo}`] = valor;
  });

  if (cambios.titulo) {
    const talleres = await cargarTalleres({ incluirOcultos: true });
    talleres
      .filter((t) => t.dinamica && t.grupo === id)
      .forEach((t) => {
        rutas[`clases/${t.id}/categoria`] = cambios.titulo;
      });
  }

  await update(ref(dbRealtime), rutas);
}

// Intercambia el orden de dos categorías (para subir y bajar en la lista)
export async function intercambiarOrden(a, b) {
  await update(ref(dbRealtime), {
    [`categoriasTalleres/${a.id}/orden`]: b.orden,
    [`categoriasTalleres/${b.id}/orden`]: a.orden,
  });
}

// Pasa las categorías de siempre indicadas (o todas las que falten) al panel.
// Se guardan con su nombre, texto y orden de siempre; los talleres y las reservas
// no cambian (siguen apuntando al mismo id). Las ya migradas o eliminadas no se tocan.
// La migración es de ida: no hay vuelta a las de siempre.
export async function migrarCategoriasDeSiempre(ids) {
  const registros = await cargarRegistrosCategorias();
  const pendientes = categoriasDeSiempre()
    .filter((c) => (ids ? ids.includes(c.id) : true))
    .filter((c) => !registros.some((r) => r.id === c.id))
    .map((c) => c.id);

  if (!pendientes.length) return 0;

  const nuevos = registrosDeMigracion(pendientes);
  await update(
    ref(dbRealtime),
    Object.fromEntries(Object.entries(nuevos).map(([id, datos]) => [`categoriasTalleres/${id}`, datos]))
  );
  return pendientes.length;
}

// Talleres (ocultos incluidos) que usan la categoría
export async function talleresDeCategoria(id) {
  const talleres = await cargarTalleres({ incluirOcultos: true });
  return talleres.filter((t) => t.grupo === id);
}

// Solo se borra una categoría vacía: los talleres no se quedan sin categoría
export async function borrarCategoria(id) {
  if (CATEGORIAS_DEL_SISTEMA.includes(id)) {
    throw new Error(
      "Esta categoría es del sistema (los bonos nuevos van aquí): puedes ocultarla, pero no borrarla."
    );
  }

  const usados = await talleresDeCategoria(id);

  if (usados.length) {
    throw new Error(
      `Tiene ${usados.length} ${usados.length === 1 ? "taller" : "talleres"}. Cámbialos de categoría antes de borrarla.`
    );
  }

  if (esCategoriaDeSiempre(id)) {
    // Un registro marcado como eliminado evita que vuelva a salir del código
    const registros = await cargarRegistrosCategorias();
    const titulo = registros.find((r) => r.id === id)?.titulo || id;

    await set(ref(dbRealtime, `categoriasTalleres/${id}`), {
      titulo,
      migrada: true,
      eliminada: true,
      eliminadaEn: new Date().toISOString(),
    });
    return;
  }

  await remove(ref(dbRealtime, `categoriasTalleres/${id}`));
}

export function mensajeErrorCategoria(error) {
  if (esErrorDePermisos(error)) {
    return "No hay permiso para guardar categorías. Entra con una cuenta de administrador (y comprueba que database.rules.json está desplegado en este proyecto de Firebase).";
  }
  return error?.message || "No se ha podido guardar la categoría.";
}
