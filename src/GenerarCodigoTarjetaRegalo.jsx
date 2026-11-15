import React from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";

export default function GenerarCodigoTarjetaRegalo() {
  const navigate = useNavigate();

  return (
    <div className="bg-crema min-h-screen px-4 py-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <BotonVolver />

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-tinta font-serif mb-2">
            Tarjeta regalo
          </h1>
          <p className="text-sm text-tinta-suave">
            El código definitivo se genera automáticamente tras confirmar el pago.
          </p>
        </div>

        <div className="bg-crema border border-linea rounded-xl p-4 text-sm text-tinta mb-5">
          <p>
            Para ver el código real de la tarjeta regalo, vuelve a la confirmación
            del pago o consulta tu perfil.
          </p>
        </div>

        <button
          onClick={() => navigate("/perfil")}
          className="w-full px-6 py-3 rounded-full text-white font-semibold
          bg-terracota
          shadow-md hover:shadow-lg
          hover:bg-terracota-oscuro
          transition-all duration-200"
        >
          Ir a mi perfil
        </button>
      </div>
    </div>
  );
}