// src/ReservarSiguienteSesion.jsx
// Reserva de la siguiente sesión de un taller de varias sesiones que se reservó solo con
// la primera. Mismo formato que las demás pantallas de reserva (calendario, turno,
// plazas y botón). No tiene coste: ya se pagó con la primera sesión.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import { cargarFranja } from "./utils/disponibilidad";
import { plazasLibresFranja } from "./utils/aforo";
import { useConfigEspacio } from "./configuracionEspacio";
import { estadoDiaTaller, useContextoReserva, useDiaDeReserva } from "./utils/turnosTaller";
import { reservarSiguienteSesion, sesionesPendientes } from "./utils/canjeServidor";
import PantallaReserva from "./components/PantallaReserva";
import SelectorDiaReserva from "./components/SelectorDiaReserva";
import SelectorTurnoReserva from "./components/SelectorTurnoReserva";
import BotonConfirmarReserva from "./components/BotonConfirmarReserva";
import { fechaDMA } from "./utils/formatoFecha";

const WHATSAPP_TALLER = "34644671664";

export default function ReservarSiguienteSesion() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { config: configEspacio } = useConfigEspacio();
  const {
    fechasBloqueadas,
    fechasHabilitadas,
    reservasGrupos,
    error: errorContexto,
    cargado: contextoCargado,
  } = useContextoReserva();

  const [user, setUser] = useState(null);
  const [pendiente, setPendiente] = useState(null);
  const [hoy, setHoy] = useState("");
  const [claseConfig, setClaseConfig] = useState(null);
  const [fecha, setFecha] = useState("");
  const [turno, setTurno] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [ocupadas, setOcupadas] = useState({ total: 0, torno: 0 });
  const [plazasListas, setPlazasListas] = useState(false);
  const [errorPlazas, setErrorPlazas] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (firebaseUser) => setUser(firebaseUser || null));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelado = false;

    (async () => {
      try {
        setCargando(true);
        const datos = await sesionesPendientes();
        const encontrada = (datos.sesiones || []).find((s) => s.orderId === orderId) || null;
        if (cancelado) return;

        setHoy(datos.hoy || "");
        setPendiente(encontrada);

        if (encontrada?.claseId) {
          const claseSnap = await get(ref(dbRealtime, `clases/${encontrada.claseId}`));
          if (!cancelado) setClaseConfig(claseSnap.exists() ? claseSnap.val() : null);
        }
      } catch (error) {
        console.error("Error al cargar la sesión pendiente:", error);
        if (!cancelado) setPendiente(null);
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [user, orderId]);

  const clase = useMemo(() => claseConfig || { horarios: {} }, [claseConfig]);
  const disponible = pendiente?.fechaDisponible || "";
  const yaSePuede = !!pendiente && (!disponible || !hoy || hoy >= disponible);

  const { turnosDisponibles, fechaHabilitadaManual, fechaBloqueada, diaNoDisponible } = useDiaDeReserva({
    clase,
    fecha,
    fechasBloqueadas,
    fechasHabilitadas,
    reservasGrupos,
  });

  // Plazas libres del turno elegido (las mismas que reservó la primera sesión)
  const esTorno = /torno/i.test(claseConfig?.modalidad || "");
  const plazasReserva = Number(pendiente?.plazas || 1);
  const plazasQuedan = plazasLibresFranja(
    ocupadas,
    {
      aforoTotal: ocupadas.aforoTotal ?? configEspacio.aforoTotal,
      maxTorno: ocupadas.maxTorno ?? configEspacio.maxTorno,
    },
    { conTorno: esTorno }
  ).reservables;

  useEffect(() => {
    if (!fecha || !turno) {
      setOcupadas({ total: 0, torno: 0 });
      setPlazasListas(false);
      setErrorPlazas(false);
      return;
    }

    let cancelado = false;
    setPlazasListas(false);

    cargarFranja(fecha, turno)
      .then((cuentas) => {
        if (cancelado) return;
        setOcupadas(cuentas);
        setErrorPlazas(false);
        setPlazasListas(true);
      })
      .catch((error) => {
        console.error("Error al contar plazas:", error);
        if (!cancelado) setErrorPlazas(true);
      });

    return () => {
      cancelado = true;
    };
  }, [fecha, turno]);

  const handleReservar = async (e) => {
    e.preventDefault();

    if (!pendiente || !yaSePuede) {
      alert("Todavía no puedes reservar esta sesión.");
      return;
    }
    if (errorContexto) {
      alert("No se ha podido comprobar la disponibilidad. Recarga la página e inténtalo de nuevo.");
      return;
    }
    if (!fecha || !turno) {
      alert("Selecciona una fecha y un turno.");
      return;
    }
    if (fechaBloqueada) {
      alert(`No se puede reservar el día ${fechaDMA(fecha)}. Motivo: ${fechaBloqueada.motivo || "día bloqueado"}.`);
      return;
    }
    if (diaNoDisponible) {
      alert("Este taller no se imparte el día seleccionado.");
      return;
    }

    try {
      setGuardando(true);
      await reservarSiguienteSesion({
        orderId,
        fecha,
        turno: String(turno).replaceAll(" a ", "-").trim(),
      });

      alert("Sesión reservada correctamente.");
      navigate("/perfil");
    } catch (error) {
      console.error("Error al reservar la siguiente sesión:", error);
      alert(
        error?.codigo === "franja_llena" || error?.codigo === "torno_lleno"
          ? "Esa franja se acaba de llenar. Elige otro turno u otro día."
          : error?.message || "No se pudo reservar la sesión."
      );
    } finally {
      setGuardando(false);
    }
  };

  if (!user) {
    return (
      <PantallaReserva>
        <p className="text-center text-tinta-suave py-6">Debes iniciar sesión para reservar tu sesión.</p>
      </PantallaReserva>
    );
  }

  return (
    <PantallaReserva ancho="max-w-4xl">
      <h1 className="text-center font-serif text-tinta mb-4">
        <span className="block text-sm font-sans font-semibold uppercase tracking-wider text-terracota">
          {pendiente ? `Sesión ${pendiente.numeroSesion || 2}` : "Siguiente sesión"}
        </span>
        {pendiente && (
          <span className="block text-3xl md:text-4xl font-bold leading-tight mt-1">{pendiente.clase}</span>
        )}
      </h1>

      {cargando ? (
        <p className="text-center text-tinta-suave py-8">Cargando reserva...</p>
      ) : !pendiente ? (
        <p className="text-center text-red-600 py-8">
          No hay ninguna sesión pendiente de reservar en este pedido.
        </p>
      ) : (
        <form onSubmit={handleReservar} className="grid gap-6 md:grid-cols-2 md:gap-x-10">
          <div className="space-y-4">
            <div className="bg-crema border border-linea rounded-xl p-3 text-sm text-tinta">
              <p>
                <strong>Sesión anterior:</strong> {fechaDMA(pendiente.fechaSesionAnterior) || "—"}
              </p>
              <p>
                <strong>Puedes reservar desde:</strong> {fechaDMA(disponible) || "—"}
              </p>
              <p>
                <strong>Plazas:</strong> {plazasReserva}
              </p>
            </div>

            {!yaSePuede ? (
              <p className="text-sm text-red-600 font-medium">
                Todavía no puedes reservar esta sesión. Podrás hacerlo a partir del {fechaDMA(disponible)}.
              </p>
            ) : (
              <>
                <div className="rounded-xl border-2 border-terracota bg-terracota-suave/40 p-4 text-tinta space-y-3">
                  <p className="font-semibold text-base">
                    Antes de reservar, habla con el taller para confirmar que todo está listo para la siguiente sesión.
                  </p>
                  <a
                    href={`https://wa.me/${WHATSAPP_TALLER}?text=${encodeURIComponent(
                      `Hola, quiero reservar la sesión ${pendiente.numeroSesion || 2} de "${pendiente.clase}". ¿Está todo listo?`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-full bg-[#25D366] hover:bg-[#1ebe5b] text-white font-semibold text-sm transition"
                  >
                    Hablar con el taller por WhatsApp
                  </a>
                </div>
                {errorContexto && (
                  <p className="text-sm text-red-600" role="alert">
                    No se ha podido comprobar la disponibilidad. Recarga la página e inténtalo de nuevo.
                  </p>
                )}
                <SelectorDiaReserva
                  etiqueta={`Selecciona el día de la sesión ${pendiente.numeroSesion || 2}:`}
                  value={fecha}
                  onChange={(iso) => {
                    setFecha(iso);
                    setTurno("");
                  }}
                  estadoDia={(iso) =>
                    estadoDiaTaller({ clase, fecha: iso, fechasBloqueadas, fechasHabilitadas, reservasGrupos })
                  }
                  cargando={!contextoCargado}
                  fechaBloqueada={fechaBloqueada}
                  fechaHabilitadaManual={fechaHabilitadaManual}
                  diaNoDisponible={diaNoDisponible}
                  clase={clase}
                  producto="Este taller"
                  desde={disponible}
                />
              </>
            )}
          </div>

          {yaSePuede && (
            <div className="space-y-4">
              <SelectorTurnoReserva
                etiqueta="Selecciona el turno:"
                value={turno}
                onChange={setTurno}
                turnos={turnosDisponibles}
                deshabilitado={!fecha || diaNoDisponible || !!fechaBloqueada}
                placeholder={!fecha ? "-- Primero selecciona el día --" : "-- Elige turno --"}
              />

              {!!turno && errorPlazas && (
                <p className="text-sm text-red-600" role="alert">
                  No se ha podido comprobar las plazas. Recarga la página e inténtalo de nuevo.
                </p>
              )}

              {!!turno && plazasListas && plazasQuedan >= plazasReserva && plazasQuedan <= 10 && (
                <p className="text-sm text-tinta font-medium">
                  {plazasQuedan <= 5
                    ? `Quedan ${plazasQuedan} ${plazasQuedan === 1 ? "plaza disponible" : "plazas disponibles"}`
                    : "Quedan pocas plazas"}{" "}
                  en este turno.
                </p>
              )}

              {!!turno && plazasListas && plazasQuedan < plazasReserva && (
                <p className="text-sm text-red-600 font-medium" role="alert">
                  No quedan plazas suficientes en este turno. Elige otro turno u otro día.
                </p>
              )}

              <div className="bg-crema border border-linea rounded-xl p-3 text-sm text-tinta">
                <p>
                  <strong>Precio:</strong> incluido en tu reserva
                </p>
              </div>

              <BotonConfirmarReserva
                guardando={guardando}
                texto="Confirmar sesión"
                deshabilitado={
                  !!errorContexto ||
                  !contextoCargado ||
                  !fecha ||
                  !turno ||
                  !!fechaBloqueada ||
                  diaNoDisponible ||
                  !plazasListas ||
                  errorPlazas ||
                  plazasQuedan < plazasReserva
                }
              />
            </div>
          )}
        </form>
      )}
    </PantallaReserva>
  );
}
