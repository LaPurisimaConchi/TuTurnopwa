
import { useNavigate } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import es from "date-fns/locale/es";
import "react-datepicker/dist/react-datepicker.css";
import BotonVolver from "./BotonVolver";
import DateInputReserva from "./components/DateInputReserva";

registerLocale("es", es);

export default function ReservaClasesOnline() {
  const navigate = useNavigate();
  const [fecha, setFecha] = useState(null);
  const [turno, setTurno] = useState("");
  const [plazas, setPlazas] = useState(1);

  const precioUnitario = 25;
  const turnosDisponibles = ["10:00 - 12:00", "18:00 - 20:00"];

  const handleContinuar = () => {
    if (!fecha || !turno || plazas < 1) return;
    const fechaStr = fecha.toISOString().split("T")[0];

    const totalEuros = precioUnitario * Number(plazas); 

    navigate("/resumenpago", {
      state: {
        clase: "Clases Online (en directo)",
        fecha: fechaStr,
        turno,
        plazas,
        precioUnitario,
        precio: totalEuros,
        ubicacion: "Online – La Purísima Conchi",
      },
    });
  };

  return (
    <div className="p-6 bg-crema min-h-screen font-sans text-tinta">
      <div className="max-w-md mx-auto bg-white shadow-md rounded-xl p-5">
        <BotonVolver />
        <h1 className="text-2xl font-bold text-center mb-2">Reserva – Clases Online</h1>
        <p className="text-center text-tinta mb-5">
          Sesiones en directo impartidas por <strong>La Purísima Conchi</strong>
        </p>

        <div className="space-y-4">
          <div>
            <span className="text-tinta font-medium block mb-1">Elige la fecha:</span>
            <DatePicker
              selected={fecha}
              onChange={(d) => setFecha(d)}
              placeholderText="Selecciona una fecha"
              dateFormat="dd/MM/yyyy"
              className="p-2 border rounded w-full"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              locale="es"
            />
          </div>

          <div>
            <span className="text-tinta font-medium block mb-1">Elige el turno:</span>
            <select
              className="block w-full rounded border border-gray-300 p-2"
              value={turno}
              onChange={(e) => setTurno(e.target.value)}
            >
              <option value="">-- Selecciona --</option>
              {turnosDisponibles.map((t, i) => (
                <option key={i} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-tinta font-medium block mb-1">Número de plazas:</span>
            <input
              type="number"
              min="1"
              max="10"
              className="block w-full rounded border border-gray-300 p-2"
              value={plazas}
              onChange={(e) => setPlazas(Number(e.target.value))}
            />
          </div>

          <button
            onClick={handleContinuar}
            className="w-full bg-[#a85d38] hover:bg-[#8f4f2e] text-white font-bold py-2 rounded-xl"
          >
            Continuar al resumen
          </button>
        </div>
      </div>
    </div>
  );
}
