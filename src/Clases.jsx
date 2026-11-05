import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import { GRUPOS_TALLER } from "./catalogoTalleres";

export default function Clases() {
  const navigate = useNavigate();
  const [clasesConfig, setClasesConfig] = useState({});
  const [cargandoConfig, setCargandoConfig] = useState(true);

  const categorias = [
    {
      id: 1,
      titulo: "Crear piezas desde cero",
      descripcion: ["Entra aquí para ver todas las clases disponibles y reservar tu plaza"],
      ruta: "/talleres/crear-piezas",
      grupo: "crear_piezas",
      color: "border-[#F4C542]",
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
    {
      id: 2,
      titulo: "Cursos y bonos mensuales",
      descripcion: ["Compra tu bono mensual y reserva tus clases"],
      ruta: "/talleres/cursos-bonos",
      color: "border-[#F4C542]",
      imagen: "/img/vasijabono4.png",
      claseIds: [
        "modelamano4clases",
        "tornodecoracion4clases",
        "tornodesdecero4clases",
        "tornoperfeccionamiento6clases",
      ],
    },
    {
      id: 3,
      titulo: "Clase suelta con continuidad",
      descripcion: [
        "Reserva clases sueltas para continuar tu proyecto o empezar uno nuevo"
      ],
      ruta: "/talleres/clase-suelta-continuidad",
      color: "border-[#F4C542]",
      imagen: "/img/vasijabono2.png",
      claseIds: ["clasesueltacontinuidad"],
    },
    {
      id: 4,
      titulo: "Otros talleres",
      descripcion: ["Nuevas experiencias y talleres especiales del estudio"],
      ruta: GRUPOS_TALLER.find((g) => g.id === "otros").ruta,
      grupo: "otros",
      color: "border-[#F4C542]",
      imagen: "/img/vasijacreativoplus.png",
      claseIds: [],
      soloConTalleres: true,
    },
  ];

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
  }, []);

  const categoriasVisibles = useMemo(() => {
    // Talleres creados desde el admin: cuentan para su categoría
    const idsDinamicos = (grupo) =>
      Object.entries(clasesConfig)
        .filter(([, clase]) => clase?.dinamica && (clase.grupo || "otros") === grupo)
        .map(([id]) => id);

    return categorias.filter((cat) => {
      if (cat.siempreVisible) return true;

      const claseIds = [...(cat.claseIds || []), ...idsDinamicos(cat.grupo)];
      if (claseIds.length === 0) return !cat.soloConTalleres;

      return claseIds.some((idClase) => {
        const clase = clasesConfig[idClase];
        if (!clase) return false;

        const estado = clase.estado || (clase.activa === false ? "oculta" : "activa");
        return estado === "activa";
      });
    });
    }, [clasesConfig]);

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
          {categoriasVisibles.map((cat) => (
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
                  {cat.id}
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