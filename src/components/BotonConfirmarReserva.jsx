// src/components/BotonConfirmarReserva.jsx
// Botón de envío de las pantallas de reserva (talleres y bonos).
export default function BotonConfirmarReserva({ guardando, desdeTarjeta, deshabilitado, texto }) {
  return (
    <button
      type="submit"
      className="w-full mt-4 px-6 py-3 rounded-full text-white font-semibold
      bg-terracota hover:bg-terracota-oscuro
      shadow-md hover:shadow-lg
      transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={guardando || deshabilitado}
    >
      {guardando ? "Guardando..." : texto || (desdeTarjeta ? "Confirmar reserva" : "Confirmar y pagar")}
    </button>
  );
}
