// src/ReprogramarReserva.jsx
// Pantalla común para reprogramar desde el perfil, la misma para una reserva normal
// (incluida la primera sesión de un taller de varias sesiones) y para una sesión de bono:
//   /reprogramar/reserva/:orderId[?sesion=N]
//   /reprogramar/bono/:bonoId?reserva=<id de la reserva>
// Los días y turnos los calcula el servidor (mismas reglas que /gestionar-reserva):
// api/cambiar-fecha.js para reservas y api/_bonoSesionServidor.js para bonos.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import PantallaReserva from "./components/PantallaReserva";
import CalendarioReserva from "./components/CalendarioReserva";
import SelectorTurnoReserva from "./components/SelectorTurnoReserva";
import BotonConfirmarReserva from "./components/BotonConfirmarReserva";
import { llamar, opcionesSesionBono, reprogramarSesionBono } from "./utils/canjeServidor";
import { fechaDMA } from "./utils/formatoFecha";

async function llamarCambioFecha(cuerpo) {
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

export default function ReprogramarReserva() {
  const navigate = useNavigate();
  const { tipo, id } = useParams();
  const [params] = useSearchParams();
  const reservaId = params.get("reserva") || "";
  const sesionCurso = Number(params.get("sesion")) || 0;
  const esBono = tipo === "bono";

  const [usuario, setUsuario] = useState(undefined);
  const [datos, setDatos] = useState(null); // { reserva, opciones }
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [fecha, setFecha] = useState("");
  const [turno, setTurno] = useState("");

  useEffect(() => onAuthStateChanged(auth, (u) => setUsuario(u || null)), []);

  useEffect(() => {
    if (!usuario) return;
    let activo = true;

    (async () => {
      try {
        setCargando(true);
        let respuesta;
        if (esBono) {
          respuesta = await opcionesSesionBono({ bonoId: id, reservaId });
        } else {
          // El código de la reserva y el email de la cuenta identifican la reserva
          const { codigo: c } = await llamar({ tipo: "pedido", orderId: String(id) });
          if (!usuario.email) throw new Error("Tu cuenta no tiene email: escríbenos y cambiamos la fecha.");
          if (activo) setCodigo(c);
          respuesta = await llamarCambioFecha({
            accion: "buscar",
            codigo: c,
            email: usuario.email,
            ...(sesionCurso ? { sesion: sesionCurso } : {}),
          });
        }
        if (activo) setDatos(respuesta);
      } catch (e) {
        console.error("Error al cargar la reserva:", e);
        if (activo) setError(e?.message || "No se pudo cargar la reserva.");
      } finally {
        if (activo) setCargando(false);
      }
    })();

    return () => {
      activo = false;
    };
  }, [usuario, esBono, id, reservaId, sesionCurso]);

  const opciones = useMemo(() => datos?.opciones || [], [datos]);
  const diasConPlaza = useMemo(() => new Set(opciones.map((o) => o.fecha)), [opciones]);
  const turnosDelDia = useMemo(
    () => opciones.find((o) => o.fecha === fecha)?.turnos || [],
    [opciones, fecha]
  );
  const reserva = datos?.reserva;
  const puedeCambiar = !!reserva?.puedeCambiar;

  const confirmar = async (e) => {
    e.preventDefault();
    if (!fecha || !turno) return;
    setError("");
    setGuardando(true);
    try {
      if (esBono) {
        await reprogramarSesionBono({ bonoId: id, reservaId, fecha, turno });
      } else {
        await llamarCambioFecha({
          accion: "confirmar",
          codigo,
          email: usuario.email,
          fecha,
          turno,
          ...(sesionCurso ? { sesion: sesionCurso } : {}),
        });
      }
      alert("Reserva reprogramada correctamente.");
      navigate("/perfil");
    } catch (err) {
      console.error("Error al reprogramar:", err);
      setError(err?.message || "No se pudo reprogramar la reserva.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PantallaReserva ancho="max-w-4xl">
      <h1 className="text-center font-serif text-tinta mb-4">
        <span className="block text-sm font-sans font-semibold uppercase tracking-wider text-terracota">
          Reprogramar
        </span>
        {reserva && (
          <span className="block text-3xl md:text-4xl font-bold leading-tight mt-1">{reserva.clase || "Reserva"}</span>
        )}
      </h1>

      {usuario === null ? (
        <p className="text-center text-tinta-suave py-8">Debes iniciar sesión para reprogramar.</p>
      ) : cargando || usuario === undefined ? (
        <p className="text-center text-tinta-suave py-8">Cargando reserva...</p>
      ) : !reserva ? (
        <p className="text-center text-red-600 py-8" role="alert">
          {error || "No se ha encontrado la reserva."}
        </p>
      ) : (
        <form onSubmit={confirmar} className="grid gap-6 md:grid-cols-2 md:gap-x-10">
          <div className="space-y-4">
            <div className="bg-crema border border-linea rounded-xl p-3 text-sm text-tinta">
              <p>
                <strong>Fecha actual:</strong> {fechaDMA(reserva.fecha)} · {reserva.turno}
              </p>
              {reserva.plazas > 1 && (
                <p>
                  <strong>Plazas:</strong> {reserva.plazas}
                </p>
              )}
              <p>
                <strong>Se puede hasta:</strong> {reserva.antelacionHoras} horas antes de la clase
              </p>
              {esBono && (reserva.validoDesde || reserva.validoHasta) && (
                <p>
                  <strong>Tu bono vale:</strong>{" "}
                  {reserva.validoDesde && reserva.validoHasta
                    ? `del ${fechaDMA(reserva.validoDesde)} al ${fechaDMA(reserva.validoHasta)}`
                    : reserva.validoHasta
                    ? `hasta el ${fechaDMA(reserva.validoHasta)}`
                    : `desde el ${fechaDMA(reserva.validoDesde)}`}
                </p>
              )}
            </div>

            {!puedeCambiar ? (
              <p className="text-sm text-red-600 font-medium" role="alert">
                {reserva.motivo || "Esta reserva no se puede reprogramar."}
              </p>
            ) : (
              <div>
                <p className="block font-bold text-sm mb-2">Selecciona la nueva fecha:</p>
                <p className="text-xs text-tinta-suave mb-3">
                  Los días con color tienen plazas para tu reserva. El resto aparece en gris.
                </p>
                <CalendarioReserva
                  value={fecha}
                  onChange={(iso) => {
                    setFecha(iso);
                    setTurno("");
                  }}
                  estadoDia={(iso) => ({ estado: diasConPlaza.has(iso) ? "disponible" : "sin-hueco" })}
                  desde={esBono ? reserva.validoDesde || "" : ""}
                  hasta={esBono ? reserva.validoHasta || "" : ""}
                />
                {opciones.length === 0 && (
                  <p className="mt-2 text-sm text-red-600">No hay días con plazas disponibles ahora mismo.</p>
                )}
              </div>
            )}
          </div>

          {puedeCambiar && (
            <div className="space-y-4">
              <SelectorTurnoReserva
                etiqueta="Selecciona el turno:"
                value={turno}
                onChange={setTurno}
                turnos={turnosDelDia.map((t) => t.turno)}
                deshabilitado={!fecha}
                placeholder={!fecha ? "-- Primero selecciona el día --" : "-- Elige turno --"}
              />

              <div className="bg-crema border border-linea rounded-xl p-3 text-sm text-tinta">
                <p>
                  Solo se puede reprogramar <strong>una vez</strong>.{" "}
                  {esBono ? "No se descuenta otra clase del bono ni se cobra nada más." : "El cambio no tiene coste."}
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <BotonConfirmarReserva
                guardando={guardando}
                texto="Confirmar nueva fecha"
                deshabilitado={!fecha || !turno}
              />
            </div>
          )}
        </form>
      )}
    </PantallaReserva>
  );
}
