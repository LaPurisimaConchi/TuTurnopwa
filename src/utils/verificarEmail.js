// Envía el correo para confirmar el email de la cuenta actual. Lo manda el servidor con
// el estilo de los demás correos (api/_correoVerificacion.js); si falla (p. ej. Resend
// sin configurar) se usa el correo estándar de Firebase.
import { sendEmailVerification } from "firebase/auth";
import { llamar } from "./canjeServidor";

export async function enviarVerificacionEmail(usuario) {
  try {
    await llamar({ tipo: "verificarEmail" });
  } catch (error) {
    console.warn("Verificación por correo propio fallida, uso el de Firebase:", error);
    await sendEmailVerification(usuario);
  }
}
