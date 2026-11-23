// src/utils/reservaServidor.js
// Crea reservas pendientes en el servidor, que comprueba el aforo real
// (api/codigo-reserva.js, tipo "reservar"). Devuelve { reservas: [{ ruta, id }] }.
// Si la franja se ha llenado lanza un Error con `codigo` ("franja_llena",
// "torno_lleno", "bloqueado", "fecha_pasada"…) y un mensaje para mostrar.
//
// En `npm run dev` el servidor puede ser un Vercel sin esta función desplegada:
// entonces se lanza un Error con `sinServidor` y la pantalla escribe la reserva
// directamente, como se hacía antes (solo en desarrollo).
import { getAuth } from "firebase/auth";

export async function reservarEnServidor(claseId, items, { edicionId = "" } = {}) {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Necesitas una sesión para reservar");

  const token = await user.getIdToken();
  const respuesta = await fetch("/api/codigo-reserva", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ tipo: "reservar", claseId, items, ...(edicionId ? { edicionId } : {}) }),
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (respuesta.ok && datos.ok) return datos;

  const error = new Error(datos.error || `No se pudo reservar (${respuesta.status})`);
  error.codigo = datos.codigo || "";
  error.status = respuesta.status;
  error.sinServidor = import.meta.env.DEV && !datos.codigo;
  throw error;
}
