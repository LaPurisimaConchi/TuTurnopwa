// src/utils/apiDisponibilidad.js
// Llamada a /api/disponibilidad (solo fechas y números, sin datos personales).
// La comparten utils/disponibilidad.js y utils/contarPlazasDia.js.
export async function pedirApi(parametros) {
  const consulta = new URLSearchParams(parametros).toString();
  const respuesta = await fetch(`/api/disponibilidad?${consulta}`);
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.error || `Error ${respuesta.status} al leer la disponibilidad`);
  }

  return datos;
}
