// src/components/CalendarioReserva.jsx
// Calendario mensual siempre visible para elegir el día de una reserva. Cada día
// se marca según `estadoDia(fecha)`:
//   "disponible" → se puede elegir
//   "bloqueado"  → cerrado desde el panel (con su motivo)
//   "solo-grupo" → solo con un mínimo de personas (`minimo`); se puede elegir
//   "completo"   → todos sus turnos tienen las plazas ocupadas (aforo o cupo): no se puede elegir
//   "sin-taller" → ese día no se imparte
//   "sin-hueco"  → no vale para esta reserva (sin plazas, fuera de plazo…): al cambiar una
//                  reserva, el taller puede darse ese día y aun así no se puede elegir
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
    "bg-mostaza-suave border border-mostaza text-tinta font-semibold hover:bg-mostaza/40 cursor-pointer",
  bloqueado: "bg-red-50 border border-red-200 text-red-400 line-through cursor-not-allowed",
  "solo-grupo":
    "bg-sky-50 border border-sky-300 text-sky-800 font-semibold hover:bg-sky-100 cursor-pointer",
  completo: "bg-violet-100 border border-violet-300 text-violet-700 font-semibold cursor-not-allowed",
  "sin-taller": "bg-crema text-gray-300 cursor-not-allowed",
  "sin-hueco": "bg-crema text-gray-300 cursor-not-allowed",
  fuera: "text-gray-300 cursor-not-allowed",
};

export default function CalendarioReserva({
  value,
  onChange,
  estadoDia,
  cargando = false,
  desde = "", // primer día que se puede elegir (si es posterior a hoy)
  hasta = "", // último día que se puede elegir (si es anterior al límite general)
}) {
  const hoy = useMemo(hoyISO, []);
  const limiteGeneral = useMemo(maxISO, []);
  const limite = hasta && hasta < limiteGeneral ? hasta : limiteGeneral;

  const inicial = value ? new Date(`${value}T12:00:00`) : desde > hoy ? new Date(`${desde}T12:00:00`) : new Date();
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
  // Días azules sin mínimo concreto (los de un bono: lo marca el taller que abre el turno)
  let hayAzulSinNumero = false;
  let haySinTaller = false;
  let hayCompleto = false;
  let haySinHueco = false;
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
          className="w-9 h-9 rounded-full text-lg text-tinta hover:bg-mostaza-suave disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ‹
        </button>
        <p className="font-semibold text-tinta first-letter:uppercase" aria-live="polite">
          {nombreMes(anio, mes)}
        </p>
        <button
          type="button"
          onClick={() => moverMes(1)}
          disabled={!puedeAvanzar}
          aria-label="Mes siguiente"
          className="w-9 h-9 rounded-full text-lg text-tinta hover:bg-mostaza-suave disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-tinta-suave mb-1">
        {DIAS_SEMANA.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celdas.map((dia, i) => {
          if (dia === null) return <span key={`hueco-${i}`} />;

          const iso = aISO(anio, mes, dia);
          const fuera = iso < hoy || iso > limite || (desde && iso < desde);
          const { estado = "disponible", motivo = "", minimo = 0 } = fuera ? {} : estadoDia(iso);
          if (estado === "solo-grupo" && minimo) hayGrupo = minimo;
          if (estado === "solo-grupo" && !minimo) hayAzulSinNumero = true;
          if (estado === "sin-taller") haySinTaller = true;
          if (estado === "completo") hayCompleto = true;
          if (estado === "sin-hueco") haySinHueco = true;
          const seleccionado = iso === value;
          const elegible = !fuera && (estado === "disponible" || estado === "solo-grupo");

          const clases = seleccionado
            ? "bg-terracota border border-terracota text-white font-bold ring-2 ring-terracota-suave"
            : ESTILOS[fuera ? "fuera" : estado];

          const descripcion = fuera
            ? ""
            : estado === "bloqueado"
            ? `No disponible${motivo ? `: ${motivo}` : ""}`
            : estado === "solo-grupo"
            ? minimo
              ? `Reserva mínima ${minimo} personas`
              : "Cerrado: solo se abre cuando otra reserva llega al mínimo de personas del taller"
            : estado === "completo"
            ? "Completo: no quedan plazas"
            : estado === "sin-taller"
            ? "No se imparte este día"
            : estado === "sin-hueco"
            ? "No disponible para cambiar esta reserva"
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

      <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-tinta-suave">
        <li className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-mostaza-suave border border-mostaza" /> Disponible
        </li>
        {hayGrupo === 0 && hayAzulSinNumero && (
          <li className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-50 border border-sky-300" /> Cerrado hasta que se abra con
            un mínimo de personas
          </li>
        )}
        {hayGrupo > 0 && (
          <li className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-sky-50 border border-sky-300" /> Reserva mínima{" "}
            {hayGrupo} personas
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-terracota border border-terracota" /> Elegido
        </li>
        <li className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-50 border border-red-200" /> Cerrado
        </li>
        {hayCompleto && (
          <li className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-violet-100 border border-violet-300" /> Completo
          </li>
        )}
        {haySinTaller && (
          <li className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-arena" /> No se imparte
          </li>
        )}
        {haySinHueco && (
          <li className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-arena" /> No disponible
          </li>
        )}
      </ul>
    </div>
  );
}
