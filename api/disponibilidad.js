// api/disponibilidad.js
// Disponibilidad de los talleres para quien aún no tiene sesión: fechas
// bloqueadas o habilitadas, turnos abiertos por grupos y plazas ocupadas.
// /reservas y /reservasGrupos llevan datos personales y no son públicos, así que
// aquí se lee con firebase-admin y solo se devuelven números y fechas.
// Las reglas y las respuestas están en src/utils/disponibilidadServidor.js.
import { adminDb } from "./_firebaseAdmin.js";
import { applyCors } from "./_cors.js";
import { resolverDisponibilidad } from "../src/utils/disponibilidadServidor.js";

export const config = { runtime: "nodejs" };

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
    const { codigo, cuerpo } = await resolverDisponibilidad(
      {
        tipo: valorDe(req.query?.tipo),
        fecha: valorDe(req.query?.fecha),
        turno: valorDe(req.query?.turno),
        ruta: valorDe(req.query?.ruta),
      },
      (ruta) => adminDb.ref(ruta).get()
    );

    return res.status(codigo).json(cuerpo);
  } catch (error) {
    console.error("Error en /api/disponibilidad:", error);
    return res.status(500).json({ ok: false, error: "No se pudo leer la disponibilidad" });
  }
}
