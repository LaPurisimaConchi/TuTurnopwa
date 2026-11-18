// src/PagoFallido.jsx
// Vuelta del TPV cuando el pago no se completa (cancelado o rechazado). No se ha
// cobrado nada y la plaza apartada se libera sola pasados los minutos de reserva,
// así que se ofrece volver a reservar desde el principio o escribir al taller.
import React, { useEffect } from "react";
import Icono from "./components/Icono";
import { useNavigate } from "react-router-dom";
import { useConfigEspacio } from "./configuracionEspacio";
import { enlaceWhatsapp } from "./utils/configEspacio";
import {
  cancelarCierreSesionInvitado,
  cerrarCompraInvitado,
  cerrarSesionInvitadoTrasSalir,
} from "./utils/invitado";

const PagoFallido = () => {
  const navigate = useNavigate();
  const { config } = useConfigEspacio();

  // La compra ha terminado: la siguiente vuelve a pedir los datos al invitado
  useEffect(() => {
    cancelarCierreSesionInvitado();
    cerrarCompraInvitado();
    return () => cerrarSesionInvitadoTrasSalir();
  }, []);

  return (
    <div className="px-4 py-10">
      <div className="max-w-md mx-auto bg-white rounded-2xl border border-linea shadow-sm p-6 text-center text-tinta">
        <h1 className="font-serif text-2xl font-bold mb-3">
          <Icono nombre="triste" className="mr-1.5" />
          El pago no se ha completado
        </h1>
        <p className="text-sm mb-2">
          No se ha hecho ningún cargo en tu tarjeta y la reserva no se ha confirmado.
        </p>
        <p className="text-sm text-tinta-suave mb-6">
          La plaza que tenías apartada se libera sola en unos {config.minutosReserva} minutos.
          Si quieres, vuelve a elegir el taller y la fecha para intentarlo de nuevo.
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate("/portada")}
            className="bg-terracota hover:bg-terracota-oscuro text-white font-bold py-3 rounded-full"
          >
            Volver a reservar
          </button>
          <a
            href={enlaceWhatsapp(
              config.telefonoWhatsapp,
              "Hola, he intentado pagar una reserva y el pago no se ha completado."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-terracota text-terracota font-semibold py-3 rounded-full"
          >
            ¿Problemas? Escríbenos por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default PagoFallido;
