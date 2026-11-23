// src/AdminEspacio.jsx
// Ajustes del espacio: aforo total, tope de torno, mínimo para reservar en grupo,
// plazos de cambio/cancelación y horarios por defecto de los talleres nuevos. Se guardan en configuracionEspacio.
import React, { useEffect, useState } from "react";
import BotonVolver from "./BotonVolver";
import EditorTurnos from "./components/EditorTurnos";
import OcupacionProximosDias from "./components/OcupacionProximosDias";
import { cargarConfigEspacio, guardarConfigEspacio } from "./configuracionEspacio";
import { normalizarTelefonoWhatsapp, telefonoVisible } from "./utils/configEspacio";
import { DIAS } from "./utils/fichaTaller";

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
  turnosDiasAbiertosDefecto: config.turnosDiasAbiertosDefecto,
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
    const horasCambioReserva = entero(form.horasCambioReserva);
    const horasCambioBono = entero(form.horasCambioBono);
    const diasVentanaReprogramar = entero(form.diasVentanaReprogramar);
    const mesesCaducidadTarjeta = entero(form.mesesCaducidadTarjeta);

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
    const horasValidas = [horasCambioReserva, horasCambioBono].every(
      (h) => h >= 0 && h <= 720
    );
    if (!horasValidas) {
      return setError("Las horas de antelación deben ser un número entre 0 y 720.");
    }

    if (!(diasVentanaReprogramar >= 1 && diasVentanaReprogramar <= 730)) {
      return setError("Los días por delante para reprogramar deben estar entre 1 y 730.");
    }

    if (!(mesesCaducidadTarjeta >= 1 && mesesCaducidadTarjeta <= 60)) {
      return setError("Los meses de validez de las tarjetas regalo deben estar entre 1 y 60.");
    }

    const telefonoWhatsapp = normalizarTelefonoWhatsapp(form.telefonoWhatsapp);
    if (!telefonoWhatsapp) {
      return setError("El WhatsApp del taller debe ser un teléfono español de 9 cifras (por ejemplo, 644 671 664).");
    }

    setGuardando(true);
    try {
      const guardada = await guardarConfigEspacio({
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
        turnosDiasAbiertosDefecto: form.turnosDiasAbiertosDefecto,
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
                    Meses que vale una tarjeta regalo desde que se compra. Por defecto, 12. Se
                    aplica a las tarjetas que se compren a partir de ahora; las ya vendidas
                    conservan su fecha (y las anteriores a este ajuste no caducan).
                  </p>
                </div>
              </div>
            </section>

            <section className={seccion}>
              <h2 className="text-lg font-semibold text-tinta">Horarios por defecto</h2>
              <p className="text-sm text-tinta-suave">
                Se ponen solos al crear un taller nuevo. Los talleres que ya existen no
                cambian.
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
                    />
                  </div>
                ))}
              </div>

              <div className="pt-3">
                <label htmlFor="esp-turnos-dias-abiertos" className="text-sm font-semibold">
                  Turnos de días abiertos
                </label>
                <EditorTurnos
                  id="esp-turnos-dias-abiertos"
                  textoVacio="Los del horario semanal de cada taller"
                  value={form.turnosDiasAbiertosDefecto}
                  onChange={(valor) => cambiar("turnosDiasAbiertosDefecto", valor)}
                />
                <p className={ayuda}>
                  Los turnos que ofrece un taller en un día sin horario que se abre con una reserva
                  del mínimo de personas (o que habilitas desde administración). Se ponen solos al
                  crear un taller nuevo; después se cambian en la ficha de cada taller.
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
