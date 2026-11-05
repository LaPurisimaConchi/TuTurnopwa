// src/components/useCategorias.js
import { useEffect, useState } from "react";
import { cargarCategorias, categoriasDeSiempre } from "../categoriasTalleres";

// Categorías de talleres (las de siempre y las del panel). Empieza con las de
// siempre para que la pantalla no parpadee mientras llegan las demás.
export default function useCategorias({ incluirOcultas = false } = {}) {
  const [categorias, setCategorias] = useState(categoriasDeSiempre);

  useEffect(() => {
    let cancelado = false;

    cargarCategorias({ incluirOcultas })
      .then((lista) => {
        if (!cancelado) setCategorias(lista);
      })
      .catch((error) => console.error("Error al cargar las categorías:", error));

    return () => {
      cancelado = true;
    };
  }, [incluirOcultas]);

  return categorias;
}
