// src/components/SelectorDiaReserva.jsx
// Elección del día en una reserva: calendario y, debajo, el aviso que toque (día
// cerrado con su motivo, fecha habilitada a mano o día sin taller). `children` va
// después de los avisos.
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
  children,
}) {
  return (
    <div>
      <p className="block font-bold text-sm mb-2">{etiqueta}</p>

      <CalendarioReserva
        value={value}
        onChange={onChange}
        estadoDia={estadoDia}
        cargando={cargando}
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
