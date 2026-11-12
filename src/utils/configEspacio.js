// src/utils/configEspacio.js
// Configuración del espacio (nodo configuracionEspacio): aforo, tope de torno,
// mínimo de personas para una reserva de grupo y horarios por defecto.
// Sin React ni Firebase: la usan las pantallas y las funciones de Vercel.

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
  horariosDefecto: Object.fromEntries(DIAS_CONFIG.map((d) => [d, ""])),
};

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

  return {
    aforoTotal: entero(datos.aforoTotal, CONFIG_ESPACIO_DEFECTO.aforoTotal),
    maxTorno: entero(datos.maxTorno, CONFIG_ESPACIO_DEFECTO.maxTorno),
    minPersonasGrupo: entero(datos.minPersonasGrupo, CONFIG_ESPACIO_DEFECTO.minPersonasGrupo, 2, 45),
    minutosReserva: entero(datos.minutosReserva, CONFIG_ESPACIO_DEFECTO.minutosReserva, 1, 120),
    horariosDefecto: Object.fromEntries(
      DIAS_CONFIG.map((dia) => {
        const valor = horarios[dia];
        const texto = Array.isArray(valor)
          ? valor.join(", ")
          : valor && typeof valor === "object"
          ? Object.values(valor).join(", ")
          : String(valor || "");
        return [dia, texto];
      })
    ),
  };
}
