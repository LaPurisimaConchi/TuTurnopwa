// Una cuenta con email y contraseña solo se usa con el correo confirmado. Se exceptúan
// los invitados (sesión anónima) y las cuentas anteriores a esta confirmación, que llevan
// usuarios/{uid}/cuentaAnterior (solo la escribe el servidor). Las reglas de la base de
// datos y api/_cuentaActiva.js piden lo mismo; esto evita además que alguien se quede con
// la sesión abierta sin confirmar (p. ej. cerrando la pestaña al registrarse).
import { useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { get, ref } from "firebase/database";
import { auth, dbRealtime } from "../firebase";

// Registro y login hacen sus propias comprobaciones: la guardia espera a que acaben
export const flujoAuth = { ocupado: 0 };

export async function enFlujoAuth(tarea) {
  flujoAuth.ocupado += 1;
  try {
    return await tarea();
  } finally {
    flujoAuth.ocupado -= 1;
  }
}

export async function cuentaSinConfirmar(usuario) {
  if (!usuario || usuario.isAnonymous || usuario.emailVerified) return false;
  const marca = await get(ref(dbRealtime, `usuarios/${usuario.uid}/cuentaAnterior`));
  return marca.val() !== true;
}

export function useGuardiaVerificacion() {
  useEffect(
    () =>
      onAuthStateChanged(auth, async (usuario) => {
        if (!usuario || flujoAuth.ocupado) return;
        try {
          if ((await cuentaSinConfirmar(usuario)) && !flujoAuth.ocupado) await signOut(auth);
        } catch (error) {
          console.error("No se pudo comprobar la confirmación del correo:", error);
        }
      }),
    []
  );
}
