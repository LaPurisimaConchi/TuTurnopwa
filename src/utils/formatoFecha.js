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
