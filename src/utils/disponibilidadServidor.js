// src/utils/disponibilidadServidor.js
// Respuesta de /api/disponibilidad, sin depender de ningún SDK: `leer(ruta)`
// devuelve el snapshot de esa ruta. La usan la función de Vercel (firebase-admin)
// y el servidor de desarrollo (SDK de cliente, ver vite.disponibilidadLocal.js).
//   tipo=contexto
//   tipo=ocupacion[&ruta=<carpeta>]                        → fechas y turnos con reservas
//   tipo=plazas&fecha=AAAA-MM-DD[&turno=…]                → torno / modelado
//   tipo=plazas&fecha=…&turno=…&ruta=<carpeta>             → ocupadas del taller
import {
  bloqueosPublicos,
  gruposPublicos,
  habilitacionesPublicas,
  plazasDeTurno,
  plazasPorMetodo,
  turnosConReservas,
} from "./plazasOcupadas.js";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RUTA = /^[A-Za-z0-9_-]{1,60}$/;
// Los turnos son claves de Firebase: "17:30-20:30", "Horario a consultar"…
const TURNO = /^[^./$#[\]]{1,60}$/;
const sinControl = (texto) => [...texto].every((c) => c.charCodeAt(0) >= 32);

const mal = (error) => ({ codigo: 400, cuerpo: { ok: false, error } });

export async function resolverDisponibilidad({ tipo, fecha, turno, ruta }, leer) {
  if (tipo === "contexto") {
    const [bloqueos, habilitadas, grupos] = await Promise.all([
      leer("bloqueosFechas"),
      leer("fechasHabilitadas"),
      leer("reservasGrupos"),
    ]);

    return {
      codigo: 200,
      cuerpo: {
        ok: true,
        fechasBloqueadas: bloqueosPublicos(bloqueos.val() || {}),
        fechasHabilitadas: habilitacionesPublicas(habilitadas.val() || {}),
        reservasGrupos: gruposPublicos(grupos.val() || {}),
      },
    };
  }

  if (tipo === "ocupacion") {
    if (ruta && !RUTA.test(ruta)) return mal("Taller no válido");

    const hoy = new Date().toISOString().slice(0, 10);
    const reservas = await leer(ruta ? `reservas/${ruta}` : "reservas");
    return { codigo: 200, cuerpo: { ok: true, ocupacion: turnosConReservas(reservas, hoy) } };
  }

  if (tipo === "plazas") {
    if (!FECHA.test(fecha)) return mal("Fecha no válida");
    if (turno && !(TURNO.test(turno) && sinControl(turno))) return mal("Turno no válido");

    // Taller sin métodos: plazas ocupadas en su carpeta de reservas
    if (ruta) {
      if (!RUTA.test(ruta) || !turno) return mal("Faltan datos");

      const snap = await leer(`reservas/${ruta}/${fecha}/${turno}`);
      return { codigo: 200, cuerpo: { ok: true, ocupadas: plazasDeTurno(snap) } };
    }

    const reservas = await leer("reservas");
    const { torno, modelado } = plazasPorMetodo(reservas, fecha, turno);
    return { codigo: 200, cuerpo: { ok: true, torno, modelado } };
  }

  return mal("Tipo no válido");
}
