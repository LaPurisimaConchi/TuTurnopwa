// src/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-[#fffef4] text-center text-gray-600 text-sm py-6 px-4 border-t">
      <nav className="flex justify-center gap-4 flex-wrap text-xs">
        <Link to="/aviso-legal" className="hover:underline">
          Aviso legal
        </Link>
        <Link to="/politica-privacidad" className="hover:underline">
          Política de privacidad
        </Link>
        <Link to="/condiciones-pago" className="hover:underline">
          Condiciones de pago
        </Link>
        <Link to="/politicacancelacion" className="hover:underline">
          Política de cancelación
        </Link>
        <Link to="/condicionesuso" className="hover:underline">
          Condiciones de uso
        </Link>
        <Link to="/politica-piezas" className="hover:underline">
          Política de piezas
        </Link>
      </nav>
    </footer>
  );
}



