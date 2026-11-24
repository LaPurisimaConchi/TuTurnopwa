// src/UsarBono.jsx
// Reserva de una sesión con un bono que ya se tiene. Mismo formato que las demás
// pantallas de reserva: tarjeta de dos columnas, calendario, turnos y botón de confirmar.
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import { cargarFranja } from "./utils/disponibilidad";
import { plazasLibresFranja } from "./utils/aforo";
import { useConfigEspacio } from "./configuracionEspacio";
import { estadoDiaTaller, useContextoReserva, useDiaDeReserva } from "./utils/turnosTaller";
import PantallaReserva from "./components/PantallaReserva";
import SelectorDiaReserva from "./components/SelectorDiaReserva";
import SelectorTurnoReserva from "./components/SelectorTurnoReserva";
import BotonConfirmarReserva from "./components/BotonConfirmarReserva";
import { reservarConBono } from "./utils/canjeServidor";
import { fechaDMA } from "./utils/formatoFecha";
import { motivoFechaFueraDeBono, rangoFechasBono, sesionBonoRepetida } from "./utils/estadoBono";

function obtenerEstadoVisibleBono(bono) {
  if (!bono) return "—";

  const restantes = Number(bono.clasesRestantes || 0);
  const estadoGuardado = String(bono.estadoBono || "").toLowerCase();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let fechaCaducidad = null;
  if (bono.fechaCaducidadBono) {
    fechaCaducidad = new Date(`${bono.fechaCaducidadBono}T00:00:00`);
  }

  const estaCaducado =
    fechaCaducidad instanceof Date &&
    !isNaN(fechaCaducidad.getTime()) &&
    hoy > fechaCaducidad;

  if (estadoGuardado === "caducado" || estaCaducado) return "Caducado";
  if (estadoGuardado === "agotado" || restantes <= 0) return "Agotado";

  return "Activo";
}


export default function UsarBono() {
  const navigate = useNavigate();
  const { bonoId } = useParams();
  const { config: configEspacio } = useConfigEspacio();
  const {
    fechasBloqueadas,
    fechasHabilitadas,
    diasAbiertos,
    error: errorContexto,
    cargado: contextoCargado,
  } = useContextoReserva();

  const [user, setUser] = useState(null);
  const [bono, setBono] = useState(null);
  const [claseConfig, setClaseConfig] = useState(null);
  // Todos los bonos de la persona: para no repetir día y turno entre sesiones
  const [todosBonos, setTodosBonos] = useState({});
  const [fechaSesion, setFechaSesion] = useState("");
  const [turno, setTurno] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [ocupadas, setOcupadas] = useState({ total: 0, torno: 0 });
  const [plazasListas, setPlazasListas] = useState(false);
  const [errorPlazas, setErrorPlazas] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (firebaseUser) => {
      setUser(firebaseUser || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const cargarTodo = async () => {
      if (!user?.uid || !bonoId) return;

      try {
        setCargando(true);

        const bonosSnap = await get(ref(dbRealtime, `usuarios/${user.uid}/bonos`));
        const bonos = bonosSnap.val() || {};
        setTodosBonos(bonos);
        if (!bonos[bonoId]) {
          setBono(null);
          setClaseConfig(null);
          return;
        }

        const bonoData = bonos[bonoId];
        setBono(bonoData);

        const claseId = bonoData?.claseId || "";
        if (claseId) {
          const claseSnap = await get(ref(dbRealtime, `clases/${claseId}`));
          setClaseConfig(claseSnap.exists() ? claseSnap.val() : null);
        } else {
          setClaseConfig(null);
        }
      } catch (error) {
        console.error("Error al cargar bono:", error);
        setBono(null);
        setClaseConfig(null);
      } finally {
        setCargando(false);
      }
    };

    cargarTodo();
  }, [user, bonoId]);

  const estadoVisible = useMemo(() => obtenerEstadoVisibleBono(bono), [bono]);
  const clase = useMemo(() => claseConfig || { horarios: {} }, [claseConfig]);

  const { turnosDisponibles, fechaHabilitadaManual, fechaBloqueada, diaNoDisponible } =
    useDiaDeReserva({
      clase,
      fecha: fechaSesion,
      fechasBloqueadas,
      fechasHabilitadas,
      diasAbiertos,
    });

  // Plazas libres del turno elegido
  const modalidad = bono?.modalidad || clase?.modalidad || "";
  const esTorno = /torno/i.test(modalidad);
  const plazasQuedan = plazasLibresFranja(
    ocupadas,
    {
      aforoTotal: ocupadas.aforoTotal ?? configEspacio.aforoTotal,
      maxTorno: ocupadas.maxTorno ?? configEspacio.maxTorno,
    },
    { conTorno: esTorno }
  ).reservables;

  useEffect(() => {
    if (!fechaSesion || !turno) {
      setOcupadas({ total: 0, torno: 0 });
      setPlazasListas(false);
      setErrorPlazas(false);
      return;
    }

    let cancelado = false;
    setPlazasListas(false);

    cargarFranja(fechaSesion, turno)
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
  }, [fechaSesion, turno]);

  const turnoRepetido = !!fechaSesion && !!turno && sesionBonoRepetida(todosBonos, fechaSesion, turno);

  const handleReservar = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Debes iniciar sesión.");
      return;
    }
    if (!bono) {
      alert("No se ha encontrado el bono.");
      return;
    }
    if (estadoVisible !== "Activo") {
      alert("Este bono no está disponible para reservar.");
      return;
    }
    if (errorContexto) {
      alert("No se ha podido comprobar la disponibilidad. Recarga la página e inténtalo de nuevo.");
      return;
    }
    if (!fechaSesion || !turno) {
      alert("Selecciona una fecha y un turno.");
      return;
    }
    if (fechaBloqueada) {
      alert(
        `No se puede reservar el día ${fechaDMA(fechaSesion)}. Motivo: ${
          fechaBloqueada.motivo || "día bloqueado"
        }.`
      );
      return;
    }
    if (diaNoDisponible) {
      alert("Esta clase no se imparte el día seleccionado.");
      return;
    }
    const fueraDeBono = motivoFechaFueraDeBono(bono, fechaSesion);
    if (fueraDeBono) {
      alert(fueraDeBono);
      return;
    }
    if (turnoRepetido) {
      alert("Ya tienes una clase reservada ese día en ese turno.");
      return;
    }

    try {
      setGuardando(true);

      // El servidor comprueba el bono y el aforo, crea la reserva y descuenta la clase
      await reservarConBono({
        bonoId,
        fecha: fechaSesion,
        turno: String(turno).replaceAll(" a ", "-").trim(),
      });

      alert("Sesión reservada correctamente con tu bono.");
      navigate("/perfil");
    } catch (error) {
      console.error("Error al reservar con bono:", error);
      alert(error?.message || "No se pudo reservar la sesión con este bono.");
    } finally {
      setGuardando(false);
    }
  };

  if (!user) {
    return (
      <PantallaReserva>
        <p className="text-center text-tinta-suave py-6">Debes iniciar sesión para usar tu bono.</p>
      </PantallaReserva>
    );
  }

  const activo = estadoVisible === "Activo";

  return (
    <PantallaReserva ancho="max-w-4xl">
      <h1 className="text-center font-serif text-tinta mb-4">
        <span className="block text-sm font-sans font-semibold uppercase tracking-wider text-terracota">
          Usar bono
        </span>
        {bono && (
          <span className="block text-3xl md:text-4xl font-bold leading-tight mt-1">
            {bono.clase || "Bono"}
          </span>
        )}
      </h1>

      {cargando ? (
        <p className="text-center text-tinta-suave py-8">Cargando bono...</p>
      ) : !bono ? (
        <p className="text-center text-red-600 py-8">No se ha encontrado este bono.</p>
      ) : (
        <form onSubmit={handleReservar} className="grid gap-6 md:grid-cols-2 md:gap-x-10">
          {/* Izquierda: el bono y el día */}
          <div className="space-y-4">
            <div className="bg-crema border border-linea rounded-xl p-3 text-sm text-tinta">
              <p>
                <strong>Estado:</strong> {estadoVisible}
              </p>
              <p>
                <strong>Clases restantes:</strong> {Number(bono.clasesRestantes || 0)}
              </p>
              <p>
                <strong>Caduca el:</strong> {fechaDMA(bono.fechaCaducidadBono) || "—"}
              </p>
            </div>

            {!activo ? (
              <p className="text-sm text-red-600 font-medium">
                Este bono no puede usarse ahora mismo.
              </p>
            ) : (
              <>
                {errorContexto && (
                  <p className="text-sm text-red-600" role="alert">
                    No se ha podido comprobar la disponibilidad. Recarga la página e inténtalo de nuevo.
                  </p>
                )}
                <SelectorDiaReserva
                  etiqueta="Selecciona la fecha de la sesión:"
                  value={fechaSesion}
                  onChange={(iso) => {
                    setFechaSesion(iso);
                    setTurno("");
                  }}
                  estadoDia={(iso) =>
                    estadoDiaTaller({ clase, fecha: iso, fechasBloqueadas, fechasHabilitadas, diasAbiertos })
                  }
                  cargando={!contextoCargado}
                  fechaBloqueada={fechaBloqueada}
                  fechaHabilitadaManual={fechaHabilitadaManual}
                  diaNoDisponible={diaNoDisponible}
                  clase={clase}
                  producto="Esta clase"
                  desde={rangoFechasBono(bono).desde}
                  hasta={rangoFechasBono(bono).hasta}
                />
              </>
            )}
          </div>

          {/* Derecha: turno, plazas y confirmación */}
          {activo && (
            <div className="space-y-4">
              <SelectorTurnoReserva
                botones
                etiqueta="Selecciona el turno:"
                value={turno}
                onChange={setTurno}
                turnos={turnosDisponibles}
                deshabilitado={!fechaSesion || diaNoDisponible || !!fechaBloqueada}
                placeholder={!fechaSesion ? "-- Primero selecciona el día --" : "-- Elige turno --"}
              />

              {turnoRepetido && (
                <p className="text-sm text-red-600 font-medium" role="alert">
                  Ya tienes una clase reservada ese día en ese turno. Elige otro turno u otro día.
                </p>
              )}

              {!!turno && errorPlazas && (
                <p className="text-sm text-red-600" role="alert">
                  No se ha podido comprobar las plazas. Recarga la página e inténtalo de nuevo.
                </p>
              )}

              {!!turno && plazasListas && plazasQuedan > 0 && plazasQuedan <= 10 && (
                <p className="text-sm text-tinta font-medium">
                  {plazasQuedan <= 5
                    ? `Quedan ${plazasQuedan} ${plazasQuedan === 1 ? "plaza disponible" : "plazas disponibles"}`
                    : "Quedan pocas plazas"}{" "}
                  en este turno.
                </p>
              )}

              {!!turno && plazasListas && plazasQuedan <= 0 && (
                <p className="text-sm text-red-600 font-medium" role="alert">
                  No quedan plazas en este turno. Elige otro turno u otro día.
                </p>
              )}

              <div className="bg-crema border border-linea rounded-xl p-3 text-sm text-tinta">
                <p>
                  <strong>Precio:</strong> incluido en tu bono
                </p>
                <p>
                  <strong>Plazas:</strong> 1 (se descuenta una clase del bono)
                </p>
              </div>

              <BotonConfirmarReserva
                guardando={guardando}
                texto="Confirmar sesión con bono"
                deshabilitado={
                  !!errorContexto ||
                  !contextoCargado ||
                  !fechaSesion ||
                  !turno ||
                  !!fechaBloqueada ||
                  diaNoDisponible ||
                  !plazasListas ||
                  errorPlazas ||
                  plazasQuedan <= 0 ||
                  turnoRepetido
                }
              />
            </div>
          )}
        </form>
      )}
    </PantallaReserva>
  );
}
