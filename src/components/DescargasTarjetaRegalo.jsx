import React, { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { dbRealtime } from "../firebase";
import { plantillasOPorDefecto, PLANTILLAS_POR_DEFECTO } from "../utils/plantillasTarjetaRegalo";

// Descarga un PDF gestionado: lo lee de la base de datos y lo baja como archivo.
// Los PDF por defecto (estáticos) se bajan directamente con un enlace.
export async function descargarPlantillaGestionada(plantilla) {
  const snap = await get(ref(dbRealtime, `plantillasTarjetaRegaloPdf/${plantilla.id}`));
  if (!snap.exists()) throw new Error("PDF no disponible");
  const bytes = Uint8Array.from(atob(snap.val()), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = plantilla.archivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Lista de plantillas que ve el cliente (las del panel o, si no hay, las originales)
export function usePlantillasTarjetaRegalo() {
  const [plantillas, setPlantillas] = useState(PLANTILLAS_POR_DEFECTO);
  useEffect(() => {
    let vivo = true;
    get(ref(dbRealtime, "plantillasTarjetaRegalo"))
      .then((snap) => vivo && setPlantillas(plantillasOPorDefecto(snap.val())))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return plantillas;
}

// Botón de descarga de una plantilla; mismo aspecto con className o style
export function BotonPlantilla({ plantilla, className, style, children }) {
  const [error, setError] = useState(false);
  if (plantilla.estatica) {
    return (
      <a href={plantilla.url} download className={className} style={style}>
        {children || plantilla.nombre}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={() => descargarPlantillaGestionada(plantilla).catch(() => setError(true))}
    >
      {error ? "No disponible, inténtalo de nuevo" : children || plantilla.nombre}
    </button>
  );
}
