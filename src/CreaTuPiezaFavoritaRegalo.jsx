import React from "react";
import { Link } from "react-router-dom";

export default function CreaTuPiezaFavoritaRegalo() {
  return (
    <div className="p-6 bg-crema min-h-screen text-tinta">
      <h1 className="text-3xl font-serif font-bold mb-4 text-tinta">
        Crea tu pieza favorita
      </h1>

      <img
  src="/img/creatupiezafavoritaregalo.jpg"
  alt="Crear pieza"
  className="w-full max-w-md h-auto mb-6 rounded-xl shadow-sm"
/>

      <p className="mb-4">
        Una clase de 3 horas para modelar y decorar tu propia pieza desde cero.
        Es ideal para iniciarte en el mundo de la cerámica, tanto con torno como con técnicas manuales.
      </p>

      <p className="mt-6 text-terracota-oscuro font-semibold">
        Para regalar esta clase,{" "}
        <Link to="/registro" className="underline">regístrate aquí</Link>.
      </p>
    </div>
  );
}
