// src/components/DatosContactoInvitado.jsx
// Ventana que pide los datos de contacto justo antes de guardar una reserva o
// compra sin cuenta. La sesión de invitado se abre aquí, al enviarlos, y no
// antes: quien solo mira fechas y plazas no deja ninguna cuenta anónima.
import { Link, useLocation } from "react-router-dom";
import FormularioDatosContacto from "./FormularioDatosContacto";
import { iniciarCompraInvitado } from "../utils/invitado";

export default function DatosContactoInvitado({ onListo, onCancelar }) {
  const location = useLocation();

  // Para volver a esta pantalla tras entrar o registrarse
  const volverAqui = {
    from: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
    },
  };

  const alEnviar = async (datos) => {
    const user = await iniciarCompraInvitado(datos);
    onListo(user);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="datos-contacto-titulo"
    >
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-6">
        <div className="text-center mb-5">
          <h2 id="datos-contacto-titulo" className="text-2xl text-[#5c3c00] font-serif">
            Tus datos de contacto
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Los necesitamos para confirmar tu reserva y avisarte si hay cualquier
            cambio. No hace falta que te registres.
          </p>
        </div>

        <FormularioDatosContacto alEnviar={alEnviar} textoBoton="Continuar al pago" />

        <button
          type="button"
          onClick={onCancelar}
          className="w-full mt-3 text-sm text-gray-600 underline"
        >
          Volver a la reserva
        </button>

        <div className="mt-5 pt-4 border-t border-[#f1e7c6] text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" state={volverAqui} className="text-[#b36a4a] font-semibold underline">
            Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
