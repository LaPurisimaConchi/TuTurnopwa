// src/RedirigirAFicha.jsx
// /reservar/:claseId ya no es una pantalla aparte para talleres y bonos: la
// reserva (calendario, turno, plazas) va dentro de la ficha pública /taller/:claseId.
// Quien llega aquí (enlaces antiguos, correos, tarjetas regalo, «siguiente sesión»…)
// se lleva a la ficha conservando la búsqueda (?variante=&metodo=) y los datos de la
// navegación (tarjeta regalo), y se baja hasta la reserva.
// Los monográficos tienen su propio formulario y siguen aquí.
import { useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import { esMonografico } from "./utils/monografico";

export default function RedirigirAFicha({ children }) {
  const { claseId } = useParams();
  const location = useLocation();
  const [destino, setDestino] = useState(null); // null = cargando | "ficha" | "aqui"

  useEffect(() => {
    let cancelado = false;
    setDestino(null);

    get(ref(dbRealtime, `clases/${claseId}`))
      .then((snap) => {
        if (cancelado) return;
        const clase = snap.exists() ? snap.val() : null;
        const normal = clase?.dinamica && !esMonografico(clase);
        setDestino(normal ? "ficha" : "aqui");
      })
      .catch((error) => {
        // Sin poder leerla, la pantalla de siempre avisará del error
        console.error("Error al leer la ficha del taller:", error);
        if (!cancelado) setDestino("aqui");
      });

    return () => {
      cancelado = true;
    };
  }, [claseId]);

  if (destino === null) {
    return <div className="text-center text-tinta-suave py-16">Cargando...</div>;
  }

  if (destino === "ficha") {
    return (
      <Navigate
        to={{ pathname: `/taller/${claseId}`, search: location.search, hash: "#reservar" }}
        replace
        state={location.state}
      />
    );
  }

  return children;
}
