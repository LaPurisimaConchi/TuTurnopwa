// src/AdminEspacio.jsx
// Ajustes del espacio: aforo total, tope de torno, mínimo para reservar en grupo,
// plazos de cambio/cancelación y horarios por defecto de los talleres nuevos. Se guardan en configuracionEspacio.
import React, { useEffect, useState } from "react";
import { ref, get, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import { preguntar, avisar } from "./utils/avisos";
import { abreDias } from "./utils/turnosFecha";
import BotonVolver from "./BotonVolver";
import EditorTurnos from "./components/EditorTurnos";
import OcupacionProximosDias from "./components/OcupacionProximosDias";
import { cargarConfigEspacio, guardarConfigEspacio } from "./configuracionEspacio";
import { normalizarTelefonoWhatsapp, telefonoVisible } from "./utils/configEspacio";
import { DIAS, horariosDesdeTexto, leerTurnos, turnoInvalido } from "./utils/fichaTaller";

const input = "w-full border border-gray-300 rounded-xl px-3 py-2 text-base bg-white";
const label = "block font-bold text-sm mb-1 text-tinta";
const seccion = "bg-white rounded-2xl border border-linea p-5 shadow-sm space-y-4";
const ayuda = "text-xs text-tinta-suave mt-1";

const aTexto = (config) => ({
  aforoTotal: String(config.aforoTotal),
  maxTorno: String(config.maxTorno),
  minPersonasGrupo: String(config.minPersonasGrupo),
  minutosReserva: String(config.minutosReserva),
  horasCambioReserva: String(config.horasCambioReserva),
  horasCambioBono: String(config.horasCambioBono),
  diasVentanaReprogramar: String(config.diasVentanaReprogramar),
  mesesCaducidadTarjeta: String(config.mesesCaducidadTarjeta),
  telefonoWhatsapp: telefonoVisible(config.telefonoWhatsapp),
  horariosDefecto: { ...config.horariosDefecto },
  horariosMinimoDefecto: { ...config.horariosMinimoDefecto },
});

export default function AdminEspacio() {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
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

  const cambiarHorarioMinimo = (dia, valor) => {
    setMensaje("");
    setForm((prev) => ({ ...prev, horariosMinimoDefecto: { ...prev.horariosMinimoDefecto, [dia]: valor } }));
  };

  // Sustituye el horario semanal (y los turnos que piden el mínimo) de todos los talleres
  // del panel por los de esta caja, tal como se ven ahora, y guarda los ajustes del formulario
  const aplicarATodos = async () => {
    const config = leerFormulario();
    if (!config) return;

    const invalidos = DIAS.flatMap(([dia]) => leerTurnos(form.horariosDefecto[dia])).filter(turnoInvalido);
    if (invalidos.length) return setError(`Revisa los turnos (formato 17:30-20:30): ${invalidos.join(", ")}`);
    const { horarios, horariosMinimo, turnos } = horariosDesdeTexto(form.horariosDefecto, form.horariosMinimoDefecto);
    if (!Object.keys(horarios).length) {
      return setError("Añade al menos un día con turnos antes de aplicar los horarios a los talleres.");
    }

    setAplicando(true);
    try {
      const snap = await get(ref(dbRealtime, "clases"));
      const clases = snap.exists() ? snap.val() || {} : {};
      const ids = Object.keys(clases).filter((id) => abreDias(clases[id]));
      if (!ids.length) return setError("No hay talleres del panel a los que aplicar los horarios.");

      const seguro = await preguntar(
        `Vas a sustituir el horario semanal y los turnos que piden el mínimo de personas de ${ids.length} ${
          ids.length === 1 ? "taller" : "talleres"
        } por los de esta caja, que también se guardan como horarios por defecto. Los horarios que tienen ahora se pierden. No se tocan sus reservas. ¿Aplicar?`
      );
      if (!seguro) return;

      const cambios = {};
      ids.forEach((id) => {
        cambios[`clases/${id}/horarios`] = horarios;
        cambios[`clases/${id}/horariosMinimo`] = Object.keys(horariosMinimo).length ? horariosMinimo : null;
        cambios[`clases/${id}/turnos`] = turnos;
      });
      await update(ref(dbRealtime), cambios);
      setForm(aTexto(await guardarConfigEspacio(config)));
      setVersion((v) => v + 1);
      avisar(`Horarios aplicados a ${ids.length} ${ids.length === 1 ? "taller" : "talleres"}.`);
    } catch (err) {
      console.error("Error al aplicar los horarios a los talleres:", err);
      setError(
        err?.code === "PERMISSION_DENIED"
          ? "No tienes permiso para cambiar los talleres."
          : "No se han podido aplicar los horarios a los talleres."
      );
    } finally {
      setAplicando(false);
    }
  };

  const entero = (valor) => {
    const n = Number(valor);
    return Number.isInteger(n) ? n : NaN;
  };

  // Valida el formulario entero y devuelve la configuración a guardar (null si algo falla,
  // y entonces ya está el error en pantalla)
  const leerFormulario = () => {
    setError("");
    setMensaje("");
    const fallar = (texto) => {
      setError(texto);
      return null;
    };


    const aforoTotal = entero(form.aforoTotal);
    const maxTorno = entero(form.maxTorno);
    const minPersonasGrupo = entero(form.minPersonasGrupo);
    const minutosReserva = entero(form.minutosReserva);
    const horasCambioReserva = entero(form.horasCambioReserva);
    const horasCambioBono = entero(form.horasCambioBono);
    const diasVentanaReprogramar = entero(form.diasVentanaReprogramar);
    const mesesCaducidadTarjeta = entero(form.mesesCaducidadTarjeta);

    if (!(aforoTotal >= 1 && aforoTotal <= 500)) {
      return fallar("El aforo total debe ser un número entre 1 y 500.");
    }
    if (!(maxTorno >= 0 && maxTorno <= aforoTotal)) {
      return fallar("Las plazas de torno deben estar entre 0 y el aforo total.");
    }
    if (!(minPersonasGrupo >= 2 && minPersonasGrupo <= 45)) {
      return fallar("El mínimo de personas para un grupo debe estar entre 2 y 45.");
    }
    if (!(minutosReserva >= 1 && minutosReserva <= 120)) {
      return fallar("Los minutos de reserva de plaza deben estar entre 1 y 120.");
    }
    const horasValidas = [horasCambioReserva, horasCambioBono].every(
      (h) => h >= 0 && h <= 720
    );
    if (!horasValidas) {
      return fallar("Las horas de antelación deben ser un número entre 0 y 720.");
    }

    if (!(diasVentanaReprogramar >= 1 && diasVentanaReprogramar <= 730)) {
      return fallar("Los días por delante para reprogramar deben estar entre 1 y 730.");
    }

    if (!(mesesCaducidadTarjeta >= 1 && mesesCaducidadTarjeta <= 60)) {
      return fallar("Los meses de validez de las tarjetas regalo deben estar entre 1 y 60.");
    }

    const telefonoWhatsapp = normalizarTelefonoWhatsapp(form.telefonoWhatsapp);
    if (!telefonoWhatsapp) {
      return fallar("El WhatsApp del taller debe ser un teléfono español de 9 cifras (por ejemplo, 644 671 664).");
    }

    return {
      aforoTotal,
      maxTorno,
      minPersonasGrupo,
      minutosReserva,
      horasCambioReserva,
      horasCambioBono,
      diasVentanaReprogramar,
      mesesCaducidadTarjeta,
      telefonoWhatsapp,
      horariosDefecto: form.horariosDefecto,
      horariosMinimoDefecto: form.horariosMinimoDefecto,
    };
  };

  const guardar = async (e) => {
    e.preventDefault();
    const config = leerFormulario();
    if (!config) return;

    setGuardando(true);
    try {
      const guardada = await guardarConfigEspacio(config);
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
    <div className="bg-crema min-h-screen px-4 py-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <BotonVolver volverA="/admin-dashboard" />

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-tinta font-serif">Espacio</h1>
          <p className="text-sm text-tinta-suave mt-1">
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
          <p className="text-tinta-suave">Cargando…</p>
        ) : (
          <form onSubmit={guardar} className="space-y-5">
            <section className={seccion}>
              <h2 className="text-lg font-semibold text-tinta">Plazas</h2>

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
              <h2 className="text-lg font-semibold text-tinta">Contacto</h2>
              <div>
                <label htmlFor="esp-whatsapp" className={label}>
                  WhatsApp del taller
                </label>
                <input
                  id="esp-whatsapp"
                  type="tel"
                  inputMode="tel"
                  className={input}
                  value={form.telefonoWhatsapp}
                  onChange={(e) => cambiar("telefonoWhatsapp", e.target.value)}
                />
                <p className={ayuda}>
                  Es el número de toda la web: el botón verde, el perfil («Contacto» y «Mi
                  pieza»), las reservas de grupo y los cambios de fecha.
                </p>
              </div>
            </section>

            <section className={seccion}>
              <h2 className="text-lg font-semibold text-tinta">Reprogramar reservas</h2>
              <p className="text-sm text-tinta-suave">
                Horas mínimas de antelación (antes de que empiece la clase) para que un
                cliente pueda reprogramar su reserva. Las reservas normales solo se reprograman; las de bono también se pueden cancelar.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="esp-horas-reserva" className={label}>
                    Reprogramar una reserva (horas)
                  </label>
                  <input
                    id="esp-horas-reserva"
                    type="number"
                    min="0"
                    max="720"
                    className={input}
                    value={form.horasCambioReserva}
                    onChange={(e) => cambiar("horasCambioReserva", e.target.value)}
                  />
                  <p className={ayuda}>Reservas normales y talleres monográficos. Por defecto, 24 horas.</p>
                </div>

                <div>
                  <label htmlFor="esp-horas-bono" className={label}>
                    Reprogramar o cancelar una reserva de bono (horas)
                  </label>
                  <input
                    id="esp-horas-bono"
                    type="number"
                    min="0"
                    max="720"
                    className={input}
                    value={form.horasCambioBono}
                    onChange={(e) => cambiar("horasCambioBono", e.target.value)}
                  />
                  <p className={ayuda}>Clases reservadas con un bono. Por defecto, 3 horas.</p>
                </div>

                <div>
                  <label htmlFor="esp-dias-ventana" className={label}>
                    Días por delante para elegir la nueva fecha
                  </label>
                  <input
                    id="esp-dias-ventana"
                    type="number"
                    min="1"
                    max="730"
                    className={input}
                    value={form.diasVentanaReprogramar}
                    onChange={(e) => cambiar("diasVentanaReprogramar", e.target.value)}
                  />
                  <p className={ayuda}>
                    Hasta cuántos días en el futuro se puede reprogramar una reserva normal. Por
                    defecto, 90 días. Las clases de un bono no tienen este límite.
                  </p>
                </div>

                <div>
                  <label htmlFor="esp-meses-tarjeta" className={label}>
                    Validez de las tarjetas regalo (meses)
                  </label>
                  <input
                    id="esp-meses-tarjeta"
                    type="number"
                    min="1"
                    max="60"
                    className={input}
                    value={form.mesesCaducidadTarjeta}
                    onChange={(e) => cambiar("mesesCaducidadTarjeta", e.target.value)}
                  />
                  <p className={ayuda}>
                    Meses que vale una tarjeta regalo desde que se compra. Por defecto, 3. Se
                    aplica a las tarjetas que se compren a partir de ahora; las ya vendidas
                    conservan su fecha (y las anteriores a este ajuste no caducan).
                  </p>
                </div>
              </div>
            </section>

            <section className={seccion}>
              <h2 className="text-lg font-semibold text-tinta">Horarios por defecto</h2>
              <p className="text-sm text-tinta-suave">
                Se ponen solos al crear un taller nuevo. Marca con «Mín.» los turnos que solo se
                abren cuando una reserva llega al mínimo de personas del taller. Los talleres que
                ya existen no cambian, salvo que pulses «Aplicar a todos los talleres».
              </p>

              <div>
                {DIAS.map(([dia, nombreDia]) => (
                  <div
                    key={dia}
                    className="grid grid-cols-1 sm:grid-cols-[88px_1fr] items-start gap-1.5 sm:gap-3 py-2 border-b border-arena last:border-0"
                  >
                    <label htmlFor={`esp-horario-${dia}`} className="text-sm font-semibold pt-1">
                      {nombreDia}
                    </label>
                    <EditorTurnos
                      id={`esp-horario-${dia}`}
                      value={form.horariosDefecto[dia]}
                      onChange={(valor) => cambiarHorario(dia, valor)}
                      minimo={form.horariosMinimoDefecto[dia]}
                      onMinimoChange={(valor) => cambiarHorarioMinimo(dia, valor)}
                    />
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-arena space-y-2">
                <button
                  type="button"
                  onClick={aplicarATodos}
                  disabled={aplicando}
                  className="px-5 py-2.5 rounded-full border border-terracota text-terracota font-bold text-sm hover:bg-terracota hover:text-white transition disabled:opacity-60"
                >
                  {aplicando ? "Aplicando…" : "Aplicar a todos los talleres"}
                </button>
                <p className={ayuda}>
                  Sustituye el horario semanal y los turnos «Mín.» de todos los talleres del panel
                  (no los monográficos, los bonos ni los de siempre sin migrar) por los de esta caja,
                  tal como están ahora, y guarda todos los ajustes de esta página (también como horarios por defecto de los talleres nuevos). Pide confirmación antes.
                </p>
              </div>
            </section>

            {/* Barra fija abajo: el botón siempre a mano, aunque la página sea larga */}
            <div className="sticky bottom-0 z-10 -mx-4 px-4 py-3 bg-crema/95 backdrop-blur border-t border-linea flex items-center justify-between gap-3">
              <p className="text-sm min-w-0 truncate" role="status">
                {mensaje ? (
                  <span className="text-green-800 font-semibold">✓ {mensaje}</span>
                ) : (
                  <span className="text-tinta-suave hidden sm:inline">Los cambios se aplican al guardar.</span>
                )}
              </p>
              <button
                type="submit"
                disabled={guardando}
                className="shrink-0 w-full sm:w-auto px-8 py-3 rounded-full bg-terracota text-white font-bold text-base shadow-md hover:bg-terracota-oscuro active:scale-[0.98] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-terracota focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {guardando ? "Guardando…" : "Guardar ajustes"}
              </button>
            </div>
          </form>
        )}

        <OcupacionProximosDias version={version} />
      </div>
    </div>
  );
}
