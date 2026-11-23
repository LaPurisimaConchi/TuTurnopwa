import { useNavigate } from "react-router-dom";

const BotonReserva = ({ destino, className = "", texto = "Reservar ahora", disabled = false }) => {
  const navigate = useNavigate();

  return (
      <button
        type="button"
        onClick={() => navigate(destino)}
        disabled={disabled}
        className={`w-full bg-terracota hover:bg-terracota-oscuro text-white font-semibold px-6 py-2 rounded-full transition mb-5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-terracota ${className}`}
      >
        {texto}
      </button>
  );
};

export default BotonReserva;
