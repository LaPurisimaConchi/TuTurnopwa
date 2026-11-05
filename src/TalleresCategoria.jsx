// src/TalleresCategoria.jsx
// Página de una categoría (/categoria/:categoriaId): las creadas desde el panel y
// las de siempre migradas. Lista los talleres activos que pertenecen a ella.
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import BotonVolver from "./BotonVolver";
import TalleresNuevos from "./components/TalleresNuevos";
import { cargarCategorias } from "./categoriasTalleres";

export default function TalleresCategoria() {
  const { categoriaId } = useParams();
  const [estado, setEstado] = useState("cargando"); // cargando | ok | noExiste
  const [categoria, setCategoria] = useState(null);
  const [cargado, setCargado] = useState(false);
  const [hayTalleres, setHayTalleres] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setEstado("cargando");
    setCargado(false);

    cargarCategorias()
      .then((lista) => {
        if (cancelado) return;
        const encontrada = lista.find((c) => c.id === categoriaId);
        setCategoria(encontrada || null);
        setEstado(encontrada ? "ok" : "noExiste");
      })
      .catch((error) => {
        console.error("Error al cargar la categoría:", error);
        if (!cancelado) setEstado("noExiste");
      });

    return () => {
      cancelado = true;
    };
  }, [categoriaId]);

  if (estado === "cargando") {
    return <p className="text-center text-gray-500 py-16">Cargando...</p>;
  }

  if (estado === "noExiste") {
    return (
      <div className="p-5 bg-[#fffef4] min-h-screen font-sans">
        <BotonVolver />
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-md p-8 mt-6 text-center">
          <h1 className="text-2xl font-bold text-[#3b3025] mb-3">
            Esta categoría no está disponible
          </h1>
          <p className="text-sm text-gray-700 mb-6">
            Puedes ver el resto de talleres desde la lista de talleres.
          </p>
          <Link
            to="/clases"
            className="inline-block px-6 py-3 rounded-full bg-[#f4c542] text-[#5c3c00] font-semibold hover:bg-[#e8b932] transition"
          >
            Ver talleres
          </Link>
        </div>
      </div>
    );
  }

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
            {categoria.titulo}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {categoria.descripcion || "Talleres y experiencias del estudio."}
          </p>
        </div>
      </div>

      <TalleresNuevos
        grupo={categoria.id}
        todos
        textoBoton="Ver / Reservar"
        alCargar={(lista) => {
          setHayTalleres(lista.length > 0);
          setCargado(true);
        }}
      />

      {cargado && !hayTalleres && (
        <p className="text-sm text-gray-600">
          Ahora mismo no hay talleres disponibles en esta categoría.
        </p>
      )}
    </div>
  );
}
