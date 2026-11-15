import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, push, get, update, set, child } from "firebase/database";
import { dbRealtime } from "./firebase";
import DatePicker, { registerLocale } from "react-datepicker";
import es from "date-fns/locale/es";
import "react-datepicker/dist/react-datepicker.css";
import BotonVolver from "./BotonVolver";
import DateInputReserva from "./components/DateInputReserva";

registerLocale("es", es);

// ... (importaciones idénticas a las que ya tenías)

export default function ReservaTheClub() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [fecha, setFecha] = useState(null);
  const [turno, setTurno] = useState("");
  const [plazas, setPlazas] = useState(1);
  const [plazasOcupadas, setPlazasOcupadas] = useState({});
  const maxPlazas = 30;
  const precio = 25;

  const diasPermitidos = [2, 3, 4, 5]; // martes a viernes

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (fecha && turno) {
      const fechaStr = fecha.toISOString().split("T")[0];
      const ruta = `reservas/TheClub/${fechaStr}/${turno}`;
      get(ref(dbRealtime, ruta)).then((snapshot) => {
        let ocupadas = 0;
        snapshot.forEach((res) => {
          ocupadas += res.val().plazas || 0;
        });
        setPlazasOcupadas((prev) => ({ ...prev, [turno]: ocupadas }));
      });
    }
  }, [fecha, turno]);

  const isDiaPermitido = (date) => {
    const dia = date.getDay();
    return diasPermitidos.includes(dia);
  };

  const handleReserva = async (e) => {
    e.preventDefault();
    if (!user || !fecha || !turno || plazas < 1) return;

    const fechaFormateada = fecha.toISOString().split("T")[0];
    const totalOcupadas = plazasOcupadas[turno] || 0;

    if (totalOcupadas + plazas > maxPlazas) {
      alert("No hay suficientes plazas disponibles para ese turno.");
      return;
    }

    const userRef = ref(dbRealtime, `usuarios/${user.uid}`);
    const snapshot = await get(userRef);
    const nombreUsuario =
      snapshot.exists() && snapshot.val().nombre
        ? snapshot.val().nombre
        : user.displayName || "Sin nombre";

        const orderId = Date.now().toString().slice(-12);
    const reserva = {
  uid: user.uid,
  email: user.email || "",
  nombre: nombreUsuario,
  clase: "Pinta tu pieza - The Club",
  claseId: "pintatupieza_theclub",
  ubicacion: "The Club",
  fecha: fechaFormateada,
  turno,
  metodo: "general",
  plazas,
  desdeTarjeta: false,
  precio,
  precioTotal: precio,
  estadoPago: "pendiente",
  orderId,
  tipoReserva: "normal",
  timestamp: new Date().toISOString(),
};

    try {
      const rutaReserva = ref(dbRealtime, `reservas/TheClub/${fechaFormateada}/${turno}`);
      const rutaListaReservas = ref(dbRealtime, `usuarios/${user.uid}/listaReservas`);

      await push(rutaReserva, reserva);
      await push(rutaListaReservas, reserva);

      if (snapshot.exists()) {
        const actuales = snapshot.val().reservas || 0;
        await update(userRef, { reservas: actuales + 1 });
      }

      navigate("/resumenpagotheclub", {
        state: {
          ...reserva,
          desdeTheClub: true
        }
      });
    } catch (error) {
      alert("Hubo un error al procesar la reserva");
      console.error(error);
    }
  };

  return (
    <div className="p-6 bg-crema min-h-screen font-sans text-tinta">
      <BotonVolver />

      <h1 className="text-2xl font-bold text-center mb-2">
        Pinta tu pieza - The Club
      </h1>
      <p className="text-center text-lg mb-6 text-tinta">
        Horarios: martes a viernes (17:00 - 19:00 y 19:00 - 21:00)
      </p>

      <div className="max-w-md mx-auto bg-white shadow-md rounded-xl p-4 space-y-4">
        <form onSubmit={handleReserva} className="space-y-4">
          <div>
            <span className="text-tinta font-medium block mb-1">Elige la fecha:</span>
            <DatePicker
              selected={fecha}
              onChange={(date) => {
                setFecha(date);
                setTurno("");
              }}
              filterDate={isDiaPermitido}
              placeholderText="Selecciona una fecha"
              dateFormat="dd/MM/yyyy"
              className="p-2 border rounded w-full"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              locale="es"
              required
            />
          </div>

          <div>
            <span className="text-tinta font-medium block mb-1">Elige el turno:</span>
            <select
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
              className="block w-full rounded border border-gray-300 p-2"
              required
            >
              <option value="">-- Selecciona turno --</option>
              <option value="17:00-19:00">17:00 – 19:00</option>
              <option value="19:00-21:00">19:00 – 21:00</option>
            </select>
          </div>

          <div>
            <span className="text-tinta font-medium block mb-1">Número de plazas:</span>
            <input
              type="number"
              value={plazas}
              onChange={(e) => setPlazas(Number(e.target.value))}
              min="1"
              max={maxPlazas - (plazasOcupadas[turno] || 0)}
              className="block w-full rounded border border-gray-300 p-2"
              required
            />
          </div>

          <div className="text-center pt-2">
            <button
              type="submit"
              className="bg-[#f4a6b4] hover:bg-[#e78fa0] text-white font-bold py-2 px-6 rounded-full"
            >
              Confirmar y pagar {precio * plazas} €
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
