// src/GestionarReserva.jsx
// /gestionar-reserva: el cliente cambia la fecha de su reserva sin iniciar sesión,
// con el código de reserva y el email con el que reservó. Todas las reglas las
// comprueba api/cambiar-fecha.js; aquí solo se pide, se enseñan las opciones que
// devuelve y se confirma.
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageContainer from "./PageContainer";

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

function Aviso({ tipo = "error", children }) {
  const estilos =
    tipo === "ok"
      ? "bg-green-50 border-green-300 text-green-800"
      : tipo === "info"
      ? "bg-yellow-50 border-yellow-300 text-yellow-900"
      : "bg-red-50 border-red-300 text-red-800";

  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`border rounded-xl p-4 text-sm ${estilos}`}>
      {children}
    </div>
  );
}

function DatosReserva({ reserva, titulo }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-800">
      <p className="font-semibold text-base text-[#7a4630] mb-2">{titulo}</p>
      <p>
        <strong>{reserva.tipo === "grupo" ? "Grupo:" : "Taller:"}</strong> {reserva.clase}
        {reserva.metodo ? ` · ${reserva.metodo}` : ""}
      </p>
      <p>
        <strong>Fecha:</strong> {formatearFecha(reserva.fecha)}
      </p>
      <p>
        <strong>Turno:</strong> {reserva.turno}
      </p>
      <p>
        <strong>Plazas:</strong> {reserva.plazas}
      </p>
      <p className="text-gray-500 mt-1">Código de reserva: {reserva.codigo}</p>
    </div>
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
  const [cambiada, setCambiada] = useState(null);

  const turnosDelDia = useMemo(
    () => datos?.opciones.find((o) => o.fecha === fecha)?.turnos || [],
    [datos, fecha]
  );

  const buscar = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const respuesta = await llamarApi({ accion: "buscar", codigo, email });
      setDatos(respuesta);
      setFecha("");
      setTurno("");
    } catch (err) {
      setDatos(null);
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const confirmar = async () => {
    if (!fecha || !turno) return;

    const ok = window.confirm(
      `¿Cambiar tu reserva al ${formatearFecha(fecha)} (${turno})? Solo puedes hacer este cambio una vez.`
    );
    if (!ok) return;

    setError("");
    setCargando(true);

    try {
      const respuesta = await llamarApi({ accion: "confirmar", codigo, email, fecha, turno });
      setCambiada(respuesta.reserva);
      setDatos(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const elegirFecha = (valor) => {
    setFecha(valor);
    const turnos = datos?.opciones.find((o) => o.fecha === valor)?.turnos || [];
    setTurno(turnos.length === 1 ? turnos[0].turno : "");
  };

  return (
    <PageContainer>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-[#7a4630] mb-2">Cambiar la fecha de mi reserva</h1>
        <p className="text-gray-600 text-sm mb-6">
          No hace falta iniciar sesión. Introduce el código de reserva y el email con el que reservaste.
          Puedes cambiar la fecha una vez, con al menos 72 horas de antelación (consulta la{" "}
          <Link to="/politicacancelacion" className="underline text-[#b36a4a]">
            política de cancelación
          </Link>
          ).
        </p>

        {cambiada ? (
          <div className="space-y-4">
            <Aviso tipo="ok">
              <strong>¡Listo!</strong> Hemos cambiado tu reserva. Estos son los datos nuevos.
            </Aviso>
            <DatosReserva reserva={cambiada} titulo="Tu reserva ahora" />
            <Link to="/portada" className="inline-block text-[#b36a4a] underline text-sm">
              Volver al inicio
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={buscar} className="space-y-4 bg-white rounded-xl border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700">
                Código de reserva
                <input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="K7M3-9QXP"
                  autoCapitalize="characters"
                  autoComplete="off"
                  required
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Email de la reserva
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </label>

              <button
                type="submit"
                disabled={cargando}
                className="bg-[#b36a4a] hover:bg-[#9e5c3f] disabled:opacity-60 text-white font-bold px-5 py-2 rounded-lg"
              >
                {cargando && !datos ? "Buscando..." : "Buscar mi reserva"}
              </button>
            </form>

            {error && (
              <div className="mt-4">
                <Aviso>{error}</Aviso>
              </div>
            )}

            {datos && (
              <div className="mt-6 space-y-4">
                <DatosReserva reserva={datos.reserva} titulo="Tu reserva" />

                {!datos.reserva.puedeCambiar ? (
                  <Aviso tipo="info">{datos.reserva.motivo}</Aviso>
                ) : datos.opciones.length === 0 ? (
                  <Aviso tipo="info">
                    Ahora mismo no hay otras fechas con plazas para tu reserva. Escríbenos y buscamos una
                    alternativa.
                  </Aviso>
                ) : (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Nueva fecha
                      <select
                        value={fecha}
                        onChange={(e) => elegirFecha(e.target.value)}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
                      >
                        <option value="">Elige un día</option>
                        {datos.opciones.map((o) => (
                          <option key={o.fecha} value={o.fecha}>
                            {formatearFecha(o.fecha)}
                          </option>
                        ))}
                      </select>
                    </label>

                    {turnosDelDia.length > 0 && (
                      <fieldset>
                        <legend className="text-sm font-medium text-gray-700 mb-1">Turno</legend>
                        <div className="flex flex-wrap gap-2">
                          {turnosDelDia.map((t) => (
                            <button
                              key={t.turno}
                              type="button"
                              onClick={() => setTurno(t.turno)}
                              aria-pressed={turno === t.turno}
                              className={`px-3 py-2 rounded-lg border text-sm ${
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

                    <button
                      type="button"
                      onClick={confirmar}
                      disabled={!fecha || !turno || cargando}
                      className="bg-[#b36a4a] hover:bg-[#9e5c3f] disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg"
                    >
                      {cargando ? "Guardando..." : "Confirmar cambio"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
