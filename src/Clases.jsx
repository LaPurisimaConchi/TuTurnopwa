import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import { cargarRegistrosCategorias, unirCategorias } from "./categoriasTalleres";

const COLOR = "border-[#F4C542]";

// Imagen y talleres de siempre de cada categoría (el nombre, el texto y el orden
// salen de la categoría). Las categorías nuevas usan FICHA_NUEVA.
const FICHAS = {
  crear_piezas: {
    imagen: "/img/vasijaedicionpremium.png",
    claseIds: [
      "crearpiezadesdecero",
      "creatubandejahogar",
      "creatubrunchbowl",
      "creatucuencoramen",
      "creatugrancentrodemesa",
      "creatujarrajarrongrande",
      "creatumaceta",
      "creatupiezafavorita",
      "creatutazafavorita",
      "macetaorganica",
      "setmatcha",
      "setsake",
      "tazaescultorica",
    ],
  },
  pinta_decora: {
    imagen: "/img/vasijapintarceramica.png",
    claseIds: [],
    soloConTalleres: true,
  },
  cursos_bonos: {
    imagen: "/img/vasijabono4.png",
    claseIds: [
      "modelamano4clases",
      "tornodecoracion4clases",
      "tornodesdecero4clases",
      "tornoperfeccionamiento6clases",
    ],
  },
  otros: {
    imagen: "/img/vasijacreativoplus.png",
    claseIds: [],
    soloConTalleres: true,
  },
};

const FICHA_NUEVA = {
  imagen: "/img/vasijacreativoplus.png",
  claseIds: [],
  soloConTalleres: true,
};

// No es una categoría: es un taller con su propia página, que se ve entre ellas
const CLASE_SUELTA = {
  id: "clasesueltacontinuidad",
  titulo: "Clase suelta con continuidad",
  descripcion: ["Reserva clases sueltas para continuar tu proyecto o empezar uno nuevo"],
  ruta: "/talleres/clase-suelta-continuidad",
  color: COLOR,
  imagen: "/img/vasijabono2.png",
  claseIds: ["clasesueltacontinuidad"],
};

export default function Clases() {
  const navigate = useNavigate();
  const [clasesConfig, setClasesConfig] = useState({});
  const [cargandoConfig, setCargandoConfig] = useState(true);
  const [registrosCategorias, setRegistrosCategorias] = useState([]);

  useEffect(() => {
    const cargarClasesConfig = async () => {
      try {
        const snap = await get(ref(dbRealtime, "clases"));
        if (snap.exists()) {
          setClasesConfig(snap.val() || {});
        } else {
          setClasesConfig({});
        }
      } catch (error) {
        console.error("Error al cargar configuración de clases:", error);
        setClasesConfig({});
      } finally {
        setCargandoConfig(false);
      }
    };

    cargarClasesConfig();
    cargarRegistrosCategorias().then(setRegistrosCategorias);
  }, []);

  const categoriasVisibles = useMemo(() => {
    // Las de siempre sin migrar y las del panel, activas y en su orden. «Pinta y decora»
    // solo sale aquí cuando se migra (hasta entonces se llega desde «Dónde reservar»).
    const fichas = unirCategorias(registrosCategorias)
      .filter((c) => c.estado === "activa" && !(c.id === "pinta_decora" && !c.propia))
      .map((c) => ({
        ...(FICHAS[c.id] || FICHA_NUEVA),
        id: c.id,
        titulo: c.titulo,
        descripcion: [c.descripcion || "Talleres y experiencias del estudio"],
        ruta: c.ruta,
        grupo: c.id,
        color: COLOR,
      }));

    // La clase suelta va justo antes de «Otros talleres» (o al final si no está)
    const posicionOtros = fichas.findIndex((f) => f.id === "otros");
    fichas.splice(posicionOtros === -1 ? fichas.length : posicionOtros, 0, CLASE_SUELTA);

    // Talleres creados desde el admin: cuentan para su categoría
    const idsDinamicos = (grupo) =>
      Object.entries(clasesConfig)
        .filter(([, clase]) => clase?.dinamica && (clase.grupo || "otros") === grupo)
        .map(([id]) => id);

    return fichas.filter((cat) => {
      const claseIds = [...(cat.claseIds || []), ...(cat.grupo ? idsDinamicos(cat.grupo) : [])];
      if (claseIds.length === 0) return !cat.soloConTalleres;

      return claseIds.some((idClase) => {
        const clase = clasesConfig[idClase];
        if (!clase) return false;

        const estado = clase.estado || (clase.activa === false ? "oculta" : "activa");
        return estado === "activa";
      });
    });
  }, [clasesConfig, registrosCategorias]);

  const handleClick = (categoria) => {
    navigate(categoria.ruta);
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
            Talleres disponibles
          </h1>

          <p className="text-sm text-gray-600 mt-1">
            Elige una categoría para ver los talleres y reservar tu plaza.
          </p>
        </div>
      </div>

      {cargandoConfig ? (
        <p className="text-sm text-gray-600">Cargando talleres...</p>
      ) : categoriasVisibles.length === 0 ? (
        <p className="text-sm text-gray-600">
          Ahora mismo no hay talleres disponibles.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
          {categoriasVisibles.map((cat, indice) => (
            <div
              key={cat.id}
              className={`rounded-2xl bg-white p-5 border border-[#f1e7c6] border-l-8 ${cat.color}
shadow-lg
hover:shadow-xl
hover:scale-[1.015]
transition
flex flex-col justify-between`}
            >
              <div className="flex items-start gap-4">
                <div className="text-sm font-bold bg-white rounded-full w-9 h-9 flex items-center justify-center border border-gray-200 mt-0.5">
                  {indice + 1}
                </div>

                <div className="flex-1">
                 <h3 className="text-xl font-semibold text-gray-800">
  {cat.titulo}
</h3>

<div className="mt-3 space-y-2">
  {cat.descripcion.map((linea, idx) => (
    <p
      key={idx}
      className="text-sm md:text-base text-[#5f3f2b] leading-7 font-medium"
    >
      {linea}
    </p>
  ))}
</div>

<button
                    className="mt-4 px-6 py-2.5 rounded-full text-white font-semibold
  bg-gradient-to-b from-[#F6D66A] to-[#F4C542]
  shadow-md hover:shadow-lg
  hover:from-[#F4C542] hover:to-[#E5B92F]
  transition-all duration-200"
                    onClick={() => handleClick(cat)}
                  >
                    Ver talleres
                  </button>
                </div>
              </div>

              <img
                src={cat.imagen}
                alt={`Icono de ${cat.titulo}`}
                className="w-28 h-28 object-contain mt-4 ml-auto opacity-95 hover:scale-110 transition-transform duration-300 drop-shadow-md"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}