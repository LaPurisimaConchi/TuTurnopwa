import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GRUPOS_TALLER, cargarTalleres } from "./catalogoTalleres";
import TarjetaTaller from "./components/TarjetaTaller";
import useMiniaturasTalleres from "./components/useMiniaturasTalleres";

export default function Portada() {
  const navigate = useNavigate();
  const [talleres, setTalleres] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [grupoActivo, setGrupoActivo] = useState("todos");
  const miniaturas = useMiniaturasTalleres(talleres);

  useEffect(() => {
    cargarTalleres()
      .then((lista) => setTalleres(lista.filter((t) => t.enPortada)))
      .catch((error) => console.error("Error al cargar talleres:", error))
      .finally(() => setCargando(false));
  }, []);

  const grupos = useMemo(
    () => GRUPOS_TALLER.filter((g) => talleres.some((t) => t.grupo === g.id)),
    [talleres]
  );

  const talleresVisibles =
    grupoActivo === "todos"
      ? talleres
      : talleres.filter((t) => t.grupo === grupoActivo);

  const irATalleres = () =>
    document.getElementById("talleres")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="bg-[#fdfaf5] min-h-screen w-full">
      {/* CABECERA */}
      <section className="px-4 pt-8 pb-10 md:pt-12 md:pb-14">
        <div className="w-full max-w-3xl mx-auto text-center">
          <img
            src="/img/logoPCsin.png"
            alt="La Purísima Conchi"
            className="w-36 sm:w-44 md:w-52 mx-auto mb-7"
          />

          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-gray-800">
            Hazte un hueco. <br /> Y una taza.
          </h1>

          <p className="text-lg text-gray-700 mt-4">
            Reserva tu taller de cerámica o sorprende con una tarjeta regalo.
          </p>
          <p className="text-sm text-gray-600 mt-2 mb-8">
            Sin necesidad de registrarte: eliges, reservas y pagas en un momento.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              className="w-full sm:w-auto bg-[#b36a4a] hover:bg-[#9e5c3f] text-white text-lg font-semibold px-6 py-3 rounded-lg shadow-md transition"
              onClick={irATalleres}
            >
              Ver talleres
            </button>

            <button
              className="w-full sm:w-auto border border-[#b36a4a] text-[#b36a4a] hover:bg-[#f9ece6] text-lg font-semibold px-6 py-3 rounded-lg transition"
              onClick={() => navigate("/tarjeta-regalo")}
            >
              🎁 Regalar un taller
            </button>
          </div>
        </div>
      </section>

      {/* CATÁLOGO */}
      <section id="talleres" className="px-4 pb-12 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-5">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-[#3f3128]">
              Nuestros talleres
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Elige tu experiencia y reserva tu plaza.
            </p>
          </div>

          {grupos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[{ id: "todos", titulo: "Todos" }, ...grupos].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGrupoActivo(g.id)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    grupoActivo === g.id
                      ? "border-[#b36a4a] bg-[#b36a4a] text-white"
                      : "border-[#eadfd2] bg-white text-[#6b4f3f] hover:bg-[#f9ece6]"
                  }`}
                >
                  {g.titulo}
                </button>
              ))}
            </div>
          )}

          {cargando ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-[#eadfd2] bg-white overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-[#f3ebe1]" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-[#f3ebe1] rounded w-3/4" />
                    <div className="h-3 bg-[#f3ebe1] rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : talleresVisibles.length === 0 ? (
            <p className="text-center text-sm text-gray-600">
              Ahora mismo no hay talleres disponibles.
            </p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {talleresVisibles.map((taller) => (
                <TarjetaTaller
                  key={taller.id}
                  taller={taller}
                  imagen={miniaturas[taller.id]}
                  textoBoton="Ver y reservar"
                />
              ))}
            </div>
          )}

          {/* OTRAS OPCIONES */}
          <div className="grid gap-4 md:grid-cols-2 mt-10">
            <button
              type="button"
              onClick={() => navigate("/tarjeta-regalo")}
              className="flex items-center gap-4 rounded-2xl border border-[#eadfd2] bg-[#fffaf0] p-4 text-left shadow-sm hover:shadow-md transition"
            >
              <img
                src="/img/miniaturas/tarjetaregalo.jpg"
                alt=""
                className="w-20 h-20 object-cover rounded-xl shrink-0"
              />
              <span>
                <span className="block font-semibold text-[#3f3128]">Tarjeta regalo</span>
                <span className="block text-sm text-gray-600 mt-1">
                  Regala un taller para una o varias personas. Quien la recibe
                  elige la fecha.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/reserva-grupos")}
              className="flex items-center gap-4 rounded-2xl border border-[#eadfd2] bg-white p-4 text-left shadow-sm hover:shadow-md transition"
            >
              <img
                src="/img/miniaturas/grupos.jpg"
                alt=""
                className="w-20 h-20 object-cover rounded-xl shrink-0"
              />
              <span>
                <span className="block font-semibold text-[#3f3128]">Reservas para grupos</span>
                <span className="block text-sm text-gray-600 mt-1">
                  Si sois 5 personas o más, reservad vuestra experiencia juntos.
                </span>
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
