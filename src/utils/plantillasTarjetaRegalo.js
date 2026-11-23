// PDF de tarjeta regalo para imprimir y rellenar a mano.
// Los gestiona el panel (/admin-tarjetas-regalo) y se guardan en la base de datos
// (no hay Firebase Storage), en dos nodos para no descargar los ficheros al listarlos:
//   plantillasTarjetaRegalo/{id}     metadatos: { nombre, archivo, tamano, orden, enCorreo, actualizadoEn }
//   plantillasTarjetaRegaloPdf/{id}  el PDF en base64 (sin prefijo data:), máx. ~2 MB
// Si no hay ninguno gestionado se usan los tres PDF originales de /public/tarjetas-regalo.

export const MAX_PDF_BYTES = 2 * 1024 * 1024;

export const PLANTILLAS_POR_DEFECTO = [
  { id: "clasica", nombre: "Tarjeta clásica", url: "/tarjetas-regalo/postal regalo.pdf", archivo: "postal regalo.pdf", enCorreo: true, estatica: true },
  { id: "navidad-1", nombre: "Navidad 1", url: "/tarjetas-regalo/regalo papa noel.pdf", archivo: "regalo papa noel.pdf", enCorreo: false, estatica: true },
  { id: "navidad-2", nombre: "Navidad 2", url: "/tarjetas-regalo/regalo reyes.pdf", archivo: "regalo reyes.pdf", enCorreo: false, estatica: true },
];

// Convierte el nodo de metadatos en una lista ordenada (vacía si no hay ninguna)
export function listarPlantillas(valor) {
  if (!valor || typeof valor !== "object") return [];
  return Object.entries(valor)
    .filter(([, p]) => p && typeof p === "object")
    .map(([id, p]) => ({
      id,
      nombre: String(p.nombre || p.archivo || "Tarjeta regalo"),
      archivo: String(p.archivo || `${id}.pdf`),
      tamano: Number(p.tamano) || 0,
      orden: Number.isFinite(Number(p.orden)) ? Number(p.orden) : 0,
      enCorreo: p.enCorreo === true,
      actualizadoEn: p.actualizadoEn || "",
      estatica: false,
    }))
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
}

export const plantillasOPorDefecto = (valor) => {
  const lista = listarPlantillas(valor);
  return lista.length ? lista : PLANTILLAS_POR_DEFECTO;
};

export function nombreArchivoPdf(nombre) {
  const limpio = String(nombre || "tarjeta-regalo")
    .replace(/\.pdf$/i, "")
    .replace(/[\\/:*?"<>|]+/g, "")
    .trim();
  return `${limpio || "tarjeta-regalo"}.pdf`;
}

export function formatearTamano(bytes) {
  const n = Number(bytes) || 0;
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}
