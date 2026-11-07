// src/GestionarReserva.jsx
// /gestionar-reserva: el cliente cambia la fecha de su reserva sin iniciar sesión,
// con el código de reserva y el email con el que reservó. Todas las reglas las
// comprueba api/cambiar-fecha.js; aquí solo se pide, se enseñan las opciones que
// devuelve y se confirma, en tres pasos: tu reserva → nueva fecha → confirmar.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageContainer from "./PageContainer";
import CalendarioReserva from "./components/CalendarioReserva";

const WHATSAPP_BERTO = "34644671664";

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
  "inline-flex items-center justify-center min-h-[48px] rounded-xl px-6 font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b36a4a] focus-visible:ring-offset-2";
const botonPrincipal = `${boton} bg-[#b36a4a] text-white hover:bg-[#9e5c3f] disabled:opacity-50 disabled:cursor-not-allowed`;
const botonSecundario = `${boton} border border-[#b36a4a] text-[#b36a4a] hover:bg-[#f9ece6]`;
const campo =
  "mt-1 w-full min-h-[48px] border border-gray-300 rounded-xl px-4 text-base bg-white focus:outline-none focus:ring-2 focus:ring-[#b36a4a] focus:border-[#b36a4a]";

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
                hecho || activo ? "bg-[#b36a4a] text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {hecho ? "✓" : numero}
            </span>
            <span
              className={`text-sm ${activo ? "font-semibold text-[#3f3128]" : "text-gray-500 hidden sm:inline"}`}
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
    <section className={`bg-white rounded-2xl border border-[#eadfd2] shadow-sm p-5 ${className}`}>
      {children}
    </section>
  );
}

function Aviso({ tipo = "error", children }) {
  const estilos =
    tipo === "ok"
      ? "bg-green-50 border-green-300 text-green-900"
      : tipo === "info"
      ? "bg-yellow-50 border-yellow-300 text-yellow-900"
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
      <dt className="text-gray-500">{etiqueta}</dt>
      <dd className="font-medium text-gray-900 text-right">{valor}</dd>
    </div>
  );
}

function ResumenReserva({ reserva, titulo }) {
  return (
    <Tarjeta>
      <h2 className="font-bold text-[#7a4630] mb-2">{titulo}</h2>
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
  return (
    <a
      href={`https://wa.me/${WHATSAPP_BERTO}`}
      target="_blank"
      rel="noreferrer"
      className="font-semibold underline"
    >
      {texto} por WhatsApp
    </a>
  );
}

export default function GestionarReserva() {
  const [params] = useSearchParams();
  const [codigo, setCodigo] = useState(params.get("codigo") || "");
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const [datos, setDatos] = useState(null); // { reserva, opciones }
  const [fecha, setFecha] = useState("");
  const [turno, setTurno] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [cambiada, setCambiada] = useState(null); // { antes, despues }

  const pasoDos = useRef(null);

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

  const paso = cambiada ? 3 : datos?.reserva.puedeCambiar && fecha && turno ? 3 : datos ? 2 : 1;

  const buscar = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const respuesta = await llamarApi({ accion: "buscar", codigo, email });
      setDatos(respuesta);
      setFecha("");
      setTurno("");
      setConfirmando(false);
    } catch (err) {
      setDatos(null);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async () => {
    setError("");
    setCargando(true);

    try {
      const respuesta = await llamarApi({ accion: "confirmar", codigo, email, fecha, turno });
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
    setConfirmando(false);
    setError("");
  };

  return (
    <PageContainer>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-[#3f3128] mb-1">Cambiar la fecha de mi reserva</h1>
        <p className="text-gray-600 text-sm mb-5">
          Sin iniciar sesión: solo necesitas tu código de reserva y el email con el que reservaste.
        </p>

        {cambiada ? (
          <div className="space-y-4" aria-live="polite">
            <Tarjeta className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
                ✓
              </div>
              <h2 className="text-xl font-bold text-[#3f3128]">¡Fecha cambiada!</h2>
              <p className="text-sm text-gray-600 mt-1">Te esperamos el nuevo día. Guarda estos datos.</p>
            </Tarjeta>

            <Tarjeta>
              <p className="text-sm text-gray-500 line-through">
                {formatearFecha(cambiada.antes.fecha)} · {cambiada.antes.turno}
              </p>
              <p className="text-lg font-bold text-[#7a4630] mt-1">
                {formatearFecha(cambiada.despues.fecha)} · {cambiada.despues.turno}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {cambiada.despues.clase} · {cambiada.despues.plazas}{" "}
                {cambiada.despues.plazas === 1 ? "plaza" : "plazas"}
              </p>
              <p className="text-sm text-gray-500 mt-1">Código: {cambiada.despues.codigo}</p>
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
                  <label className="block text-sm font-medium text-gray-800">
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
                    <span className="block mt-1 text-xs font-normal text-gray-500">
                      Lo ves al terminar de reservar, en la pantalla de confirmación.
                    </span>
                  </label>

                  <label className="block text-sm font-medium text-gray-800">
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

                <ul className="mt-4 space-y-1 text-xs text-gray-500">
                  <li>• Puedes cambiar la fecha una vez.</li>
                  <li>
                    • Se puede hasta 72 horas antes de la clase (
                    <Link to="/politicacancelacion" className="underline text-[#b36a4a]">
                      política de cancelación
                    </Link>
                    ).
                  </li>
                </ul>
              </Tarjeta>
            )}

            {datos && (
              <div ref={pasoDos} className="space-y-4 scroll-mt-20">
                <ResumenReserva reserva={datos.reserva} titulo="Tu reserva actual" />

                {!datos.reserva.puedeCambiar ? (
                  <Aviso tipo="info">
                    <p>{datos.reserva.motivo}</p>
                    <p className="mt-2">
                      <ContactoTaller />
                    </p>
                  </Aviso>
                ) : datos.opciones.length === 0 ? (
                  <Aviso tipo="info">
                    <p>Ahora mismo no hay otras fechas con plazas para tu reserva.</p>
                    <p className="mt-2">
                      <ContactoTaller texto="Escríbenos y buscamos una alternativa" />
                    </p>
                  </Aviso>
                ) : (
                  <>
                    <Tarjeta>
                      <h2 className="font-bold text-[#7a4630] mb-1">Elige la nueva fecha</h2>
                      <p className="text-xs text-gray-500 mb-3">
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
                          <legend className="text-sm font-medium text-gray-800 mb-2">
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
                                    ? "bg-[#b36a4a] text-white border-[#b36a4a]"
                                    : "bg-white text-gray-800 border-gray-300 hover:border-[#b36a4a]"
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
                      <Tarjeta className="border-[#b36a4a]">
                        <h2 className="font-bold text-[#7a4630] mb-3">Resumen del cambio</h2>
                        <p className="text-sm text-gray-500 line-through">
                          {formatearFecha(datos.reserva.fecha)} · {datos.reserva.turno}
                        </p>
                        <p className="text-lg font-bold text-[#3f3128]">
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
                            Cambiar mi reserva
                          </button>
                        ) : (
                          <div className="mt-4 rounded-xl bg-yellow-50 border border-yellow-300 p-4">
                            <p className="text-sm text-yellow-900 font-medium">
                              Solo puedes cambiar la fecha una vez. ¿Confirmas el cambio?
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
                  className="block mx-auto text-sm text-gray-500 underline hover:text-[#b36a4a]"
                >
                  No es mi reserva
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
