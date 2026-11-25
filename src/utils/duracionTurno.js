// src/utils/duracionTurno.js
// Duración de las clases y turnos «inicio + duración». Sin React ni Firebase: lo usan el
// formulario del taller, «Espacio» y las funciones de Vercel (configEspacio.js).
//
// En el horario de un taller solo se escribe la hora de inicio («11:30»); la hora de fin
// sale de la duración del taller (`duracionMinutos`, 3 horas por defecto). Lo que se guarda
// en `clases/{id}/horarios` sigue siendo el rango de siempre («11:30-14:30»): es la clave de
// las reservas, del aforo y de los bloqueos, y así no cambia nada aguas abajo. Cambiar la
// duración de un taller solo afecta a los turnos que se guarden desde entonces: las reservas
// ya hechas conservan el suyo.

export const DURACION_POR_DEFECTO_MIN = 180;
export const DURACION_MIN = 15;
export const DURACION_MAX = 720;

const HORA = /^(\d{1,2}):(\d{2})$/;
const RANGO = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;
const MINUTOS_DIA = 24 * 60;

const dosCifras = (n) => String(n).padStart(2, "0");

// "17:30 a 20:30" / "17:30 - 20:30" → "17:30-20:30"
export const normalizarTurno = (turno) =>
  String(turno ?? "").replace(/\s+a\s+/gi, "-").replace(/\s+/g, "");

// Texto del formulario ("11:30, 17:30" o "11:30-14:30; …") → lista de turnos
export const leerTurnos = (texto = "") =>
  String(texto ?? "")
    .split(/[,;\n]/)
    .map((t) => normalizarTurno(t.trim()))
    .filter(Boolean);

export const esHora = (hora) => {
  const m = HORA.exec(String(hora ?? "").trim());
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
};

export const horaAMinutos = (hora) => {
  const m = HORA.exec(String(hora ?? "").trim());
  return m && esHora(hora) ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export const minutosAHora = (minutos) =>
  `${dosCifras(Math.floor(minutos / 60))}:${dosCifras(minutos % 60)}`;

// Duración válida en minutos (entero entre 15 min y 12 h), o 0
export const duracionValida = (valor) => {
  const n = Math.round(Number(valor));
  return Number.isFinite(n) && n >= DURACION_MIN && n <= DURACION_MAX ? n : 0;
};

// Horas escritas en el formulario ("3", "2,5") → minutos; 0 si no vale
export const minutosDesdeHoras = (horas) =>
  duracionValida(Number(String(horas ?? "").replace(",", ".")) * 60);

// Minutos → horas para el formulario: 180 → "3", 150 → "2.5"
export const horasDesdeMinutos = (minutos) => String(Math.round((minutos / 60) * 100) / 100);

// "11:30" + 180 → "14:30". "" si la hora no vale o la clase acabaría pasada la medianoche.
export function finDeTurno(inicio, duracionMin) {
  const desde = horaAMinutos(inicio);
  const duracion = duracionValida(duracionMin);
  if (desde === null || !duracion || desde + duracion >= MINUTOS_DIA) return "";
  return minutosAHora(desde + duracion);
}

// "11:30" + 180 → "11:30-14:30" (con las horas a dos cifras); "" si no vale
export function turnoDesdeInicio(inicio, duracionMin) {
  const fin = finDeTurno(inicio, duracionMin);
  return fin ? `${minutosAHora(horaAMinutos(inicio))}-${fin}` : "";
}

// "11:30-14:30" → "11:30"; "11:30" → "11:30"; lo que no tiene horas (a consultar) → ""
export function inicioDeTurno(turno) {
  const limpio = normalizarTurno(turno);
  const m = RANGO.exec(limpio);
  const inicio = m ? `${m[1]}:${m[2]}` : limpio;
  return esHora(inicio) ? minutosAHora(horaAMinutos(inicio)) : "";
}

// "11:30-14:30" → 180; null si no es un rango con horas
export function duracionDeTurno(turno) {
  const m = RANGO.exec(normalizarTurno(turno));
  if (!m) return null;
  const desde = Number(m[1]) * 60 + Number(m[2]);
  const hasta = Number(m[3]) * 60 + Number(m[4]);
  return hasta > desde ? hasta - desde : null;
}

const aMinutosInicio = (turno) => horaAMinutos(inicioDeTurno(turno)) ?? Number.MAX_SAFE_INTEGER;

// Texto de turnos (con rangos o solo inicios) → texto de solo inicios, sin repetidos y
// por orden de hora. Lo que no tiene horas («a consultar») se deja tal cual.
export function iniciosDeTexto(texto = "") {
  const inicios = leerTurnos(texto).map((t) => inicioDeTurno(t) || t);
  return [...new Set(inicios)].sort((a, b) => aMinutosInicio(a) - aMinutosInicio(b)).join(", ");
}

// Inicios escritos en el formulario → turnos con hora de fin, con la duración dada. Los que
// ya son un rango, o no tienen horas, se dejan como están (los demás los marca como no
// válidos `horasInvalidas`).
export const turnosDesdeInicios = (texto = "", duracionMin) =>
  leerTurnos(texto).map((t) => (HORA.test(t) ? turnoDesdeInicio(t, duracionMin) || t : t));

// ¿Este turno del formulario vale? Un inicio con su duración, un rango con horas o un
// turno «a consultar». Sin duración (los horarios por defecto de «Espacio») basta con que
// el inicio sea una hora.
export function turnoDeFormularioInvalido(turno, duracionMin) {
  if (/consultar/i.test(turno)) return false;
  if (RANGO.test(turno)) return duracionDeTurno(turno) === null;
  if (!duracionMin) return !esHora(turno);
  return !turnoDesdeInicio(turno, duracionMin);
}

// Todos los turnos del horario escrito (un texto por día) que no valen
export function horasInvalidas(horariosTexto = {}, duracionMin) {
  const invalidas = Object.values(horariosTexto || {})
    .flatMap((texto) => leerTurnos(texto))
    .filter((t) => turnoDeFormularioInvalido(t, duracionMin));
  return [...new Set(invalidas)];
}

// Duraciones distintas (en minutos) de los turnos de un horario guardado
export function duracionesDeHorarios(horarios) {
  const lista = Object.values(horarios && typeof horarios === "object" ? horarios : {}).flatMap((turnos) =>
    Array.isArray(turnos) ? turnos : turnos ? [turnos] : []
  );
  return [...new Set(lista.map(duracionDeTurno).filter((d) => d !== null))].sort((a, b) => a - b);
}

// Duración de un taller guardado: la de su ficha o, en los anteriores a este ajuste, la de
// sus turnos (si todos duran igual: el primero manda); 3 horas si no hay de dónde sacarla.
export function duracionDeFicha(clase) {
  const guardada = duracionValida(clase?.duracionMinutos);
  if (guardada) return guardada;
  return duracionesDeHorarios(clase?.horarios)[0] || DURACION_POR_DEFECTO_MIN;
}

// 180 → "3 horas", 150 → "2 horas y media", 90 → "1 hora y media", 45 → "45 minutos",
// 135 → "2 horas y 15 minutos"
export function textoDuracion(minutos) {
  const total = duracionValida(minutos);
  if (!total) return "";
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  const dehoras = horas === 1 ? "1 hora" : `${horas} horas`;
  if (!horas) return `${resto} minutos`;
  if (!resto) return dehoras;
  if (resto === 30) return `${dehoras} y media`;
  return `${dehoras} y ${resto} minutos`;
}

const comoLista = (valor) =>
  Array.isArray(valor) ? valor : valor && typeof valor === "object" ? Object.values(valor) : [];

// ¿Habla de la duración esta sección de la página escrita a mano («Duración», «Duración del
// taller», «Horario y duración»…)? Esas secciones no se tocan: pueden llevar más cosas que las
// horas, y mientras exista una, la ficha pública no repite la duración generada.
export const esSeccionDuracion = (seccion) => /duraci[oó]n/i.test(String(seccion?.titulo || ""));

// Texto de la duración para la ficha pública: «3 horas», «2 sesiones de 3 horas». En un
// monográfico, cada sesión lleva su turno: si todas duran igual se dice, si no solo cuántas son.
// "" si la ficha no tiene duración guardada (las anteriores se quedan con su texto de siempre).
export function resumenDuracion(clase = {}) {
  if (clase.tipoProducto === "bono") return "";
  const monografico = clase.monografico === true;
  const sesiones = Math.max(1, Math.round(Number(monografico ? clase.sesionesCurso : clase.sesiones)) || 1);

  let minutos = duracionValida(clase.duracionMinutos);
  if (monografico) {
    const duraciones = new Set(
      comoLista(clase.ediciones)
        .flatMap((edicion) => comoLista(edicion?.fechas))
        .map((f) => duracionDeTurno(f?.turno))
        .filter((d) => d !== null)
    );
    minutos = duraciones.size === 1 ? [...duraciones][0] : 0;
  } else if (!minutos) {
    return "";
  }

  const base = textoDuracion(minutos);
  if (!base) return sesiones > 1 ? `${sesiones} sesiones` : "";
  return sesiones > 1 ? `${sesiones} sesiones de ${base}` : base;
}
