// src/migracion/migrarTalleres.js
// Migra los talleres de siempre (páginas hechas a mano) para gestionarlos
// desde el panel como si se hubieran creado allí:
// - clases/{id} pasa a dinamica: true con toda su ficha (textos, opciones…)
// - sus fotos se copian a imagenesClases/{id}
// Nunca se pisa lo que ya hay en Firebase (precios, plazas, horarios, textos
// editados): solo se rellena lo que falta con lo que llevaba escrito el código.
import { ref, get, set, update } from "firebase/database";
import { dbRealtime } from "../firebase";
import { TALLERES_FIJOS, estadoTaller } from "../catalogoTalleres";
import { reducirImagen } from "../utils/imagenes";
import { cargarCategorias } from "../categoriasTalleres";
import { CONFIG, IDS_MIGRABLES, construirParche, primero } from "./parcheTalleres.js";

export { IDS_MIGRABLES, construirParche };
export { claseTrasMigrar } from "./parcheTalleres.js";

async function cargarContenido() {
  const modulo = await import("./contenidoTalleres.json");
  return modulo.default;
}

const rutaFoto = (src) =>
  src.startsWith("/") ? `${window.location.origin}${src}` : src;

// Copia las fotos de la página antigua a imagenesClases/{id}, reducidas
async function importarFotos(id, fotos, alProgreso) {
  const galeria = {};
  let miniatura = "";

  for (let i = 0; i < fotos.length; i += 1) {
    alProgreso?.(`Foto ${i + 1} de ${fotos.length}`);
    const url = rutaFoto(fotos[i]);

    galeria[`img${i + 1}`] = {
      src: await reducirImagen(url, { maxLado: 1000, calidad: 0.75 }),
      orden: i,
    };

    if (i === 0) {
      miniatura = await reducirImagen(url, { maxLado: 480, calidad: 0.75 });
    }
  }

  await set(ref(dbRealtime, `imagenesClases/${id}`), {
    miniatura,
    galeria,
    actualizadoEn: new Date().toISOString(),
  });
}

// Estado de cada taller de siempre: ¿migrado?, ¿con fotos en la base de datos?
export async function estadoMigracion() {
  const snap = await get(ref(dbRealtime, "clases"));
  const clases = snap.exists() ? snap.val() || {} : {};

  return Promise.all(
    IDS_MIGRABLES.map(async (id) => {
      const clase = clases[id];
      const fotos = await get(ref(dbRealtime, `imagenesClases/${id}/actualizadoEn`))
        .then((s) => s.exists())
        .catch(() => false);

      return {
        id,
        existe: !!clase,
        nombre: primero(clase?.nombre, clase?.["nombre "], TALLERES_FIJOS[id].nombre),
        grupo: TALLERES_FIJOS[id].grupo,
        esBono: !!CONFIG[id]?.bono,
        migrado: !!clase?.dinamica,
        estado: clase ? estadoTaller(clase) : "",
        fotos,
      };
    })
  );
}


export async function migrarTaller(id, { fotos = true, alProgreso } = {}) {
  if (!TALLERES_FIJOS[id] || !CONFIG[id]) {
    throw new Error(`«${id}» no es un taller migrable.`);
  }

  const snap = await get(ref(dbRealtime, `clases/${id}`));
  if (!snap.exists()) throw new Error("Este taller no existe en la base de datos.");

  const actual = snap.val() || {};
  if (actual.dinamica) return { yaMigrado: true };

  const contenido = (await cargarContenido())[id];
  if (!contenido) throw new Error("Falta el contenido de la página de este taller.");

  // Primero las fotos: si falla algo, el taller sigue como estaba
  if (fotos) {
    const yaTiene = await get(ref(dbRealtime, `imagenesClases/${id}/actualizadoEn`));
    if (!yaTiene.exists() && contenido.fotos?.length) {
      await importarFotos(id, contenido.fotos, alProgreso);
    }
  }

  alProgreso?.("Guardando la ficha");

  const categorias = await cargarCategorias({ incluirOcultas: true });
  const patch = construirParche(id, actual, contenido, categorias);
  patch[`clases/${id}/actualizadoEn`] = new Date().toISOString();

  await update(ref(dbRealtime), patch);
  return { yaMigrado: false };
}

// Vuelve a la página de siempre. Se conservan la ficha y las fotos.
export async function deshacerMigracion(id) {
  await update(ref(dbRealtime, `clases/${id}`), {
    dinamica: false,
    migrado: false,
    actualizadoEn: new Date().toISOString(),
  });
}
