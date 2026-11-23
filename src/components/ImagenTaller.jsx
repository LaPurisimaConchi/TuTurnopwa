// src/components/ImagenTaller.jsx
// Foto de un taller con tres estados:
//   · cargando: fondo que late suavemente (mientras se sabe si hay foto y mientras baja)
//   · foto: aparece con un fundido
//   · sin imagen: jarrón con «Sin imagen» (no hay foto o no se ha podido cargar)
// `src`: undefined = todavía se está buscando; null/"" = no hay foto.
import { useEffect, useRef, useState } from "react";

function Jarron({ className = "" }) {
  return (
    <svg viewBox="0 0 90 90" aria-hidden="true" className={className}>
      <path
        d="M35 18h20M38 18q-1 12-8 22q-8 12-8 24q0 14 12 14h26q12 0 12-14q0-12-8-24q-7-10-8-22"
        fill="none"
        stroke="#b36a4a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ImagenTaller({ src, alt = "", className = "", imgClassName = "" }) {
  const [lista, setLista] = useState(false);
  const [fallo, setFallo] = useState(false);

  const imgRef = useRef(null);

  // Una foto en caché (o en base64) puede estar lista antes de que React enganche
  // onLoad: se comprueba al montar y al cambiar de foto
  useEffect(() => {
    const img = imgRef.current;
    const yaCargada = !!img && img.complete && img.naturalWidth > 0;
    setLista(yaCargada);
    setFallo(!!img && img.complete && img.naturalWidth === 0);
  }, [src]);

  const buscando = src === undefined;
  const sinImagen = !buscando && (!src || fallo);

  return (
    <div className={`relative h-full w-full overflow-hidden bg-arena ${className}`}>
      {sinImagen ? (
        <div role="img" aria-label={alt ? `${alt}: sin imagen` : "Sin imagen"} className="flex h-full w-full flex-col items-center justify-center gap-1">
          <Jarron className="w-1/4 min-w-[28px] max-w-[90px]" />
          <span className="text-[11px] font-medium text-[#8a6a55] sm:text-sm">Sin imagen</span>
        </div>
      ) : (
        <>
          {!lista && (
            <div
              className="absolute inset-0 flex animate-pulse items-center justify-center bg-[#efe4d6]"
              aria-hidden="true"
            >
              <Jarron className="w-1/4 min-w-[28px] max-w-[90px] opacity-35" />
            </div>
          )}
          {!buscando && (
            <img loading="lazy" decoding="async"
              ref={imgRef}
              src={src}
              alt={alt}
              onLoad={() => setLista(true)}
              onError={() => setFallo(true)}
              className={`h-full w-full object-cover transition-opacity duration-500 ${
                lista ? "opacity-100" : "opacity-0"
              } ${imgClassName}`}
            />
          )}
        </>
      )}
    </div>
  );
}
