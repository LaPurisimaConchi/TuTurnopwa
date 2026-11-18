// src/utils/cambioFecha.js
// Reglas del cambio de fecha que hace el propio cliente sin iniciar sesión
// (número de reserva + email). Sin React ni Firebase: lo usa api/cambiar-fecha.js
// y la pantalla /gestionar-reserva para mostrar los mismos plazos.
import { esReservaValida, normalizarMetodo } from "./plazasOcupadas.js";
import { esTurnoConsulta, limpiarTurno, turnosDisponiblesEnFecha } from "./turnosFecha.js";
import { contarFranja, plazasLibresFranja } from "./aforo.js";
import { bloqueoAfectaTurno } from "./rangosHora.js";
import { edicionesDeClase } from "./monografico.js";
import { CONFIG_ESPACIO_DEFECTO } from "./configEspacio.js";

// Política de cancelación: las horas de antelación las fija el panel (Espacio) y son
// distintas para una reserva normal y una de bono
export const ANTELACION_HORAS = CONFIG_ESPACIO_DEFECTO.horasCambioReserva;
// La nueva clase debe empezar con este margen, para que el taller pueda prepararla
export const MARGEN_NUEVA_CLASE_HORAS = 24;
export const MAX_CAMBIOS_CLIENTE = 1;
// Una reserva que cancela el estudio se puede recuperar con su código durante este
// tiempo: el cliente elige otra fecha sin pagar de nuevo
export const MESES_RECUPERACION = 6;
export const DIAS_VENTANA = 90;

const ZONA = "Europe/Madrid";
const HORA = 3_600_000;
const DIA = 24 * HORA;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const normalizarEmail = (valor = "") => String(valor || "").trim().toLowerCase();

export const esFechaISO = (valor) => FECHA.test(String(valor || ""));

// "Ahora" en hora de Madrid como milisegundos «de pared» (sin zona), para poder
// compararlos con el inicio de una clase, que se guarda como fecha y turno locales
export function ahoraMadridMs(ahora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: ZONA,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(ahora)
      .map((p) => [p.type, p.value])
  );

  return Date.UTC(
    Number(partes.year),
    Number(partes.month) - 1,
    Number(partes.day),
    Number(partes.hour) % 24,
    Number(partes.minute),
    Number(partes.second)
  );
}

export const fechaDeMs = (ms) => new Date(ms).toISOString().slice(0, 10);

// Suma meses a una fecha AAAA-MM-DD (el día se recorta al último del mes si hace falta)
export function sumarMesesISO(fecha, meses) {
  const [anio, mes, dia] = String(fecha).split("-").map(Number);
  const destino = new Date(Date.UTC(anio, mes - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(destino.getUTCFullYear(), destino.getUTCMonth() + 1, 0)).getUTCDate();
  destino.setUTCDate(Math.min(dia, ultimo));
  return destino.toISOString().slice(0, 10);
}

// Inicio de la clase en milisegundos «de pared». Turno "17:30-20:30" → 17:30; si
// el turno no tiene hora, se toma el comienzo del día (el caso más restrictivo)
export function inicioClaseMs(fecha, turno = "") {
  if (!esFechaISO(fecha)) return NaN;

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const hora = String(turno).match(/(\d{1,2}):(\d{2})/);

  return Date.UTC(anio, mes - 1, dia, hora ? Number(hora[1]) : 0, hora ? Number(hora[2]) : 0);
}

// Un turno deja de poderse reservar en cuanto llega su hora de inicio (hora de Madrid).
// Sin fecha válida se considera empezado, para no dejar pasar nada raro.
export function turnoYaEmpezado(fecha, turno = "", ahoraMs = ahoraMadridMs()) {
  const inicio = inicioClaseMs(fecha, turno);
  return Number.isNaN(inicio) || inicio <= ahoraMs;
}

// Horas mínimas de antelación para reprogramar esta reserva: las de bono tienen su plazo;
// el resto (monográficos incluidos) usa el de las reservas normales
export function horasAntelacionDe(reserva, config = CONFIG_ESPACIO_DEFECTO) {
  if (reserva?.desdeBono) {
    return config?.horasCambioBono ?? CONFIG_ESPACIO_DEFECTO.horasCambioBono;
  }
  return config?.horasCambioReserva ?? CONFIG_ESPACIO_DEFECTO.horasCambioReserva;
}

const pareceReservaDirecta = (obj) =>
  !!obj &&
  typeof obj === "object" &&
  ("fecha" in obj || "estado" in obj || "estadoPago" in obj || "uid" in obj || "orderId" in obj);

// Localiza una reserva por número de pedido en el valor de /reservas. Devuelve la
// ruta completa y los datos tal y como están guardados.
//   reservas/{clase}/{fecha}/{turno}/{reservaId}
//   reservas/{clase}/{fecha}/{turno}/{metodo}/{reservaId}
export function buscarReservaEnArbol(reservas, orderId) {
  if (!reservas || typeof reservas !== "object" || !orderId) return null;

  for (const [clase, fechas] of Object.entries(reservas)) {
    for (const [fecha, turnos] of Object.entries(fechas || {})) {
      for (const [turno, hijos] of Object.entries(turnos || {})) {
        for (const [clave, valor] of Object.entries(hijos || {})) {
          if (!valor || typeof valor !== "object") continue;

          if (pareceReservaDirecta(valor)) {
            if (valor.orderId === orderId) {
              return { segmentos: ["reservas", clase, fecha, turno, clave], reserva: valor };
            }
            continue;
          }

          for (const [reservaId, reserva] of Object.entries(valor)) {
            if (reserva?.orderId === orderId) {
              return {
                segmentos: ["reservas", clase, fecha, turno, clave, reservaId],
                reserva,
              };
            }
          }
        }
      }
    }
  }

  return null;
}

// ¿Puede el cliente cambiar esta reserva él mismo? Si no, el motivo se le enseña.
export function evaluarCambio(reserva, ahoraMs = ahoraMadridMs(), config = CONFIG_ESPACIO_DEFECTO) {
  const cambiosHechos = Number(reserva?.numCambiosCliente || 0);

  if (
    reserva?.cancelada === true ||
    String(reserva?.estado || "").toLowerCase() === "cancelada"
  ) {
    // Cancelada por el estudio: se puede volver a reservar con el código, sin el
    // plazo de antelación ni el límite de cambios (no es un cambio del cliente)
    if (reserva?.cancelacionEstudio === true && !reserva?.recuperada) {
      const hasta = String(reserva?.recuperableHasta || "");
      if (esFechaISO(hasta) && hasta >= fechaDeMs(ahoraMs)) {
        return { ok: true, motivo: "", recuperacion: true };
      }
      return {
        ok: false,
        motivo: "El plazo para volver a reservar esta clase ya ha terminado. Escríbenos y lo vemos.",
      };
    }
    return { ok: false, motivo: "Esta reserva está cancelada." };
  }

  if (!esReservaValida(reserva)) {
    return { ok: false, motivo: "Esta reserva no está confirmada y pagada." };
  }

  // Las clases de un bono tienen su fecha ligada al bono y se gestionan desde el perfil.
  // La primera sesión de un taller de varias sesiones sí se cambia (api/cambiar-fecha.js
  // respeta los días mínimos con la segunda, si ya está reservada)
  if (reserva?.desdeBono) {
    return {
      ok: false,
      motivo: "Esta reserva forma parte de un bono: reprograma la clase desde tu perfil, en la pestaña Bonos.",
    };
  }

  if (cambiosHechos >= MAX_CAMBIOS_CLIENTE) {
    return {
      ok: false,
      motivo: "Ya cambiaste la fecha de esta reserva una vez. Si necesitas otro cambio, escríbenos.",
    };
  }

  const inicio = inicioClaseMs(reserva?.fecha, reserva?.turno);
  if (Number.isNaN(inicio)) {
    return { ok: false, motivo: "No se puede leer la fecha de la reserva. Escríbenos y la cambiamos." };
  }

  const horas = horasAntelacionDe(reserva, config);
  if (inicio - ahoraMs < horas * HORA) {
    return {
      ok: false,
      motivo: `Los cambios se piden con al menos ${horas} horas de antelación y a tu clase le queda menos.`,
    };
  }

  return { ok: true, motivo: "" };
}

// Plazas libres de una franja para esta reserva: el aforo y el torno son los del
// espacio, comunes a todos los talleres (src/utils/aforo.js). `reservas` y `grupos`
// son los snapshots de /reservas y /reservasGrupos.
export function plazasLibresParaReserva({ reservas, grupos, config, reserva, fecha, turno }) {
  const ocupadas = contarFranja(reservas, grupos, fecha, turno);
  const conTorno = reserva?.incluyeTorno === true || normalizarMetodo(reserva) === "torno";

  return plazasLibresFranja(ocupadas, config, { conTorno }).reservables;
}

// Ediciones de un monográfico a las que puede pasar una reserva: con hueco para
// todas sus plazas en cada sesión, sin sesiones cerradas y con el margen de la primera clase
export function opcionesDeCambioEdicion({
  clase,
  reserva,
  reservas,
  grupos,
  config,
  bloqueos,
  ahoraMs = ahoraMadridMs(),
}) {
  const plazas = Number(reserva?.plazas || 1);

  return edicionesDeClase(clase)
    .filter((edicion) => edicion.id !== reserva?.edicionId)
    .map((edicion) => {
      const [primera] = edicion.fechas;
      if (motivoFechaNoValida({ fecha: primera.fecha, turno: primera.turno, ahoraMs, bloqueos, config })) return null;
      if (edicion.fechas.some((f) => bloqueoAfectaTurno(bloqueos?.[f.fecha], f.turno))) return null;

      const libres = Math.min(
        ...edicion.fechas.map((f) =>
          plazasLibresParaReserva({
            reservas,
            grupos,
            config,
            reserva: { ...reserva, incluyeTorno: f.torno === true },
            fecha: f.fecha,
            turno: f.turno,
          })
        )
      );

      return libres >= plazas ? { ...edicion, libres } : null;
    })
    .filter(Boolean);
}

// Por qué un día no se puede elegir (o "" si está bien)
// `margenHoras` y `ventanaDias` se cambian para los bonos (cualquier fecha futura)
export function motivoFechaNoValida({
  fecha,
  turno,
  ahoraMs,
  bloqueos = {},
  margenHoras = MARGEN_NUEVA_CLASE_HORAS,
  config = null,
  ventanaDias = config?.diasVentanaReprogramar ?? DIAS_VENTANA,
}) {
  if (!esFechaISO(fecha)) return "La fecha no es válida.";

  const inicio = inicioClaseMs(fecha, turno);
  if (Number.isNaN(inicio) || inicio - ahoraMs < margenHoras * HORA) {
    return margenHoras > 0
      ? `La nueva clase debe empezar dentro de, al menos, ${margenHoras} horas.`
      : "La nueva clase debe ser en el futuro.";
  }

  if (inicio - ahoraMs > ventanaDias * DIA) {
    return `Solo se puede elegir una fecha de los próximos ${ventanaDias} días.`;
  }

  if (bloqueoAfectaTurno(bloqueos?.[fecha], turno)) return "Ese día no hay taller.";

  return "";
}

// Turnos que se pueden elegir en una fecha, sin mirar el aforo
export function turnosElegibles({ clase, fecha, fechasHabilitadas, reservasGrupos }) {
  const turnos = turnosDisponiblesEnFecha({ clase, fecha, fechasHabilitadas, reservasGrupos });
  return esTurnoConsulta(turnos) ? [] : turnos.map(limpiarTurno);
}

// Días y turnos a los que puede pasar la reserva: con hueco para todas sus plazas
export function opcionesDeCambio({
  reservas,
  grupos,
  config,
  reserva,
  clase,
  bloqueos,
  fechasHabilitadas,
  reservasGrupos,
  ahoraMs = ahoraMadridMs(),
  margenHoras = MARGEN_NUEVA_CLASE_HORAS,
  ventanaDias = config?.diasVentanaReprogramar ?? DIAS_VENTANA,
}) {
  const plazas = Number(reserva?.plazas || 1);
  const opciones = [];
  const [anio, mes, dia] = fechaDeMs(ahoraMs).split("-").map(Number);
  const hoy = Date.UTC(anio, mes - 1, dia);

  for (let i = 0; i <= ventanaDias; i += 1) {
    const fecha = fechaDeMs(hoy + i * DIA);
    const turnos = [];

    turnosElegibles({ clase, fecha, fechasHabilitadas, reservasGrupos }).forEach((turno) => {
      if (motivoFechaNoValida({ fecha, turno, ahoraMs, bloqueos, margenHoras, ventanaDias })) return;
      if (fecha === reserva.fecha && turno === limpiarTurno(reserva.turno)) return;

      const libres = plazasLibresParaReserva({ reservas, grupos, config, reserva, fecha, turno });
      if (libres >= plazas) turnos.push({ turno, libres });
    });

    if (turnos.length) opciones.push({ fecha, turnos });
  }

  return opciones;
}

// --- Reservas de grupo -------------------------------------------------------
// Los turnos de grupo son fijos (los mismos que ofrece ReservaGrupos.jsx). No hay
// aforo que comprobar: la fecha de un grupo se acuerda con el taller, así que el
// cambio se aplica y queda marcado para que Berto lo revise.
export const TURNOS_GRUPO = ["11:30-14:30", "17:30-20:30"];

export function evaluarCambioGrupo(grupo, ahoraMs = ahoraMadridMs(), config = CONFIG_ESPACIO_DEFECTO) {
  const estado = String(grupo?.estado || "").toLowerCase();

  if (grupo?.cancelada === true || estado.includes("cancelada")) {
    return { ok: false, motivo: "Esta reserva está cancelada." };
  }

  // Los grupos se pagan de una vez: hasta entonces la reserva no está confirmada
  if (estado !== "confirmada") {
    return { ok: false, motivo: "Esta reserva todavía no está confirmada y pagada." };
  }

  if (Number(grupo?.numCambiosCliente || 0) >= MAX_CAMBIOS_CLIENTE) {
    return {
      ok: false,
      motivo: "Ya cambiaste la fecha de esta reserva una vez. Si necesitas otro cambio, escríbenos.",
    };
  }

  const inicio = inicioClaseMs(grupo?.fecha, grupo?.turno);
  if (Number.isNaN(inicio)) {
    return { ok: false, motivo: "No se puede leer la fecha de la reserva. Escríbenos y la cambiamos." };
  }

  const horas = horasAntelacionDe(grupo, config);
  if (inicio - ahoraMs < horas * HORA) {
    return {
      ok: false,
      motivo: `Los cambios se piden con al menos ${horas} horas de antelación y a vuestra reserva le queda menos.`,
    };
  }

  return { ok: true, motivo: "" };
}

export function opcionesDeCambioGrupo({ grupo, bloqueos, config = null, ahoraMs = ahoraMadridMs() }) {
  const ventanaDias = config?.diasVentanaReprogramar ?? DIAS_VENTANA;
  const [anio, mes, dia] = fechaDeMs(ahoraMs).split("-").map(Number);
  const hoy = Date.UTC(anio, mes - 1, dia);
  const opciones = [];

  for (let i = 0; i <= ventanaDias; i += 1) {
    const fecha = fechaDeMs(hoy + i * DIA);
    const turnos = TURNOS_GRUPO.filter(
      (turno) =>
        !motivoFechaNoValida({ fecha, turno, ahoraMs, bloqueos, ventanaDias }) &&
        !(fecha === grupo.fecha && turno === grupo.turno)
    ).map((turno) => ({ turno, libres: null }));

    if (turnos.length) opciones.push({ fecha, turnos });
  }

  return opciones;
}
