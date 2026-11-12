import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get, push, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import DateInputReserva from "./components/DateInputReserva";
import {
  validarUsoBono,
  usarSesionDeBono,
} from "./utils/bonos";

import { fechaDMA } from "./utils/formatoFecha";
const CLASE_ID = "tornodesdecero4clases";
const RESERVAS_PATH_KEY = "TornoAlfareroEmpezarDesdeCero";

const normalizarTurnos = (turnosRaw) => {
  if (!turnosRaw) return [];

  if (Array.isArray(turnosRaw)) {
    return turnosRaw
      .map((t) => String(t || "").trim())
      .filter(Boolean);
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
  const turnosDia = horarios[nombreDia];

  return normalizarTurnos(turnosDia);
};

export default function UsarBonoTornoAlfareroEmpezarDesdeCero() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [claseConfig, setClaseConfig] = useState(null);
  const [cargandoConfig, setCargandoConfig] = useState(true);
  const [fechasBloqueadas, setFechasBloqueadas] = useState({});

  const [fechaSesion, setFechaSesion] = useState("");
  const [turno, setTurno] = useState("");

  const [bonoActivo, setBonoActivo] = useState(null);
  const [mensajeBono, setMensajeBono] = useState("");
  const [cargandoBono, setCargandoBono] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const cargarConfiguracionClase = async () => {
      try {
        const claseRef = ref(dbRealtime, `clases/${CLASE_ID}`);
        const snapshot = await get(claseRef);

        if (snapshot.exists()) {
          setClaseConfig(snapshot.val());
        } else {
          setClaseConfig(null);
        }
      } catch (error) {
        console.error("Error al cargar configuración de la clase:", error);
        setClaseConfig(null);
      } finally {
        setCargandoConfig(false);
      }
    };

    cargarConfiguracionClase();
  }, []);

  useEffect(() => {
    const cargarFechasBloqueadas = async () => {
      try {
        const snap = await get(ref(dbRealtime, "bloqueosFechas"));
        if (snap.exists()) {
          setFechasBloqueadas(snap.val() || {});
        } else {
          setFechasBloqueadas({});
        }
      } catch (error) {
        console.error("Error al cargar fechas bloqueadas:", error);
        setFechasBloqueadas({});
      }
    };

    cargarFechasBloqueadas();
  }, []);

  useEffect(() => {
    const cargarBono = async () => {
      if (!user?.uid) {
        setBonoActivo(null);
        setMensajeBono("");
        setCargandoBono(false);
        return;
      }

      try {
        setCargandoBono(true);

        const resultado = await validarUsoBono({
          uid: user.uid,
          claseId: CLASE_ID,
        });

        if (resultado.ok) {
          setBonoActivo(resultado.bono);
          setMensajeBono("");
        } else {
          setBonoActivo(null);
          setMensajeBono(resultado.motivo || "No tienes un bono disponible.");
        }
      } catch (error) {
        console.error("Error al comprobar bono:", error);
        setBonoActivo(null);
        setMensajeBono("No se pudo comprobar tu bono.");
      } finally {
        setCargandoBono(false);
      }
    };

    cargarBono();
  }, [user]);

  const turnosDisponibles = useMemo(() => {
    return getTurnosDesdeHorarios(claseConfig?.horarios, fechaSesion);
  }, [claseConfig, fechaSesion]);

  const fechaBloqueada = useMemo(() => {
    if (!fechaSesion) return null;

    const bloqueo = fechasBloqueadas?.[fechaSesion];
    if (bloqueo?.bloqueado) {
      return bloqueo;
    }

    return null;
  }, [fechaSesion, fechasBloqueadas]);

  const diaNoDisponible = useMemo(() => {
    if (!fechaSesion) return false;
    return turnosDisponibles.length === 0;
  }, [fechaSesion, turnosDisponibles]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Debes iniciar sesión.");
      return;
    }

    if (!bonoActivo?.bonoId) {
      alert("No tienes un bono activo disponible para esta clase.");
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

    try {
      setGuardando(true);

      const orderId = Date.now().toString().slice(-12);
      const timestamp = new Date().toISOString();

      const reserva = {
        clase: claseConfig?.nombre || "Torno alfarero empezar desde cero",
        claseId: CLASE_ID,
        fecha: fechaSesion,
        turno,
        metodo: bonoActivo?.modalidad || claseConfig?.modalidad || "torno",
        modalidad: bonoActivo?.modalidad || claseConfig?.modalidad || "torno",
        plazas: 1,
        precio: 0,
        precioUnitario: 0,
        precioTotal: 0,
        estado: "Confirmada",
        estadoPago: "pagado",
        procesado: true,
        orderId,
        uid: user.uid,
        desdeBono: true,
        bonoId: bonoActivo.bonoId,
        timestamp,
        actualizadoEn: timestamp,
        nombreTipoClase: bonoActivo?.subtipo || "",
        tipoClase: bonoActivo?.modalidad || "",
      };

      const generalRef = ref(
        dbRealtime,
        `reservas/${RESERVAS_PATH_KEY}/${fechaSesion}/${turno}`
      );

      const nuevaReservaRef = push(generalRef);
      await update(nuevaReservaRef, reserva);

      await push(ref(dbRealtime, `usuarios/${user.uid}/listaReservas`), {
        ...reserva,
        reservaId: nuevaReservaRef.key,
      });

      await usarSesionDeBono({
        uid: user.uid,
        bonoId: bonoActivo.bonoId,
        fechaSesion,
        turno,
        taller: claseConfig?.nombre || "Torno alfarero empezar desde cero",
        reservaId: nuevaReservaRef.key || "",
        clase: claseConfig?.nombre || "Torno alfarero empezar desde cero",
      });

      alert("Clase reservada correctamente con tu bono.");
      navigate("/perfil");
    } catch (error) {
      console.error("Error al usar bono:", error);
      alert(error?.message || "No se pudo reservar la clase con el bono.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-[#fffef4] min-h-screen flex items-center justify-center px-4 py-8">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6">
        <BotonVolver />

        <h1 className="text-center text-2xl text-[#5c3c00] font-serif mb-4">
          Usar bono –{" "}
          {claseConfig?.nombre || "Torno alfarero empezar desde cero"}
        </h1>

        {cargandoConfig || cargandoBono ? (
          <p className="text-center text-gray-500 py-8">Cargando...</p>
        ) : !claseConfig ? (
          <p className="text-center text-red-600 py-8">
            No se ha encontrado la configuración de esta clase.
          </p>
        ) : !bonoActivo ? (
          <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-4 text-sm text-[#5c3c00]">
            <p className="font-semibold mb-2">No puedes usar este bono ahora mismo.</p>
            <p>{mensajeBono || "No tienes un bono activo para esta clase."}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
              <p>
                <strong>Clases incluidas:</strong>{" "}
                {Number(bonoActivo.numeroClases || 0)}
              </p>
              <p>
                <strong>Consumidas:</strong>{" "}
                {Number(bonoActivo.clasesConsumidas || 0)}
              </p>
              <p>
                <strong>Restantes:</strong>{" "}
                {Number(bonoActivo.clasesRestantes || 0)}
              </p>
              <p>
                <strong>Caduca el:</strong>{" "}
                {fechaDMA(bonoActivo.fechaCaducidadBono) || "—"}
              </p>
            </div>

            <div>
              <label
                htmlFor="fechaSesion"
                className="block font-bold text-sm mb-1"
              >
                Selecciona la fecha de esta sesión:
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
                  Esta clase no se imparte el día seleccionado. Días disponibles:{" "}
                  {Object.keys(claseConfig?.horarios || {}).join(", ")}.
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

            <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
              <p>
                <strong>Modalidad:</strong>{" "}
                {bonoActivo.modalidad || claseConfig?.modalidad || "torno"}
              </p>
              <p>
                <strong>Precio de esta sesión:</strong> 0€
              </p>
            </div>

            <button
              type="submit"
              disabled={
                guardando ||
                !!fechaBloqueada ||
                diaNoDisponible ||
                !fechaSesion ||
                !turno
              }
              className="w-full mt-4 px-6 py-3 rounded-full text-white font-semibold
              bg-gradient-to-b from-[#F6D66A] to-[#F4C542]
              shadow-md hover:shadow-lg
              hover:from-[#F4C542] hover:to-[#E5B92F]
              transition-all duration-200"
            >
              {guardando ? "Guardando..." : "Reservar con bono"}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <img
            src="/img/logoPCsin.png"
            alt="La Purísima Conchi"
            className="w-20 mx-auto"
          />
        </div>
      </div>
    </div>
  );
}