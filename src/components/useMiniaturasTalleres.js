// src/components/useMiniaturasTalleres.js
import { useEffect, useState } from "react";
import { cargarMiniatura } from "../catalogoTalleres";

// Fotos subidas desde el admin para cada taller ({ claseId: dataUrl }).
// Mientras se busca, el id no está; si no tiene foto, vale null.
export default function useMiniaturasTalleres(talleres) {
  const [miniaturas, setMiniaturas] = useState({});
  const ids = talleres.map((t) => t.id).join(",");

  useEffect(() => {
    if (!ids) return undefined;
    let cancelado = false;

    Promise.all(
      ids.split(",").map(async (id) => [id, await cargarMiniatura(id)])
    ).then((pares) => {
      if (!cancelado) {
        setMiniaturas(Object.fromEntries(pares));
      }
    });

    return () => {
      cancelado = true;
    };
  }, [ids]);

  return miniaturas;
}
