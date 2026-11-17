import React, { useEffect, useMemo, useState } from "react";
import Icono from "./components/Icono";
import { useNavigate } from "react-router-dom";
import { cargarTalleres } from "./catalogoTalleres";
import TarjetaTaller from "./components/TarjetaTaller";
import BarraDeslizable from "./components/BarraDeslizable";
import useMiniaturasTalleres from "./components/useMiniaturasTalleres";
import useCategorias from "./components/useCategorias";
import { useConfigEspacio } from "./configuracionEspacio";

export default function Portada() {
  const navigate = useNavigate();
  const { config } = useConfigEspacio();
  const [talleres, setTalleres] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [grupoActivo, setGrupoActivo] = useState("todos");
  const miniaturas = useMiniaturasTalleres(talleres);
  const categorias = useCategorias();

  useEffect(() => {
    cargarTalleres()
      .then((lista) => setTalleres(lista.filter((t) => t.enPortada)))
      .catch((error) => console.error("Error al cargar talleres:", error))
      .finally(() => setCargando(false));
  }, []);

  const grupos = useMemo(
    () => categorias.filter((g) => talleres.some((t) => t.grupo === g.id)),
    [categorias, talleres]
  );

  const talleresVisibles =
    grupoActivo === "todos"
      ? talleres
      : talleres.filter((t) => t.grupo === grupoActivo);

  const irATalleres = () =>
    document.getElementById("talleres")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="bg-crema min-h-screen w-full">
      {/* CABECERA */}
      <section className="px-4 pt-8 pb-10 md:pt-12 md:pb-14">
        <div className="w-full max-w-3xl mx-auto text-center">
          <img
            src="/img/logoPCsin.png"
            alt="La Purísima Conchi"
            className="w-36 sm:w-44 md:w-52 mx-auto mb-7"
          />

          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-tinta">
            Hazte un hueco. <br /> Y una taza.
          </h1>

          <p className="text-lg text-tinta mt-4">
            Reserva tu taller de cerámica en un momento.
          </p>
          <p className="text-sm text-tinta-suave mt-1 mb-7">
            Sin registrarte: eliges, reservas y pagas.
          </p>

          <button
            type="button"
            className="w-full sm:w-auto bg-terracota hover:bg-terracota-oscuro text-white text-lg font-semibold px-10 py-3 rounded-full shadow-md transition"
            onClick={irATalleres}
          >
            Ver talleres
          </button>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 max-w-2xl mx-auto text-left">
            <button
              type="button"
              onClick={() => navigate("/regalar-taller")}
              className="flex items-center gap-3 text-left rounded-2xl border border-mostaza-borde bg-mostaza-suave hover:bg-mostaza/30 p-2.5 pr-4 transition"
            >
              <img
                src="/img/creatupiezafavoritaregalo.jpg"
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
              />
              <span>
                <span className="flex items-center gap-1.5 font-semibold text-tinta">
                  <Icono nombre="regalo" />
                  Regalar un taller
                </span>
                <span className="block text-xs text-tinta-suave">Tarjeta regalo</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/grupos")}
              className="flex items-center gap-3 text-left rounded-2xl border border-[#8fbf9f] bg-[#eef6f0] hover:bg-[#ddeee3] p-2.5 pr-4 transition"
            >
              <img
                src="/img/grupos/portadagrupos.jpg"
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl object-cover"
              />
              <span>
                <span className="flex items-center gap-1.5 font-semibold text-[#2f6b44]">
                  <Icono nombre="usuarios" color="#3f8f5a" />
                  Reservas para grupos
                </span>
                <span className="block text-xs text-[#3f7a55]">
                  Desde {config.minPersonasGrupo} personas
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/gestionar-reserva?tab=tarjeta")}
              className="sm:col-span-2 flex items-center justify-center gap-2 rounded-2xl border border-terracota bg-white hover:bg-terracota-suave px-4 py-3 font-semibold text-terracota-oscuro transition"
            >
              <Icono nombre="regalo" />
              Canjear código de tarjeta regalo
            </button>
          </div>
        </div>
      </section>

      {/* CATÁLOGO */}
      <section id="talleres" className="px-4 pb-12 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-5">
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-tinta">
              Nuestros talleres
            </h2>
            <p className="text-sm text-tinta-suave mt-1">
              Elige tu experiencia y reserva tu plaza.
            </p>
          </div>

          {grupos.length > 1 && (
            <BarraDeslizable
              fondo="crema"
              claseExterior="mb-6 -mx-4 sm:mx-0"
              className="gap-2 px-4 sm:px-0 sm:flex-wrap sm:justify-center"
            >
              {[{ id: "todos", titulo: "Todos" }, ...grupos].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={(e) => {
                    setGrupoActivo(g.id);
                    e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                  }}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    grupoActivo === g.id
                      ? "border-terracota bg-terracota text-white"
                      : "border-linea bg-white text-tinta-suave hover:bg-terracota-suave"
                  }`}
                >
                  {g.titulo}
                </button>
              ))}
            </BarraDeslizable>
          )}

          {cargando ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-linea bg-white overflow-hidden animate-pulse"
                >
                  <div className="aspect-[4/3] bg-arena" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-arena rounded w-3/4" />
                    <div className="h-3 bg-arena rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : talleresVisibles.length === 0 ? (
            <p className="text-center text-sm text-tinta-suave">
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
        </div>
      </section>
    </div>
  );
}
