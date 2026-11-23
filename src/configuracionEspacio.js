// src/configuracionEspacio.js
// Lectura y guardado de configuracionEspacio (lectura pública, escritura admin).
import { useEffect, useState } from "react";
import { ref, get, set } from "firebase/database";
import { dbRealtime } from "./firebase";
import {
  CONFIG_ESPACIO_DEFECTO,
  normalizarConfigEspacio,
} from "./utils/configEspacio";

export async function cargarConfigEspacio() {
  try {
    const snap = await get(ref(dbRealtime, "configuracionEspacio"));
    return normalizarConfigEspacio(snap.exists() ? snap.val() : null);
  } catch (err) {
    // Reglas sin desplegar o sin conexión: se usan los valores por defecto
    console.warn("No se pudo leer configuracionEspacio, se usan los valores por defecto.", err);
    return CONFIG_ESPACIO_DEFECTO;
  }
}

export async function guardarConfigEspacio(config) {
  const limpia = normalizarConfigEspacio(config);
  await set(ref(dbRealtime, "configuracionEspacio"), {
    ...limpia,
    actualizadoEn: new Date().toISOString(),
  });
  return limpia;
}

// Configuración del espacio; hasta que llega (o si falla) vale la de por defecto
export function useConfigEspacio() {
  const [config, setConfig] = useState(CONFIG_ESPACIO_DEFECTO);
  const [cargada, setCargada] = useState(false);

  useEffect(() => {
    let activo = true;
    cargarConfigEspacio().then((c) => {
      if (!activo) return;
      setConfig(c);
      setCargada(true);
    });
    return () => {
      activo = false;
    };
  }, []);

  return { config, cargada };
}
