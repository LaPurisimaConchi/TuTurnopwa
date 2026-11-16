// src/components/DatosContactoInvitado.jsx
// Ventana que pide los datos de contacto justo antes de guardar una reserva o
// compra sin cuenta. La sesión de invitado se abre aquí, al enviarlos, y no
// antes: quien solo mira fechas y plazas no deja ninguna cuenta anónima.
import { Link, useLocation } from "react-router-dom";
import FormularioDatosContacto from "./FormularioDatosContacto";
import { iniciarCompraInvitado } from "../utils/invitado";

// compra: para compras que no son una reserva (p. ej. tarjeta regalo)
export default function DatosContactoInvitado({ onListo, onCancelar, compra = false }) {
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
        <h2 id="datos-contacto-titulo" className="text-2xl text-tinta font-serif text-center mb-5">
          ¿Cómo quieres continuar?
        </h2>

        <div className="border border-terracota rounded-xl p-4 text-center">
          <p className="font-bold text-tinta">¿Ya tienes cuenta?</p>
          <p className="text-sm text-tinta-suave mt-1">
            Entra para tener tus datos y tus {compra ? "compras" : "reservas"} guardados.
          </p>
          <Link
            to="/login"
            state={volverAqui}
            className="block w-full mt-3 px-6 py-3 rounded-full border-2 border-terracota text-terracota font-semibold hover:bg-terracota-suave transition"
          >
            Iniciar sesión
          </Link>
        </div>

        <div className="flex items-center gap-3 my-5 text-sm text-tinta-suave">
          <span className="flex-1 border-t border-linea" />
          o
          <span className="flex-1 border-t border-linea" />
        </div>

        <div className="border border-linea rounded-xl p-4 bg-crema">
          <p className="font-bold text-tinta text-center">Continuar como invitado</p>
          <p className="text-sm text-tinta-suave mt-1 mb-4 text-center">
            Solo necesitamos tus datos para confirmar tu {compra ? "compra" : "reserva"} y
            avisarte si hay cualquier cambio. No hace falta registrarse.
          </p>

          <FormularioDatosContacto alEnviar={alEnviar} textoBoton="Continuar como invitado" />
        </div>

        <button
          type="button"
          onClick={onCancelar}
          className="w-full mt-4 text-sm text-tinta-suave underline"
        >
          {compra ? "Volver" : "Volver a la reserva"}
        </button>
      </div>
    </div>
  );
}
