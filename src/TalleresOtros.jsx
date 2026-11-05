import React, { useState } from "react";
import BotonVolver from "./BotonVolver";
import TalleresNuevos from "./components/TalleresNuevos";

export default function TalleresOtros() {
  const [cargado, setCargado] = useState(false);
  const [hayTalleres, setHayTalleres] = useState(true);

  return (
    <div className="p-5 bg-[#fffef4] min-h-screen font-sans">
      <BotonVolver />

      <div className="flex flex-col md:flex-row items-center mb-7">
        <img
          src="/img/logoPCsin.png"
          alt="Logo La Purísima Conchi"
          className="h-20 w-auto mb-4 md:mb-0 md:mr-4"
        />

        <div className="text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-yellow-900 font-serif">
            Otros talleres
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Nuevas experiencias y talleres especiales del estudio.
          </p>
        </div>
      </div>

      <TalleresNuevos
        grupo="otros"
        textoBoton="Ver / Reservar"
        alCargar={(lista) => {
          setHayTalleres(lista.length > 0);
          setCargado(true);
        }}
      />

      {cargado && !hayTalleres && (
        <p className="text-sm text-gray-600">
          Ahora mismo no hay otros talleres disponibles.
        </p>
      )}
    </div>
  );
}
