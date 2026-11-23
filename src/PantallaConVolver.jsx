// src/PantallaConVolver.jsx
import React from "react";

// `recortar={false}` deja que un hijo salga de los márgenes (por ejemplo, una barra a todo el ancho)
export default function PantallaConVolver({ children, recortar = true, className = "px-0 pt-0 pb-6 -mt-5 sm:mt-0 sm:px-4 sm:py-6" }) {
  return (
    <div className={`bg-crema min-h-screen w-full ${className} ${recortar ? "overflow-x-clip" : ""}`}>

      {children}

    </div>
  );
}