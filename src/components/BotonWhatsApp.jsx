// src/components/BotonWhatsApp.jsx
// Botón flotante de WhatsApp (abajo a la derecha) para consultar dudas al taller.
// Se monta una sola vez en AppLayout. z-30: por debajo del header (z-40) y de los modales (z-50).
import React from "react";

const WHATSAPP_NUMERO = "34644671664";
const MENSAJE = "Hola, tengo una duda sobre La Purísima Conchi.";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(MENSAJE)}`;

export default function BotonWhatsApp() {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="group fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-30 flex items-center gap-2.5"
    >
      <span className="hidden sm:block pointer-events-none rounded-lg bg-tinta px-3 py-1.5 text-xs text-crema opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        ¿Dudas? Escríbenos por WhatsApp
      </span>
      <span className="flex h-[52px] w-[52px] sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-transform group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-[#25D366]/40">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.7 1.2 1.5 1.9 1 .9 1.9 1.2 2.2 1.3.3.1.4.1.6-.1l.8-1c.2-.2.3-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2Z" />
        </svg>
      </span>
    </a>
  );
}
