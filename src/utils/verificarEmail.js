// Envía el correo para confirmar el email de la cuenta actual. Lo manda el servidor con
// el estilo de los demás correos (api/_correoVerificacion.js); si falla (p. ej. Resend
// sin configurar) se usa el correo estándar de Firebase.
import { sendEmailVerification } from "firebase/auth";
import { llamar } from "./canjeServidor";

export async function enviarVerificacionEmail(usuario) {
  try {
    // Sin respuesta en 12 s se pasa al correo de Firebase en vez de dejar la pantalla colgada
    await Promise.race([
      llamar({ tipo: "verificarEmail" }),
      new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("Tiempo agotado")), 12000)),
    ]);
  } catch (error) {
    console.warn("Verificación por correo propio fallida, uso el de Firebase:", error);
    await sendEmailVerification(usuario);
  }
}
