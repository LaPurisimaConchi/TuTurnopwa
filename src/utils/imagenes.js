// src/utils/imagenes.js
// Las fotos que sube el admin se reducen en el navegador y se guardan como
// data URL en Realtime Database (imagenesClases/), sin necesidad de Storage.

export const LADO_GRANDE = 1200;
export const LADO_MINIATURA = 480;

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se ha podido leer la imagen."));
    img.src = src;
  });
}

function dibujarReducida(img, maxLado, calidad) {
  const escala = Math.min(1, maxLado / Math.max(img.naturalWidth, img.naturalHeight));
  const ancho = Math.round(img.naturalWidth * escala);
  const alto = Math.round(img.naturalHeight * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext("2d").drawImage(img, 0, 0, ancho, alto);

  // WebP pesa bastante menos; si el navegador no lo genera, JPEG
  const webp = canvas.toDataURL("image/webp", calidad);
  return webp.startsWith("data:image/webp")
    ? webp
    : canvas.toDataURL("image/jpeg", calidad);
}

export async function reducirImagen(src, { maxLado = LADO_GRANDE, calidad = 0.8 } = {}) {
  const img = await cargarImagen(src);
  return dibujarReducida(img, maxLado, calidad);
}

export async function comprimirArchivoImagen(archivo) {
  if (!archivo?.type?.startsWith("image/")) {
    throw new Error("El archivo no es una imagen.");
  }

  const url = URL.createObjectURL(archivo);

  try {
    const img = await cargarImagen(url);
    return {
      grande: dibujarReducida(img, LADO_GRANDE, 0.8),
      miniatura: dibujarReducida(img, LADO_MINIATURA, 0.75),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Tamaño aproximado en KB de un data URL (para mostrarlo en el admin)
export const pesoDataUrlKb = (dataUrl = "") =>
  Math.round(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4 / 1024);
