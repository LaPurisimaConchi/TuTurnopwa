// src/components/SelectorTurnoReserva.jsx
// Desplegable (o, con `botones`, botones) del turno de una reserva (talleres y bonos). El texto de la opción
// vacía lo decide quien lo usa, según lo que falte por elegir.
import { useRef } from "react";

export default function SelectorTurnoReserva({
  etiqueta = "Selecciona el turno:",
  value,
  onChange,
  turnos,
  deshabilitado = false,
  placeholder = "-- Elige turno --",
  id = "turno",
  botones = false, // los turnos se ven como botones en lugar de un desplegable
}) {
  const raiz = useRef(null);

  // En móvil, tras elegir turno se sube la sección a la parte alta de la pantalla para
  // que queden a la vista las plazas, el precio y el botón de confirmar
  const elegirBoton = (turno) => {
    onChange(turno);
    if (window.innerWidth >= 768) return;

    setTimeout(() => {
      if (!raiz.current) return;
      const arriba = raiz.current.getBoundingClientRect().top + window.scrollY - 76; // cabecera fija
      window.scrollTo({ top: arriba, behavior: "smooth" });
    }, 60);
  };

  if (botones) {
    return (
      <div ref={raiz}>
        <p id={`${id}-etiqueta`} className="block font-bold text-sm mb-2">
          {etiqueta}
        </p>
        {deshabilitado || !turnos.length ? (
          <p className="text-sm text-tinta-suave">{placeholder.replace(/^-+\s*|\s*-+$/g, "")}</p>
        ) : (
          <div role="radiogroup" aria-labelledby={`${id}-etiqueta`} className="flex flex-wrap gap-2">
            {turnos.map((turno) => {
              const elegido = value === turno;
              return (
                <button
                  key={turno}
                  type="button"
                  role="radio"
                  aria-checked={elegido}
                  onClick={() => elegirBoton(turno)}
                  className={`px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                    elegido
                      ? "bg-terracota border-terracota text-white ring-2 ring-terracota-suave"
                      : "bg-mostaza-suave border-mostaza text-tinta hover:bg-mostaza/40"
                  }`}
                >
                  {turno}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="block font-bold text-sm mb-1">
        {etiqueta}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base disabled:bg-arena disabled:text-tinta-suave"
        required
        disabled={deshabilitado}
      >
        <option value="">{placeholder}</option>
        {turnos.map((turno) => (
          <option key={turno} value={turno}>
            {turno}
          </option>
        ))}
      </select>
    </div>
  );
}
