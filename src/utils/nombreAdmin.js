// src/utils/nombreAdmin.js
// Nombre del administrador con la sesión abierta, para dejar constancia de quién
// cancela, reprograma o cambia algo desde el panel (antes se guardaba siempre "Berto").
import { getAuth } from "firebase/auth";

export function nombreAdminActual() {
  const usuario = getAuth().currentUser;
  const nombre = String(usuario?.displayName || "").trim();
  if (nombre) return nombre.split(/\s+/)[0];
  const email = String(usuario?.email || "").trim();
  return email ? email.split("@")[0] : "Administración";
}
