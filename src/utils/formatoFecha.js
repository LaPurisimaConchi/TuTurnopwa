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

// Fecha y hora para mostrar: "2026-11-17T22:14:20.354Z" → "17-11-2026, 23:14" (hora de
// España). Una fecha sin hora sale como fechaDMA y el resto se devuelve igual.
export function fechaHoraLegible(valor) {
  const texto = typeof valor === "string" ? valor.trim() : "";
  // Texto guardado por el panel con toLocaleString: «19/11/2026, 15:48:20»
  const antiguo = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(texto);
  if (antiguo) {
    const [, d, m, a, h, min] = antiguo;
    return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${a}, ${h.padStart(2, "0")}:${min}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(texto)) return fechaDMA(valor);
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return fechaDMA(valor);
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(fecha)
      .map((p) => [p.type, p.value])
  );
  return `${partes.day}-${partes.month}-${partes.year}, ${partes.hour}:${partes.minute}`;
}
