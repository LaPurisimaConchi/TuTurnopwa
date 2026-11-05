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

// Respaldo en memoria: sessionStorage puede no estar disponible (Firefox con las
// cookies o los datos de sitios bloqueados, algunos modos privados) y entonces
// acceder a él lanza un error. Sin el respaldo, la compra nunca figuraría como
// abierta y cada pantalla de pago volvería a pedir los datos en bucle. En memoria
// sobrevive a navegar por la app; solo una recarga de la página lo pierde.
let compraEnMemoria = "";

const guardarCompra = (uid) => {
  compraEnMemoria = uid || "";

  try {
    if (uid) sessionStorage.setItem(CLAVE_COMPRA, uid);
    else sessionStorage.removeItem(CLAVE_COMPRA);
  } catch {
    // Sin almacenamiento solo queda el respaldo en memoria
  }
};

export function compraInvitadoAbierta(uid) {
  if (!uid) return false;
  if (compraEnMemoria === uid) return true;

  try {
    return sessionStorage.getItem(CLAVE_COMPRA) === uid;
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

// Mientras se abre la sesión de invitado, quien escucha los cambios de sesión
// (AccesoCompra) no debe tomarla por la de una compra anterior y cerrarla
let abriendoSesion = false;

export const abriendoSesionInvitado = () => abriendoSesion;

// Abre la sesión de invitado con sus datos y deja la compra abierta
export async function iniciarCompraInvitado(datos) {
  abriendoSesion = true;

  try {
    const user = await continuarComoInvitado(datos);
    abrirCompraInvitado(user.uid);
    return user;
  } finally {
    abriendoSesion = false;
  }
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

  if (codigo === "auth/too-many-requests") {
    return "Hay demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.";
  }

  // Con el código del error es mucho más fácil saber qué falla (permisos, red…)
  const detalle = codigo || String(error?.message || "").split(":")[0].trim();
  return `No se ha podido continuar${detalle ? ` (${detalle})` : ""}. Inténtalo de nuevo.`;
}
