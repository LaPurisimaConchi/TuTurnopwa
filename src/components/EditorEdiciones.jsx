// src/components/EditorEdiciones.jsx
// Ediciones de un taller monográfico: cada una es un grupo de `sesionesCurso` sesiones con
// su fecha, su hora de inicio y su duración (la del taller por defecto, cambiable en cada
// sesión). La hora de fin se calcula; lo que se guarda en la sesión sigue siendo el turno
// «inicio-fin». Se reservan enteras. Las ediciones pasadas se pueden
// quitar; un taller sin ediciones futuras deja de verse en la web.
import { fechaDMA, hoyMadrid } from "../utils/formatoFecha";
import { primeraFecha } from "../utils/monografico";
import {
  DURACION_POR_DEFECTO_MIN,
  duracionDeTurno,
  finDeTurno,
  horasDesdeMinutos,
  inicioDeTurno,
  minutosDesdeHoras,
  turnoDesdeInicio,
} from "../utils/duracionTurno";

const diaVacio = () => ({ fecha: "", turno: "", torno: false });

// Ajusta una edición al número de sesiones del curso
export const ajustarSesiones = (edicion, sesiones) => ({
  ...edicion,
  fechas: Array.from({ length: sesiones }, (_, i) => edicion.fechas[i] || diaVacio()),
});

const input = "border border-gray-300 rounded-xl px-3 py-2 text-base bg-white";

export default function EditorEdiciones({
  ediciones,
  sesionesCurso,
  duracionDefecto = DURACION_POR_DEFECTO_MIN,
  onChange,
}) {
  const hoy = hoyMadrid();
  const sesiones = Math.max(1, Math.round(Number(sesionesCurso)) || 1);

  const cambiarDia = (e, d, campo, valor) =>
    onChange(
      ediciones.map((edicion, i) =>
        i !== e
          ? edicion
          : { ...edicion, fechas: edicion.fechas.map((f, j) => (j === d ? { ...f, [campo]: valor } : f)) }
      )
    );

  // Duración de una sesión en horas (texto del campo): la que escribió, la de su turno o la
  // del taller
  const horasDe = (dia) =>
    dia.duracionHoras ?? horasDesdeMinutos(duracionDeTurno(dia.turno) ?? duracionDefecto);

  // Turno «inicio-fin» de una sesión. Con una hora de inicio pero sin poder calcular el fin
  // (duración vacía o clase que pasaría de medianoche) queda «inicio-», que no vale y lo
  // marca el formulario al guardar.
  const turnoDe = (inicio, horas) =>
    inicio ? turnoDesdeInicio(inicio, minutosDesdeHoras(horas)) || `${inicio}-` : "";

  const cambiarSesion = (e, d, cambios) =>
    onChange(
      ediciones.map((edicion, i) =>
        i !== e
          ? edicion
          : { ...edicion, fechas: edicion.fechas.map((f, j) => (j === d ? { ...f, ...cambios } : f)) }
      )
    );

  const cambiarInicio = (e, d, valor) => {
    const dia = ediciones[e].fechas[d];
    cambiarSesion(e, d, { turno: turnoDe(valor, horasDe(dia)) });
  };

  const cambiarDuracion = (e, d, horas) => {
    const dia = ediciones[e].fechas[d];
    cambiarSesion(e, d, { duracionHoras: horas, turno: turnoDe(inicioDeTurno(dia.turno), horas) });
  };

  const anadir = () =>
    onChange([
      ...ediciones,
      ajustarSesiones({ id: `ed${Date.now().toString(36)}`, fechas: [] }, sesiones),
    ]);

  const quitar = (e) => onChange(ediciones.filter((_, i) => i !== e));

  return (
    <div className="space-y-4">
      {ediciones.length === 0 && (
        <p className="text-sm text-tinta-suave">
          Todavía no hay ediciones. Mientras no haya ninguna con fecha futura, el taller
          no se ve en la web.
        </p>
      )}

      {ediciones.map((edicion, e) => {
        const primera = primeraFecha({ fechas: edicion.fechas.filter((f) => f.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha)) });
        const pasada = primera && primera < hoy;

        return (
          <div key={edicion.id} className="rounded-xl border border-linea bg-crema p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-sm text-tinta">
                Edición {e + 1}
                {primera ? ` · empieza el ${fechaDMA(primera)}` : ""}
                {pasada && <span className="ml-2 text-xs font-semibold text-tinta-suave">(ya empezó: no se puede reservar)</span>}
              </p>
              <button
                type="button"
                onClick={() => quitar(e)}
                className="text-xs text-red-700 underline"
              >
                Quitar edición
              </button>
            </div>

            <div className="space-y-2">
              {edicion.fechas.map((dia, d) => {
                const desde = inicioDeTurno(dia.turno);
                const fin = finDeTurno(desde, minutosDesdeHoras(horasDe(dia)));

                return (
                  <div key={d} className="grid grid-cols-1 sm:grid-cols-[70px_auto_auto_auto] items-center gap-2">
                    <span className="text-sm font-semibold">Sesión {d + 1}</span>
                    <input
                      type="date"
                      aria-label={`Fecha de la sesión ${d + 1} de la edición ${e + 1}`}
                      className={input}
                      value={dia.fecha}
                      onChange={(ev) => cambiarDia(e, d, "fecha", ev.target.value)}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        aria-label={`Hora de inicio de la sesión ${d + 1}`}
                        className={input}
                        value={desde}
                        onChange={(ev) => cambiarInicio(e, d, ev.target.value)}
                      />
                      <input
                        type="number"
                        min="0.25"
                        max="12"
                        step="0.25"
                        inputMode="decimal"
                        aria-label={`Duración en horas de la sesión ${d + 1}`}
                        className={input + " w-24"}
                        value={horasDe(dia)}
                        onChange={(ev) => cambiarDuracion(e, d, ev.target.value)}
                      />
                      <span className="text-sm text-tinta-suave whitespace-nowrap">
                        h{desde && fin ? ` · hasta las ${fin}` : ""}
                      </span>
                    </div>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={!!dia.torno}
                        onChange={(ev) => cambiarDia(e, d, "torno", ev.target.checked)}
                      />
                      Torno
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={anadir}
        className="px-4 py-2 rounded-full border border-dashed border-[#d6c89a] text-sm font-semibold text-tinta hover:bg-mostaza-suave"
      >
        + Añadir edición
      </button>
    </div>
  );
}
