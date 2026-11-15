import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get, update, push } from "firebase/database";
import { dbRealtime } from "./firebase";
import { contarPlazasTotalesPorDia } from "./utils/contarPlazasDia";
import BotonVolver from "./BotonVolver";
import DateInputReserva from "./components/DateInputReserva";

const actualizarContadorReservas = async (uid) => {
  try {
    const userRef = ref(dbRealtime, `usuarios/${uid}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const datos = snapshot.val();
      const nuevasReservas = (datos.reservas || 0) + 1;
      await update(userRef, { reservas: nuevasReservas });
    }
  } catch (error) {
    console.error("❌ Error al actualizar el contador de reservas:", error);
  }
};

export default function ReservaPintarCeramica() {
  const [fecha, setFecha] = useState("");
  const [turno, setTurno] = useState("");
  const [plazas, setPlazas] = useState(1);
  const [plazasOcupadas, setPlazasOcupadas] = useState(0);
  const [usuarioAutenticado, setUsuarioAutenticado] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const desdeTarjeta = location.state?.desdeTarjeta || false;
  const codigoTarjeta = location.state?.codigo || null;

  const maxPlazas = 33;
  const plazasDisponibles = Math.max(maxPlazas - plazasOcupadas, 0);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuarioAutenticado(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (fecha) {
      contarPlazasTotalesPorDia(fecha).then(setPlazasOcupadas);
    }
  }, [fecha]);
const plazasNum = Number(plazas) > 0 ? Number(plazas) : 1;
const PRECIO_UNITARIO = 25;                 // Pinta tu pieza de cerámica
const totalEuros = PRECIO_UNITARIO * plazasNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const plazasNum = parseInt(plazas, 10);

    if (!fecha || !turno || plazasNum <= 0) {
      alert("Por favor, completa todos los campos correctamente.");
      return;
    }

    if (plazasNum > plazasDisponibles) {
      alert("No hay suficientes plazas disponibles.");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("Debes iniciar sesión para hacer una reserva.");
      return;
    }

    const uid = user.uid;
   const reserva = {
  clase: "Pinta tu pieza de cerámica",
  claseId: "pintatupieza",
  fecha,
  turno,
  metodo: "general",
  plazas: plazasNum,
  desdeTarjeta,
  precio: totalEuros,
  precioTotal: totalEuros,
  estadoPago: "pendiente",
  orderId,
  tipoReserva: desdeTarjeta ? "tarjetaRegalo" : "normal",
  nombre: user.displayName || "",
  email: user.email || "",
  codigoTarjeta: codigoTarjeta || null,
  timestamp: new Date().toISOString(),
};

    try {
      const reservaRef = ref(dbRealtime, `reservas/Pinta tu pieza de cerámica/${fecha}/${turno}/general`);
      await push(reservaRef, { uid, ...reserva });

      const userHistorialRef = ref(dbRealtime, `usuarios/${uid}/listaReservas`);
      await push(userHistorialRef, reserva);

      await actualizarContadorReservas(uid);

      if (desdeTarjeta) {
        navigate("/generar-codigo", { state: reserva });
      } else {
        navigate("/resumen-pago", { state: reserva });
      }
    } catch (error) {
      console.error("❌ Error al guardar la reserva:", error);
      alert("Ocurrió un error al guardar tu reserva.");
    }
  };

  return (
    <div className="bg-crema min-h-screen flex items-center justify-center px-4 py-8">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6">
        <BotonVolver />

        <h1 className="text-center text-2xl text-tinta font-serif mb-4">
          Reserva – Pintar Cerámica
        </h1>

        {desdeTarjeta && (
          <p className="text-sm text-green-700 text-center font-medium mb-4">
            Estás usando una tarjeta regalo 🎁
          </p>
        )}

        {!usuarioAutenticado ? (
          <div className="text-center text-red-600 font-medium">
            🔒 Inicia sesión para poder reservar esta clase.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fecha" className="block font-bold text-sm mb-1">
                Selecciona el día:
              </label>
              <input
                type="date"
                id="fecha"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                min="2025-01-01"
                max="2025-12-31"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                required
              />
            </div>

            <div>
              <label htmlFor="turno" className="block font-bold text-sm mb-1">
                Selecciona el turno:
              </label>
              <select
                id="turno"
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                required
              >
                <option value="">-- Elige turno --</option>
                <option value="10:00-12:00">10:00 – 12:00</option>
                <option value="12:00-14:00">12:00 – 14:00</option>
                <option value="16:00-18:00">16:00 – 18:00</option>
                <option value="18:00-20:00">18:00 – 20:00</option>
              </select>
            </div>

            <div className="text-sm text-tinta-suave">
              Máximo {maxPlazas} plazas por día.
              <br />
              Quedan {plazasDisponibles} plazas disponibles para este día.
            </div>

            <div>
              <label htmlFor="plazas" className="block font-bold text-sm mb-1">
                ¿Cuántas plazas deseas reservar?
              </label>
              <input
                type="number"
                id="plazas"
                value={plazas}
                onChange={(e) => setPlazas(e.target.value)}
                min="1"
                max={plazasDisponibles || 1}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#f4a6b4] hover:bg-[#e78fa0] text-white font-bold text-lg py-3 rounded-full transition"
              disabled={!plazas || plazas > plazasDisponibles}
            >
              {desdeTarjeta ? "Confirmar reserva" : "Confirmar y pagar"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <img src="/img/logoPCsin.png" alt="La Purísima Conchi" className="w-20 mx-auto" />
        </div>
      </div>
    </div>
  );
}
