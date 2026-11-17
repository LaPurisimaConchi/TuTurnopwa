// src/PantallaConVolver.jsx
import React from "react";

// `recortar={false}` deja que un hijo salga de los márgenes (por ejemplo, una barra a todo el ancho)
export default function PantallaConVolver({ children, recortar = true, className = "px-4 py-6" }) {
  return (
    <div className={`bg-crema min-h-screen w-full ${className} ${recortar ? "overflow-x-clip" : ""}`}>

      {children}

    </div>
  );
}