// src/components/useTalleres.js
import { useEffect, useState } from "react";
import { cargarTalleres } from "../catalogoTalleres";

// Todos los talleres (ocultos incluidos), para decidir qué se muestra en los
// listados de siempre. Si no se pueden cargar, esos listados no se filtran.
export default function useTalleres() {
  const [estado, setEstado] = useState({ cargado: false, talleres: [] });

  useEffect(() => {
    let cancelado = false;

    cargarTalleres({ incluirOcultos: true })
      .then((talleres) => {
        if (!cancelado) setEstado({ cargado: true, talleres });
      })
      .catch((error) => {
        console.error("Error al cargar los talleres:", error);
        if (!cancelado) setEstado({ cargado: true, talleres: [], error: true });
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // ¿Se muestra la tarjeta de siempre de este taller en los listados?
  const visibleEstatico = (claseId) => {
    if (!estado.cargado || estado.error) return true;
    const taller = estado.talleres.find((t) => t.id === claseId);
    return !!taller && !taller.dinamica && taller.estado === "activa";
  };

  const dinamicosDelGrupo = (grupo) =>
    estado.talleres.filter(
      (t) => t.dinamica && t.estado === "activa" && t.grupo === grupo
    );

  return { ...estado, visibleEstatico, dinamicosDelGrupo };
}
