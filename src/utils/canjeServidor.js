// src/utils/canjeServidor.js
// Tarjetas regalo y bonos pasan por el servidor (api/codigo-reserva.js →
// api/_canjeServidor.js): las reglas de la base de datos no dejan al navegador
// leer ni escribir tarjetas, ni escribir bonos. Se llama con la sesión actual,
// también la de invitado.
import { auth } from "../firebase";

export const MENSAJE_TARJETA_USADA =
  "Esta tarjeta regalo ya se ha usado o hay un canje en curso. Si crees que es un error, escríbenos.";

// Llama a api/codigo-reserva.js con la sesión actual (también la de invitado)
export async function llamar(datos) {
  await auth.authStateReady();
  const usuario = auth.currentUser;
  if (!usuario) throw new Error("Necesitas una sesión para continuar");

  const respuesta = await fetch("/api/codigo-reserva", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await usuario.getIdToken()}`,
    },
    body: JSON.stringify(datos),
  });
  const cuerpo = await respuesta.json().catch(() => ({}));

  if (respuesta.ok && cuerpo.ok) return cuerpo;

  const error = new Error(cuerpo.error || `Error ${respuesta.status}`);
  error.codigo = cuerpo.codigo || "";
  error.status = respuesta.status;
  throw error;
}

// Datos de la tarjeta para llevar a su reserva (sin los de quien la compró).
// null si el código no existe.
export async function consultarTarjetaRegalo(codigo) {
  try {
    const { tarjeta } = await llamar({ tipo: "tarjeta", codigo: String(codigo || "").trim().toUpperCase() });
    return tarjeta;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

// Confirma con la tarjeta las reservas pendientes del pedido `orderId` (ya creadas,
// pendientes de pago) y la marca usada. Con `bono` (bonos de siempre, sin reserva de
// la primera sesión) crea el bono. El correo de confirmación lo envía el servidor.
export function canjearTarjetaRegalo({ codigo, orderId, bono }) {
  return llamar({ tipo: "canjear", codigo, orderId, ...(bono ? { bono } : {}) });
}

// Solo el panel: cancela una tarjeta regalo (ya no se podrá canjear) y, si se pide,
// avisa por correo a quien la compró
export function cancelarTarjetaRegalo({ tarjetaId, enviarCorreo }) {
  return llamar({ tipo: "cancelarTarjeta", tarjetaId, enviarCorreo });
}

// Reserva una clase de un bono del perfil y la descuenta
export function reservarConBono({ bonoId, fecha, turno }) {
  return llamar({ tipo: "usarBono", bonoId, fecha, turno });
}

// Cancela (la clase vuelve al bono) o reprograma una sesión ya reservada con un bono
export function cancelarSesionBono({ bonoId, reservaId }) {
  return llamar({ tipo: "gestionarSesionBono", accion: "cancelar", bonoId, reservaId });
}

export const opcionesSesionBono = ({ bonoId, reservaId }) =>
  llamar({ tipo: "gestionarSesionBono", accion: "opciones", bonoId, reservaId });

export function reprogramarSesionBono({ bonoId, reservaId, fecha, turno }) {
  return llamar({ tipo: "gestionarSesionBono", accion: "reprogramar", bonoId, reservaId, fecha, turno });
}

// Mensaje para enseñar si el canje falla
export function mensajeErrorCanje(error) {
  if (error?.codigo === "tarjeta_usada") return MENSAJE_TARJETA_USADA;
  if (error?.codigo === "franja_llena" || error?.codigo === "torno_lleno") {
    return "Esa franja se acaba de llenar. Elige otro turno u otro día.";
  }
  return error?.message || "No se pudo confirmar la reserva con la tarjeta regalo.";
}

// Sesiones de talleres de varias sesiones que se reservaron solo con la primera:
// { hoy, sesiones: [{ orderId, clase, claseId, fechaPrimeraSesion, fechaDisponible, plazas }] }
export function sesionesPendientes() {
  return llamar({ tipo: "sesionesPendientes" });
}

// Reserva la siguiente sesión de un pedido (sin coste: ya se pagó con la primera)
export function reservarSiguienteSesion({ orderId, fecha, turno }) {
  return llamar({ tipo: "siguienteSesion", orderId, fecha, turno });
}
