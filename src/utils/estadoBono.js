// src/utils/estadoBono.js
// Estado visible de un bono y campos de su primera sesión, sin SDK de Firebase:
// los usan el navegador (utils/bonos.js) y el servidor (api/_canjeServidor.js).

export const obtenerEstadoVisibleBono = (bono) => {
  if (!bono) return "—";

  const restantes = Number(bono.clasesRestantes || 0);
  const estadoGuardado = String(
    bono.estadoBono || bono.estado || ""
  ).toLowerCase();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let fechaCaducidad = null;
  if (bono.fechaCaducidadBono) {
    fechaCaducidad = new Date(`${bono.fechaCaducidadBono}T00:00:00`);
  }

  const estaCaducado =
    fechaCaducidad instanceof Date &&
    !isNaN(fechaCaducidad.getTime()) &&
    hoy > fechaCaducidad;

  if (estadoGuardado === "caducado" || estaCaducado) {
    return "Caducado";
  }

  if (
    estadoGuardado === "agotado" ||
    estadoGuardado === "completado" ||
    restantes <= 0
  ) {
    return "Agotado";
  }

  return "Activo";
};

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Carpetas de reservas de los bonos de siempre (como en UsarBono); los del panel usan
// el reservasPath de su ficha y, si no tienen, su id
export const CARPETA_BONO_ANTIGUO = {
  modelamano4clases: "ModelaAManoYDecoraTusPiezasFavoritas",
  tornodesdecero4clases: "TornoAlfareroEmpezarDesdeCero",
  tornodecoracion4clases: "TornoAlfareroYDecoracion",
  tornoperfeccionamiento6clases: "TornoAlfareroPerfeccionaLoQueYaSabes",
};

export const carpetaReservasBono = (claseId, ficha = null) =>
  String(ficha?.reservasPath || CARPETA_BONO_ANTIGUO[claseId] || claseId || "");

// Datos del bono al devolverle la clase de una sesión (la sesión se quita de la lista).
// null si esa sesión ya no está en el bono (nada que devolver).
export function bonoSinSesion(bono, claveSesion, actualizadoEn = new Date().toISOString()) {
  const sesiones = bono?.sesionesConsumidas && typeof bono.sesionesConsumidas === "object" ? bono.sesionesConsumidas : {};
  if (!sesiones[claveSesion]) return null;

  const { [claveSesion]: _quitada, ...resto } = sesiones;
  const restantes = Number(bono.clasesRestantes || 0) + 1;
  const estado = String(bono.estadoBono || "").toLowerCase();

  return {
    ...bono,
    clasesRestantes: restantes,
    clasesConsumidas: Math.max(Number(bono.clasesConsumidas || 0) - 1, 0),
    estadoBono: estado === "agotado" ? "activo" : bono.estadoBono || "activo",
    sesionesConsumidas: Object.keys(resto).length ? resto : null,
    actualizadoEn,
  };
}

// Días que dura un bono desde su primera clase si la ficha no dice otra cosa
export const DIAS_CADUCIDAD_BONO = 31;

// Días de validez de la ficha del taller (bono), entre 1 y 365
export function diasCaducidadBono(ficha) {
  const n = Math.round(Number(ficha?.diasCaducidad));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 365) : DIAS_CADUCIDAD_BONO;
}

// Último día en que se puede usar el bono: la fecha de inicio más esos días
export function fechaCaducidadBono(fechaInicio, dias = DIAS_CADUCIDAD_BONO) {
  if (!FECHA_ISO.test(String(fechaInicio || ""))) return "";
  const [anio, mes, dia] = fechaInicio.split("-").map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia + Number(dias))).toISOString().slice(0, 10);
}
const turnoLimpio = (turno) => String(turno || "").replaceAll(" a ", "-").replace(/\s+/g, "");

// Fechas en las que se pueden reservar clases de un bono: desde su inicio hasta su
// caducidad, ambos incluidos ("" si el bono no tiene esa fecha guardada)
export function rangoFechasBono(bono) {
  const desde = String(bono?.fechaInicio || "");
  const hasta = String(bono?.fechaCaducidadBono || bono?.fechaFinMes || "");
  return { desde: FECHA_ISO.test(desde) ? desde : "", hasta: FECHA_ISO.test(hasta) ? hasta : "" };
}

// Por qué una fecha no vale para un bono ("" si vale)
export function motivoFechaFueraDeBono(bono, fecha) {
  const { desde, hasta } = rangoFechasBono(bono);
  if (desde && fecha < desde) return "Tu bono empieza el " + desde.split("-").reverse().join("-") + ". Elige una fecha a partir de ese día.";
  if (hasta && fecha > hasta) return "Tu bono caduca el " + hasta.split("-").reverse().join("-") + ". Elige una fecha anterior.";
  return "";
}

// ¿Esa persona ya tiene una clase de bono ese día y en ese turno? `bonos` es el nodo
// usuarios/{uid}/bonos; `exceptoReservaId` deja fuera la sesión que se está moviendo
export function sesionBonoRepetida(bonos, fecha, turno, { exceptoReservaId = "" } = {}) {
  const buscado = turnoLimpio(turno);
  return Object.values(bonos && typeof bonos === "object" ? bonos : {}).some((bono) =>
    Object.values(bono?.sesionesConsumidas && typeof bono.sesionesConsumidas === "object" ? bono.sesionesConsumidas : {}).some(
      (s) =>
        s &&
        String(s.fecha || "") === fecha &&
        turnoLimpio(s.turno) === buscado &&
        (!exceptoReservaId || String(s.reservaId || "") !== exceptoReservaId)
    )
  );
}

// Campos del bono cuando su primera sesión se reserva con la compra: cuenta como
// una clase usada (igual que al reservar las demás con el bono, api/_canjeServidor.js)
export const datosPrimeraSesionBono = ({
  numeroClases,
  fecha,
  turno,
  taller,
  clase = "",
  reservaId = "",
  timestamp = new Date().toISOString(),
  clave = "primeraSesion",
}) => {
  const restantes = Math.max(Number(numeroClases || 0) - 1, 0);

  return {
    clasesConsumidas: 1,
    clasesRestantes: restantes,
    estadoBono: restantes === 0 ? "agotado" : "activo",
    ultimaSesionReservada: fecha,
    sesionesConsumidas: {
      [clave]: {
        fecha,
        turno,
        taller,
        clase: clase || taller,
        reservaId,
        timestamp,
        primeraSesion: true,
      },
    },
  };
};
