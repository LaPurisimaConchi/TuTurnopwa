// src/components/SelectorTurnoReserva.jsx
// Desplegable del turno de una reserva (talleres y bonos). El texto de la opción
// vacía lo decide quien lo usa, según lo que falte por elegir.
export default function SelectorTurnoReserva({
  etiqueta = "Selecciona el turno:",
  value,
  onChange,
  turnos,
  deshabilitado = false,
  placeholder = "-- Elige turno --",
}) {
  return (
    <div>
      <label htmlFor="turno" className="block font-bold text-sm mb-1">
        {etiqueta}
      </label>
      <select
        id="turno"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base disabled:bg-gray-100 disabled:text-gray-400"
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
