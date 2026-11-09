// src/utils/disponibilidad.js
// Disponibilidad para la pantalla de reserva. Con sesión se lee de la base de
// datos como siempre; sin sesión (quien aún no ha dejado sus datos) las reglas
// no dejan leer /reservas, /reservasGrupos ni las fechas, así que se pide a
// /api/disponibilidad, que devuelve solo fechas y números.
import { ref, get, child } from "firebase/database";
import { auth, dbRealtime } from "../firebase";
import { contarPlazasPorMetodo } from "./contarPlazasDia";
import { plazasDeTurno, turnosConReservas } from "./plazasOcupadas";

// El SDK restaura la sesión de forma asíncrona: hasta que termina, currentUser
// es null aunque haya cuenta
const haySesion = async () => {
  await auth.authStateReady();
  return !!auth.currentUser;
};

async function pedirApi(parametros) {
  const consulta = new URLSearchParams(parametros).toString();
  const respuesta = await fetch(`/api/disponibilidad?${consulta}`);
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.error || `Error ${respuesta.status} al leer la disponibilidad`);
  }

  return datos;
}

const leerNodo = async (ruta) => {
  try {
    const snap = await get(ref(dbRealtime, ruta));
    return snap.exists() ? snap.val() || {} : {};
  } catch (error) {
    console.error(`Error al cargar ${ruta}:`, error);
    return {};
  }
};

// Fechas bloqueadas, fechas habilitadas y reservas de grupo
export async function cargarContextoReserva() {
  if (!(await haySesion())) {
    const { fechasBloqueadas, fechasHabilitadas, reservasGrupos } = await pedirApi({
      tipo: "contexto",
    });
    return { fechasBloqueadas, fechasHabilitadas, reservasGrupos };
  }

  const [fechasBloqueadas, fechasHabilitadas, reservasGrupos] = await Promise.all([
    leerNodo("bloqueosFechas"),
    leerNodo("fechasHabilitadas"),
    leerNodo("reservasGrupos"),
  ]);

  return { fechasBloqueadas, fechasHabilitadas, reservasGrupos };
}

// Plazas ocupadas por método (torno / modelado) en una fecha
export async function plazasOcupadasPorMetodo(fecha, turno = "") {
  if (!(await haySesion())) {
    const { torno, modelado } = await pedirApi({ tipo: "plazas", fecha, turno });
    return { torno, modelado };
  }

  return contarPlazasPorMetodo(fecha, turno);
}

// Plazas ocupadas en un turno de un taller sin métodos
export async function plazasOcupadasDeTaller(ruta, fecha, turno) {
  if (!(await haySesion())) {
    const { ocupadas } = await pedirApi({ tipo: "plazas", fecha, turno, ruta });
    return ocupadas;
  }

  const snap = await get(child(ref(dbRealtime), `reservas/${ruta}/${fecha}/${turno}`));
  return plazasDeTurno(snap);
}

// Fechas y turnos que ya tienen alguna reserva: { "2026-11-14": ["11:30-14:30"] }.
// Con `ruta` solo ese taller; sin ella, todos (talleres con método torno/modelado).
export async function cargarOcupacion(ruta = "") {
  if (!(await haySesion())) {
    const { ocupacion } = await pedirApi(ruta ? { tipo: "ocupacion", ruta } : { tipo: "ocupacion" });
    return ocupacion || {};
  }

  const snap = await get(ref(dbRealtime, ruta ? `reservas/${ruta}` : "reservas"));
  const hoy = new Date().toISOString().slice(0, 10);
  return turnosConReservas(snap, hoy);
}
