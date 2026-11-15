//pantalla antigua

import React from "react";
import BotonReserva from "./BotonReserva";
import PantallaConVolver from "./PantallaConVolver";

export default function PintarCeramica() {
  return (
    <PantallaConVolver>
      <div className="bg-white text-[#333] font-sans max-w-sm w-full shadow-md rounded-2xl overflow-hidden relative">
        <img
          src="/img/pintatupieza.jpg"
          alt="Clase Pintar Cerámica"
          className="w-full h-[260px] object-cover object-center"
        />

        <div className="absolute top-3 left-4 bg-[#fde68a] text-tinta font-bold text-sm px-4 py-1 rounded-full z-10">
          desde 25€
        </div>

        <div className="p-5 pt-2">
          <h2 className="text-center text-xl font-bold mb-1">
            DECORA TU PIEZA FAVORITA
          </h2>
          <p className="text-center text-sm text-tinta-suave mb-4">
            Taller único para disfrutar dando color
          </p>

          <div className="bg-mostaza-suave border border-mostaza text-sm text-center font-bold p-3 rounded-xl mb-4">
            Ideal para quienes desean disfrutar del proceso de pintar y decorar
            piezas.
            <br />
            <strong>SIN NECESIDAD DE EXPERIENCIA.</strong>
          </div>

          <p className="text-sm mb-3">
            Elige una pieza de cerámica blanca, selecciona tus colores y decora con total libertad. Nosotros nos encargamos del esmaltado y la cocción para que tu creación quede perfecta.
          </p>

          <p className="text-sm mb-6">
            ¡Todo está incluido! Solo tienes que elegir la pieza que más te guste y disfrutar del proceso creativo sin preocuparte por nada.
          </p>

          <BotonReserva destino="/reserva-pintar-ceramica" />
        </div>
      </div>
    </PantallaConVolver>
  );
}

