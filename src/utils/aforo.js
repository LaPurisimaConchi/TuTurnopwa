// src/utils/aforo.js
// Aforo real: las plazas ocupadas en una franja (fecha + turno) sumando todos los
// talleres y los grupos. Sin React ni Firebase: lo usan el navegador y las
// funciones de Vercel, con snapshots de cualquiera de los dos SDK (forEach, key,
// val, exists).
//
// Cuentan las reservas confirmadas y pagadas, las reservas de grupo confirmadas y
// las reservas pendientes de pago que aún guardan su plaza (`reservadaHasta` en el
// futuro). Las pendientes sin ese campo (pantallas antiguas) no cuentan, como antes.
import { esReservaValida, normalizarMetodo } from "./plazasOcupadas.js";
import { turnosSeSolapan } from "./rangosHora.js";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const esReserva = (obj) =>
  !!obj &&
  typeof obj === "object" &&
  ("fecha" in obj || "estado" in obj || "estadoPago" in obj || "uid" in obj || "orderId" in obj);

// Confirmada y pagada, o pendiente con la plaza aún guardada
export function reservaVigente(data = {}, ahoraMs = Date.now()) {
  if (esReservaValida(data)) return true;

  const estado = String(data.estado || "").trim().toLowerCase();
  const hasta = Date.parse(data.reservadaHasta || "");

  return estado === "pendiente" && Number.isFinite(hasta) && hasta > ahoraMs;
}

export const usaTorno = (data = {}) =>
  data.incluyeTorno === true || normalizarMetodo(data) === "torno";

// Orden de llegada: las reservas antiguas, sin marca de creación, van primero
export const ordenDeReserva = (data = {}, clave = "") =>
  `${String(data.creadaEnMs || data.creadaEn || "")}|${clave}`;

// Recorre /reservas (taller → fecha → turno → [método →] reserva) y los grupos
// confirmados. Llama a `alEncontrar({ fecha, turno, plazas, torno, orden, clave, id })`
// por cada reserva vigente. En forEach, devolver algo verdadero corta el recorrido,
// por eso los callbacks llevan llaves.
export function recorrerOcupacion(reservas, reservasGrupos, alEncontrar, { desde = "", ahoraMs = Date.now() } = {}) {
  const contar = (fecha, turno, id, data) => {
    if (!data || typeof data !== "object" || !reservaVigente(data, ahoraMs)) return;

    alEncontrar({
      fecha,
      turno,
      plazas: Math.max(1, Number(data.plazas || 1)),
      torno: usaTorno(data),
      orden: ordenDeReserva(data, id),
      clave: id,
      orderId: data.orderId || "",
    });
  };

  if (reservas && reservas.exists()) {
    reservas.forEach((tallerSnap) => {
      tallerSnap.forEach((fechaSnap) => {
        const fecha = fechaSnap.key;
        if (!FECHA.test(fecha) || (desde && fecha < desde)) return;

        fechaSnap.forEach((turnoSnap) => {
          turnoSnap.forEach((hijo) => {
            const valor = hijo.val();
            if (!valor || typeof valor !== "object") return;

            if (esReserva(valor)) {
              contar(fecha, turnoSnap.key, hijo.key, valor);
              return;
            }

            hijo.forEach((reservaSnap) => {
              contar(fecha, turnoSnap.key, reservaSnap.key, reservaSnap.val());
            });
          });
        });
      });
    });
  }

  if (reservasGrupos && reservasGrupos.exists()) {
    reservasGrupos.forEach((grupoSnap) => {
      const grupo = grupoSnap.val();
      if (!grupo || String(grupo.estado || "") !== "Confirmada") return;
      if (!FECHA.test(String(grupo.fecha || "")) || !grupo.turno) return;
      if (desde && grupo.fecha < desde) return;

      alEncontrar({
        fecha: grupo.fecha,
        turno: String(grupo.turno),
        plazas: Math.max(1, Number(grupo.plazas || 1)),
        torno: usaTorno(grupo),
        orden: ordenDeReserva(grupo, grupoSnap.key),
        clave: grupoSnap.key,
        orderId: grupo.orderId || "",
      });
    });
  }
}

// Dos turnos comparten plazas si son el mismo o se solapan en el tiempo (un turno
// 10:00-12:00 y otro 11:00-13:00 ocupan el mismo espacio entre las 11 y las 12).
// Los turnos sin horas («Horario a consultar») solo coinciden si son iguales.
export const turnosCompartenPlazas = (a, b) => a === b || turnosSeSolapan(a, b);

// Plazas de una franja, contando también las de los turnos que se solapan con ella.
// Con `hasta` (orden de una reserva) solo cuentan las que
// llegaron antes o a la vez: así dos reservas simultáneas no se tapan una a otra.
export function contarFranja(reservas, reservasGrupos, fecha, turno, { hasta = "", ahoraMs = Date.now() } = {}) {
  let total = 0;
  let torno = 0;

  recorrerOcupacion(
    reservas,
    reservasGrupos,
    (e) => {
      if (e.fecha !== fecha || !turnosCompartenPlazas(e.turno, turno)) return;
      if (hasta && e.orden > hasta) return;

      total += e.plazas;
      if (e.torno) torno += e.plazas;
    },
    { desde: fecha, ahoraMs }
  );

  return { total, torno };
}

// Plazas de un turno dentro de la ocupación de un día ({ turno: { total, torno } }),
// sumando también los turnos que se solapan con él
export function sumarSolapadas(delDia = {}, turno) {
  let total = 0;
  let torno = 0;

  Object.entries(delDia).forEach(([otro, plazas]) => {
    if (!turnosCompartenPlazas(otro, turno)) return;
    total += plazas.total;
    torno += plazas.torno;
  });

  return { total, torno };
}

// Ocupación de cada turno que tiene reservas, desde una fecha, sin sumar solapes
// (para eso, sumarSolapadas): { "2026-11-14": { "11:30-14:30": { total, torno } } }
export function ocupacionPorFranja(reservas, reservasGrupos, desde = "", ahoraMs = Date.now()) {
  const resultado = {};

  recorrerOcupacion(
    reservas,
    reservasGrupos,
    (e) => {
      const dia = (resultado[e.fecha] ||= {});
      const franja = (dia[e.turno] ||= { total: 0, torno: 0 });
      franja.total += e.plazas;
      if (e.torno) franja.torno += e.plazas;
    },
    { desde, ahoraMs }
  );

  return resultado;
}

// Plazas libres con los límites de la configuración del espacio
export function plazasLibresFranja({ total = 0, torno = 0 }, config, { conTorno = false } = {}) {
  const libresTotal = Math.max(config.aforoTotal - total, 0);
  const libresTorno = Math.max(config.maxTorno - torno, 0);

  return {
    total: libresTotal,
    torno: libresTorno,
    reservables: conTorno ? Math.min(libresTotal, libresTorno) : libresTotal,
  };
}
