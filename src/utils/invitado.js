// src/utils/invitado.js
// Compras sin registro: el cliente entra con una sesión anónima de Firebase
// y deja sus datos de contacto en usuarios/{uid}, igual que un usuario normal.
// Así las reglas (auth != null), el webhook y el panel admin siguen funcionando.
import { signInAnonymously, updateProfile } from "firebase/auth";
import { ref, get, set, update } from "firebase/database";
import { auth, dbRealtime } from "../firebase";

export const normalizarTelefono = (valor = "") =>
  valor.replace(/\s+/g, "").replace(/[^\d+]/g, "").trim();

export function validarDatosContacto({ nombre, email, telefono }) {
  if (!nombre.trim()) return "El nombre es obligatorio.";
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Introduce un email válido.";
  if (!/^[+]?\d{9,15}$/.test(normalizarTelefono(telefono))) {
    return "Introduce un teléfono válido.";
  }
  return "";
}

// Los datos del invitado no se recuerdan: cada compra empieza pidiéndolos de
// nuevo. Mientras recorre las pantallas de reserva y pago (también si recarga la
// página) la compra está "abierta" en esta pestaña; al salir de ellas se cierra y
// la siguiente reserva empieza con una sesión de invitado nueva.
const CLAVE_COMPRA = "compraInvitado";
let cierrePendiente = null;

const guardarCompra = (uid) => {
  try {
    if (uid) sessionStorage.setItem(CLAVE_COMPRA, uid);
    else sessionStorage.removeItem(CLAVE_COMPRA);
  } catch {
    // Sin almacenamiento: la compra se pedirá de nuevo, que es lo seguro
  }
};

export function compraInvitadoAbierta(uid) {
  try {
    return !!uid && sessionStorage.getItem(CLAVE_COMPRA) === uid;
  } catch {
    return false;
  }
}

export function cancelarCierreCompraInvitado() {
  clearTimeout(cierrePendiente);
  cierrePendiente = null;
}

export function abrirCompraInvitado(uid) {
  cancelarCierreCompraInvitado();
  guardarCompra(uid);
}

export function cerrarCompraInvitado() {
  cancelarCierreCompraInvitado();
  guardarCompra(null);
}

// Al salir de una pantalla de compra: si la siguiente también lo es, la cancela
// (cancelarCierreCompraInvitado) antes de que pase el plazo
export function cerrarCompraInvitadoTrasSalir() {
  cancelarCierreCompraInvitado();
  cierrePendiente = setTimeout(cerrarCompraInvitado, 400);
}

export async function leerDatosContacto(uid) {
  const snap = await get(ref(dbRealtime, `usuarios/${uid}`));
  return snap.exists() ? snap.val() || {} : {};
}

export async function continuarComoInvitado({ nombre, email, telefono }) {
  let user = auth.currentUser;

  if (!user) {
    const credencial = await signInAnonymously(auth);
    user = credencial.user;
  }

  const datos = {
    uid: user.uid,
    nombre: nombre.trim(),
    email: email.trim().toLowerCase(),
    telefono: normalizarTelefono(telefono),
    invitado: true,
  };

  const usuarioRef = ref(dbRealtime, `usuarios/${user.uid}`);
  const existente = await get(usuarioRef);

  if (existente.exists()) {
    await update(usuarioRef, datos);
  } else {
    await set(usuarioRef, {
      ...datos,
      fechaRegistro: new Date().toISOString(),
      reservas: 0,
    });
  }

  await updateProfile(user, { displayName: datos.nombre });

  return user;
}

export function mensajeErrorInvitado(error) {
  const codigo = error?.code || "";

  if (
    codigo === "auth/admin-restricted-operation" ||
    codigo === "auth/operation-not-allowed"
  ) {
    return "Ahora mismo no se puede reservar sin cuenta. Crea una cuenta o inicia sesión para continuar.";
  }

  if (codigo === "auth/network-request-failed") {
    return "No hay conexión. Revisa tu internet e inténtalo de nuevo.";
  }

  return "No se ha podido continuar. Inténtalo de nuevo.";
}
