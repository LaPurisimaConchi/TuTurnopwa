// api/_reservarServidor.js
// Crea reservas pendientes comprobando el aforo real en el servidor (no cuenta
// como función de Vercel: empieza por _). La llama api/codigo-reserva.js con
// tipo "reservar".
//
// Cómo evita pasarse del aforo: escribe las reservas con una marca de llegada
// (creadaEnMs) y una hora límite (reservadaHasta, mientras se paga), y después
// cuenta la franja considerando solo las reservas que llegaron antes o a la vez.
// Si no cabe, las borra y avisa. Dos personas a la vez nunca superan el aforo.
import {
  contarFranja,
  ordenDeReserva,
} from "../src/utils/aforo.js";
import { normalizarConfigEspacio } from "../src/utils/configEspacio.js";
import { hoyMadrid } from "../src/utils/formatoFecha.js";
import { bloqueoAfectaTurno } from "../src/utils/rangosHora.js";
import { normalizarMetodo } from "../src/utils/plazasOcupadas.js";
import { edicionPorId, edicionReservable, esMonografico } from "../src/utils/monografico.js";

const ID = /^[A-Za-z0-9_-]{1,60}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PEDIDO = /^\d{4,20}$/;
const TURNO = /^[^./$#[\]]{1,60}$/;
const METODO = /^[\p{L}0-9 _-]{0,40}$/u;
const MAX_FRANJAS = 30;

// Campos que decide el servidor, no el navegador
const RESERVADOS = [
  "uid",
  "estado",
  "estadoPago",
  "reservadaHasta",
  "creadaEnMs",
  "incluyeTorno",
  "sobreaforo",
  "codigoReserva",
  "pagoAdmin",
];

export const fallo = (status, error, extra = {}) => ({ ok: false, status, error, codigo: "error", ...extra });

const sinControl = (texto) => [...texto].every((c) => c.charCodeAt(0) >= 32);

// ¿Esta reserva usa torno? Solo si el método elegido es el torno; las sesiones de
// un monográfico traen su propia marca (item.torno).
function reservaUsaTorno(metodo) {
  return normalizarMetodo({ metodo }) === "torno";
}

// Escribe las reservas preparadas y comprueba cada franja con lo que llegó antes o
// a la vez que ellas; si alguna no cabe, las borra todas. `alExito` (rutas → null)
// se aplica solo si todo cabe (por ejemplo, borrar las reservas que se sustituyen).
export async function escribirConAforo(db, preparadas, config, ahoraMs, alExito = null) {
  // 1) Se escriben todas las franjas de golpe
  const escritura = {};
  preparadas.forEach((p) => {
    escritura[p.ruta] = p.datos;
  });
  await db.ref().update(escritura);

  // 2) Se cuenta cada franja con lo que llegó antes o a la vez que esta reserva
  const retirar = async () => {
    const borrado = {};
    preparadas.forEach((p) => {
      borrado[p.ruta] = null;
    });
    await db.ref().update(borrado);
  };

  try {
    const [reservas, grupos] = await Promise.all([db.ref("reservas").get(), db.ref("reservasGrupos").get()]);

    for (const p of preparadas) {
      const { total, torno } = contarFranja(reservas, grupos, p.fecha, p.turno, {
        hasta: ordenDeReserva(p.datos, p.clave),
        ahoraMs,
      });

      if (total > config.aforoTotal || (p.torno && torno > config.maxTorno)) {
        await retirar();
        return fallo(409, "Esa franja se acaba de llenar", {
          codigo: p.torno && torno > config.maxTorno && total <= config.aforoTotal ? "torno_lleno" : "franja_llena",
          fecha: p.fecha,
          turno: p.turno,
        });
      }
    }

    if (alExito && Object.keys(alExito).length) await db.ref().update(alExito);
  } catch (err) {
    await retirar().catch(() => {});
    throw err;
  }

  return { ok: true };
}

export async function reservarConAforo(db, uid, claseId, items, { edicionId = "" } = {}) {
  if (!ID.test(String(claseId || ""))) return fallo(400, "Taller no válido");
  if (!Array.isArray(items) || !items.length || items.length > MAX_FRANJAS) {
    return fallo(400, "Reserva no válida");
  }

  const [claseSnap, bloqueosSnap, espacioSnap] = await Promise.all([
    db.ref(`clases/${claseId}`).get(),
    db.ref("bloqueosFechas").get(),
    db.ref("configuracionEspacio").get(),
  ]);

  const clase = claseSnap.exists() ? claseSnap.val() : null;
  const activa = clase && (clase.estado ? clase.estado === "activa" : clase.activa !== false);
  // Monográfico: se reserva una edición entera. Las fechas y los turnos los pone el
  // servidor a partir de la edición; del navegador solo se toman plazas y datos.
  if (clase && esMonografico(clase)) {
    const edicion = edicionPorId(clase, String(edicionId || ""));
    if (!edicion) return fallo(400, "Edición no válida");
    if (!edicionReservable(edicion, hoyMadrid())) {
      return fallo(409, "Esa edición ya ha empezado", { codigo: "fecha_pasada" });
    }

    const base = items?.[0];
    if (!base?.reserva || typeof base.reserva !== "object") return fallo(400, "Reserva no válida");

    items = edicion.fechas.map((f, indice) => ({
      fecha: f.fecha,
      turno: f.turno,
      metodo: "",
      plazas: base.plazas,
      torno: f.torno === true,
      reserva: {
        ...base.reserva,
        edicionId: edicion.id,
        sesionEdicion: indice + 1,
        sesionesEdicion: edicion.fechas.length,
        fechasEdicion: edicion.fechas,
      },
    }));
  } else if (edicionId) {
    return fallo(400, "Este taller no tiene ediciones");
  }

  // Un bono solo se reserva con su primera sesión (desdeBono); el resto, talleres
  const esPrimeraSesionBono = items.every((i) => i?.reserva?.desdeBono === true);
  if (!clase || !activa || (clase.tipoProducto === "bono") !== esPrimeraSesionBono) {
    return fallo(404, "Este taller no está disponible para reservar");
  }

  const config = normalizarConfigEspacio(espacioSnap.exists() ? espacioSnap.val() : null);
  const bloqueos = bloqueosSnap.exists() ? bloqueosSnap.val() || {} : {};
  const hoy = hoyMadrid();
  const ahora = new Date();
  const creadaEnMs = ahora.toISOString();
  const reservadaHasta = new Date(ahora.getTime() + config.minutosReserva * 60000).toISOString();
  const rutaTaller = String(clase.reservasPath || claseId);

  if (!ID.test(rutaTaller)) return fallo(400, "Taller no válido");

  const preparadas = [];
  for (const item of items) {
    const fecha = String(item?.fecha || "");
    const turno = String(item?.turno || "");
    const metodo = String(item?.metodo || "");
    const plazas = Number(item?.plazas);
    const orderId = String(item?.reserva?.orderId || "");

    if (!FECHA.test(fecha)) return fallo(400, "Fecha no válida");
    if (!TURNO.test(turno) || !sinControl(turno)) return fallo(400, "Turno no válido");
    if (!METODO.test(metodo)) return fallo(400, "Método no válido");
    if (!Number.isInteger(plazas) || plazas < 1 || plazas > config.aforoTotal) {
      return fallo(400, "Número de plazas no válido");
    }
    if (!PEDIDO.test(orderId)) return fallo(400, "Pedido no válido");
    if (!item.reserva || typeof item.reserva !== "object" || JSON.stringify(item.reserva).length > 6000) {
      return fallo(400, "Reserva no válida");
    }

    if (fecha < hoy) {
      return fallo(409, "Esa fecha ya ha pasado", { codigo: "fecha_pasada", fecha, turno });
    }
    if (bloqueoAfectaTurno(bloqueos[fecha], turno)) {
      return fallo(409, "Ese día no está disponible", { codigo: "bloqueado", fecha, turno });
    }

    const torno = item.torno === true || reservaUsaTorno(metodo);
    const carpeta = metodo
      ? `reservas/${rutaTaller}/${fecha}/${turno}/${metodo}`
      : `reservas/${rutaTaller}/${fecha}/${turno}`;
    const clave = db.ref(carpeta).push().key;

    const datos = { ...item.reserva };
    RESERVADOS.forEach((campo) => delete datos[campo]);

    preparadas.push({
      fecha,
      turno,
      torno,
      ruta: `${carpeta}/${clave}`,
      clave,
      datos: {
        ...datos,
        uid,
        claseId,
        fecha,
        turno,
        metodo: metodo || String(item.reserva.metodo || ""),
        plazas,
        orderId,
        estado: "Pendiente",
        estadoPago: "pendiente",
        incluyeTorno: torno,
        creadaEnMs,
        reservadaHasta,
      },
    });
  }

  const resultado = await escribirConAforo(db, preparadas, config, ahora.getTime());
  if (!resultado.ok) return resultado;

  return {
    ok: true,
    status: 200,
    reservadaHasta,
    reservas: preparadas.map((p) => ({ ruta: p.ruta, id: p.clave, fecha: p.fecha, turno: p.turno })),
  };
}

// Un pago puede llegar cuando la plaza guardada ya caducó y otra persona la ha
// ocupado. No se puede rechazar un pago hecho: la reserva se confirma igualmente y
// se marca `sobreaforo` para que el admin lo vea en el panel. Nunca rompe el pago.
// `confirmadas`: [{ ruta, fecha, turno, reservadaHasta, torno }] ya confirmadas.
export async function marcarSobreaforo(db, confirmadas) {
  try {
    const ahoraMs = Date.now();
    const caducadas = (confirmadas || []).filter((c) => {
      const hasta = Date.parse(c.reservadaHasta || "");
      return Number.isFinite(hasta) && hasta < ahoraMs;
    });
    if (!caducadas.length) return;

    const [reservas, grupos, espacio] = await Promise.all([
      db.ref("reservas").get(),
      db.ref("reservasGrupos").get(),
      db.ref("configuracionEspacio").get(),
    ]);
    const config = normalizarConfigEspacio(espacio.exists() ? espacio.val() : null);

    const marcas = {};
    caducadas.forEach((c) => {
      const { total, torno } = contarFranja(reservas, grupos, c.fecha, c.turno, { ahoraMs });
      if (total > config.aforoTotal || (c.torno && torno > config.maxTorno)) {
        marcas[`${c.ruta}/sobreaforo`] = true;
      }
    });

    if (Object.keys(marcas).length) await db.ref().update(marcas);
  } catch (error) {
    console.error("No se pudo comprobar el sobreaforo:", error);
  }
}
