// src/components/TarjetaTaller.jsx
// Tarjeta de taller con foto, usada en la portada y en los listados
import { useNavigate } from "react-router-dom";
import { formatearEuros } from "../catalogoTalleres";

export default function TarjetaTaller({ taller, imagen, textoBoton = "Ver taller", onElegir }) {
  const navigate = useNavigate();
  const abrir = () => (onElegir ? onElegir(taller) : navigate(taller.ruta));

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-[#eadfd2] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={abrir}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-[#f6efe6]"
        aria-label={`Ver ${taller.nombre}`}
      >
        <img
          src={imagen || taller.imagen}
          alt={taller.nombre}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        {taller.sesiones > 1 && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#6b4f3f] shadow-sm">
            {taller.sesiones} sesiones
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="text-sm font-semibold leading-snug text-[#3f3128] sm:text-base">
          {taller.nombre}
        </h3>

        {taller.precioDesde ? (
          <p className="mt-1 text-sm text-[#8a5a44]">
            {taller.variosPrecios ? "Desde " : ""}
            <span className="font-bold">{formatearEuros(taller.precioDesde)}</span>
          </p>
        ) : null}

        {taller.descripcionCorta ? (
          <p className="mt-2 hidden text-sm leading-5 text-gray-600 sm:line-clamp-2">
            {taller.descripcionCorta}
          </p>
        ) : null}

        <div className="mt-auto pt-3 sm:pt-4">
          <button
            type="button"
            onClick={abrir}
            className="w-full rounded-full bg-gradient-to-b from-[#F6D66A] to-[#F4C542] px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:from-[#F4C542] hover:to-[#E5B92F]"
          >
            {textoBoton}
          </button>
        </div>
      </div>
    </article>
  );
}
