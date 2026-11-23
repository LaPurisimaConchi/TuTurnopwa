// src/utils/contarPlazasDia.js
// /reservas solo lo leen los administradores (lleva datos personales): el resto
// cuenta las plazas con /api/disponibilidad.
import { ref, get, child } from "firebase/database";
import { auth, dbRealtime } from "../firebase";
import { esReservaValida, plazasPorMetodo } from "./plazasOcupadas";
import { esAdministrador } from "./administradores";
import { pedirApi } from "./apiDisponibilidad";

function pareceReservaDirecta(obj) {
  if (!obj || typeof obj !== "object") return false;

  return (
    "fecha" in obj ||
    "estado" in obj ||
    "estadoPago" in obj ||
    "uid" in obj ||
    "orderId" in obj
  );
}

/**
 * Cuenta las plazas ocupadas por tipo de método: torno o modelado.
 * Solo cuenta reservas confirmadas y pagadas.
 * @param {string} fechaStr - Fecha en formato YYYY-MM-DD.
 * @returns {Promise<{torno: number, modelado: number}>}
 */
export async function contarPlazasPorMetodo(fechaStr, turnoStr = "") {
  try {
    await auth.authStateReady();
    if (!esAdministrador(auth.currentUser)) {
      const { torno, modelado } = await pedirApi({
        tipo: "plazas",
        fecha: fechaStr,
        ...(turnoStr ? { turno: turnoStr } : {}),
      });
      return { torno, modelado };
    }

    const snapshot = await get(child(ref(dbRealtime), "reservas"));
    return plazasPorMetodo(snapshot, fechaStr, turnoStr);
  } catch (error) {
    console.error("❌ Error al contar plazas por método:", error);
    return { torno: 0, modelado: 0 };
  }
}

/**
 * Cuenta el total de plazas ocupadas en todas las clases en un día.
 * Solo cuenta reservas confirmadas y pagadas.
 * @param {string} fechaStr - Fecha en formato YYYY-MM-DD.
 * @returns {Promise<number>}
 */
export async function contarPlazasTotalesPorDia(fechaStr) {
  try {
    const snapshot = await get(child(ref(dbRealtime), "reservas"));
    let total = 0;

    if (!snapshot.exists()) return 0;

    const sumarReserva = (data) => {
      if (!data || typeof data !== "object") return;
      if (!esReservaValida(data)) return;

      total += Number(data.plazas || 1);
    };

    snapshot.forEach((claseSnap) => {
      const fechaSnap = claseSnap.child(fechaStr);
      if (!fechaSnap.exists()) return;

      fechaSnap.forEach((turnoSnap) => {
        turnoSnap.forEach((tipoSnap) => {
          const tipoVal = tipoSnap.val();

          if (!tipoVal || typeof tipoVal !== "object") return;

          if (pareceReservaDirecta(tipoVal)) {
            sumarReserva(tipoVal);
            return;
          }

          tipoSnap.forEach((reservaSnap) => {
            sumarReserva(reservaSnap.val());
          });
        });
      });
    });

    return total;
  } catch (error) {
    console.error("❌ Error al contar plazas totales:", error);
    return 0;
  }
}

/**
 * Cuenta plazas reservadas para una clase específica, en una fecha y turno concretos.
 * Solo cuenta reservas confirmadas y pagadas.
 * @param {string} clase - ID de la clase.
 * @param {string} fecha - Fecha en formato YYYY-MM-DD.
 * @param {string} turno - Turno exacto, como "12:00-15:00".
 * @returns {Promise<number>}
 */
export async function contarPlazasPorFechaYTurno(clase, fecha, turno) {
  try {
    const snapshot = await get(
      child(ref(dbRealtime), `reservas/${clase}/${fecha}/${turno}`)
    );

    let total = 0;

    if (!snapshot.exists()) return 0;

    const sumarReserva = (data) => {
      if (!data || typeof data !== "object") return;
      if (!esReservaValida(data)) return;

      total += Number(data.plazas || 1);
    };

    snapshot.forEach((tipoSnap) => {
      const tipoVal = tipoSnap.val();

      if (!tipoVal || typeof tipoVal !== "object") return;

      if (pareceReservaDirecta(tipoVal)) {
        sumarReserva(tipoVal);
        return;
      }

      tipoSnap.forEach((reservaSnap) => {
        sumarReserva(reservaSnap.val());
      });
    });

    return total;
  } catch (error) {
    console.error("❌ Error al contar plazas por clase/fecha/turno:", error);
    return 0;
  }
}