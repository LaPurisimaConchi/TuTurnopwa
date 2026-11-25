// src/components/CrearTurnoExtra.jsx
// Crear turnos nuevos para uno o varios días, con la hora de inicio, en todos los talleres o
// en los que se elijan. Se usa en «Abrir días» (con su propio rango de fechas) y en el
// calendario del panel (con los días que se han seleccionado: `fechas`). Los guarda en
// `turnosExtra/{claseId}/{fecha}/{inicio}` (ver `src/utils/turnosExtra.js`). Si un taller ya
// tiene un turno con esa hora de inicio ese día, no se crea y se deja el que estaba.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ref, get, update } from "firebase/database";
import { dbRealtime } from "../firebase";
import EditorTurnos from "./EditorTurnos";
import { avisar, preguntar } from "../utils/avisos";
import { fechaDMA, hoyMadrid } from "../utils/formatoFecha";
import { esHora, finDeTurno, inicioDeTurno, leerTurnos, textoDuracion } from "../utils/duracionTurno";
import {
  agruparTurnosExtra,
  cambiosParaQuitar,
  clasesConTurnos,
  fechasDeRango,
  planificarTurnosExtra,
  resumenPlan,
} from "../utils/turnosExtra";

const input = "w-full border border-gray-300 rounded-xl px-3 py-2 text-base bg-white";
const etiqueta = "block font-bold text-sm mb-1 text-tinta";
const ayuda = "text-xs text-tinta-suave mt-1";
const MAX_DIAS = 120;

const nombresDe = (ids, clases) => ids.map((id) => clases[id]?.nombre || clases[id]?.["nombre "] || id);

export default function CrearTurnoExtra({ fechas: fechasFijas = null, onCambio }) {
  const conRango = !fechasFijas;
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [inicios, setInicios] = useState("");
  const [minimos, setMinimos] = useState("");
  const [todos, setTodos] = useState(true);
  const [elegidos, setElegidos] = useState([]);
  const [motivo, setMotivo] = useState("");
  const [clases, setClases] = useState({});
  const [extras, setExtras] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      // Los talleres son públicos; los turnos ya creados solo los leen los admins con el correo
      // verificado: si esa lectura falla, el formulario sigue funcionando con la lista de talleres
      const [clasesSnap, extrasSnap] = await Promise.all([
        get(ref(dbRealtime, "clases")),
        get(ref(dbRealtime, "turnosExtra")).catch((err) => {
          console.error("No se han podido leer los turnos creados:", err);
          return null;
        }),
      ]);
      setClases(clasesSnap.exists() ? clasesSnap.val() || {} : {});
      setExtras(extrasSnap?.exists() ? extrasSnap.val() || {} : {});
      setError(extrasSnap ? "" : "No se han podido leer los turnos ya creados. Comprueba que tu cuenta de administrador tiene el correo verificado.");
    } catch (err) {
      console.error("Error al cargar los talleres:", err);
      setError("No se han podido cargar los talleres.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const hoy = hoyMadrid();
  const fechas = useMemo(
    () => (conRango ? fechasDeRango(desde, hasta) : fechasFijas),
    [conRango, desde, hasta, fechasFijas]
  );
  const talleres = useMemo(() => clasesConTurnos(clases), [clases]);
  const idsElegidos = todos ? talleres.map((t) => t.id) : elegidos.filter((id) => talleres.some((t) => t.id === id));
  const turnosPedidos = useMemo(() => leerTurnos(inicios).map((t) => inicioDeTurno(t)).filter(Boolean), [inicios]);

  // Cuándo acaba cada hora de inicio según la duración de los talleres elegidos
  const finales = useMemo(() => {
    const duraciones = [...new Set(talleres.filter((t) => idsElegidos.includes(t.id)).map((t) => t.duracion))];
    return turnosPedidos.map((inicio) => ({
      inicio,
      fines: duraciones.map((d) => ({ d, fin: finDeTurno(inicio, d) })),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnosPedidos, talleres, todos, elegidos]);

  const alternarTaller = (id) =>
    setElegidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const crear = async () => {
    setError("");
    if (conRango && desde && hasta && hasta < desde) {
      return setError("La fecha de fin no puede ser anterior a la de inicio.");
    }
    if (!fechas.length) {
      return setError(conRango ? "Elige la fecha de inicio y la de fin." : "Elige algún día en el calendario.");
    }
    if (fechas.length > MAX_DIAS) return setError(`Como mucho ${MAX_DIAS} días de una vez.`);
    if (!turnosPedidos.length) return setError("Añade al menos una hora de inicio.");
    const malas = leerTurnos(inicios).filter((t) => !esHora(inicioDeTurno(t) || t));
    if (malas.length) return setError(`Hora no válida: ${malas.join(", ")}.`);
    if (!idsElegidos.length) return setError("Elige al menos un taller.");

    setGuardando(true);
    try {
      // Se lee lo que hay ahora mismo: si otro admin acaba de crear lo mismo, se deja como estaba
      const [clasesSnap, extrasSnap] = await Promise.all([
        get(ref(dbRealtime, "clases")),
        get(ref(dbRealtime, "turnosExtra")),
      ]);
      const clasesAhora = clasesSnap.exists() ? clasesSnap.val() || {} : {};
      const plan = planificarTurnosExtra({
        clases: clasesAhora,
        claseIds: idsElegidos,
        fechas,
        turnos: turnosPedidos.map((inicio) => ({ inicio, minimo: leerTurnos(minimos).map(inicioDeTurno).includes(inicio) })),
        extrasActuales: extrasSnap.exists() ? extrasSnap.val() || {} : {},
        motivo: motivo.trim(),
        hoy,
      });
      const resumen = resumenPlan(plan, clasesAhora);

      if (!plan.creados.length) {
        setError(resumen || "No había nada que crear.");
        return;
      }

      await update(ref(dbRealtime), plan.cambios);
      avisar(resumen);
      setInicios("");
      setMinimos("");
      await cargar();
      await onCambio?.();
    } catch (err) {
      console.error("Error al crear los turnos:", err);
      setError(
        err?.code === "PERMISSION_DENIED"
          ? "No tienes permiso para crear turnos. Revisa que las reglas de la base de datos estén desplegadas."
          : "No se han podido crear los turnos."
      );
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async (grupo, ids) => {
    const nombres = nombresDe(ids, clases);
    const ok = await preguntar(
      `¿Quitar el turno de las ${grupo.inicio} del ${fechaDMA(grupo.fecha)} en ${
        ids.length === 1 ? `«${nombres[0]}»` : `${ids.length} talleres`
      }? Las reservas que ya tenga se conservan.`
    );
    if (!ok) return;
    try {
      await update(ref(dbRealtime), cambiosParaQuitar(grupo, ids));
      await cargar();
      await onCambio?.();
    } catch (err) {
      console.error("Error al quitar el turno:", err);
      avisar("No se ha podido quitar el turno.");
    }
  };

  const grupos = useMemo(
    () => agruparTurnosExtra(extras, { desde: hoy, fechas: conRango ? null : fechasFijas }),
    [extras, hoy, conRango, fechasFijas]
  );
  const total = talleres.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-tinta-suave">
        Crea un turno nuevo en esos días: aparece como uno más del horario del taller, aunque ese día no dé clase.
        Solo pones la hora de inicio; la de fin la pone la duración de cada taller. Si un taller ya tiene un turno a
        esa hora, no se crea y se deja el que estaba.
      </p>

      {conRango && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="turno-extra-desde" className={etiqueta}>Fecha inicio</label>
            <input
              id="turno-extra-desde"
              type="date"
              className={input}
              min={hoy}
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value);
                if (!hasta || hasta < e.target.value) setHasta(e.target.value);
              }}
            />
          </div>
          <div>
            <label htmlFor="turno-extra-hasta" className={etiqueta}>Fecha fin</label>
            <input
              id="turno-extra-hasta"
              type="date"
              className={input}
              min={desde || hoy}
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>
          <p className={ayuda + " sm:col-span-2"}>
            El turno se crea en todos los días del rango, también fines de semana.
            {fechas.length > 0 && ` Son ${fechas.length} día${fechas.length !== 1 ? "s" : ""}.`}
          </p>
        </div>
      )}

      <div>
        <p className={etiqueta}>Hora de inicio</p>
        <EditorTurnos
          id="turno-extra-inicios"
          value={inicios}
          onChange={setInicios}
          minimo={minimos}
          onMinimoChange={setMinimos}
          soloInicio
          textoVacio="Sin horas"
        />
        <p className={ayuda}>
          Marca «Mín.» en los turnos que solo se reservan con el mínimo de personas del taller (salen en azul hasta que
          una reserva llega a ese mínimo).
        </p>
        {finales.length > 0 && talleres.length > 0 && (
          <ul className={ayuda + " space-y-0.5"}>
            {finales.map(({ inicio, fines }) => (
              <li key={inicio}>
                {inicio}:{" "}
                {fines
                  .map(({ d, fin }) => (fin ? `acaba a las ${fin} (${textoDuracion(d)})` : `no cabe (${textoDuracion(d)})`))
                  .join(" · ")}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className={etiqueta}>Talleres</p>
        <label className="flex items-center gap-2 text-sm mb-1.5">
          <input type="radio" name="turno-extra-talleres" checked={todos} onChange={() => setTodos(true)} />
          Todos los talleres y bonos{total ? ` (${total})` : ""}
        </label>
        <label className="flex items-center gap-2 text-sm mb-2">
          <input type="radio" name="turno-extra-talleres" checked={!todos} onChange={() => setTodos(false)} />
          Elegir talleres
        </label>
        {!todos && (
          <div className="rounded-xl border border-linea bg-crema p-3 space-y-1.5 max-h-64 overflow-auto">
            <div className="flex gap-3 text-xs pb-1">
              <button type="button" className="underline" onClick={() => setElegidos(talleres.map((t) => t.id))}>
                Marcar todos
              </button>
              <button type="button" className="underline" onClick={() => setElegidos([])}>
                Quitar todos
              </button>
            </div>
            {talleres.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={elegidos.includes(t.id)} onChange={() => alternarTaller(t.id)} />
                <span>
                  {t.nombre}
                  <span className="text-tinta-suave">
                    {" "}· {textoDuracion(t.duracion)}
                    {t.bono ? " · bono" : ""}
                    {t.oculta ? " · oculto" : ""}
                  </span>
                </span>
              </label>
            ))}
            {!talleres.length && !cargando && <p className="text-sm text-tinta-suave">No hay talleres.</p>}
          </div>
        )}
        <p className={ayuda}>
          Talleres (también los de varias sesiones) y bonos del panel. Los monográficos tienen fechas fijas y no entran.
        </p>
      </div>

      <div>
        <label htmlFor="turno-extra-motivo" className={etiqueta}>Motivo (opcional)</label>
        <input
          id="turno-extra-motivo"
          className={input}
          value={motivo}
          maxLength={80}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: apertura especial, puente, grupo confirmado…"
        />
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={guardando || cargando}
        onClick={crear}
        className="px-5 py-2.5 rounded-full bg-tinta text-white font-bold text-sm disabled:opacity-50"
      >
        {guardando ? "Creando…" : "Crear turno"}
      </button>

      <div className="pt-3 border-t border-arena space-y-2">
        <h3 className="font-bold text-sm text-tinta">
          {conRango ? "Turnos creados a mano" : "Turnos creados en estos días"}
        </h3>
        {!grupos.length ? (
          <p className="text-sm text-tinta-suave">No hay turnos creados{conRango ? "" : " en estos días"}.</p>
        ) : (
          <ul className="space-y-2">
            {grupos.map((g) => {
              const todosLosTalleres = total > 0 && g.talleres.length >= total;
              const nombres = nombresDe(g.talleres, clases);
              return (
                <li key={`${g.fecha}-${g.inicio}-${g.minimo}`} className="rounded-xl border border-linea bg-crema p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-tinta">
                      {fechaDMA(g.fecha)} · {g.inicio}
                      {g.minimo && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-sky-600 text-white text-[11px] font-bold">Mín.</span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => quitar(g, g.talleres)}
                      className="text-xs text-red-700 underline"
                    >
                      Quitar{g.talleres.length > 1 ? ` (${g.talleres.length} talleres)` : ""}
                    </button>
                  </div>
                  {g.motivo && <p className="text-xs text-tinta-suave">{g.motivo}</p>}
                  <p className="text-xs text-tinta-suave mt-1">
                    {todosLosTalleres ? `Todos los talleres (${g.talleres.length})` : "Talleres:"}
                  </p>
                  {!todosLosTalleres && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {g.talleres.map((id, i) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-white border border-linea text-xs"
                        >
                          {nombres[i]}
                          {g.talleres.length > 1 && (
                            <button
                              type="button"
                              aria-label={`Quitar el turno de ${nombres[i]}`}
                              onClick={() => quitar(g, [id])}
                              className="w-4 h-4 rounded-full leading-none hover:bg-black/10"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
