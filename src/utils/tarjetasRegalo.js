import { ref, update } from "firebase/database";
import { dbRealtime } from "../firebase";

export const marcarTarjetaRegaloComoUsada = async ({ codigo, uid }) => {
  if (!codigo) return;

  await update(ref(dbRealtime, `tarjetas_regalo/${codigo}`), {
    usado: true,
    fechaUso: new Date().toISOString(),
    usadoPorUID: uid,
  });
};

// Plazas que cubre una tarjeta regalo al canjearla (las antiguas son de 1)
export const plazasDeTarjetaRegalo = (state) =>
  Math.max(1, Math.floor(Number(state?.plazasTarjeta) || 1));

// Máximo de personas en una sola tarjeta regalo
export const MAX_PLAZAS_TARJETA_REGALO = 10;
