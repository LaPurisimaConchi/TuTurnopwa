// src/AdminEspacio.jsx
// Ajustes del espacio: aforo total, tope de torno, mínimo para reservar en grupo y
// horarios por defecto de los talleres nuevos. Se guardan en configuracionEspacio.
import React, { useEffect, useState } from "react";
import BotonVolver from "./BotonVolver";
import EditorTurnos from "./components/EditorTurnos";
import OcupacionProximosDias from "./components/OcupacionProximosDias";
import { cargarConfigEspacio, guardarConfigEspacio } from "./configuracionEspacio";
import { DIAS } from "./utils/fichaTaller";

const input = "w-full border border-gray-300 rounded-xl px-3 py-2 text-base bg-white";
const label = "block font-bold text-sm mb-1 text-[#3d3126]";
const seccion = "bg-white rounded-2xl border border-[#eadfbe] p-5 shadow-sm space-y-4";
const ayuda = "text-xs text-gray-500 mt-1";

const aTexto = (config) => ({
  aforoTotal: String(config.aforoTotal),
  maxTorno: String(config.maxTorno),
  minPersonasGrupo: String(config.minPersonasGrupo),
  minutosReserva: String(config.minutosReserva),
  horariosDefecto: { ...config.horariosDefecto },
});

export default function AdminEspacio() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  // Cambia al guardar para que el resumen de ocupación se vuelva a calcular
  const [version, setVersion] = useState(0);

  useEffect(() => {
    cargarConfigEspacio().then((config) => setForm(aTexto(config)));
  }, []);

  const cambiar = (campo, valor) => {
    setMensaje("");
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const cambiarHorario = (dia, valor) => {
    setMensaje("");
    setForm((prev) => ({ ...prev, horariosDefecto: { ...prev.horariosDefecto, [dia]: valor } }));
  };

  const entero = (valor) => {
    const n = Number(valor);
    return Number.isInteger(n) ? n : NaN;
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    const aforoTotal = entero(form.aforoTotal);
    const maxTorno = entero(form.maxTorno);
    const minPersonasGrupo = entero(form.minPersonasGrupo);
    const minutosReserva = entero(form.minutosReserva);

    if (!(aforoTotal >= 1 && aforoTotal <= 500)) {
      return setError("El aforo total debe ser un número entre 1 y 500.");
    }
    if (!(maxTorno >= 0 && maxTorno <= aforoTotal)) {
      return setError("Las plazas de torno deben estar entre 0 y el aforo total.");
    }
    if (!(minPersonasGrupo >= 2 && minPersonasGrupo <= 45)) {
      return setError("El mínimo de personas para un grupo debe estar entre 2 y 45.");
    }
    if (!(minutosReserva >= 1 && minutosReserva <= 120)) {
      return setError("Los minutos de reserva de plaza deben estar entre 1 y 120.");
    }

    setGuardando(true);
    try {
      const guardada = await guardarConfigEspacio({
        aforoTotal,
        maxTorno,
        minPersonasGrupo,
        minutosReserva,
        horariosDefecto: form.horariosDefecto,
      });
      setForm(aTexto(guardada));
      setVersion((v) => v + 1);
      setMensaje("Ajustes guardados.");
    } catch (err) {
      console.error("Error al guardar la configuración del espacio:", err);
      setError(
        err?.code === "PERMISSION_DENIED"
          ? "No tienes permiso para guardar. Revisa que las reglas de la base de datos estén desplegadas."
          : "No se han podido guardar los ajustes."
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-[#fffef4] min-h-screen px-4 py-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <BotonVolver volverA="/admin-dashboard" />

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-[#3d3126] font-serif">Espacio</h1>
          <p className="text-sm text-gray-600 mt-1">
            Límites de plazas y valores por defecto que se aplican a todos los talleres.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {mensaje && (
          <p className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">
            {mensaje}
          </p>
        )}

        {!form ? (
          <p className="text-gray-600">Cargando…</p>
        ) : (
          <form onSubmit={guardar} className="space-y-5">
            <section className={seccion}>
              <h2 className="text-lg font-semibold text-[#3d3126]">Plazas</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="esp-aforo" className={label}>Aforo total por franja</label>
                  <input
                    id="esp-aforo"
                    type="number"
                    min="1"
                    max="500"
                    className={input}
                    value={form.aforoTotal}
                    onChange={(e) => cambiar("aforoTotal", e.target.value)}
                  />
                  <p className={ayuda}>
                    Personas como máximo en la misma fecha y turno, sumando todos los
                    talleres y los grupos.
                  </p>
                </div>

                <div>
                  <label htmlFor="esp-torno" className={label}>Plazas de torno por franja</label>
                  <input
                    id="esp-torno"
                    type="number"
                    min="0"
                    max="500"
                    className={input}
                    value={form.maxTorno}
                    onChange={(e) => cambiar("maxTorno", e.target.value)}
                  />
                  <p className={ayuda}>
                    Máximo de personas con torno en la misma franja (entran en el aforo total).
                  </p>
                </div>

                <div>
                  <label htmlFor="esp-grupo" className={label}>
                    Mínimo de personas para reservar en grupo
                  </label>
                  <input
                    id="esp-grupo"
                    type="number"
                    min="2"
                    max="45"
                    className={input}
                    value={form.minPersonasGrupo}
                    onChange={(e) => cambiar("minPersonasGrupo", e.target.value)}
                  />
                  <p className={ayuda}>Igual para todos los talleres.</p>
                </div>

                <div>
                  <label htmlFor="esp-minutos" className={label}>
                    Minutos que se guarda la plaza al pagar
                  </label>
                  <input
                    id="esp-minutos"
                    type="number"
                    min="1"
                    max="120"
                    className={input}
                    value={form.minutosReserva}
                    onChange={(e) => cambiar("minutosReserva", e.target.value)}
                  />
                  <p className={ayuda}>
                    Mientras alguien paga, su plaza no se puede reservar. Pasado este
                    tiempo se libera.
                  </p>
                </div>
              </div>
            </section>

            <section className={seccion}>
              <h2 className="text-lg font-semibold text-[#3d3126]">Horarios por defecto</h2>
              <p className="text-sm text-gray-600">
                Se ponen solos al crear un taller nuevo. Los talleres que ya existen no
                cambian.
              </p>

              <div>
                {DIAS.map(([dia, nombreDia]) => (
                  <div
                    key={dia}
                    className="grid grid-cols-1 sm:grid-cols-[88px_1fr] items-start gap-1.5 sm:gap-3 py-2 border-b border-[#f3ead7] last:border-0"
                  >
                    <label htmlFor={`esp-horario-${dia}`} className="text-sm font-semibold pt-1">
                      {nombreDia}
                    </label>
                    <EditorTurnos
                      id={`esp-horario-${dia}`}
                      value={form.horariosDefecto[dia]}
                      onChange={(valor) => cambiarHorario(dia, valor)}
                    />
                  </div>
                ))}
              </div>
            </section>

            <button
              type="submit"
              disabled={guardando}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#E5B92F] text-[#3d3126] font-bold hover:bg-[#d3a825] disabled:opacity-60"
            >
              {guardando ? "Guardando…" : "Guardar ajustes"}
            </button>
          </form>
        )}

        <OcupacionProximosDias version={version} />
      </div>
    </div>
  );
}
