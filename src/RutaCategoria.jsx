// src/RutaCategoria.jsx
// Envuelve las páginas de siempre de cada categoría de talleres:
// - Si la categoría se ha migrado al panel, redirige a la página genérica
//   (/categoria/:id), que refleja sus cambios (nombre, texto, visibilidad).
// - Si se ha ocultado o borrado desde el panel, avisa de que ya no está disponible.
// - En cualquier otro caso (o si no se puede leer), muestra la página de siempre.
// - Con ?desdeGrupos (elegir un taller para una reserva de grupo) se muestra siempre
//   la página de siempre, que sabe devolver la elección.
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { cargarRegistrosCategorias } from "./categoriasTalleres";
import PantallaConVolver from "./PantallaConVolver";

export default function RutaCategoria({ categoriaId, children }) {
  const location = useLocation();
  const desdeGrupos = !!location.state?.desdeGrupos;
  const [estado, setEstado] = useState("cargando"); // cargando | antigua | migrada | noDisponible

  useEffect(() => {
    if (desdeGrupos) return undefined;

    let cancelado = false;

    cargarRegistrosCategorias()
      .then((registros) => {
        if (cancelado) return;
        const registro = registros.find((r) => r.id === categoriaId);

        if (!registro) setEstado("antigua");
        else if (registro.eliminada || registro.estado === "oculta") setEstado("noDisponible");
        else setEstado("migrada");
      })
      .catch(() => {
        if (!cancelado) setEstado("antigua");
      });

    return () => {
      cancelado = true;
    };
  }, [categoriaId, desdeGrupos]);

  if (desdeGrupos) return children;

  if (estado === "cargando") {
    return <p className="text-center text-gray-500 py-16">Cargando...</p>;
  }

  if (estado === "migrada") {
    return <Navigate to={`/categoria/${categoriaId}`} replace state={location.state} />;
  }

  if (estado === "noDisponible") {
    return (
      <PantallaConVolver>
        <div className="bg-white text-[#333] font-sans max-w-3xl w-full mx-auto shadow-md rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-[#3b3025] mb-4">
            Esta categoría no está disponible
          </h1>
          <p className="text-sm text-gray-700 leading-relaxed mb-6">
            Puedes ver el resto de talleres desde la lista de talleres.
          </p>
          <Link
            to="/clases"
            className="inline-block px-6 py-3 rounded-full bg-[#f4c542] text-[#5c3c00] font-semibold hover:bg-[#e8b932] transition"
          >
            Ver talleres
          </Link>
        </div>
      </PantallaConVolver>
    );
  }

  return children;
}
