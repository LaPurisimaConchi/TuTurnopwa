import React from "react";
import { Link } from "react-router-dom";

// Ruta que no existe: se dice claramente en vez de llevar a la portada sin más
export default function NoEncontrada() {
  return (
    <div className="bg-crema min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6 text-[#333] text-center">
        <p className="text-5xl font-semibold text-tinta mb-2">404</p>
        <h1 className="text-[1.4rem] text-tinta font-semibold mb-3">Esta página no existe</h1>
        <p className="mb-6">
          Puede que el enlace esté mal escrito o que la página ya no esté disponible.
        </p>
        <Link
          to="/portada"
          className="inline-block bg-mostaza text-tinta font-semibold rounded-full px-6 py-2"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
