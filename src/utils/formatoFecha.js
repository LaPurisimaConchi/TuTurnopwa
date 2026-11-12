// src/utils/formatoFecha.js
// Fechas para mostrar: "2026-05-01" → "01-05-2026". En la base de datos las
// fechas siguen guardándose como AAAA-MM-DD; esto es solo para lo que se lee en
// pantalla. Lo que no es una fecha ISO (vacío, "—", texto) se devuelve igual.
export function fechaDMA(valor) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  const m = /^(\d{4})-(\d{2})-(\d{2})(?![\d])/.exec(texto);
  if (!m) return valor;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

// Hoy en España como AAAA-MM-DD (no en UTC: a las 00:30 ya es otro día aquí)
export function hoyMadrid(ahora = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}
