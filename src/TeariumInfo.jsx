import React from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";

export default function Tearium() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-crema p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-6">

        <BotonVolver />

        <img
          src="/img/pintarkarma.jpg"
          alt="Tearium"
          className="w-full h-60 object-cover rounded-xl mb-6"
        />

        <h1 className="text-3xl font-serif text-[#a85d38] font-bold mb-4 text-center">
          Tearium
        </h1>

        <p className="text-tinta text-base mb-4">
          Vive una experiencia única de pintura cerámica en <strong>Tearium</strong>, 
          un espacio acogedor pensado para que desconectes, disfrutes del arte y 
          compartas un rato relajante contigo mismo o con otras personas.
        </p>

        <p className="text-tinta text-base mb-4">
          Ponemos a tu disposición pinceles, pinturas, piezas de cerámica y todo el material necesario.
          No necesitas experiencia previa. Podrás elegir si pintar una taza, un cuenco o dejarte llevar.
          Además, disfrutarás de un ambiente tranquilo, buena música
          y la opción de tomar algo si te apetece.
        </p>

        <div className="text-sm text-tinta-suave mb-6">
          <strong>Horarios:</strong>
          <ul className="list-disc list-inside mt-2">
            <li>
              <strong></strong> lunes, martes, jueves y sábado (mañana).  
              Miércoles solo en horario de mañana.
            </li>
            <li>
              Precio por sesión: 25 €. Es necesario reservar previamente.
            </li>
          </ul>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => navigate("/reservatearium")}
            className="bg-[#a85d38] text-white px-6 py-3 rounded-xl text-lg hover:bg-[#8f4f2e] transition"
          >
            Reservar en Tearium
          </button>
        </div>
      </div>
    </div>
  );
}

