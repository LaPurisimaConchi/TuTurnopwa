import React from "react";
import { hoyMadrid } from "../utils/formatoFecha";
import { situacionDe } from "../utils/estadoTarjetaRegalo";

const ETIQUETAS_ESTADO = {
  disponible: { texto: "Disponible", color: "bg-green-100 text-green-800" },
  canjeada: { texto: "Canjeada", color: "bg-gray-100 text-gray-600" },
  caducada: { texto: "Caducada", color: "bg-amber-100 text-amber-800" },
  cancelada: { texto: "Cancelada", color: "bg-red-100 text-red-800" },
  sinPagar: { texto: "Sin canjear", color: "bg-gray-100 text-gray-600" },
};

const Etiqueta = ({ color, children }) => (
  <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
    {children}
  </span>
);

export const EtiquetaEstadoTarjeta = ({ tarjeta }) => {
  const { texto, color } = ETIQUETAS_ESTADO[situacionDe(tarjeta, hoyMadrid())];
  return <Etiqueta color={color}>{texto}</Etiqueta>;
};

// El pago solo se destaca cuando hay algo que revisar
export const AvisoPagoTarjeta = ({ tarjeta }) => {
  const pago = String(tarjeta.estadoPago).toLowerCase();
  if (pago === "pagado") return null;
  const color = pago === "pendiente" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  return <Etiqueta color={color}>Pago: {tarjeta.estadoPago}</Etiqueta>;
};
