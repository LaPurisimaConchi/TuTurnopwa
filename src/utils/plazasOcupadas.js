// src/utils/plazasOcupadas.js
// Reglas para contar plazas ocupadas y para publicar la disponibilidad sin datos
// personales. Sin imports de Firebase: las usan el navegador (SDK de cliente) y
// api/disponibilidad.js (firebase-admin). Los snapshots son los de cualquiera de
// los dos SDK (forEach, child, exists, val, key).
// Ojo: en forEach, devolver un valor verdadero corta la enumeración; por eso los
// callbacks llevan llaves.

export function normalizarMetodo(data = {}) {
  const valor = (data.metodo || data.tipoClase || data.tipo || "")
    .toString()
    .trim()
    .toLowerCase();

  if (valor === "torno") return "torno";

  if (
    valor === "modelado a mano" ||
    valor === "modelado" ||
    valor === "decoración con esmaltes" ||
    valor === "decoracion con esmaltes"
  ) {
    return "modelado";
  }

  return "";
}

// Solo ocupan plaza las reservas confirmadas y pagadas
export function esReservaValida(data = {}) {
  const estado = (data.estado || "").toString().trim().toLowerCase();
  const estadoPago = (data.estadoPago || "").toString().trim().toLowerCase();

  return estado === "confirmada" && estadoPago === "pagado";
}

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

// Plazas ocupadas por método (torno o modelado) en una fecha, en todos los
// talleres. `reservas` es el snapshot de /reservas; con turno, solo ese turno.
export function plazasPorMetodo(reservas, fecha, turno = "") {
  let torno = 0;
  let modelado = 0;

  if (!reservas || !reservas.exists()) return { torno, modelado };

  const sumarReserva = (data) => {
    if (!data || typeof data !== "object") return;
    if (!esReservaValida(data)) return;

    const plazas = Number(data.plazas || 1);
    const metodo = normalizarMetodo(data);

    if (metodo === "torno") {
      torno += plazas;
    } else if (metodo === "modelado") {
      modelado += plazas;
    }
  };

  reservas.forEach((claseSnap) => {
    const fechaSnap = claseSnap.child(fecha);
    if (!fechaSnap.exists()) return;

    fechaSnap.forEach((turnoSnap) => {
      if (turno && turnoSnap.key !== turno) return;

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

  return { torno, modelado };
}

// Plazas libres en un turno: el torno tiene su propio tope y todos los métodos
// comparten el total
export function plazasLibres({ torno = 0, modelado = 0, esTorno = false, maxTorno = 12, maxTotales = 45 }) {
  const totales = torno + modelado;
  const libres = esTorno ? Math.min(maxTorno - torno, maxTotales - totales) : maxTotales - totales;

  return Math.max(libres, 0);
}

// Plazas ocupadas en un turno de un taller sin métodos: `turnoSnap` es el
// snapshot de reservas/{ruta}/{fecha}/{turno}
export function plazasDeTurno(turnoSnap) {
  let ocupadas = 0;

  if (!turnoSnap || !turnoSnap.exists()) return ocupadas;

  turnoSnap.forEach((reservaSnap) => {
    const reserva = reservaSnap.val();
    if (esReservaValida(reserva)) ocupadas += Number(reserva.plazas || 1);
  });

  return ocupadas;
}

// --- Lo que se publica sin sesión (solo lo que usa la pantalla de reserva) ---

// bloqueosFechas → { "2026-12-25": { bloqueado: true, motivo } }
export function bloqueosPublicos(bloqueos = {}) {
  const publico = {};

  Object.entries(bloqueos || {}).forEach(([fecha, bloqueo]) => {
    if (bloqueo?.bloqueado) {
      publico[fecha] = { bloqueado: true, motivo: String(bloqueo.motivo || "") };
    }
  });

  return publico;
}

// fechasHabilitadas → solo las habilitadas, con los turnos que se abren
export function habilitacionesPublicas(habilitadas = {}) {
  const publico = {};

  Object.entries(habilitadas || {}).forEach(([fecha, habilitacion]) => {
    if (!habilitacion?.habilitada) return;

    publico[fecha] = { habilitada: true };
    if (habilitacion.turnosHabilitados) {
      publico[fecha].turnosHabilitados = habilitacion.turnosHabilitados;
    }
    if (habilitacion.turnosDisponibles) {
      publico[fecha].turnosDisponibles = habilitacion.turnosDisponibles;
    }
  });

  return publico;
}

// reservasGrupos → solo las confirmadas de 5 o más plazas, que son las que abren
// turno; sin nombres ni contacto
export function gruposPublicos(grupos = {}) {
  const publico = {};

  Object.entries(grupos || {}).forEach(([id, grupo]) => {
    if (
      grupo?.estado === "Confirmada" &&
      Number(grupo?.plazas || 0) >= 5 &&
      grupo?.fecha &&
      grupo?.turno
    ) {
      publico[id] = {
        fecha: grupo.fecha,
        turno: grupo.turno,
        plazas: Number(grupo.plazas),
        estado: "Confirmada",
      };
    }
  });

  return publico;
}
