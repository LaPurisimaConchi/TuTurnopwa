import React from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";


export default function PoliticaPiezas() {
  const navigate = useNavigate();

  return (
    <div className="text-gray-800 px-4 py-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <img
          src="/img/logoPCsin.png"
          alt="Logo del taller"
          className="mx-auto mb-6 w-36"
        />

        <BotonVolver />
        <h1 className="text-2xl font-bold text-center text-orange-800 mb-8">
          Política sobre roturas de piezas
        </h1>

        <section className="mb-6">
          <p>
            En el taller trabajamos con materiales frágiles como el barro y el esmalte, 
            y aunque ponemos todo el cariño en cuidar cada creación, hay factores fuera 
            de nuestro control que pueden afectar el resultado final.
          </p>
        </section>

        <section className="mb-6">
          <ul className="list-disc list-inside ml-4">
            <li>
              Las piezas pueden <strong>romperse, agrietarse o deformarse</strong> durante el secado, la cocción o el esmaltado.
            </li>
            <li>
              No podemos <strong>garantizar el resultado final</strong> de cada pieza, 
              especialmente si se trata de formas complejas o muy finas.
            </li>
            <li>
              Aunque tratamos de minimizar los riesgos, las 
              <strong> roturas forman parte natural del proceso cerámico</strong>.
            </li>
          </ul>
        </section>

        <section className="mb-6">
          <p>
            Aun así, siempre intentamos ofrecerte una solución, como rehacer la pieza 
            en otra sesión si es posible, o guardarla como muestra del aprendizaje.
          </p>
          <p className="mt-2">
            Lo más importante es <strong>disfrutar del proceso y aprender</strong>.
          </p>
        </section>

        <div className="text-center text-sm text-gray-600">
          Gracias por tu comprensión y por formar parte de esta experiencia creativa.
        </div>
      </div>
    </div>
  );
}
