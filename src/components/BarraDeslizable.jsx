// src/components/BarraDeslizable.jsx
// Fila de pestañas/filtros que se desliza en horizontal. Si queda contenido oculto
// por un lado, muestra un degradado con una flecha para avisar de que se puede
// deslizar. `fondo` es el color sobre el que está ("white" o "crema").
import { useEffect, useRef, useState } from "react";

// Flecha dibujada (no un carácter de texto) para que quede centrada de verdad
const Flecha = ({ izquierda = false }) => (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5 text-terracota"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={izquierda ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
  </svg>
);

const DEGRADADOS = {
  white: { izq: "from-white", der: "from-white via-white/90" },
  crema: { izq: "from-crema", der: "from-crema via-crema/90" },
};

export default function BarraDeslizable({
  children,
  fondo = "white",
  className = "",
  claseExterior = "",
  role,
}) {
  const barra = useRef(null);
  const [masIzquierda, setMasIzquierda] = useState(false);
  const [masDerecha, setMasDerecha] = useState(false);

  const medir = () => {
    const el = barra.current;
    if (!el) return;
    setMasIzquierda(el.scrollLeft > 4);
    setMasDerecha(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  });

  const colores = DEGRADADOS[fondo] || DEGRADADOS.white;

  return (
    <div className={`relative ${claseExterior}`}>
      <div
        ref={barra}
        onScroll={medir}
        role={role}
        className={`flex overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>

      {masIzquierda && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute top-0 bottom-1 left-0 w-10 bg-gradient-to-r ${colores.izq} to-transparent flex items-center pl-1.5`}
        >
          <Flecha izquierda />
        </div>
      )}
      {masDerecha && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute top-0 bottom-1 right-0 w-12 bg-gradient-to-l ${colores.der} to-transparent flex items-center justify-end pr-1.5`}
        >
          <Flecha />
        </div>
      )}
    </div>
  );
}
