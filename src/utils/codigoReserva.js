// src/utils/codigoReserva.js
// Código de reserva de quien acaba de reservar (api/codigo-reserva.js). Se pide con
// la sesión actual, también la de invitado.
import { auth } from "../firebase";

// Dos tipos de petición:
//   { tipo: "grupo", grupoId }   reserva de grupo recién creada
//   { tipo: "pedido", orderId }  reserva ya pagada (individual o de grupo)
export async function pedirCodigoReserva(datos) {
  await auth.authStateReady();
  const usuario = auth.currentUser;
  if (!usuario) throw new Error("Sin sesión");

  const respuesta = await fetch("/api/codigo-reserva", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await usuario.getIdToken()}`,
    },
    body: JSON.stringify(datos),
  });
  const cuerpo = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !cuerpo.ok) {
    const error = new Error(cuerpo.error || `Error ${respuesta.status}`);
    error.status = respuesta.status;
    throw error;
  }

  return cuerpo.codigo;
}
