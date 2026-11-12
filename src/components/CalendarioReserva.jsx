// src/components/CalendarioReserva.jsx
// Calendario mensual siempre visible para elegir el día de una reserva. Cada día
// se marca según `estadoDia(fecha)`:
//   "disponible" → se puede elegir
//   "bloqueado"  → cerrado desde el panel (con su motivo)
//   "solo-grupo" → solo con un mínimo de personas (`minimo`); se puede elegir
//   "sin-taller" → ese día no se imparte
// Los días pasados y los que quedan fuera del rango no se pueden elegir.
import { useMemo, useState } from "react";

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

const dosCifras = (n) => String(n).padStart(2, "0");
const aISO = (anio, mes, dia) => `${anio}-${dosCifras(mes + 1)}-${dosCifras(dia)}`;

const hoyISO = () => {
  const d = new Date();
  return aISO(d.getFullYear(), d.getMonth(), d.getDate());
};

const maxISO = () => {
  const d = new Date();
  return aISO(d.getFullYear() + 2, d.getMonth(), d.getDate());
};

const nombreMes = (anio, mes) =>
  new Date(anio, mes, 1).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

const ESTILOS = {
  disponible:
    "bg-[#fff6d6] border border-[#F4C542] text-[#5c3c00] font-semibold hover:bg-[#F6D66A] cursor-pointer",
  bloqueado: "bg-red-50 border border-red-200 text-red-400 line-through cursor-not-allowed",
  "solo-grupo":
    "bg-sky-50 border border-sky-300 text-sky-800 font-semibold hover:bg-sky-100 cursor-pointer",
  "sin-taller": "bg-gray-50 text-gray-300 cursor-not-allowed",
  fuera: "text-gray-300 cursor-not-allowed",
};

export default function CalendarioReserva({
  value,
  onChange,
  estadoDia,
  cargando = false,
}) {
  const hoy = useMemo(hoyISO, []);
  const limite = useMemo(maxISO, []);

  const inicial = value ? new Date(`${value}T12:00:00`) : new Date();
  const [anio, setAnio] = useState(inicial.getFullYear());
  const [mes, setMes] = useState(inicial.getMonth());

  const [anioHoy, mesHoy] = [Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1];
  const [anioMax, mesMax] = [Number(limite.slice(0, 4)), Number(limite.slice(5, 7)) - 1];

  const puedeRetroceder = anio * 12 + mes > anioHoy * 12 + mesHoy;
  const puedeAvanzar = anio * 12 + mes < anioMax * 12 + mesMax;

  const moverMes = (delta) => {
    const nuevo = new Date(anio, mes + delta, 1);
    setAnio(nuevo.getFullYear());
    setMes(nuevo.getMonth());
  };

  // Lunes = 0
  const huecosIniciales = (new Date(anio, mes, 1).getDay() + 6) % 7;
  const diasDelMes = new Date(anio, mes + 1, 0).getDate();

  // Mínimo de personas de los días de grupo (para la leyenda); 0 si no hay ninguno
  let hayGrupo = 0;
  const celdas = [];
  for (let i = 0; i < huecosIniciales; i += 1) celdas.push(null);
  for (let dia = 1; dia <= diasDelMes; dia += 1) celdas.push(dia);

  return (
    <div className={cargando ? "opacity-60 pointer-events-none" : ""} aria-busy={cargando}>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => moverMes(-1)}
          disabled={!puedeRetroceder}
          aria-label="Mes anterior"
          className="w-9 h-9 rounded-full text-lg text-[#5c3c00] hover:bg-[#fff6d6] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        <p className="font-semibold text-[#5c3c00] first-letter:uppercase" aria-live="polite">
          {nombreMes(anio, mes)}
        </p>
        <button
          type="button"
          onClick={() => moverMes(1)}
          disabled={!puedeAvanzar}
          aria-label="Mes siguiente"
          className="w-9 h-9 rounded-full text-lg text-[#5c3c00] hover:bg-[#fff6d6] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
        {DIAS_SEMANA.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celdas.map((dia, i) => {
          if (dia === null) return <span key={`hueco-${i}`} />;

          const iso = aISO(anio, mes, dia);
          const fuera = iso < hoy || iso > limite;
          const { estado = "disponible", motivo = "", minimo = 0 } = fuera ? {} : estadoDia(iso);
          if (estado === "solo-grupo" && minimo) hayGrupo = minimo;
          const seleccionado = iso === value;
          const elegible = !fuera && (estado === "disponible" || estado === "solo-grupo");

          const clases = seleccionado
            ? "bg-[#F4C542] border border-[#E5B92F] text-[#5c3c00] font-bold ring-2 ring-[#E5B92F]"
            : ESTILOS[fuera ? "fuera" : estado];

          const descripcion = fuera
            ? ""
            : estado === "bloqueado"
            ? `No disponible${motivo ? `: ${motivo}` : ""}`
            : estado === "solo-grupo"
            ? `Reserva mínima ${minimo} personas`
            : estado === "sin-taller"
            ? "No se imparte este día"
            : "Disponible";

          return (
            <button
              key={iso}
              type="button"
              disabled={!elegible}
              onClick={() => onChange(iso)}
              title={descripcion}
              aria-label={`${dia} de ${nombreMes(anio, mes)}${descripcion ? `, ${descripcion}` : ""}`}
              aria-pressed={seleccionado}
              className={`aspect-square rounded-lg text-sm flex items-center justify-center transition ${clases}`}
            >
              {dia}
            </button>
          );
        })}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-600">
        <li className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#fff6d6] border border-[#F4C542]" /> Disponible
        </li>
        {hayGrupo > 0 && (
          <li className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-50 border border-sky-300" /> Reserva mínima{" "}
            {hayGrupo} personas
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#F4C542] border border-[#E5B92F]" /> Elegido
        </li>
        <li className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-50 border border-red-200" /> Cerrado
        </li>
        <li className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-gray-100" /> No se imparte
        </li>
      </ul>
    </div>
  );
}
