import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get, push, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import DateInputReserva from "./components/DateInputReserva";
import { usarSesionDeBono } from "./utils/bonos";

const normalizarTurnos = (turnosRaw) => {
  if (!turnosRaw) return [];

  if (Array.isArray(turnosRaw)) {
    return turnosRaw.map((t) => String(t || "").trim()).filter(Boolean);
  }

  if (typeof turnosRaw === "object") {
    return Object.values(turnosRaw)
      .map((t) => String(t || "").trim())
      .filter(Boolean);
  }

  if (typeof turnosRaw === "string") {
    return [turnosRaw.trim()].filter(Boolean);
  }

  return [];
};

const getNombreDiaSemana = (fechaISO) => {
  if (!fechaISO) return "";

  const [year, month, day] = fechaISO.split("-").map(Number);
  const fechaLocal = new Date(year, month - 1, day);

  const dias = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];

  return dias[fechaLocal.getDay()] || "";
};

const getTurnosDesdeHorarios = (horarios, fechaISO) => {
  if (!horarios || !fechaISO) return [];
  const nombreDia = getNombreDiaSemana(fechaISO);
  return normalizarTurnos(horarios[nombreDia]).map((t) =>
  String(t).replaceAll(" a ", "-").trim()
);
};

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

function obtenerReservasPathKey(claseId) {
  const mapa = {
    modelamano4clases: "ModelaAManoYDecoraTusPiezasFavoritas",
    tornodesdecero4clases: "TornoAlfareroEmpezarDesdeCero",
    tornodecoracion4clases: "TornoAlfareroYDecoracion",
    tornoperfeccionamiento6clases: "TornoAlfareroPerfeccionaLoQueYaSabes",
  };

  return mapa[claseId] || claseId;
}

export default function UsarBono() {
  const navigate = useNavigate();
  const { bonoId } = useParams();

  const [user, setUser] = useState(null);
  const [bono, setBono] = useState(null);
  const [claseConfig, setClaseConfig] = useState(null);
  const [fechasBloqueadas, setFechasBloqueadas] = useState({});
  const [fechasHabilitadas, setFechasHabilitadas] = useState({});
  const [fechaSesion, setFechaSesion] = useState("");
  const [turno, setTurno] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const cargarTodo = async () => {
      if (!user?.uid || !bonoId) return;

      try {
        setCargando(true);

        const bonoRef = ref(dbRealtime, `usuarios/${user.uid}/bonos/${bonoId}`);
        const bonoSnap = await get(bonoRef);

        if (!bonoSnap.exists()) {
          setBono(null);
          setClaseConfig(null);
          return;
        }

        const bonoData = bonoSnap.val();
        setBono(bonoData);

        const claseId = bonoData?.claseId || "";
        if (claseId) {
          const claseSnap = await get(ref(dbRealtime, `clases/${claseId}`));
          setClaseConfig(claseSnap.exists() ? claseSnap.val() : null);
        } else {
          setClaseConfig(null);
        }

        const bloqueosSnap = await get(ref(dbRealtime, "bloqueosFechas"));
        setFechasBloqueadas(
          bloqueosSnap.exists() ? bloqueosSnap.val() || {} : {}
        );
        const habilitadasSnap = await get(ref(dbRealtime, "fechasHabilitadas"));
setFechasHabilitadas(
  habilitadasSnap.exists() ? habilitadasSnap.val() || {} : {}
);
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
  const fechaHabilitadaManual = useMemo(() => {
  if (!fechaSesion) return null;

  const habilitacion = fechasHabilitadas?.[fechaSesion];

  if (!habilitacion) return null;

  if (
    habilitacion.habilitada === true ||
    habilitacion.activo === true ||
    habilitacion.estado === "activa" ||
    habilitacion.tipo === "apertura_especial" ||
    habilitacion.turnos ||
    habilitacion.turnosHabilitados ||
    habilitacion.turnosDisponibles
  ) {
    return habilitacion;
  }

  return null;
}, [fechaSesion, fechasHabilitadas]);

  const estadoVisible = useMemo(() => obtenerEstadoVisibleBono(bono), [bono]);

const turnosDisponibles = useMemo(() => {
  let turnos = getTurnosDesdeHorarios(claseConfig?.horarios, fechaSesion);

  if (fechaHabilitadaManual) {
    const turnosConfig =
      fechaHabilitadaManual.turnosHabilitados ||
      fechaHabilitadaManual.turnos ||
      fechaHabilitadaManual.turnosDisponibles ||
      [];

    const turnosManual = normalizarTurnos(turnosConfig).map((t) =>
      String(t).replaceAll(" a ", "-").trim()
    );

    if (turnosManual.length > 0) {
      turnos = turnosManual;
    }
  }

  return turnos;
}, [claseConfig, fechaSesion, fechaHabilitadaManual]);
  const fechaBloqueada = useMemo(() => {
    if (!fechaSesion) return null;
    const bloqueo = fechasBloqueadas?.[fechaSesion];
    return bloqueo?.bloqueado ? bloqueo : null;
  }, [fechaSesion, fechasBloqueadas]);

  const diaNoDisponible = useMemo(() => {
    if (!fechaSesion) return false;
    return turnosDisponibles.length === 0;
  }, [fechaSesion, turnosDisponibles]);

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

    if (!fechaSesion || !turno) {
      alert("Selecciona una fecha y un turno.");
      return;
    }

    if (fechaBloqueada) {
      alert(
        `No se puede reservar el día ${fechaSesion}. Motivo: ${
          fechaBloqueada.motivo || "día bloqueado"
        }.`
      );
      return;
    }

    if (diaNoDisponible) {
      alert("Esta clase no se imparte el día seleccionado.");
      return;
    }

    try {
      setGuardando(true);

      const timestamp = new Date().toISOString();
      const orderId = Date.now().toString().slice(-12);

      const nombreClase = bono.clase || claseConfig?.nombre || "Bono";
      const claseId = bono.claseId || "";
      const turnoElegido = String(turno).replaceAll(" a ", "-").trim();
      const modalidad = bono.modalidad || claseConfig?.modalidad || "";
      const reservasPathKey =
        claseConfig?.reservasPath || obtenerReservasPathKey(claseId);

      const reserva = {
        clase: nombreClase,
        claseId,
        fecha: fechaSesion,
        turno: turnoElegido,
        modalidad,
        metodo: modalidad,
        precio: 0,
        precioBase: 0,
        precioTotal: 0,
        plazas: 1,
        desdeBono: true,
        bonoId,
        estado: "Confirmada",
        estadoPago: "pagado",
        orderId,
        timestamp,
      };

      const generalRef = ref(
        dbRealtime,
        `reservas/${reservasPathKey}/${fechaSesion}/${turnoElegido}`
      );
      const nuevaReservaRef = push(generalRef);
      await update(nuevaReservaRef, { uid: user.uid, ...reserva });

      const reservaId = nuevaReservaRef.key || "";

      await push(ref(dbRealtime, `usuarios/${user.uid}/listaReservas`), {
        ...reserva,
        uid: user.uid,
        reservaId,
      });

      await usarSesionDeBono({
        uid: user.uid,
        bonoId,
        fechaSesion,
        turno: turnoElegido,
        taller: nombreClase,
        reservaId,
        clase: nombreClase,
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
      <div className="bg-[#fffef4] min-h-screen flex items-center justify-center px-4 py-8">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6 text-center">
          <p className="text-gray-600">Debes iniciar sesión para usar tu bono.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fffef4] min-h-screen flex items-center justify-center px-4 py-8">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6">
        <BotonVolver />

        <h1 className="text-center text-2xl text-[#5c3c00] font-serif mb-4">
          Usar bono
        </h1>

        {cargando ? (
          <p className="text-center text-gray-500 py-8">Cargando bono...</p>
        ) : !bono ? (
          <p className="text-center text-red-600 py-8">
            No se ha encontrado este bono.
          </p>
        ) : (
          <form onSubmit={handleReservar} className="space-y-4">
            <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
              <p>
                <strong>Bono:</strong> {bono.clase || "Bono"}
              </p>
              <p>
                <strong>Estado:</strong> {estadoVisible}
              </p>
              <p>
                <strong>Restantes:</strong>{" "}
                {Number(bono.clasesRestantes || 0)}
              </p>
              <p>
                <strong>Caduca el:</strong>{" "}
                {bono.fechaCaducidadBono || "—"}
              </p>
            </div>

            {estadoVisible !== "Activo" ? (
              <p className="text-sm text-red-600 font-medium">
                Este bono no puede usarse ahora mismo.
              </p>
            ) : (
              <>
                <div>
                  <label
                    htmlFor="fechaSesion"
                    className="block font-bold text-sm mb-1"
                  >
                    Selecciona la fecha de la sesión:
                  </label>
                  <DateInputReserva
                    id="fechaSesion"
                    value={fechaSesion}
                    onChange={(e) => {
                      setFechaSesion(e.target.value);
                      setTurno("");
                    }}
                  />
                  {fechaBloqueada && (
                    <p className="mt-2 text-sm text-red-600 font-medium">
                      Este día no está disponible.
                      {fechaBloqueada.motivo
                        ? ` Motivo: ${fechaBloqueada.motivo}.`
                        : ""}
                    </p>
                  )}
                  {fechaSesion && !fechaBloqueada && diaNoDisponible && (
                    <p className="mt-2 text-sm text-red-600 font-medium">
                      Esta clase no se imparte el día seleccionado.
                    </p>
                    
                  )}
                  {fechaSesion && !fechaBloqueada && fechaHabilitadaManual && (
  <p className="mt-2 text-sm text-green-700 font-medium">
    Esta fecha ha sido habilitada manualmente desde administración.
  </p>
)}
                </div>

                <div>
                  <label
                    htmlFor="turno"
                    className="block font-bold text-sm mb-1"
                  >
                    Selecciona el turno:
                  </label>
                  <select
                    id="turno"
                    value={turno}
                    onChange={(e) => setTurno(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                    required
                    disabled={!fechaSesion || diaNoDisponible}
                  >
                    <option value="">-- Elige turno --</option>
                    {turnosDisponibles.map((turnoItem) => (
                      <option key={turnoItem} value={turnoItem}>
                        {turnoItem}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={
                    guardando ||
                    !fechaSesion ||
                    !turno ||
                    !!fechaBloqueada ||
                    diaNoDisponible
                  }
                  className="w-full mt-4 px-6 py-3 rounded-full text-white font-semibold
                  bg-gradient-to-b from-[#F6D66A] to-[#F4C542]
                  shadow-md hover:shadow-lg
                  hover:from-[#F4C542] hover:to-[#E5B92F]
                  transition-all duration-200"
                >
                  {guardando ? "Reservando..." : "Confirmar sesión con bono"}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}