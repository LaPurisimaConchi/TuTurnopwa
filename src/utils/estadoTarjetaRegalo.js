// Situación de una tarjeta regalo de cara al canje, para el listado y el detalle del panel
import { tarjetaCaducada } from "./configEspacio";

export const situacionDe = (t, hoy) => {
  const estado = String(t.estado).toLowerCase();
  if (t.cancelada) return "cancelada";
  if (["canjeado", "canjeada", "usada"].includes(estado)) return "canjeada";
  if (estado === "caducada" || tarjetaCaducada(t, hoy)) return "caducada";
  return String(t.estadoPago).toLowerCase() === "pagado" ? "disponible" : "sinPagar";
};
