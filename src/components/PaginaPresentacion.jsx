// src/components/PaginaPresentacion.jsx
// Página de presentación (imagen, descripción, pasos, galería y talleres
// recomendados) de «Regalar un taller» y «Reservas para grupos».
import TarjetaTaller from "./TarjetaTaller";
import useMiniaturasTalleres from "./useMiniaturasTalleres";
import { useTalleresRecomendados } from "../paginasEspeciales";

export default function PaginaPresentacion({
  pagina, // "regalo" | "grupos"
  titulo,
  entradilla,
  imagenPrincipal,
  descripcion = [], // párrafos
  pasos = [],
  ventajas = [],
  galeria = [],
  tituloRecomendados,
}) {
  const { talleres, cargando } = useTalleresRecomendados(pagina);
  const miniaturas = useMiniaturasTalleres(talleres);

  return (
    <div className="space-y-10 pb-10">
      {/* CABECERA */}
      <section className="grid md:grid-cols-2 gap-6 items-center">
        <div className="order-2 md:order-1 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-gray-800">{titulo}</h1>
          <p className="text-lg text-gray-700 mt-3">{entradilla}</p>
        </div>
        <img
          src={imagenPrincipal}
          alt={titulo}
          className="order-1 md:order-2 w-full aspect-[4/3] object-cover rounded-2xl shadow-md"
        />
      </section>

      {/* DESCRIPCIÓN */}
      {descripcion.length > 0 && (
        <section className="max-w-2xl mx-auto space-y-3 text-gray-700 text-center">
          {descripcion.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      )}

      {/* VENTAJAS */}
      {ventajas.length > 0 && (
        <section className="grid sm:grid-cols-3 gap-3">
          {ventajas.map((v) => (
            <div key={v.titulo} className="rounded-2xl border border-[#eadfd2] bg-white p-4 text-center">
              <p className="text-2xl" aria-hidden="true">{v.icono}</p>
              <p className="font-semibold text-[#3f3128] mt-1">{v.titulo}</p>
              <p className="text-sm text-gray-600 mt-1">{v.texto}</p>
            </div>
          ))}
        </section>
      )}

      {/* GALERÍA */}
      {galeria.length > 0 && (
        <section className="grid grid-cols-3 gap-2 sm:gap-3">
          {galeria.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              className="w-full aspect-square object-cover rounded-xl"
            />
          ))}
        </section>
      )}

      {/* PASOS */}
      {pasos.length > 0 && (
        <section className="rounded-2xl border border-[#eadfd2] bg-white p-5">
          <h2 className="text-xl font-serif font-semibold text-[#3f3128] mb-3">Cómo funciona</h2>
          <ol className="space-y-3">
            {pasos.map((paso, i) => (
              <li key={paso} className="flex gap-3 items-start">
                <span className="shrink-0 w-7 h-7 rounded-full bg-[#b36a4a] text-white text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-gray-700 pt-0.5">{paso}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* RECOMENDADOS */}
      {(cargando || talleres.length > 0) && (
        <section>
          <h2 className="text-2xl font-serif font-semibold text-[#3f3128] text-center mb-4">
            {tituloRecomendados}
          </h2>
          {cargando ? (
            <p className="text-center text-sm text-gray-600">Cargando...</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {talleres.map((taller) => (
                <TarjetaTaller
                  key={taller.id}
                  taller={taller}
                  imagen={miniaturas[taller.id]}
                  textoBoton="Ver taller"
                />
              ))}
            </div>
          )}
        </section>
      )}

    </div>
  );
}
