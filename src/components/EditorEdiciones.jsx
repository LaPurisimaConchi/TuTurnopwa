// src/components/EditorEdiciones.jsx
// Ediciones de un taller monográfico: cada una es un grupo de `sesionesCurso` sesiones con
// su horario (desde – hasta). Se reservan enteras. Las ediciones pasadas se pueden
// quitar; un taller sin ediciones futuras deja de verse en la web.
import { fechaDMA, hoyMadrid } from "../utils/formatoFecha";
import { primeraFecha } from "../utils/monografico";

const diaVacio = () => ({ fecha: "", turno: "", torno: false });

// Ajusta una edición al número de sesiones del curso
export const ajustarSesiones = (edicion, sesiones) => ({
  ...edicion,
  fechas: Array.from({ length: sesiones }, (_, i) => edicion.fechas[i] || diaVacio()),
});

const input = "border border-gray-300 rounded-xl px-3 py-2 text-base bg-white";

function partesTurno(turno = "") {
  const [desde = "", hasta = ""] = String(turno).split("-");
  return [desde, hasta];
}

export default function EditorEdiciones({ ediciones, sesionesCurso, onChange }) {
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

  const cambiarHora = (e, d, parte, valor) => {
    const [desde, hasta] = partesTurno(ediciones[e].fechas[d].turno);
    const nuevo = parte === 0 ? [valor, hasta] : [desde, valor];
    cambiarDia(e, d, "turno", nuevo[0] || nuevo[1] ? `${nuevo[0]}-${nuevo[1]}` : "");
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
        <p className="text-sm text-gray-600">
          Todavía no hay ediciones. Mientras no haya ninguna con fecha futura, el taller
          no se ve en la web.
        </p>
      )}

      {ediciones.map((edicion, e) => {
        const primera = primeraFecha({ fechas: edicion.fechas.filter((f) => f.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha)) });
        const pasada = primera && primera < hoy;

        return (
          <div key={edicion.id} className="rounded-xl border border-[#eadfbe] bg-[#fffaf0] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-sm text-[#3d3126]">
                Edición {e + 1}
                {primera ? ` · empieza el ${fechaDMA(primera)}` : ""}
                {pasada && <span className="ml-2 text-xs font-semibold text-gray-500">(ya empezó: no se puede reservar)</span>}
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
                const [desde, hasta] = partesTurno(dia.turno);

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
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        aria-label="Hora de inicio"
                        className={input}
                        value={desde}
                        onChange={(ev) => cambiarHora(e, d, 0, ev.target.value)}
                      />
                      <span aria-hidden="true">–</span>
                      <input
                        type="time"
                        aria-label="Hora de fin"
                        className={input}
                        value={hasta}
                        onChange={(ev) => cambiarHora(e, d, 1, ev.target.value)}
                      />
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
        className="px-4 py-2 rounded-full border border-dashed border-[#d6c89a] text-sm font-semibold text-[#5c3c00] hover:bg-[#fff6d6]"
      >
        + Añadir edición
      </button>
    </div>
  );
}
