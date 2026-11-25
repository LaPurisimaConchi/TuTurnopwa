// src/components/EditorTurnos.jsx
// Editor de turnos sin texto libre: cada turno es una pastilla (11:30 – 14:30) que
// se quita con ✕, y los nuevos se añaden con dos selectores de hora o con los
// atajos de mañana y tarde. El valor sigue siendo el texto de siempre
// ("11:30-14:30, 17:30-20:30"), así que el formulario y la ficha no cambian.
// Con `minimo` y `onMinimoChange`, cada turno con horas lleva además un botón «Mín.» para
// marcar los que piden el mínimo de personas (otro texto con el subconjunto de turnos).
// Con `duracion` (minutos) el valor es solo la lista de horas de inicio ("11:30, 17:30"):
// cada pastilla enseña el rango que sale de sumarle la duración (11:30 – 14:30) y se añaden
// con un único selector de hora. Es el modo del horario de los talleres. Con `soloInicio`
// y sin duración (los horarios por defecto de «Espacio», que no tienen fin porque cada
// taller dura lo suyo) las pastillas enseñan solo la hora de inicio.
import { useState } from "react";
import Icono from "./Icono";
import { leerTurnos, turnoInvalido } from "../utils/fichaTaller";
import { esHora, finDeTurno, inicioDeTurno, turnoDeFormularioInvalido } from "../utils/duracionTurno";

export const TURNO_MANANA = "11:30-14:30";
export const TURNO_TARDE = "17:30-20:30";
const INICIO_MANANA = "11:30";
const INICIO_TARDE = "17:30";

const inicioEnMinutos = (turno) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(turno);
  return m ? Number(m[1]) * 60 + Number(m[2]) : Number.MAX_SAFE_INTEGER;
};

const SOLO_HORA = /^\d{1,2}:\d{2}$/;

const ordenar = (turnos) =>
  [...new Set(turnos)].sort((a, b) => inicioEnMinutos(a) - inicioEnMinutos(b));

const bonito = (turno, duracion) => {
  if (/consultar/i.test(turno)) return "A consultar";
  if (duracion && SOLO_HORA.test(turno)) {
    const fin = finDeTurno(turno, duracion);
    return fin ? `${turno} – ${fin}` : `${turno} – ?`;
  }
  return turno.replace("-", " – ");
};

export default function EditorTurnos({
  value = "",
  onChange,
  id,
  textoVacio = "Sin taller",
  minimo,
  onMinimoChange,
  duracion,
  soloInicio: soloInicioProp = false,
}) {
  const soloInicio = !!duracion || soloInicioProp;
  const turnos = leerTurnos(value);
  const conMinimo = typeof onMinimoChange === "function";
  const marcados = conMinimo ? leerTurnos(minimo || "").filter((t) => turnos.includes(t)) : [];
  const [anadiendo, setAnadiendo] = useState(false);
  const [desde, setDesde] = useState(INICIO_MANANA);
  const [hasta, setHasta] = useState("14:30");

  const emitir = (lista) => onChange(ordenar(lista).join(", "));
  const quitar = (turno) => {
    emitir(turnos.filter((t) => t !== turno));
    if (conMinimo && marcados.includes(turno)) {
      onMinimoChange(ordenar(marcados.filter((t) => t !== turno)).join(", "));
    }
  };
  const alternarMinimo = (turno) =>
    onMinimoChange(
      ordenar(marcados.includes(turno) ? marcados.filter((t) => t !== turno) : [...marcados, turno]).join(", ")
    );
  const anadir = (turno) => {
    if (!turnos.includes(turno)) emitir([...turnos, turno]);
  };

  // Con duración, la clase no puede acabar pasada la medianoche
  const horaValida = soloInicio
    ? duracion
      ? !!finDeTurno(desde, duracion)
      : esHora(desde)
    : desde && hasta && hasta > desde;
  // Un turno de otro formato (rango antiguo) se avisa en rojo aunque aún se pueda quitar
  const invalido = (turno) =>
    soloInicio ? turnoDeFormularioInvalido(turno, duracion) : turnoInvalido(turno);
  const atajoManana = soloInicio ? INICIO_MANANA : TURNO_MANANA;
  const atajoTarde = soloInicio ? INICIO_TARDE : TURNO_TARDE;

  const boton =
    "px-2.5 py-1 rounded-full border border-dashed border-[#d6c89a] text-xs font-semibold text-tinta hover:bg-mostaza-suave";

  return (
    <div id={id} className="flex flex-wrap items-center gap-2">
      {turnos.length === 0 && <span className="text-sm text-tinta-suave">{textoVacio}</span>}

      {turnos.map((turno) => (
        <span
          key={turno}
          className={`inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-sm font-semibold border ${
            invalido(turno)
              ? "bg-red-50 border-red-300 text-red-700"
              : marcados.includes(turno)
              ? "bg-sky-50 border-sky-300 text-sky-800"
              : "bg-mostaza-suave border-mostaza text-tinta"
          }`}
        >
          {bonito(turno, duracion)}
          {conMinimo && !invalido(turno) && (
            <button
              type="button"
              onClick={() => alternarMinimo(turno)}
              aria-pressed={marcados.includes(turno)}
              title="Marca los turnos que solo se abren con el mínimo de personas del taller"
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                marcados.includes(turno)
                  ? "bg-sky-600 border-sky-600 text-white"
                  : "bg-white border-linea text-tinta-suave hover:bg-black/5"
              }`}
            >
              Mín.
            </button>
          )}
          <button
            type="button"
            onClick={() => quitar(turno)}
            aria-label={`Quitar el turno ${bonito(turno, duracion)}`}
            className="w-5 h-5 rounded-full text-xs leading-none hover:bg-black/10"
          ><Icono nombre="cerrar" /></button>
        </span>
      ))}

      {!turnos.includes(atajoManana) && (
        <button type="button" className={boton} onClick={() => anadir(atajoManana)}>
          + Mañana
        </button>
      )}
      {!turnos.includes(atajoTarde) && (
        <button type="button" className={boton} onClick={() => anadir(atajoTarde)}>
          + Tarde
        </button>
      )}

      {anadiendo ? (
        <span className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-linea bg-white px-2 py-1">
          <input
            type="time"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            aria-label="Hora de inicio"
            className="border border-gray-300 rounded-lg px-1.5 py-0.5 text-sm"
          />
          {soloInicio ? (
            duracion ? (
              <span className="text-sm text-tinta-suave">
                {finDeTurno(desde, duracion) ? `hasta las ${finDeTurno(desde, duracion)}` : "acabaría después de medianoche"}
              </span>
            ) : null
          ) : (
            <>
              <span className="text-sm">a</span>
              <input
                type="time"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                aria-label="Hora de fin"
                className="border border-gray-300 rounded-lg px-1.5 py-0.5 text-sm"
              />
            </>
          )}
          <button
            type="button"
            disabled={!horaValida}
            onClick={() => {
              anadir(soloInicio ? inicioDeTurno(desde) : `${desde}-${hasta}`);
              setAnadiendo(false);
            }}
            className="px-2.5 py-1 rounded-full bg-tinta text-white text-xs font-semibold disabled:opacity-40"
          >
            Añadir
          </button>
          <button
            type="button"
            onClick={() => setAnadiendo(false)}
            className="px-2 py-1 text-xs text-tinta-suave"
          >
            Cancelar
          </button>
        </span>
      ) : (
        <button type="button" className={boton} onClick={() => setAnadiendo(true)}>
          + Otra hora
        </button>
      )}
    </div>
  );
}
