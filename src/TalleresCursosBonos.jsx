import React from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";
import TalleresNuevos from "./components/TalleresNuevos";
import useTalleres from "./components/useTalleres";

const ID_POR_RUTA = {
  "/modela-a-mano-y-decora-tus-piezas-favoritas": "modelamano4clases",
  "/torno-alfarero-y-decoracion": "tornodecoracion4clases",
  "/torno-alfarero-empezar-desde-cero": "tornodesdecero4clases",
  "/torno-alfarero-perfecciona-lo-que-ya-sabes": "tornoperfeccionamiento6clases",
};

export default function TalleresCursosBonos() {
  const navigate = useNavigate();

  const { visibleEstatico } = useTalleres();

  const cursosBonosTodos = [
    {
      id: 1,
      titulo: "Modela a mano y decora tus piezas favoritas",
      subtitulo: "4 clases de 3h al mes",
      precio: "79€",
      slug: "/modela-a-mano-y-decora-tus-piezas-favoritas",
      imagen: "/img/vasijabasicoesencial.png",
    },
    {
      id: 2,
     titulo: "Torno alfarero y decoración",
     subtitulo: "4 clases de 3h al mes",
     precio: "99€",
     slug: "/torno-alfarero-y-decoracion",
     imagen: "/img/vasijabono4.png",
    },
    {
      id: 3,
  titulo: "Torno alfarero empezar desde cero",
  subtitulo: "4 clases de 3h al mes",
  precio: "120€",
  slug: "/torno-alfarero-empezar-desde-cero",
  imagen: "/img/vasijacreativoplus.png",
    },
    {
       id: 4,
  titulo: "Torno alfarero perfecciona lo que ya sabes",
  subtitulo: "6 clases de 3h al mes",
  precio: "145€",
  slug: "/torno-alfarero-perfecciona-lo-que-ya-sabes",
  imagen: "/img/vasijaedicionpremium.png",
    },
  ];

  // Mientras no estén migrados, ocultos ni borrados
  const cursosBonos = cursosBonosTodos.filter((c) => visibleEstatico(ID_POR_RUTA[c.slug]));

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
            Cursos y bonos mensuales
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Elige una opción para ver detalles y reservar tu plaza.
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
        {cursosBonos.map((item) => (
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
                  {item.subtitulo} —{" "}
                  <span className="font-semibold">{item.precio}</span>
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
        grupo="cursos_bonos"
        titulo={cursosBonos.length ? "Más cursos y bonos" : undefined}
        textoBoton="Ver / Reservar"
      />
    </div>
  );
}