// src/utils/configEspacio.js
// Configuración del espacio (nodo configuracionEspacio): aforo, tope de torno,
// mínimo de personas para una reserva de grupo y horarios por defecto.
// Sin React ni Firebase: la usan las pantallas y las funciones de Vercel.
import { iniciosDeTexto } from "./duracionTurno.js";

export const DIAS_CONFIG = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

export const CONFIG_ESPACIO_DEFECTO = {
  aforoTotal: 45,
  maxTorno: 12,
  minPersonasGrupo: 3,
  // Minutos que una reserva pendiente de pago guarda su plaza
  minutosReserva: 15,
  // Horas mínimas de antelación para reprogramar (las reservas no se cancelan)
  horasCambioReserva: 24,
  horasCambioBono: 3,
  // Hasta cuántos días por delante se puede elegir la nueva fecha al reprogramar una reserva
  diasVentanaReprogramar: 90,
  horariosDefecto: Object.fromEntries(DIAS_CONFIG.map((d) => [d, ""])),
  // Turnos de cada día que piden el mínimo de personas (subconjunto de horariosDefecto)
  horariosMinimoDefecto: Object.fromEntries(DIAS_CONFIG.map((d) => [d, ""])),
  // Meses de validez de una tarjeta regalo desde su compra (se guarda la fecha en cada tarjeta)
  mesesCaducidadTarjeta: 3,
  // WhatsApp del taller (9 cifras, sin prefijo): botón flotante, perfil, grupos…
  telefonoWhatsapp: "644671664",
  // Segundo WhatsApp, para recogida de piezas y envíos (/recoger-pieza)
  telefonoPiezas: "611804664",
};

// "+34 644 67 16 64" → "644671664"; "" si no es un móvil o fijo español de 9 cifras
export function normalizarTelefonoWhatsapp(valor) {
  let digitos = String(valor || "").replace(/\D/g, "");
  if (digitos.length === 11 && digitos.startsWith("34")) digitos = digitos.slice(2);
  if (digitos.length === 13 && digitos.startsWith("0034")) digitos = digitos.slice(4);
  return /^[6789]\d{8}$/.test(digitos) ? digitos : "";
}

// "644671664" → "644 671 664"
export const telefonoVisible = (numero) =>
  String(numero || "").replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3");

// Enlace de WhatsApp al taller, con mensaje opcional
export const enlaceWhatsapp = (numero, texto = "") =>
  `https://wa.me/34${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;

const entero = (valor, defecto, minimo = 1, maximo = 500) => {
  const n = Math.round(Number(valor));
  return Number.isFinite(n) && n >= minimo ? Math.min(n, maximo) : defecto;
};

// Datos guardados → configuración completa (con los valores por defecto)
export function normalizarConfigEspacio(raw) {
  const datos = raw && typeof raw === "object" ? raw : {};
  const horarios = datos.horariosDefecto && typeof datos.horariosDefecto === "object"
    ? datos.horariosDefecto
    : {};
  const minimos = datos.horariosMinimoDefecto && typeof datos.horariosMinimoDefecto === "object"
    ? datos.horariosMinimoDefecto
    : {};
  const aTexto = (valor) =>
    Array.isArray(valor)
      ? valor.join(", ")
      : valor && typeof valor === "object"
      ? Object.values(valor).join(", ")
      : String(valor || "");

  return {
    aforoTotal: entero(datos.aforoTotal, CONFIG_ESPACIO_DEFECTO.aforoTotal),
    maxTorno: entero(datos.maxTorno, CONFIG_ESPACIO_DEFECTO.maxTorno),
    minPersonasGrupo: entero(datos.minPersonasGrupo, CONFIG_ESPACIO_DEFECTO.minPersonasGrupo, 2, 45),
    minutosReserva: entero(datos.minutosReserva, CONFIG_ESPACIO_DEFECTO.minutosReserva, 1, 120),
    horasCambioReserva: entero(datos.horasCambioReserva, CONFIG_ESPACIO_DEFECTO.horasCambioReserva, 0, 720),
    diasVentanaReprogramar: entero(
      datos.diasVentanaReprogramar,
      CONFIG_ESPACIO_DEFECTO.diasVentanaReprogramar,
      1,
      730
    ),
    horasCambioBono: entero(datos.horasCambioBono, CONFIG_ESPACIO_DEFECTO.horasCambioBono, 0, 720),
    mesesCaducidadTarjeta: entero(
      datos.mesesCaducidadTarjeta,
      CONFIG_ESPACIO_DEFECTO.mesesCaducidadTarjeta,
      1,
      60
    ),
    telefonoWhatsapp:
      normalizarTelefonoWhatsapp(datos.telefonoWhatsapp) || CONFIG_ESPACIO_DEFECTO.telefonoWhatsapp,
    telefonoPiezas:
      normalizarTelefonoWhatsapp(datos.telefonoPiezas) || CONFIG_ESPACIO_DEFECTO.telefonoPiezas,
    // Los horarios por defecto solo llevan la hora de inicio («11:30, 17:30»): la de fin la
    // pone la duración de cada taller. Los guardados con rango («11:30-14:30») se leen así.
    horariosDefecto: Object.fromEntries(DIAS_CONFIG.map((dia) => [dia, iniciosDeTexto(aTexto(horarios[dia]))])),
    horariosMinimoDefecto: Object.fromEntries(DIAS_CONFIG.map((dia) => [dia, iniciosDeTexto(aTexto(minimos[dia]))])),
  };
}

// Último día de una tarjeta regalo: «YYYY-MM-DD» de la compra + N meses (si el mes
// destino es más corto, el último día de ese mes). "" si la fecha de compra no vale.
export function fechaCaducidadTarjeta(fechaCompra, meses) {
  const m = String(fechaCompra || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  const n = Math.round(Number(meses));
  if (!m || !Number.isFinite(n) || n < 1) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + n, 1));
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(Number(m[3]), ultimo));
  return d.toISOString().slice(0, 10);
}

// «12 meses» / «1 mes»
export const textoMeses = (meses) => `${meses} ${Number(meses) === 1 ? "mes" : "meses"}`;

// Una tarjeta sin fechaCaducidad (las de antes) no caduca
export const tarjetaCaducada = (tarjeta, hoyISO) =>
  !!tarjeta?.fechaCaducidad && String(hoyISO) > String(tarjeta.fechaCaducidad);
