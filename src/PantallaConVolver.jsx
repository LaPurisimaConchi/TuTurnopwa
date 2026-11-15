// src/PantallaConVolver.jsx
import React from "react";

// `recortar={false}` deja que un hijo salga de los márgenes (por ejemplo, una barra a todo el ancho)
export default function PantallaConVolver({ children, recortar = true }) {
  return (
    <div className={`bg-[#fffef4] min-h-screen w-full px-4 py-6 ${recortar ? "overflow-x-clip" : ""}`}>

      {children}

    </div>
  );
}