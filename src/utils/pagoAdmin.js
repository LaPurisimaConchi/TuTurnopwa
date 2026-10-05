import { getAuth } from "firebase/auth";
import { esAdministrador } from "./administradores";

export async function simularPagoAdmin(orderId) {
  const user = getAuth().currentUser;
  if (!esAdministrador(user)) return false;

  const token = await user.getIdToken();
  const response = await fetch("/api/pago-admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderId }),
  });

  if (!response.ok) {
    const detalle = await response.text();
    throw new Error(detalle || `No se pudo simular el pago (${response.status}).`);
  }

  return true;
}
