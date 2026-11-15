// src/paginasEspeciales.js
// Talleres recomendados de las páginas «Regalar un taller» y «Reservas para grupos».
// Se guardan en paginasEspeciales/{regalo|grupos}/recomendados (lista de ids);
// lectura pública, escritura solo admin. Si las reglas no están desplegadas, se
// devuelve una lista vacía en vez de romper la página.
import { useEffect, useState } from "react";
import { ref, get, set } from "firebase/database";
import { dbRealtime } from "./firebase";
import { cargarTalleres } from "./catalogoTalleres";

export const PAGINAS_ESPECIALES = {
  regalo: { id: "regalo", titulo: "Regalar un taller", ruta: "/regalar-taller" },
  grupos: { id: "grupos", titulo: "Reservas para grupos", ruta: "/grupos" },
};

export async function cargarIdsRecomendados(pagina) {
  try {
    const snap = await get(ref(dbRealtime, `paginasEspeciales/${pagina}/recomendados`));
    const valor = snap.exists() ? snap.val() : [];
    return (Array.isArray(valor) ? valor : Object.values(valor || {})).filter(
      (id) => typeof id === "string" && id
    );
  } catch (err) {
    console.warn("No se pudieron leer los talleres recomendados.", err);
    return [];
  }
}

export async function guardarIdsRecomendados(pagina, ids) {
  await set(ref(dbRealtime, `paginasEspeciales/${pagina}`), {
    recomendados: ids,
    actualizadoEn: new Date().toISOString(),
  });
}

// Talleres activos recomendados de una página, en el orden elegido en el panel
export function useTalleresRecomendados(pagina) {
  const [talleres, setTalleres] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    Promise.all([cargarIdsRecomendados(pagina), cargarTalleres()])
      .then(([ids, todos]) => {
        if (!activo) return;
        const porId = new Map(todos.map((t) => [t.id, t]));
        setTalleres(ids.map((id) => porId.get(id)).filter(Boolean));
      })
      .catch((err) => console.error("Error al cargar recomendados:", err))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [pagina]);

  return { talleres, cargando };
}
