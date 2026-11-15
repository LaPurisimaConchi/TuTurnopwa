// src/components/SelectorDiaReserva.jsx
// Elección del día en una reserva: calendario y, debajo, el aviso que toque (día
// cerrado con su motivo, fecha habilitada a mano o día sin taller). `children` va
// después de los avisos.
import { useRef } from "react";
import CalendarioReserva from "./CalendarioReserva";

export default function SelectorDiaReserva({
  etiqueta = "Selecciona el día:",
  value,
  onChange,
  estadoDia,
  cargando = false,
  fechaBloqueada,
  fechaHabilitadaManual,
  diaNoDisponible,
  clase,
  producto = "Este taller",
  desde = "",
  children,
}) {
  const raiz = useRef(null);

  // En móvil, las siguientes opciones (turno, método, plazas…) quedan debajo del
  // calendario: al elegir un día se baja hasta ellas. En escritorio van al lado.
  const elegir = (iso) => {
    onChange(iso);
    if (window.innerWidth >= 768) return;

    setTimeout(() => {
      let el = raiz.current;
      for (let i = 0; i < 3 && el && !el.nextElementSibling; i += 1) el = el.parentElement;
      const siguiente = el?.nextElementSibling;
      if (!siguiente) return;

      const arriba = siguiente.getBoundingClientRect().top + window.scrollY - 76; // cabecera fija
      window.scrollTo({ top: arriba, behavior: "smooth" });
    }, 60);
  };

  return (
    <div ref={raiz}>
      <p className="block font-bold text-sm mb-2">{etiqueta}</p>

      <CalendarioReserva
        value={value}
        onChange={elegir}
        estadoDia={estadoDia}
        cargando={cargando}
        desde={desde}
      />

      {fechaBloqueada && (
        <p className="mt-2 text-sm text-red-600 font-medium">
          Este día no está disponible para reservar.
          {fechaBloqueada.motivo ? ` Motivo: ${fechaBloqueada.motivo}.` : ""}
        </p>
      )}

      {value && !fechaBloqueada && fechaHabilitadaManual && (
        <p className="mt-2 text-sm text-green-700 font-medium">
          Esta fecha ha sido habilitada manualmente desde administración.
        </p>
      )}

      {value && !fechaBloqueada && !fechaHabilitadaManual && diaNoDisponible && (
        <p className="mt-2 text-sm text-red-600 font-medium">
          {producto} no se imparte el día seleccionado. Días disponibles:{" "}
          {Object.keys(clase?.horarios || {}).join(", ") || "—"}.
        </p>
      )}

      {children}
    </div>
  );
}
