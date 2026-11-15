// ReservaTornoIntensivoRegalo.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { ref, get, update, push } from "firebase/database";
import { dbRealtime } from "./firebase";
import { contarPlazasPorMetodo } from "./utils/contarPlazasDia";
import BotonVolver from "./BotonVolver";
import DateInputReserva from "./components/DateInputReserva";

export default function ReservaTornoIntensivoRegalo() {
  const [fecha, setFecha] = useState("");
  const [turno, setTurno] = useState("");
  const [metodo, setMetodo] = useState("torno");
  const [ocupadasTorno, setOcupadasTorno] = useState(0);
  const [ocupadasModelado, setOcupadasModelado] = useState(0);
  const [usuarioLogueado, setUsuarioLogueado] = useState(false);
  const [codigoTarjeta, setCodigoTarjeta] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const maxTorno = 12;
  const maxModelado = 33;

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUsuarioLogueado(!!user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (fecha) {
      contarPlazasPorMetodo(fecha, turno).then(({ torno, modelado }) => {
        setOcupadasTorno(torno);
        setOcupadasModelado(modelado);
      });
    }
  }, [fecha, turno]);

  useEffect(() => {
    if (location.state?.codigo) {
      setCodigoTarjeta(location.state.codigo);
    }
  }, [location.state]);

  const plazasDisponibles = Math.max(maxTorno - ocupadasTorno, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fecha || !turno || !metodo || !codigoTarjeta) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const reserva = {
  clase: "Torno intensivo individual",
  claseId: "tornointensivoindividual",
  fecha,
  turno,
  metodo,
  precio: 0,
  plazas: 1,
  timestamp: new Date().toISOString(),
  tipoReserva: "regalo",
  codigoUsado: codigoTarjeta
};

    try {
      const refGeneral = ref(dbRealtime, `reservas/TornoIntensivoRegalo/${fecha}/${turno}/${metodo}`);
      await push(refGeneral, { uid: user.uid, ...reserva });

      const historialRef = ref(dbRealtime, `usuarios/${user.uid}/listaReservas`);
      await push(historialRef, reserva);

      navigate("/perfil");
    } catch (error) {
      console.error("Error al guardar la reserva:", error);
      alert("Ocurrió un error al guardar tu reserva.");
    }
  };

  return (
    <div className="bg-crema min-h-screen flex items-center justify-center px-4 py-8">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6">
        <BotonVolver volverA="/perfil" />


        <h1 className="text-center text-2xl text-tinta font-serif mb-4">
          Reserva – Torno intensivo individual (Tarjeta regalo)
        </h1>

        {!usuarioLogueado ? (
          <div className="text-center bg-orange-100 text-terracota-oscuro p-4 rounded-xl font-semibold text-base">
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
                <option value="10:00-15:00">10:00 – 15:00</option>
                <option value="16:00-21:00">16:00 – 21:00</option>
              </select>
            </div>

            <div>
              <label htmlFor="metodo" className="block font-bold text-sm mb-1">
                Método:
              </label>
              <select
                id="metodo"
                value={metodo}
                onChange={(e) => setMetodo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                required
              >
                <option value="">-- Selecciona --</option>
                <option value="torno">Torno</option>
              </select>
            </div>

            <div className="text-sm text-tinta-suave">
              Quedan {plazasDisponibles} plazas disponibles para torno.
            </div>

            <button
              type="submit"
              className="w-full bg-[#f4a6b4] hover:bg-[#e78fa0] text-white font-bold text-lg py-3 rounded-full transition"
              disabled={plazasDisponibles < 1}
            >
              Confirmar reserva con tarjeta regalo
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
