import { getAuth } from "firebase/auth";

// Pide al servidor el correo de confirmación de una reserva confirmada sin pasar
// por Redsys (tarjeta regalo). Es un aviso: si falla no debe afectar a la reserva.
export async function pedirCorreoReserva(orderId) {
  try {
    const user = getAuth().currentUser;
    if (!user || !orderId) return;

    const token = await user.getIdToken();
    await fetch("/api/codigo-reserva", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tipo: "correo", orderId }),
    });
  } catch (error) {
    console.warn("No se pudo pedir el correo de confirmación:", error);
  }
}
