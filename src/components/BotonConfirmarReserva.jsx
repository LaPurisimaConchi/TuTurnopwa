// src/components/BotonConfirmarReserva.jsx
// Botón de envío de las pantallas de reserva (talleres y bonos).
export default function BotonConfirmarReserva({ guardando, desdeTarjeta, deshabilitado }) {
  return (
    <button
      type="submit"
      className="w-full mt-4 px-6 py-3 rounded-full text-white font-semibold
      bg-gradient-to-b from-[#F6D66A] to-[#F4C542]
      shadow-md hover:shadow-lg
      hover:from-[#F4C542] hover:to-[#E5B92F]
      transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={guardando || deshabilitado}
    >
      {guardando ? "Guardando..." : desdeTarjeta ? "Confirmar reserva" : "Confirmar y pagar"}
    </button>
  );
}
