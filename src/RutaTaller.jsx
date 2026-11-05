// src/RutaTaller.jsx
// Envuelve las páginas de siempre de cada taller (landing y reserva):
// - Si el taller se ha migrado al panel, redirige a la página genérica
//   (/taller/:id o /reservar/:id), conservando los datos de la navegación
//   (tarjeta regalo, etc.).
// - Si se ha borrado desde el panel, avisa de que ya no está disponible.
// - En cualquier otro caso (o si no se puede leer), muestra la página de siempre.
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import PantallaConVolver from "./PantallaConVolver";

export default function RutaTaller({ claseId, tipo = "pagina", children }) {
  const location = useLocation();
  const [estado, setEstado] = useState("cargando"); // cargando | antigua | migrada | borrada

  useEffect(() => {
    let cancelado = false;

    get(ref(dbRealtime, `clases/${claseId}`))
      .then((snap) => {
        if (cancelado) return;
        if (!snap.exists()) setEstado("borrada");
        else setEstado(snap.val()?.dinamica ? "migrada" : "antigua");
      })
      .catch((error) => {
        console.error("Error al comprobar el taller:", error);
        if (!cancelado) setEstado("antigua");
      });

    return () => {
      cancelado = true;
    };
  }, [claseId]);

  if (estado === "cargando") {
    return <p className="text-center text-gray-500 py-16">Cargando...</p>;
  }

  if (estado === "migrada") {
    return (
      <Navigate
        to={tipo === "reserva" ? `/reservar/${claseId}` : `/taller/${claseId}`}
        replace
        state={location.state}
      />
    );
  }

  if (estado === "borrada") {
    return (
      <PantallaConVolver>
        <div className="bg-white text-[#333] font-sans max-w-3xl w-full mx-auto shadow-md rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-[#3b3025] mb-4">
            Este taller ya no está disponible
          </h1>
          <p className="text-sm text-gray-700 leading-relaxed mb-6">
            El taller que buscas se ha retirado. Puedes ver el resto desde la lista
            de talleres.
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
