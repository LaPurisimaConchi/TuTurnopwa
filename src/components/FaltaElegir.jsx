import React from "react";
import { Link } from "react-router-dom";

// Pantalla de error de las páginas que solo tienen sentido con algo ya elegido (un taller,
// su opción, su método…): se llega desde la ficha del taller, no escribiendo la dirección.
export default function FaltaElegir({ titulo, mensaje, enlace, textoEnlace }) {
  return (
    <div className="bg-crema min-h-[60vh] flex items-center justify-center px-4 py-10">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6 text-[#333] text-center" role="alert">
        <h1 className="text-[1.4rem] text-tinta font-semibold mb-3">{titulo}</h1>
        <p className="mb-6">{mensaje}</p>
        <Link
          to={enlace}
          className="inline-block bg-mostaza text-tinta font-semibold rounded-full px-6 py-2"
        >
          {textoEnlace}
        </Link>
      </div>
    </div>
  );
}
