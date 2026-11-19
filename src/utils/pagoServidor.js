// src/utils/pagoServidor.js
// Pago con tarjeta: el servidor prepara el pedido con el importe calculado a partir
// de la ficha del taller (api/_pedidoServidor.js) y api/crear-sesion.js solo firma
// ese importe. El navegador no decide lo que se cobra.
import { llamar } from "./canjeServidor";

// Crea (o rehace) el pedido en el servidor y devuelve lo que se va a cobrar:
// { orderId, precioTotal, precioUnitario, plazas }.
// `pedido`: "reserva" | "bono" | "grupo" | "tarjeta_regalo"
export function prepararPago({ pedido, orderId, ...datos }) {
  return llamar({ tipo: "prepararPago", pedido, orderId, ...datos });
}

// Qué se está pagando, para que /pago/error explique lo que no se ha completado
// (sessionStorage sigue en la pestaña al volver del TPV)
export const CLAVE_PAGO_EN_CURSO = "tipoPagoEnCurso";

export function leerTipoPagoEnCurso() {
  try {
    const tipo = sessionStorage.getItem(CLAVE_PAGO_EN_CURSO) || "";
    sessionStorage.removeItem(CLAVE_PAGO_EN_CURSO);
    return tipo;
  } catch {
    return "";
  }
}

// Lleva al TPV de Redsys para pagar un pedido ya preparado
// `pedido`: el mismo tipo que prepararPago ("reserva" | "bono" | "grupo" | "tarjeta_regalo")
export function irAlTPV(orderId, pedido = "") {
  try {
    if (pedido) sessionStorage.setItem(CLAVE_PAGO_EN_CURSO, pedido);
  } catch {
    // Sin sessionStorage, la pantalla de error usa el texto general
  }
  const qs = new URLSearchParams({
    orderId: String(orderId),
    okUrl: new URL("/pago/exito", window.location.origin).toString(),
  });
  window.location.href = `/api/crear-sesion?${qs.toString()}`;
}
