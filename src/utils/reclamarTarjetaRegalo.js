// src/utils/reclamarTarjetaRegalo.js
// Una tarjeta regalo solo se puede canjear una vez. Antes de crear la reserva se
// «reclama» con una transacción: dos pestañas, un doble clic o volver atrás y
// enviar de nuevo no pueden pasar las dos. Si la reserva falla se libera; si el
// navegador se cierra a medias, la reclamación caduca sola.
import { ref, runTransaction, update } from "firebase/database";
import { dbRealtime } from "../firebase";

const CADUCA_MS = 2 * 60 * 1000;

// true si la tarjeta es de este usuario y queda reclamada; false si ya está
// usada, la tiene otro usuario o hay otro canje en curso
export async function reclamarTarjetaRegalo(tarjetaId, uid) {
  if (!tarjetaId || !uid) return false;

  try {
    const { committed, snapshot } = await runTransaction(
      ref(dbRealtime, `tarjetasRegalo/${tarjetaId}`),
      (tarjeta) => {
        // Sin datos locales aún: se devuelve tal cual y se repite con los del servidor
        if (tarjeta === null) return tarjeta;

        if (tarjeta.usado || tarjeta.estadoCanje === "usada") return;
        if (tarjeta.canjeadoPorUID && tarjeta.canjeadoPorUID !== uid) return;

        const enCurso =
          tarjeta.reclamadaEn && Date.now() - Number(tarjeta.reclamadaEn) < CADUCA_MS;
        if (enCurso) return;

        return { ...tarjeta, reclamadaEn: Date.now(), reclamadaPor: uid };
      }
    );
    // Si la tarjeta no existe la transacción «confirma» sin cambiar nada
    return committed && snapshot.val()?.reclamadaPor === uid;
  } catch (error) {
    console.error("Error al reclamar la tarjeta regalo:", error);
    return false;
  }
}

// Libera la reclamación si la reserva no llegó a crearse (no toca una ya usada)
export async function liberarTarjetaRegalo(tarjetaId, uid) {
  if (!tarjetaId || !uid) return;

  try {
    await runTransaction(ref(dbRealtime, `tarjetasRegalo/${tarjetaId}`), (tarjeta) => {
      if (tarjeta === null) return tarjeta;
      if (tarjeta.usado || tarjeta.reclamadaPor !== uid) return;
      return { ...tarjeta, reclamadaEn: null, reclamadaPor: null };
    });
  } catch (error) {
    console.error("Error al liberar la tarjeta regalo:", error);
  }
}

export const MENSAJE_TARJETA_USADA =
  "Esta tarjeta regalo ya se ha usado o hay un canje en curso. Si crees que es un error, escríbenos.";
