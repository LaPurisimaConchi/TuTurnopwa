// api/_cuentaActiva.js
// Una cuenta con email y contraseña solo opera con el correo confirmado. Se exceptúan los
// invitados (sesión anónima) y las cuentas anteriores a la confirmación de correo, que
// llevan usuarios/{uid}/cuentaAnterior (lo pone scripts/marcar-cuentas-anteriores.mjs y
// solo lo escribe el servidor). Mismas condiciones que database.rules.json.
import { adminDb } from "./_firebaseAdmin.js";

export async function cuentaActiva(decodificado) {
  if (decodificado?.email_verified === true) return true;
  if (decodificado?.firebase?.sign_in_provider === "anonymous") return true;
  try {
    const marca = await adminDb.ref(`usuarios/${decodificado.uid}/cuentaAnterior`).get();
    return marca.val() === true;
  } catch (error) {
    console.error("No se pudo comprobar cuentaAnterior:", error);
    return false;
  }
}
