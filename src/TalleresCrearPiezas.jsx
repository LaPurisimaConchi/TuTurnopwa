import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BotonVolver from "./BotonVolver";
import { TALLERES_FIJOS, formatearEuros } from "./catalogoTalleres";
import useTalleres from "./components/useTalleres";
import useMiniaturasTalleres from "./components/useMiniaturasTalleres";

// página de siempre → id del taller en Firebase
const ID_POR_RUTA = Object.fromEntries(
  Object.entries(TALLERES_FIJOS).map(([id, taller]) => [taller.ruta, id])
);

export default function TalleresCrearPiezas() {
  const navigate = useNavigate();
  const location = useLocation();

  const desdeGrupos = location.state?.desdeGrupos || false;
  const volverA = location.state?.volverA || "/reserva-grupos";

  const [openSection, setOpenSection] = useState(null); // null | "1" | "2"
  const { visibleEstatico, dinamicosDelGrupo } = useTalleres();
  const dinamicos = dinamicosDelGrupo("crear_piezas");
  const miniaturas = useMiniaturasTalleres(dinamicos);

  const talleres1Sesion = [
    {
      id: 1,
      titulo: "Crea tu pieza favorita desde cero — Cuenco o taza",
      precio: "55€",
      descripcion: "Elige el tamaño dentro del taller",
      slug: "/crea-tu-pieza-favorita-desde-cero",
      imagen: "/img/vasijaedicionpremium.png",
      especial: true,
    },
    {
      id: 2,
      titulo: "Crea tu brunch bowl",
      precio: "55€",
      slug: "/crea-tu-brunch-bowl",
      imagen: "/img/vasijabasicoesencial.png",
    },
    {
      id: 3,
      titulo: "Crea tu cuenco para ramen",
      precio: "55€",
      slug: "/crea-tu-cuenco-ramen",
      imagen: "/img/vasijabasicoesencial.png",
    },
    {
      id: 4,
      titulo: "Crea tu bandeja de hogar",
      precio: "55€",
      slug: "/crea-tu-bandeja-hogar",
      imagen: "/img/vasijabasicoesencial.png",
    },
    {
      id: 5,
      titulo: "Crea tu taza favorita",
      precio: "55€",
      slug: "/crea-tu-taza-favorita",
      imagen: "/img/vasijabasicoesencial.png",
    },
    {
      id: 6,
      titulo: "Crea tu maceta",
      precio: "55€",
      slug: "/crea-tu-maceta",
      imagen: "/img/vasijabasicoesencial.png",
    },
    {
      id: 7,
      titulo: "Crea tu gran centro de mesa",
      precio: "65€",
      slug: "/crea-tu-gran-centro-mesa",
      imagen: "/img/vasijacreativoplus.png",
    },
    {
      id: 8,
      titulo: "Crea tu jarra / jarrón grande",
      precio: "75€",
      slug: "/crea-tu-jarra-jarron-grande",
      imagen: "/img/vasijaedicionpremium.png",
    },
    {
      id: 13,
      titulo: "Crea tu pieza favorita desde cero — Frutero / cuenco grande",
      precio: "65€",
      slug: "/crea-tu-pieza-favorita-desde-cero",
      imagen: "/img/vasijacreativoplus.png",
    },
    {
      id: 14,
      titulo: "Crea tu pieza favorita desde cero — Jarrón grande",
      precio: "75€",
      slug: "/crea-tu-pieza-favorita-desde-cero",
      imagen: "/img/vasijaedicionpremium.png",
    },
  ];

  const talleres2Sesiones = [
    {
      id: 9,
      titulo: "Crea tu set de matcha",
      precio: "60€",
      slug: "/crea-tu-set-matcha",
      imagen: "/img/vasijabono2.png",
    },
    {
      id: 10,
      titulo: "Crea tu set de sake",
      precio: "60€",
      slug: "/crea-tu-set-sake",
      imagen: "/img/vasijabono2.png",
    },
    {
      id: 11,
      titulo: "Crea tu taza escultórica",
      precio: "58€",
      slug: "/crea-tu-taza-escultorica",
      imagen: "/img/vasijabono2.png",
    },
    {
      id: 12,
      titulo: "Crea tu maceta orgánica",
      precio: "59€",
      slug: "/crea-tu-maceta-organica",
      imagen: "/img/vasijabono2.png",
    },
  ];

  // Talleres gestionados desde el panel (nuevos y migrados), con su foto
  const tarjetaDinamica = (t) => ({
    id: t.id,
    titulo: t.nombre,
    precio: `${t.variosPrecios ? "desde " : ""}${formatearEuros(t.precioDesde)}`,
    descripcion: t.descripcionCorta,
    slug: t.ruta,
    imagen: miniaturas[t.id] || t.imagen,
    foto: true,
  });

  // Las tarjetas de siempre solo salen mientras el taller no esté migrado,
  // oculto ni borrado; después, la misma ficha sale desde el panel
  const numerar = (lista) => lista.map((t, i) => ({ ...t, numero: i + 1 }));
  const lista1Sesion = numerar([
    ...talleres1Sesion.filter((t) => visibleEstatico(ID_POR_RUTA[t.slug])),
    ...dinamicos.filter((t) => t.sesiones <= 1).map(tarjetaDinamica),
  ]);
  const lista2Sesiones = numerar([
    ...talleres2Sesiones.filter((t) => visibleEstatico(ID_POR_RUTA[t.slug])),
    ...dinamicos.filter((t) => t.sesiones > 1).map(tarjetaDinamica),
  ]);

  const handleAccionTaller = (taller) => {
    if (desdeGrupos) {
      navigate(volverA, {
        state: {
          clasePreseleccionada: taller.titulo,
        },
      });
      return;
    }

    navigate(taller.slug, { state: { desdeTarjeta: false } });
  };

  const CardTaller = ({ taller }) => (
    <div
      className="rounded-2xl bg-white p-5 border border-[#f1e7c6] border-l-8 border-[#F4C542]
      shadow-lg
      hover:shadow-xl
      hover:scale-[1.015]
      transition
      flex flex-col justify-between"
    >
      <div className="flex items-start gap-4">
        <div className="text-sm font-bold bg-white rounded-full w-9 h-9 flex items-center justify-center border border-gray-200 mt-0.5">
          {taller.numero ?? taller.id}
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">
            {taller.titulo}
          </h3>

          <p className="text-[13px] text-gray-600 mt-2">
            Precio: <span className="font-semibold">{taller.precio}</span>
          </p>

          {taller.especial && (
            <p className="text-[12px] text-gray-500 mt-1">
              (Cuenco/taza 55€)
            </p>
          )}

          {taller.descripcion && (
            <p className="text-[12px] text-gray-500 mt-1">
              {taller.descripcion}
            </p>
          )}

          {desdeGrupos ? (
            <button
              className="mt-4 px-6 py-2.5 rounded-full text-white font-semibold
              bg-gradient-to-b from-[#F6D66A] to-[#F4C542]
              shadow-md hover:shadow-lg
              hover:from-[#F4C542] hover:to-[#E5B92F]
              transition-all duration-200"
              onClick={() => handleAccionTaller(taller)}
            >
              Elegir esta opción para mi grupo
            </button>
          ) : (
            <button
              className="mt-4 px-6 py-2.5 rounded-full text-white font-semibold
              bg-gradient-to-b from-[#F6D66A] to-[#F4C542]
              shadow-md hover:shadow-lg
              hover:from-[#F4C542] hover:to-[#E5B92F]
              transition-all duration-200"
              onClick={() => handleAccionTaller(taller)}
            >
              Ver / Reservar
            </button>
          )}
        </div>
      </div>

      <img
        src={taller.imagen}
        alt={taller.foto ? taller.titulo : `Icono de ${taller.titulo}`}
        loading="lazy"
        className={
          taller.foto
            ? "w-28 h-28 object-cover rounded-xl mt-4 ml-auto shadow-md"
            : "w-28 h-28 object-contain mt-4 ml-auto opacity-95 hover:scale-110 transition-transform duration-300 drop-shadow-md"
        }
      />
    </div>
  );

  const TarjetaSeccion = ({ id, titulo, subtitulo }) => {
    const isOpen = openSection === id;

    return (
      <button
        onClick={() => setOpenSection(isOpen ? null : id)}
        className="w-full rounded-2xl bg-white p-5 border border-[#f1e7c6] border-l-8 border-[#F4C542]
        shadow-lg
        hover:shadow-xl
        hover:scale-[1.015]
        transition
        text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
  <h2 className="text-xl font-bold text-gray-800">{titulo}</h2>
  <p className="text-sm text-gray-600 mt-1 max-w-[90%] leading-5">
    {subtitulo}
  </p>
</div>

          <div className="text-[#b8860b] font-bold text-2xl leading-none">
            {isOpen ? "−" : "+"}
          </div>
        </div>
      </button>
    );
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
            Crear piezas desde cero
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Elige el tipo de clase y luego la pieza que quieres crear.
          </p>
        </div>
      </div>

      {desdeGrupos && (
        <div className="max-w-5xl mx-auto bg-[#fff8df] border border-[#f1e7c6] rounded-xl p-4 mb-6">
          <p className="text-sm text-[#7a5a1e] text-center leading-relaxed">
            Estás viendo esta sección en modo informativo para una reserva de grupo.
            Aquí podéis consultar las distintas opciones y precios. Si alguna os interesa,
            podéis seleccionarla directamente y volveréis a la pantalla de grupos con esa opción elegida.
          </p>
        </div>
      )}

     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
  <TarjetaSeccion
    id="1"
    titulo="Taller de 1 día"
    subtitulo="Elige la clase que quieres hacer y reserva tu plaza."
  />

  <TarjetaSeccion
    id="2"
    titulo="Taller de 2 días"
    subtitulo="Elige una clase para crear tu pieza en dos sesiones."
  />
</div>

      {openSection === "1" && (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 mb-10">
          {lista1Sesion.map((t) => (
            <CardTaller key={t.id} taller={t} />
          ))}
        </div>
      )}

      {openSection === "2" && (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
          {lista2Sesiones.map((t) => (
            <CardTaller key={t.id} taller={t} />
          ))}
        </div>
      )}


      {desdeGrupos && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate(volverA)}
            className="px-6 py-3 rounded-full bg-[#f4c542] text-[#5c3c00] font-semibold hover:bg-[#e8b932] transition"
          >
            Volver a reservas de grupo
          </button>
        </div>
      )}
    </div>
  );
}