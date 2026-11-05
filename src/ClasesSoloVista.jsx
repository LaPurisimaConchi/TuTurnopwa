import React from "react";
import { Link } from "react-router-dom";
import BotonVolver from "./BotonVolver";

export default function ClasesSoloVista() {
  const categorias = [
    {
      id: 1,
      titulo: "Crear piezas desde cero",
      subtitulo: "Talleres para crear tu pieza desde cero, con opciones de 1 o 2 sesiones.",
      color: "border-[#F4C542]",
      imagen: "/img/vasijaedicionpremium.png",
      bloques: [
        {
          titulo: "Taller de 1 sesión",
          items: [
            "Crea tu pieza favorita desde cero — desde 55€ (eligiendo tamaño)",
            "Cuenco o taza — 55€",
            "Frutero / cuenco grande — 65€",
            "Jarrón grande — 75€",
            "Crea tu brunch bowl — 55€",
            "Crea tu cuenco para ramen — 55€",
            "Crea tu bandeja de hogar — 55€",
            "Crea tu taza favorita — 55€",
            "Crea tu maceta — 55€",
            "Crea tu gran centro de mesa — 65€",
            "Crea tu jarra / jarrón grande — 75€",
          ],
        },
        {
          titulo: "Taller de 2 sesiones",
          items: [
            "Crea tu set de matcha — 60€",
            "Crea tu set de sake — 60€",
            "Crea tu taza escultórica — 58€",
            "Crea tu maceta orgánica — 59€",
          ],
        },
      ],
    },
    {
      id: 2,
      titulo: "Cursos y bonos mensuales",
      subtitulo: "Opciones mensuales para aprender, practicar y avanzar en torno o modelado.",
      color: "border-[#D9A441]",
      imagen: "/img/vasijabono4.png",
      bloques: [
        {
          titulo: "Cursos disponibles",
          items: [
            "Modela a mano y decora tus piezas favoritas — 4 clases — 79€",
            "Torno alfarero y decoración — 4 clases — 99€",
            "Torno alfarero empezar desde cero — 4 clases — 120€",
            "Torno alfarero perfecciona lo que ya sabes — 6 clases — 145€",
          ],
        },
      ],
    },
    {
      id: 3,
      titulo: "Pinta y decora tu pieza",
      subtitulo: "Talleres para disfrutar pintando cerámica en una experiencia creativa y relajada.",
      color: "border-[#E7B85C]",
      imagen: "/img/vasijapintarceramica.png",
      bloques: [
        {
          titulo: "Opciones disponibles",
          items: [
            "Pinta tu pieza de cerámica — 25€",
            "Especial pinta tu pieza de cerámica — 35€",
          ],
        },
      ],
    },
    {
      id: 4,
      titulo: "Tarjeta regalo",
      subtitulo: "Una opción ideal para regalar cualquiera de los talleres del estudio.",
      color: "border-[#E5B93D]",
      imagen: "/img/vasijatarjetaregalo.png",
      bloques: [
        {
          titulo: "Información",
          items: [
            "Disponible para todos los talleres",
            "Ideal para sorprender a alguien con una experiencia creativa",
          ],
        },
      ],
    },
  ];

  return (
    <div className="bg-[#fffef4] min-h-screen px-4 py-5 font-sans">
      <BotonVolver />

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
          <img
            src="/img/logoPCsin.png"
            alt="Logo La Purísima Conchi"
            className="h-20 w-auto"
          />

          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold text-yellow-900 font-serif">
              Talleres disponibles
            </h1>
            <p className="text-gray-600 mt-2 text-sm md:text-base max-w-2xl">
              Descubre todas las opciones del taller: experiencias
              disponibles, precios y modalidades.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {categorias.map((categoria) => (
            <section
              key={categoria.id}
              className={`bg-white rounded-3xl shadow-md border-l-8 ${categoria.color} p-5 md:p-7`}
            >
              <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center text-sm font-bold bg-white">
                      {categoria.id}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">
                      {categoria.titulo}
                    </h2>
                  </div>

                  <p className="text-gray-600 mb-5 leading-relaxed">
                    {categoria.subtitulo}
                  </p>

                  <div className="space-y-5">
                    {categoria.bloques.map((bloque, index) => (
                      <div
                        key={index}
                        className="bg-[#fffaf0] border border-[#f1e7c6] rounded-2xl p-4"
                      >
                        <h3 className="text-lg font-semibold text-yellow-900 mb-3">
                          {bloque.titulo}
                        </h3>

                        <ul className="space-y-2 text-gray-700 text-sm md:text-base">
                          {bloque.items.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-yellow-700 mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:w-56 flex justify-center md:justify-end items-start">
                  <img
                    src={categoria.imagen}
                    alt={categoria.titulo}
                    className="w-32 h-32 md:w-40 md:h-40 object-contain opacity-95 drop-shadow-md"
                  />
                </div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 bg-[#fff8dc] border border-[#f1e0a6] rounded-3xl p-6 text-center shadow-sm">
          <h3 className="text-xl font-bold text-yellow-900 mb-2">
            ¿Te interesa algún taller?
          </h3>
          <p className="text-gray-700 max-w-2xl mx-auto">
            Puedes reservar tu plaza y elegir fecha sin necesidad de registrarte.
          </p>
          <Link
            to="/clases"
            className="inline-block mt-4 bg-[#b36a4a] hover:bg-[#9e5c3f] text-white font-semibold px-6 py-2.5 rounded-lg"
          >
            Reservar un taller
          </Link>
        </div>
      </div>
    </div>
  );
}