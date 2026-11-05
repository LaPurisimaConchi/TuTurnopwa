import React from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";
import TalleresNuevos from "./components/TalleresNuevos";
import useTalleres from "./components/useTalleres";

export default function TalleresPintaDecora() {
  const navigate = useNavigate();
  const { visibleEstatico } = useTalleres();
  const ID_POR_RUTA = {
    "/pinta-tu-pieza": "pintatupieza",
    "/especial-pinta-tu-pieza": "especialpintatupieza",
  };
const talleresTodos = [
  {
    id: 1,
    titulo: "Pinta tu pieza de cerámica",
    precio: "25€",
    descripcion:
      "Elige una pieza ya preparada, y aprende a pintarla y decorarla a tu gusto.",
    slug: "/pinta-tu-pieza",
    imagen: "/img/vasijapintarceramica.png",
  },
  {
    id: 2,
    titulo: "Especial pinta tu pieza de cerámica",
    precio: "35€",
    descripcion:
      "Una sesión más completa para profundizar en la práctica del taller en un entorno cuidado",
    slug: "/especial-pinta-tu-pieza",
    imagen: "/img/vasijapintarceramica.png",
  },
];

  // Mientras no estén migrados, ocultos ni borrados
  const talleres = talleresTodos.filter((t) => visibleEstatico(ID_POR_RUTA[t.slug]));

  const handleReservar = (item) => {
    navigate(item.slug, { state: { desdeTarjeta: false } });
  };

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
            Pinta y decora tu pieza
          </h1>

          <p className="text-sm text-gray-600 mt-1">
            Elige una opción para ver detalles y reservar tu plaza.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
        {talleres.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl bg-white p-5 border border-[#f1e7c6] border-l-8 border-[#F4C542]
            shadow-lg
            hover:shadow-xl
            hover:scale-[1.015]
            transition
            flex flex-col justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="text-sm font-bold bg-white rounded-full w-9 h-9 flex items-center justify-center border border-gray-200 mt-0.5">
                {item.id}
              </div>

              <div className="flex-1">
               <h3 className="text-lg font-semibold text-gray-800">
  {item.titulo}
</h3>

<p className="text-[13px] text-gray-600 mt-2">
  Precio: <span className="font-semibold">{item.precio}</span>
</p>

<p className="text-base text-[#5f3f2b] mt-3 leading-7">
  {item.descripcion}
</p>

<button
                  className="mt-4 px-6 py-2.5 rounded-full text-white font-semibold
                  bg-gradient-to-b from-[#F6D66A] to-[#F4C542]
                  shadow-md hover:shadow-lg
                  hover:from-[#F4C542] hover:to-[#E5B92F]
                  transition-all duration-200"
                  onClick={() => handleReservar(item)}
                >
                  Ver / Reservar
                </button>
              </div>
            </div>

            <img
              src={item.imagen}
              alt={`Icono de ${item.titulo}`}
              className="w-28 h-28 object-contain mt-4 ml-auto opacity-95 hover:scale-110 transition-transform duration-300 drop-shadow-md"
            />
          </div>
        ))}
      </div>

      <TalleresNuevos
        grupo="pinta_decora"
        titulo={talleres.length ? "Más talleres" : undefined}
      />
    </div>
  );
}