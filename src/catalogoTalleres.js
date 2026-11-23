// src/catalogoTalleres.js
// Catálogo de talleres para la portada, los listados y las tarjetas regalo.
// Junta los talleres de siempre (con página propia) y los que crea el admin
// desde el panel (clases/{id} con dinamica: true, página genérica /taller/:id).
// Lo que no usa Firebase vive en src/catalogoBase.js (también lo usa el servidor).
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import { normalizarTaller, ordenarTalleres } from "./catalogoBase.js";

export * from "./catalogoBase.js";

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
