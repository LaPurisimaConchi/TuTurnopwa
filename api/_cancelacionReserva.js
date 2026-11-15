// api/_cancelacionReserva.js
// Lo que el servidor hace cuando el estudio cancela una reserva desde el panel:
// asegura su código, la deja recuperable durante MESES_RECUPERACION meses y, si se
// pide, avisa por correo al cliente con el motivo. La marca de «Cancelada» la pone
// el propio panel; esto añade lo que necesita el cliente para volver a reservar.
import { asegurarCodigo, formatearCodigo } from "./_codigosReserva.js";
import { enviarCorreoCancelacion } from "./_correoReserva.js";
import {
  MESES_RECUPERACION,
  ahoraMadridMs,
  fechaDeMs,
  sumarMesesISO,
} from "../src/utils/cambioFecha.js";

// reservas/{clase}/{fecha}/{turno}/{reservaId}  o  .../{turno}/{metodo}/{reservaId}
const RUTA_RESERVA = /^reservas\/[^/]+\/\d{4}-\d{2}-\d{2}\/[^/]+(\/[^/]+){1,2}$/;

export async function registrarCancelacion(db, { ruta, enviarCorreo, permitirReprogramar = true }) {
  if (!RUTA_RESERVA.test(String(ruta || ""))) {
    return { status: 400, ok: false, error: "Reserva no válida" };
  }

  const snap = await db.ref(ruta).get();
  if (!snap.exists()) return { status: 404, ok: false, error: "Reserva no encontrada" };

  const reserva = snap.val() || {};
  const cancelada =
    reserva.cancelada === true || String(reserva.estado || "").toLowerCase() === "cancelada";
  if (!cancelada) return { status: 409, ok: false, error: "La reserva no está cancelada" };

  const orderId = String(reserva.orderId || "");
  if (permitirReprogramar && !orderId) {
    return { status: 409, ok: false, error: "Esta reserva no tiene número de pedido" };
  }

  // Sin reprogramación: la reserva queda cancelada del todo y el código ya no la recupera
  let codigo = "";
  let hasta = "";
  let campos;
  if (permitirReprogramar) {
    codigo =
      reserva.codigoReserva ||
      (await asegurarCodigo(db, {
        clave: orderId,
        datos: { tipo: "individual", orderId, ruta, uid: reserva.uid || "" },
      }));
    hasta = sumarMesesISO(fechaDeMs(ahoraMadridMs()), MESES_RECUPERACION);
    campos = {
      codigoReserva: codigo,
      cancelacionEstudio: true,
      recuperada: false,
      recuperableHasta: hasta,
      avisoPerfil:
        "Hemos cancelado esta reserva. No pierdes tu plaza: puedes elegir una nueva fecha sin coste.",
    };
  } else {
    campos = {
      cancelacionEstudio: false,
      recuperada: false,
      recuperableHasta: null,
      avisoPerfil: "Tu reserva ha sido cancelada. Si lo necesitas, contacta con el taller.",
    };
  }

  const actualizaciones = {};
  Object.entries(campos).forEach(([campo, valor]) => {
    actualizaciones[`${ruta}/${campo}`] = valor;
  });

  // Copia de la reserva en el perfil de la persona
  if (reserva.uid && orderId) {
    const lista = await db.ref(`usuarios/${reserva.uid}/listaReservas`).get();
    lista.forEach((item) => {
      if (item.val()?.orderId === orderId) {
        Object.entries(campos).forEach(([campo, valor]) => {
          actualizaciones[`usuarios/${reserva.uid}/listaReservas/${item.key}/${campo}`] = valor;
        });
      }
    });
  }

  let correo = { estado: "no_solicitado", email: "" };
  if (enviarCorreo) {
    correo = await enviarCorreoCancelacion({
      reserva: { ...reserva, ...campos },
      orderId,
      motivo: String(reserva.motivoCancelacion || ""),
      codigo,
      hasta,
      conReprogramacion: permitirReprogramar,
    });
    if (correo.estado === "enviado") {
      actualizaciones[`${ruta}/correoCancelacionEnviadoEn`] = new Date().toISOString();
    }
  }

  await db.ref().update(actualizaciones);

  return {
    status: 200,
    ok: true,
    codigo: codigo ? formatearCodigo(codigo) : "",
    recuperableHasta: hasta,
    reprogramable: permitirReprogramar,
    correo: correo.estado,
    email: correo.email,
  };
}
