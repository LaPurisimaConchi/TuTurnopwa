// api/disponibilidad.js
// Disponibilidad de los talleres para quien aún no tiene sesión: fechas
// bloqueadas o habilitadas, turnos abiertos por grupos y plazas ocupadas.
// /reservas y /reservasGrupos llevan datos personales y no son públicos, así que
// aquí se lee con firebase-admin y solo se devuelven números y fechas.
//   GET /api/disponibilidad?tipo=contexto
//   GET /api/disponibilidad?tipo=plazas&fecha=AAAA-MM-DD[&turno=…]            → torno / modelado
//   GET /api/disponibilidad?tipo=plazas&fecha=…&turno=…&ruta=<carpeta>        → ocupadas del taller
import { adminDb } from "./_firebaseAdmin.js";
import { applyCors } from "./_cors.js";
import {
  bloqueosPublicos,
  gruposPublicos,
  habilitacionesPublicas,
  plazasDeTurno,
  plazasPorMetodo,
} from "../src/utils/plazasOcupadas.js";

export const config = { runtime: "nodejs" };

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RUTA = /^[A-Za-z0-9_-]{1,60}$/;
// Los turnos son claves de Firebase: "17:30-20:30", "Horario a consultar"…
const TURNO = /^[^./$#[\]]{1,60}$/;
const sinControl = (texto) => [...texto].every((c) => c.charCodeAt(0) >= 32);

const valorDe = (param) => (Array.isArray(param) ? param[0] : param) || "";

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  // Unos segundos en la caché de Vercel bastan para absorber ráfagas de lecturas
  res.setHeader("Cache-Control", "public, s-maxage=5, stale-while-revalidate=10");

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  const tipo = valorDe(req.query?.tipo);
  const fecha = valorDe(req.query?.fecha);
  const turno = valorDe(req.query?.turno);
  const ruta = valorDe(req.query?.ruta);

  try {
    if (tipo === "contexto") {
      const [bloqueos, habilitadas, grupos] = await Promise.all([
        adminDb.ref("bloqueosFechas").get(),
        adminDb.ref("fechasHabilitadas").get(),
        adminDb.ref("reservasGrupos").get(),
      ]);

      return res.status(200).json({
        ok: true,
        fechasBloqueadas: bloqueosPublicos(bloqueos.val() || {}),
        fechasHabilitadas: habilitacionesPublicas(habilitadas.val() || {}),
        reservasGrupos: gruposPublicos(grupos.val() || {}),
      });
    }

    if (tipo === "plazas") {
      if (!FECHA.test(fecha)) {
        return res.status(400).json({ ok: false, error: "Fecha no válida" });
      }
      if (turno && !(TURNO.test(turno) && sinControl(turno))) {
        return res.status(400).json({ ok: false, error: "Turno no válido" });
      }

      // Taller sin métodos: plazas ocupadas en su carpeta de reservas
      if (ruta) {
        if (!RUTA.test(ruta) || !turno) {
          return res.status(400).json({ ok: false, error: "Faltan datos" });
        }

        const snap = await adminDb.ref(`reservas/${ruta}/${fecha}/${turno}`).get();
        return res.status(200).json({ ok: true, ocupadas: plazasDeTurno(snap) });
      }

      const reservas = await adminDb.ref("reservas").get();
      const { torno, modelado } = plazasPorMetodo(reservas, fecha, turno);
      return res.status(200).json({ ok: true, torno, modelado });
    }

    return res.status(400).json({ ok: false, error: "Tipo no válido" });
  } catch (error) {
    console.error("Error en /api/disponibilidad:", error);
    return res.status(500).json({ ok: false, error: "No se pudo leer la disponibilidad" });
  }
}
