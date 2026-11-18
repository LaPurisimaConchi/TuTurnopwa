// api/_bonoSesionServidor.js
// Cancelar o reprogramar desde el perfil una sesión ya reservada con un bono (no cuenta
// como función de Vercel: empieza por _). Lo llama api/codigo-reserva.js con
// tipo "gestionarSesionBono". El plazo es `horasCambioBono` de configuracionEspacio.
// Acciones: "opciones" (días y turnos a los que se puede mover, con el mismo cálculo que
// api/cambiar-fecha.js; alimenta la pantalla común /reprogramar), "reprogramar" y "cancelar".
//
// Cancelar: la reserva queda «Cancelada» y la clase vuelve al bono.
// Reprogramar: se crea la reserva en la nueva franja (con la comprobación de aforo de
// siempre) y, si cabe, se borra la anterior; la clase del bono sigue gastada.
import { escribirConAforo, fallo } from "./_reservarServidor.js";
import { CARPETA_BONO_ANTIGUO } from "./_canjeServidor.js";
import { normalizarConfigEspacio } from "../src/utils/configEspacio.js";
import {
  ahoraMadridMs,
  horasAntelacionDe,
  inicioClaseMs,
  motivoFechaNoValida,
  opcionesDeCambio,
  turnosElegibles,
} from "../src/utils/cambioFecha.js";
import { limpiarTurno } from "../src/utils/turnosFecha.js";
import { esReservaValida } from "../src/utils/plazasOcupadas.js";
import { motivoFechaFueraDeBono, rangoFechasBono, sesionBonoRepetida } from "../src/utils/estadoBono.js";

const ID = /^[A-Za-z0-9_-]{1,60}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const TURNO = /^[^./$#[\]]{1,60}$/;
const HORA = 3_600_000;
const DIA = 24 * HORA;

// Con un bono se puede elegir cualquier fecha futura mientras el bono no caduque (sin el
// margen de 24 h ni la ventana de 90 días de las reservas normales). Sin caducidad, un año.
// La ventana solo acota el recorrido: el inicio y la caducidad exactos del bono los
// comprueba motivoFechaFueraDeBono (los mismos que al reservar con UsarBono).
function reglasDeFecha(bono, ahoraMs) {
  const caduca = /^\d{4}-\d{2}-\d{2}$/.test(String(bono?.fechaCaducidadBono || ""))
    ? inicioClaseMs(bono.fechaCaducidadBono, "23:59")
    : NaN;
  const dias = Number.isNaN(caduca) ? 365 : Math.ceil((caduca - ahoraMs) / DIA);
  return { margenHoras: 0, ventanaDias: Math.min(Math.max(dias, 0), 730) };
}

const sinControl = (texto) => [...texto].every((c) => c.charCodeAt(0) >= 32);

// Lo que necesitan las reglas de cambio de fecha (src/utils/cambioFecha.js) del taller
async function contextoDeLaClase(db, claseSnap, carpeta) {
  const [bloqueos, habilitadas, grupos, reservas] = await Promise.all([
    db.ref("bloqueosFechas").get(),
    db.ref("fechasHabilitadas").get(),
    db.ref("reservasGrupos").get(),
    db.ref("reservas").get(),
  ]);
  return {
    carpeta,
    clase: claseSnap?.exists() ? claseSnap.val() : null,
    bloqueos: bloqueos.val() || {},
    fechasHabilitadas: habilitadas.val() || {},
    reservasGrupos: grupos.val() || {},
    grupos,
    reservas,
  };
}

export async function gestionarSesionBono(db, uid, { accion, bonoId, reservaId, fecha, turno } = {}) {
  bonoId = String(bonoId || "");
  reservaId = String(reservaId || "");
  if (!["opciones", "cancelar", "reprogramar"].includes(accion)) return fallo(400, "Acción no válida");
  if (!ID.test(bonoId) || !ID.test(reservaId)) return fallo(400, "Sesión no válida");

  const bonoRef = db.ref(`usuarios/${uid}/bonos/${bonoId}`);
  const bonoSnap = await bonoRef.get();
  if (!bonoSnap.exists()) return fallo(404, "No se ha encontrado el bono.");
  const bono = bonoSnap.val();

  // La sesión del bono que apunta a esta reserva
  const sesiones = bono.sesionesConsumidas && typeof bono.sesionesConsumidas === "object" ? bono.sesionesConsumidas : {};
  const claveSesion = Object.keys(sesiones).find((k) => String(sesiones[k]?.reservaId || "") === reservaId);
  if (!claveSesion) return fallo(404, "No se ha encontrado esa sesión en tu bono.");
  const sesion = sesiones[claveSesion];

  const claseId = String(bono.claseId || "");
  const [claseSnap, espacioSnap] = await Promise.all([
    ID.test(claseId) ? db.ref(`clases/${claseId}`).get() : Promise.resolve(null),
    db.ref("configuracionEspacio").get(),
  ]);
  const carpeta = String(
    (claseSnap?.exists() ? claseSnap.val()?.reservasPath : "") || CARPETA_BONO_ANTIGUO[claseId] || claseId
  );
  if (!ID.test(carpeta)) return fallo(400, "Taller no válido");

  const rutaActual = `reservas/${carpeta}/${sesion.fecha}/${sesion.turno}/${reservaId}`;
  const reservaSnap = await db.ref(rutaActual).get();
  if (!reservaSnap.exists()) return fallo(404, "No se ha encontrado la reserva de esa sesión.");
  const reserva = reservaSnap.val();

  if (reserva.uid !== uid || !reserva.desdeBono) return fallo(403, "Esta reserva no es tuya.");
  if (!esReservaValida(reserva)) return fallo(409, "Esta reserva no está confirmada.");

  // Plazo de antelación
  const config = normalizarConfigEspacio(espacioSnap.exists() ? espacioSnap.val() : null);
  const horas = horasAntelacionDe(reserva, config);
  const ahoraMs = ahoraMadridMs();
  const inicio = inicioClaseMs(sesion.fecha, sesion.turno);
  const fueraDePlazo = Number.isNaN(inicio) || inicio - ahoraMs < horas * HORA;
  const yaReprogramada = Number(reserva.numCambiosCliente || 0) >= 1;

  // Datos de la sesión actual y si se puede cambiar (para la pantalla común /reprogramar)
  if (accion === "opciones") {
    const { desde: validoDesde, hasta: validoHasta } = rangoFechasBono(bono);
    const resumen = {
      tipo: "bono",
      clase: String(reserva.clase || bono.clase || ""),
      fecha: sesion.fecha,
      turno: limpiarTurno(sesion.turno),
      plazas: 1,
      validoDesde,
      validoHasta,
      antelacionHoras: horas,
      cambiosRestantes: yaReprogramada ? 0 : 1,
      puedeCambiar: !fueraDePlazo && !yaReprogramada,
      motivo: fueraDePlazo
        ? `Los cambios se piden con al menos ${horas} horas de antelación y a tu clase le queda menos.`
        : yaReprogramada
        ? "Ya reprogramaste esta sesión una vez. Si necesitas otro cambio, escríbenos."
        : "",
    };
    if (!resumen.puedeCambiar) return { ok: true, status: 200, reserva: resumen, opciones: [] };

    const contexto = await contextoDeLaClase(db, claseSnap, carpeta);
    if (!contexto.clase) {
      return { ok: true, status: 200, reserva: { ...resumen, puedeCambiar: false, motivo: "Este taller no se puede reprogramar online. Escríbenos." }, opciones: [] };
    }
    return {
      ok: true,
      status: 200,
      reserva: resumen,
      opciones: opcionesDeCambio({
        ...contexto,
        config,
        reserva: { ...reserva, plazas: 1 },
        ahoraMs,
        ...reglasDeFecha(bono, ahoraMs),
      }).filter((o) => !motivoFechaFueraDeBono(bono, o.fecha)),
    };
  }

  if (fueraDePlazo) {
    return fallo(409, `Solo se puede ${accion} con al menos ${horas} horas de antelación y a esta clase le queda menos.`, {
      codigo: "fuera_de_plazo",
    });
  }

  const ahora = new Date();
  const timestamp = ahora.toISOString();

  // --- Cancelar ---------------------------------------------------------------
  if (accion === "cancelar") {
    // La clase vuelve al bono (una vez: la sesión se retira de la lista en la misma transacción)
    const { committed } = await bonoRef.transaction((actual) => {
      if (actual === null) return actual; // primera pasada sin datos: Firebase repite con el valor real
      if (!actual?.sesionesConsumidas?.[claveSesion]) return;
      const { [claveSesion]: _quitada, ...resto } = actual.sesionesConsumidas;
      const restantes = Number(actual.clasesRestantes || 0) + 1;
      return {
        ...actual,
        clasesConsumidas: Math.max(Number(actual.clasesConsumidas || 0) - 1, 0),
        clasesRestantes: restantes,
        estadoBono: "activo",
        sesionesConsumidas: Object.keys(resto).length ? resto : null,
        actualizadoEn: timestamp,
      };
    });
    if (!committed) return fallo(409, "Esta sesión ya estaba cancelada.");

    const datos = {
      estado: "Cancelada",
      cancelada: true,
      canceladaPor: "cliente",
      canceladaEn: ahora.toLocaleString("es-ES", { timeZone: "Europe/Madrid" }),
      actualizadoEn: timestamp,
    };
    const cambios = { [`${rutaActual}/estado`]: datos.estado };
    Object.entries(datos).forEach(([k, v]) => {
      cambios[`${rutaActual}/${k}`] = v;
    });
    const lista = await db.ref(`usuarios/${uid}/listaReservas`).get();
    lista.forEach((item) => {
      if (item.val()?.reservaId === reservaId) {
        Object.entries(datos).forEach(([k, v]) => {
          cambios[`usuarios/${uid}/listaReservas/${item.key}/${k}`] = v;
        });
      }
    });
    await db.ref().update(cambios);

    return { ok: true, status: 200 };
  }

  // --- Reprogramar ------------------------------------------------------------
  fecha = String(fecha || "");
  turno = String(turno || "").replaceAll(" a ", "-").trim();
  if (!FECHA.test(fecha)) return fallo(400, "Fecha no válida");
  if (!TURNO.test(turno) || !sinControl(turno)) return fallo(400, "Turno no válido");
  if (fecha === sesion.fecha && turno === sesion.turno) return fallo(400, "Elige otra fecha u otro turno.");
  // Una sola reprogramación por sesión, como en el cambio de fecha de las reservas
  if (yaReprogramada) {
    return fallo(409, "Ya reprogramaste esta sesión una vez. Si necesitas otro cambio, escríbenos.", {
      codigo: "ya_reprogramada",
    });
  }

  // Mismas reglas que el cambio de fecha: margen, ventana, bloqueos y turnos del día
  const contexto = await contextoDeLaClase(db, claseSnap, carpeta);
  if (!contexto.clase) return fallo(409, "Este taller no se puede reprogramar online. Escríbenos.");
  const motivo = motivoFechaNoValida({
    fecha,
    turno,
    ahoraMs,
    bloqueos: contexto.bloqueos,
    ...reglasDeFecha(bono, ahoraMs),
  });
  if (motivo) return fallo(409, motivo, { codigo: "fecha_no_valida" });
  const fueraDeBono = motivoFechaFueraDeBono(bono, fecha);
  if (fueraDeBono) return fallo(409, fueraDeBono, { codigo: "fuera_de_bono" });
  const bonosSnap = await db.ref(`usuarios/${uid}/bonos`).get();
  if (sesionBonoRepetida(bonosSnap.val(), fecha, turno, { exceptoReservaId: reservaId })) {
    return fallo(409, "Ya tienes una clase reservada ese día en ese turno.", { codigo: "repetida" });
  }
  if (!turnosElegibles({ clase: contexto.clase, fecha, fechasHabilitadas: contexto.fechasHabilitadas, reservasGrupos: contexto.reservasGrupos }).includes(turno)) {
    return fallo(409, "Ese turno no está disponible ese día.", { codigo: "bloqueado" });
  }

  const carpetaNueva = `reservas/${carpeta}/${fecha}/${turno}`;
  const nuevaClave = db.ref(carpetaNueva).push().key;
  const nuevaRuta = `${carpetaNueva}/${nuevaClave}`;
  const nueva = {
    ...reserva,
    fecha,
    turno,
    reprogramada: true,
    fechaOriginal: reserva.fechaOriginal || sesion.fecha,
    turnoOriginal: reserva.turnoOriginal || sesion.turno,
    numCambiosCliente: Number(reserva.numCambiosCliente || 0) + 1,
    reprogramadaEn: timestamp,
    actualizadoEn: timestamp,
  };

  // La reserva antigua se borra solo si la nueva franja admite la plaza
  const resultado = await escribirConAforo(
    db,
    [{ fecha, turno, torno: reserva.incluyeTorno === true, ruta: nuevaRuta, clave: nuevaClave, datos: nueva }],
    config,
    ahora.getTime(),
    { [rutaActual]: null }
  );
  if (!resultado.ok) return resultado;

  const cambios = {
    [`usuarios/${uid}/bonos/${bonoId}/sesionesConsumidas/${claveSesion}/fecha`]: fecha,
    [`usuarios/${uid}/bonos/${bonoId}/sesionesConsumidas/${claveSesion}/turno`]: turno,
    [`usuarios/${uid}/bonos/${bonoId}/sesionesConsumidas/${claveSesion}/reservaId`]: nuevaClave,
  };
  const lista = await db.ref(`usuarios/${uid}/listaReservas`).get();
  lista.forEach((item) => {
    if (item.val()?.reservaId === reservaId) {
      const base = `usuarios/${uid}/listaReservas/${item.key}`;
      cambios[`${base}/fecha`] = fecha;
      cambios[`${base}/turno`] = turno;
      cambios[`${base}/reservaId`] = nuevaClave;
      cambios[`${base}/reprogramada`] = true;
      cambios[`${base}/fechaOriginal`] = nueva.fechaOriginal;
      cambios[`${base}/numCambiosCliente`] = nueva.numCambiosCliente;
    }
  });
  await db.ref().update(cambios);

  return { ok: true, status: 200, reservaId: nuevaClave };
}
