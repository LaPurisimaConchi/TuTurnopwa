import React from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";


export default function TheClub() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-crema p-6">
      <div className="max-w-2xl mx-auto bg-white shadow-md rounded-2xl p-6">
        
        <BotonVolver />

        <img
          src="/img/pintartheclub.jpg"
          alt="The Club"
          className="w-full h-60 object-cover rounded-xl mb-4"
        />

        <h1 className="text-3xl font-serif text-tinta font-bold mb-4 text-center">
          Pinta tu pieza en The Club 
        </h1>

        <p className="text-tinta text-base mb-4">
          En The Club (Av. Fray Albino, 3 – Córdoba) podrás disfrutar de una
          experiencia relajante y creativa mientras pintas tu pieza de cerámica
          favorita. Tendrás a tu disposición todo el material necesario: pinceles,
          pinturas y varias piezas a elegir.
        </p>
        <p className="text-tinta text-base mb-4">
          Además de dar rienda suelta a tu creatividad, podrás merendar, tomar café
          o té en un ambiente acogedor. La actividad tiene un coste de 25 € y
          requiere reserva previa.
        </p>

        <div className="text-sm text-tinta-suave mb-6">
          <strong>Días y horarios disponibles:</strong>
          <ul className="list-disc list-inside mt-2">
            <li>Martes a viernes</li>
            <li>Turnos: 17:00 – 19:00 y 19:00 – 21:00</li>
            <li>Plazas diarias: máximo 30</li>
          </ul>
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate("/reservatheclub")}
            className="bg-[#f4a6b4] hover:bg-[#e78fa0] text-white font-bold py-2 px-6 rounded-full transition"
          >
            Reservar ahora
          </button>
        </div>
      </div>
    </div>
  );
}

