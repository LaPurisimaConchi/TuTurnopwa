// src/components/TarjetaTaller.jsx
// Tarjeta de taller con foto, usada en la portada y en los listados
import { useNavigate } from "react-router-dom";
import { formatearEuros, TALLERES_FIJOS } from "../catalogoTalleres";
import ImagenTaller from "./ImagenTaller";

export default function TarjetaTaller({ taller, imagen, textoBoton = "Ver taller", onElegir }) {
  const navigate = useNavigate();
  const abrir = () => (onElegir ? onElegir(taller) : navigate(taller.ruta));

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-linea bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={abrir}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-arena"
        aria-label={`Ver ${taller.nombre}`}
      >
        <ImagenTaller
          src={imagen === undefined ? undefined : imagen || (TALLERES_FIJOS[taller.id] ? taller.imagen : null)}
          alt={taller.nombre}
          imgClassName="transition duration-300 group-hover:scale-105"
        />
        {taller.sesiones > 1 && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-tinta-suave shadow-sm">
            {taller.sesiones} sesiones
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="text-sm font-semibold leading-snug text-tinta sm:text-base">
          {taller.nombre}
        </h3>

        {taller.precioDesde ? (
          <p className="mt-1 text-sm text-tinta-suave">
            {taller.variosPrecios ? "Desde " : ""}
            <span className="font-bold">{formatearEuros(taller.precioDesde)}</span>
          </p>
        ) : null}

        {taller.descripcionCorta ? (
          <p className="mt-2 hidden text-sm leading-5 text-tinta-suave sm:line-clamp-2">
            {taller.descripcionCorta}
          </p>
        ) : null}

        <div className="mt-auto pt-3 sm:pt-4">
          <button
            type="button"
            onClick={abrir}
            className="w-full rounded-full bg-terracota px-3 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-terracota-oscuro"
          >
            {textoBoton}
          </button>
        </div>
      </div>
    </article>
  );
}
