// api/disponibilidad.js
// Disponibilidad de los talleres para quien aún no tiene sesión: fechas
// bloqueadas o habilitadas, turnos abiertos por grupos y plazas ocupadas.
// /reservas y /reservasGrupos llevan datos personales y no son públicos, así que
// aquí se lee con firebase-admin y solo se devuelven números y fechas.
// Las reglas y las respuestas están en src/utils/disponibilidadServidor.js.
import { adminDb } from "./_firebaseAdmin.js";
import { applyCors } from "./_cors.js";
import { resolverDisponibilidad } from "../src/utils/disponibilidadServidor.js";
import { consumirIntento, hash, ipDe } from "./_limiteIntentos.js";

export const config = { runtime: "nodejs" };

// Lecturas recientes, compartidas por todas las peticiones que lleguen a esta
// instancia de la función. Cambiar los parámetros de la URL se salta la caché de
// Vercel, pero ya no obliga a leer otra vez todas las reservas: como mucho, una
// lectura de cada ruta cada LECTURA_MS.
const LECTURA_MS = 5_000;
const MAX_LECTURAS = 200;
const lecturas = new Map(); // ruta → { hasta, promesa }

function leerConCache(ruta) {
  const ahora = Date.now();
  const previa = lecturas.get(ruta);
  if (previa && previa.hasta > ahora) return previa.promesa;

  // Las rutas llevan fecha y turno: se retiran las caducadas para no acumularlas
  if (lecturas.size >= MAX_LECTURAS) {
    for (const [clave, valor] of lecturas) if (valor.hasta <= ahora) lecturas.delete(clave);
    if (lecturas.size >= MAX_LECTURAS) lecturas.clear();
  }

  const promesa = adminDb.ref(ruta).get();
  lecturas.set(ruta, { hasta: ahora + LECTURA_MS, promesa });
  promesa.catch(() => lecturas.delete(ruta));
  return promesa;
}

// Límite por IP: el calendario hace unas pocas llamadas; 120 por minuto solo lo
// alcanza quien la consulta en bucle
const LIMITE_POR_MINUTO = 120;

const valorDe = (param) => (Array.isArray(param) ? param[0] : param) || "";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  // Unos segundos en la caché de Vercel bastan para absorber ráfagas de lecturas
  res.setHeader("Cache-Control", "public, s-maxage=5, stale-while-revalidate=10");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    if (!(await consumirIntento(adminDb, "limitesDisponibilidad", `ip_${hash(ipDe(req))}`, LIMITE_POR_MINUTO, 60_000))) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(429).json({ ok: false, error: "Demasiadas consultas. Espera un momento." });
    }

    const { codigo, cuerpo } = await resolverDisponibilidad(
      {
        tipo: valorDe(req.query?.tipo),
        fecha: valorDe(req.query?.fecha),
        turno: valorDe(req.query?.turno),
        ruta: valorDe(req.query?.ruta),
      },
      leerConCache
    );

    return res.status(codigo).json(cuerpo);
  } catch (error) {
    console.error("Error en /api/disponibilidad:", error);
    return res.status(500).json({ ok: false, error: "No se pudo leer la disponibilidad" });
  }
}
