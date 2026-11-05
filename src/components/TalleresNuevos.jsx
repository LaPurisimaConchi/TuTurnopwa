// src/components/TalleresNuevos.jsx
// Talleres creados desde el panel admin para un grupo del catálogo. Con
// «todos» salen también los de siempre sin migrar (página genérica de categoría).
import { useEffect, useState } from "react";
import { cargarTalleresDeGrupo, cargarTalleresDinamicos } from "../catalogoTalleres";
import TarjetaTaller from "./TarjetaTaller";
import useMiniaturasTalleres from "./useMiniaturasTalleres";

export default function TalleresNuevos({ grupo, titulo, textoBoton, onElegir, alCargar, todos = false }) {
  const [talleres, setTalleres] = useState([]);
  const miniaturas = useMiniaturasTalleres(talleres);

  useEffect(() => {
    (todos ? cargarTalleresDeGrupo(grupo) : cargarTalleresDinamicos(grupo))
      .then((lista) => {
        setTalleres(lista);
        alCargar?.(lista);
      })
      .catch((error) => console.error("Error al cargar talleres nuevos:", error));
    // alCargar es un aviso opcional; no debe volver a lanzar la carga
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grupo, todos]);

  if (!talleres.length) return null;

  return (
    <section className="mt-8">
      {titulo && (
        <h2 className="mb-4 text-xl font-bold text-gray-800">{titulo}</h2>
      )}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {talleres.map((taller) => (
          <TarjetaTaller
            key={taller.id}
            taller={taller}
            imagen={miniaturas[taller.id]}
            textoBoton={textoBoton}
            onElegir={onElegir}
          />
        ))}
      </div>
    </section>
  );
}
