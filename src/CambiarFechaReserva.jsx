// src/GestionarReserva.jsx
// Pestaña «Cambiar fecha» de /gestionar-reserva: el cliente cambia la fecha de su reserva sin iniciar sesión,
// con el código de reserva y el email con el que reservó. Todas las reglas las
// comprueba api/cambiar-fecha.js; aquí solo se pide, se enseñan las opciones que
// devuelve y se confirma, en tres pasos: tu reserva → nueva fecha → confirmar.
import { useEffect, useMemo, useRef, useState } from "react";
import Icono from "./components/Icono";
import { Link, useSearchParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import CalendarioReserva from "./components/CalendarioReserva";
import { useConfigEspacio } from "./configuracionEspacio";


const formatearFecha = (fechaISO) => {
  if (!fechaISO) return "";
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const texto = new Date(anio, mes - 1, dia).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

async function llamarApi(cuerpo) {
  const respuesta = await fetch("/api/cambiar-fecha", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok || !datos.ok) {
    throw new Error(datos.error || "No se pudo completar la operación. Inténtalo de nuevo.");
  }

  return datos;
}

const boton =
  "inline-flex items-center justify-center min-h-[48px] rounded-full px-6 font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-terracota focus-visible:ring-offset-2";
const botonPrincipal = `${boton} bg-terracota text-white hover:bg-terracota-oscuro disabled:opacity-50 disabled:cursor-not-allowed`;
const botonSecundario = `${boton} border border-terracota text-terracota hover:bg-terracota-suave`;
const campo =
  "mt-1 w-full min-h-[48px] border border-gray-300 rounded-xl px-4 text-base bg-white focus:outline-none focus:ring-2 focus:ring-terracota focus:border-terracota";

const PASOS = ["Tu reserva", "Nueva fecha", "Confirmar"];

function Pasos({ actual }) {
  return (
    <ol className="flex items-center gap-2 mb-6" aria-label="Progreso">
      {PASOS.map((nombre, i) => {
        const numero = i + 1;
        const hecho = numero < actual;
        const activo = numero === actual;

        return (
          <li
            key={nombre}
            className="flex items-center gap-2 flex-1 last:flex-none"
            aria-current={activo ? "step" : undefined}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                hecho || activo ? "bg-terracota text-white" : "bg-gray-200 text-tinta-suave"
              }`}
            >
              {hecho ? <Icono nombre="check" /> : numero}
            </span>
            <span
              className={`text-sm ${activo ? "font-semibold text-tinta" : "text-tinta-suave hidden sm:inline"}`}
            >
              {nombre}
            </span>
            {numero < PASOS.length && <span className="h-px flex-1 bg-gray-200" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}

function Tarjeta({ children, className = "" }) {
  return (
    <section className={`bg-white rounded-2xl border border-linea shadow-sm p-5 ${className}`}>
      {children}
    </section>
  );
}

function Aviso({ tipo = "error", children }) {
  const estilos =
    tipo === "ok"
      ? "bg-green-50 border-green-300 text-green-900"
      : tipo === "info"
      ? "bg-mostaza-suave border-mostaza text-tinta"
      : "bg-red-50 border-red-300 text-red-800";

  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`border rounded-xl p-4 text-sm ${estilos}`}>
      {children}
    </div>
  );
}

function Fila({ etiqueta, valor }) {
  if (!valor) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-tinta-suave">{etiqueta}</dt>
      <dd className="font-medium text-tinta text-right">{valor}</dd>
    </div>
  );
}

function ResumenReserva({ reserva, titulo }) {
  return (
    <Tarjeta>
      <h2 className="font-bold text-tinta mb-2">{titulo}</h2>
      <dl className="divide-y divide-gray-100">
        <Fila etiqueta={reserva.tipo === "grupo" ? "Reserva de grupo" : "Taller"} valor={reserva.clase} />
        <Fila etiqueta={reserva.tipo === "grupo" ? "Grupo" : "Opción"} valor={reserva.metodo} />
        <Fila etiqueta="Fecha" valor={formatearFecha(reserva.fecha)} />
        <Fila etiqueta="Turno" valor={reserva.turno} />
        <Fila etiqueta="Plazas" valor={String(reserva.plazas)} />
        <Fila etiqueta="Código" valor={reserva.codigo} />
      </dl>
    </Tarjeta>
  );
}

function ContactoTaller({ texto = "Escríbenos" }) {
  const { config } = useConfigEspacio();
  return (
    <a
      href={`https://wa.me/34${config.telefonoWhatsapp}`}
      target="_blank"
      rel="noreferrer"
      className="font-semibold underline"
    >
      {texto} por WhatsApp
    </a>
  );
}

export default function CambiarFechaReserva() {
  const [params] = useSearchParams();
  const { config: configEspacio } = useConfigEspacio();
  const [codigo, setCodigo] = useState(params.get("codigo") || "");
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [datos, setDatos] = useState(null); // { reserva, opciones }
  const [fecha, setFecha] = useState("");
  const [turno, setTurno] = useState("");
  const [edicionId, setEdicionId] = useState(""); // monográficos: se cambia de edición
  const [sesion, setSesion] = useState(0); // talleres de varias sesiones: la que se cambia
  const [confirmando, setConfirmando] = useState(false);
  const [cambiada, setCambiada] = useState(null); // { antes, despues }

  const pasoDos = useRef(null);

  // Desde el perfil (?codigo=…&auto=1): el email es el de la cuenta y se busca sola
  const [emailDeCuenta, setEmailDeCuenta] = useState(false);
  const busquedaAutomatica = useRef(false);
  const vieneDelPerfil = params.get("auto") === "1" && !!params.get("codigo");
  useEffect(() => {
    if (!vieneDelPerfil) return undefined;
    return onAuthStateChanged(getAuth(), (usuario) => {
      if (usuario?.email) {
        setEmail((previo) => previo || usuario.email);
        setEmailDeCuenta(true);
      }
    });
  }, [vieneDelPerfil]);

  // Solo se ofrecen los días que el servidor ha dicho que tienen sitio
  const diasConPlaza = useMemo(() => new Set(datos?.opciones.map((o) => o.fecha) || []), [datos]);
  const estadoDia = (iso) => ({ estado: diasConPlaza.has(iso) ? "disponible" : "sin-taller" });

  const turnosDelDia = useMemo(
    () => datos?.opciones.find((o) => o.fecha === fecha)?.turnos || [],
    [datos, fecha]
  );

  // Al encontrar la reserva se baja al siguiente paso
  useEffect(() => {
    if (datos) pasoDos.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [datos]);

  const esEdicion = Array.isArray(datos?.ediciones);
  // Varias sesiones reservadas juntas: primero se elige cuál cambiar
  const eligiendoSesion = Array.isArray(datos?.sesiones) && !datos?.sesionElegida;
  const edicionElegida = esEdicion ? datos.ediciones.find((e) => e.id === edicionId) || null : null;
  const paso = cambiada
    ? 3
    : datos?.reserva.puedeCambiar && (esEdicion ? edicionElegida : fecha && turno)
    ? 3
    : datos
    ? 2
    : 1;

  const buscar = async (e, numeroSesion = 0) => {
    e?.preventDefault?.();
    setError("");
    setCargando(true);

    try {
      const respuesta = await llamarApi({
        accion: "buscar",
        codigo,
        email,
        ...(numeroSesion ? { sesion: numeroSesion } : {}),
      });
      setDatos(respuesta);
      setSesion(numeroSesion);
      setFecha("");
      setTurno("");
      setEdicionId("");
      setConfirmando(false);
    } catch (err) {
      setDatos(null);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!vieneDelPerfil || !emailDeCuenta || busquedaAutomatica.current || !codigo || !email) return;
    busquedaAutomatica.current = true;
    buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vieneDelPerfil, emailDeCuenta, codigo, email]);

  const confirmar = async () => {
    setError("");
    setCargando(true);

    try {
      const respuesta = await llamarApi({
        accion: "confirmar",
        codigo,
        email,
        ...(esEdicion ? { edicionId } : { fecha, turno }),
        ...(sesion ? { sesion } : {}),
      });
      setCambiada({ antes: datos.reserva, despues: respuesta.reserva });
      setDatos(null);
      setConfirmando(false);
    } catch (err) {
      setError(err.message);
      setConfirmando(false);
    } finally {
      setCargando(false);
    }
  };

  const elegirFecha = (valor) => {
    setFecha(valor);
    setConfirmando(false);
    const turnos = datos?.opciones.find((o) => o.fecha === valor)?.turnos || [];
    setTurno(turnos.length === 1 ? turnos[0].turno : "");
  };

  const empezarDeNuevo = () => {
    setDatos(null);
    setFecha("");
    setTurno("");
    setEdicionId("");
    setConfirmando(false);
    setError("");
  };

  return (
    <>
      <div className="max-w-xl mx-auto">
        <p className="text-tinta-suave text-sm mb-5">
          Sin iniciar sesión: solo necesitas tu código de reserva y el email con el que reservaste.
        </p>

        {cambiada ? (
          <div className="space-y-4" aria-live="polite">
            <Tarjeta className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
                <Icono nombre="check" tamano={32} />
              </div>
              <h2 className="text-xl font-bold text-tinta">
                {cambiada.antes.recuperacion ? "¡Reserva recuperada!" : "¡Fecha cambiada!"}
              </h2>
              <p className="text-sm text-tinta-suave mt-1">Te esperamos el nuevo día. Guarda estos datos.</p>
            </Tarjeta>

            <Tarjeta>
              <p className="text-sm text-tinta-suave line-through">
                {formatearFecha(cambiada.antes.fecha)} · {cambiada.antes.turno}
              </p>
              <p className="text-lg font-bold text-tinta mt-1">
                {formatearFecha(cambiada.despues.fecha)} · {cambiada.despues.turno}
              </p>
              <p className="text-sm text-tinta-suave mt-2">
                {cambiada.despues.clase} · {cambiada.despues.plazas}{" "}
                {cambiada.despues.plazas === 1 ? "plaza" : "plazas"}
              </p>
              <p className="text-sm text-tinta-suave mt-1">Código: {cambiada.despues.codigo}</p>
            </Tarjeta>

            {cambiada.despues.tipo === "grupo" && (
              <Aviso tipo="info">El taller revisará el cambio y se pondrá en contacto contigo si hace falta.</Aviso>
            )}

            <Link to="/portada" className={`${botonSecundario} w-full`}>
              Volver al inicio
            </Link>
          </div>
        ) : (
          <>
            <Pasos actual={paso} />

            {!datos && (
              <Tarjeta>
                <form onSubmit={buscar} className="space-y-4">
                  <label className="block text-sm font-medium text-tinta">
                    Código de reserva
                    <input
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                      placeholder="K7M3-9QXP"
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      required
                      className={`${campo} font-mono tracking-widest uppercase`}
                    />
                    <span className="block mt-1 text-xs font-normal text-tinta-suave">
                      Lo ves al terminar de reservar, en la pantalla de confirmación.
                    </span>
                  </label>

                  <label className="block text-sm font-medium text-tinta">
                    Email de la reserva
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      autoComplete="email"
                      required
                      className={campo}
                    />
                  </label>

                  {error && <Aviso>{error}</Aviso>}

                  <button type="submit" disabled={cargando} className={`${botonPrincipal} w-full`}>
                    {cargando ? "Buscando..." : "Buscar mi reserva"}
                  </button>
                </form>

                <ul className="mt-4 space-y-1 text-xs text-tinta-suave">
                  <li>• Puedes cambiar la fecha una vez.</li>
                  <li>
                    • Se puede hasta {configEspacio.horasCambioReserva} horas antes de la clase (en bonos, {configEspacio.horasCambioBono} horas) (
                    <Link to="/politicacancelacion" className="underline text-terracota">
                      política de cancelación
                    </Link>
                    ).
                  </li>
                </ul>
              </Tarjeta>
            )}

            {datos && (
              <div ref={pasoDos} className="space-y-4 scroll-mt-20">
                {!eligiendoSesion && (
                  <ResumenReserva
                    reserva={datos.reserva}
                    titulo={datos.sesionElegida ? `Sesión ${datos.sesionElegida} de tu reserva` : "Tu reserva actual"}
                  />
                )}
                {datos.reserva.recuperacion && !eligiendoSesion && (
                  <Aviso tipo="info">
                    <p className="font-semibold">Hemos cancelado esta clase.</p>
                    <p className="mt-1">
                      No pierdes tu plaza: elige una nueva fecha sin coste
                      {datos.reserva.recuperableHasta
                        ? ` hasta el ${formatearFecha(datos.reserva.recuperableHasta)}`
                        : ""}
                      .
                    </p>
                    {datos.reserva.motivoCancelacion && (
                      <p className="mt-1">
                        <span className="font-semibold">Motivo:</span> {datos.reserva.motivoCancelacion}
                      </p>
                    )}
                  </Aviso>
                )}
                {datos.sesionElegida && !eligiendoSesion && (
                  <button
                    type="button"
                    onClick={() => buscar(null, 0)}
                    disabled={cargando}
                    className="text-sm underline text-terracota"
                  >
                    <Icono nombre="izquierda" className="mr-1" />Elegir otra sesión
                  </button>
                )}

                {eligiendoSesion ? (
                  <Tarjeta>
                    <h2 className="font-bold text-tinta mb-1">Tus sesiones</h2>
                    <p className="text-xs text-tinta-suave mb-3">
                      Esta reserva incluye {datos.sesiones.length} sesiones. Elige la que quieres cambiar: cada
                      una se cambia por separado, una vez, y respeta el tiempo mínimo
                      que hay entre sesiones.
                    </p>
                    <ul className="space-y-3">
                      {datos.sesiones.map((s) => (
                        <li key={s.sesion} className="rounded-xl border border-gray-200 p-3">
                          <p className="text-sm font-semibold text-tinta">Sesión {s.sesion}</p>
                          <p className="text-sm text-tinta">
                            {formatearFecha(s.fecha)} · {s.turno}
                          </p>
                          {s.diasDesdeAnterior > 0 && (
                            <p className="text-xs text-tinta-suave">
                              Al menos {s.diasDesdeAnterior} días después de la sesión anterior
                            </p>
                          )}
                          {s.puedeCambiar ? (
                            <button
                              type="button"
                              onClick={() => buscar(null, s.sesion)}
                              disabled={cargando}
                              className={`${botonSecundario} mt-2 w-full`}
                            >
                              Cambiar esta sesión
                            </button>
                          ) : (
                            <p className="mt-1 text-xs text-tinta-suave">{s.motivo}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                    {error && (
                      <div className="mt-3">
                        <Aviso>{error}</Aviso>
                      </div>
                    )}
                    <p className="mt-3 text-xs text-tinta-suave">
                      <ContactoTaller texto="¿Necesitas otro cambio? Escríbenos" />
                    </p>
                  </Tarjeta>
                ) : !datos.reserva.puedeCambiar ? (
                  <Aviso tipo="info">
                    <p>{datos.reserva.motivo}</p>
                    <p className="mt-2">
                      <ContactoTaller />
                    </p>
                  </Aviso>
                ) : (esEdicion ? datos.ediciones.length === 0 : datos.opciones.length === 0) ? (
                  <Aviso tipo="info">
                    <p>Ahora mismo no hay otras fechas con plazas para tu reserva.</p>
                    <p className="mt-2">
                      <ContactoTaller texto="Escríbenos y buscamos una alternativa" />
                    </p>
                  </Aviso>
                ) : esEdicion ? (
                  <>
                    <Tarjeta>
                      <h2 className="font-bold text-tinta mb-1">Elige la nueva edición</h2>
                      <p className="text-xs text-tinta-suave mb-3">
                        Se cambian todas las sesiones de tu reserva. Estas ediciones tienen plazas para tu reserva.
                      </p>
                      <div className="grid gap-3">
                        {datos.ediciones.map((ed, i) => (
                          <button
                            key={ed.id}
                            type="button"
                            aria-pressed={edicionId === ed.id}
                            onClick={() => {
                              setEdicionId(ed.id);
                              setConfirmando(false);
                            }}
                            className={`text-left rounded-xl border p-3 text-sm ${
                              edicionId === ed.id
                                ? "border-terracota bg-terracota-suave"
                                : "border-gray-300 bg-white hover:border-terracota"
                            }`}
                          >
                            <strong>Edición {i + 1}</strong>
                            <ul className="mt-1 list-disc ml-5 text-tinta">
                              {ed.fechas.map((f) => (
                                <li key={`${f.fecha}-${f.turno}`}>
                                  {formatearFecha(f.fecha)} · {f.turno}
                                </li>
                              ))}
                            </ul>
                          </button>
                        ))}
                      </div>
                    </Tarjeta>

                    {edicionElegida && (
                      <Tarjeta className="border-terracota">
                        <h2 className="font-bold text-tinta mb-3">Resumen del cambio</h2>
                        <p className="text-sm text-tinta-suave line-through">
                          Desde {formatearFecha(datos.reserva.fecha)}
                        </p>
                        <p className="text-lg font-bold text-tinta">
                          Edición del {formatearFecha(edicionElegida.fechas[0].fecha)} al{" "}
                          {formatearFecha(edicionElegida.fechas[edicionElegida.fechas.length - 1].fecha)}
                        </p>

                        {error && (
                          <div className="mt-3">
                            <Aviso>{error}</Aviso>
                          </div>
                        )}

                        {!confirmando ? (
                          <button
                            type="button"
                            onClick={() => setConfirmando(true)}
                            className={`${botonPrincipal} w-full mt-4`}
                          >
                            {datos.reserva.recuperacion ? "Reservar en la nueva fecha" : "Cambiar mi reserva"}
                          </button>
                        ) : (
                          <div className="mt-4 rounded-xl bg-mostaza-suave border border-mostaza p-4">
                            <p className="text-sm text-tinta font-medium">
                              {datos.reserva.recuperacion
                                ? "¿Confirmas la nueva fecha para tu reserva?"
                                : "Solo puedes cambiar la fecha una vez. ¿Confirmas el cambio?"}
                            </p>
                            <div className="mt-3 flex flex-col sm:flex-row gap-2">
                              <button
                                type="button"
                                onClick={confirmar}
                                disabled={cargando}
                                className={`${botonPrincipal} flex-1`}
                              >
                                {cargando ? "Guardando..." : "Sí, cambiar"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmando(false)}
                                disabled={cargando}
                                className={`${botonSecundario} flex-1`}
                              >
                                Volver
                              </button>
                            </div>
                          </div>
                        )}
                      </Tarjeta>
                    )}
                  </>
                ) : (
                  <>
                    <Tarjeta>
                      <h2 className="font-bold text-tinta mb-1">Elige la nueva fecha</h2>
                      <p className="text-xs text-tinta-suave mb-3">
                        Los días con color tienen plazas para tu reserva. El resto aparece en gris.
                      </p>
                      <CalendarioReserva
                        key={datos.reserva.codigo}
                        value={fecha}
                        onChange={elegirFecha}
                        estadoDia={estadoDia}
                      />

                      {turnosDelDia.length > 0 && (
                        <fieldset className="mt-4">
                          <legend className="text-sm font-medium text-tinta mb-2">
                            Turno del {formatearFecha(fecha).toLowerCase()}
                          </legend>
                          <div className="flex flex-wrap gap-2">
                            {turnosDelDia.map((t) => (
                              <button
                                key={t.turno}
                                type="button"
                                onClick={() => {
                                  setTurno(t.turno);
                                  setConfirmando(false);
                                }}
                                aria-pressed={turno === t.turno}
                                className={`min-h-[48px] px-4 rounded-xl border text-sm font-semibold ${
                                  turno === t.turno
                                    ? "bg-terracota text-white border-terracota"
                                    : "bg-white text-tinta border-gray-300 hover:border-terracota"
                                }`}
                              >
                                {t.turno}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      )}
                    </Tarjeta>

                    {fecha && turno && (
                      <Tarjeta className="border-terracota">
                        <h2 className="font-bold text-tinta mb-3">Resumen del cambio</h2>
                        <p className="text-sm text-tinta-suave line-through">
                          {formatearFecha(datos.reserva.fecha)} · {datos.reserva.turno}
                        </p>
                        <p className="text-lg font-bold text-tinta">
                          {formatearFecha(fecha)} · {turno}
                        </p>

                        {error && (
                          <div className="mt-3">
                            <Aviso>{error}</Aviso>
                          </div>
                        )}

                        {!confirmando ? (
                          <button
                            type="button"
                            onClick={() => setConfirmando(true)}
                            className={`${botonPrincipal} w-full mt-4`}
                          >
                            {datos.reserva.recuperacion ? "Reservar en la nueva fecha" : "Cambiar mi reserva"}
                          </button>
                        ) : (
                          <div className="mt-4 rounded-xl bg-mostaza-suave border border-mostaza p-4">
                            <p className="text-sm text-tinta font-medium">
                              {datos.reserva.recuperacion
                                ? "¿Confirmas la nueva fecha para tu reserva?"
                                : "Solo puedes cambiar la fecha una vez. ¿Confirmas el cambio?"}
                            </p>
                            <div className="mt-3 flex flex-col sm:flex-row gap-2">
                              <button
                                type="button"
                                onClick={confirmar}
                                disabled={cargando}
                                className={`${botonPrincipal} flex-1`}
                              >
                                {cargando ? "Guardando..." : "Sí, cambiar"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmando(false)}
                                disabled={cargando}
                                className={`${botonSecundario} flex-1`}
                              >
                                Volver
                              </button>
                            </div>
                          </div>
                        )}
                      </Tarjeta>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={empezarDeNuevo}
                  className="block mx-auto text-sm text-tinta-suave underline hover:text-terracota"
                >
                  No es mi reserva
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
