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

// Lleva al TPV de Redsys para pagar un pedido ya preparado
export function irAlTPV(orderId) {
  const qs = new URLSearchParams({
    orderId: String(orderId),
    okUrl: new URL("/pago/exito", window.location.origin).toString(),
  });
  window.location.href = `/api/crear-sesion?${qs.toString()}`;
}
