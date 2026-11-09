import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get, push, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import { plazasDeTarjetaRegalo } from "./utils/tarjetasRegalo";
import { contarPlazasPorMetodo } from "./utils/contarPlazasDia";
import BloqueoReserva from "./BloqueoReserva";
import BotonVolver from "./BotonVolver";
import DateInputReserva from "./components/DateInputReserva";

import { fechaDMA } from "./utils/formatoFecha";
const CLASE_ID = "creatubandejahogar";
const RESERVAS_PATH_KEY = "CreaTuBandejaHogar";

// Fallback temporal mientras no metas estos límites en Firebase
const MAX_TORNO_FALLBACK = 12;
const MAX_TOTALES_FALLBACK = 45;

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

const mapearPrecioDesdeFirebase = (metodo, precios) => {
  if (!metodo || !precios) return 0;

  if (metodo === "torno") {
    return Number(precios.torno || 0);
  }

  if (metodo === "modelado a mano") {
    return Number(precios.modelado || 0);
  }

  return 0;
};

const getNombreMetodo = (metodo) => {
  if (metodo === "torno") return "Torno";
  if (metodo === "modelado a mano") return "Modelado a mano";
  return "";
};

export default function ReservaCreaTuBandejaHogar() {
  const [fecha, setFecha] = useState("");
  const [turno, setTurno] = useState("");
  const [metodo, setMetodo] = useState("");
  const [plazas, setPlazas] = useState(1);

  const [ocupadasTorno, setOcupadasTorno] = useState(0);
  const [ocupadasModelado, setOcupadasModelado] = useState(0);
  const [user, setUser] = useState(null);

  const [cargandoConfig, setCargandoConfig] = useState(true);
  const [claseConfig, setClaseConfig] = useState(null);
  const [fechasBloqueadas, setFechasBloqueadas] = useState({});
  const [fechasHabilitadas, setFechasHabilitadas] = useState({});
  const [reservasGrupos, setReservasGrupos] = useState({});

  const navigate = useNavigate();
  const location = useLocation();

  const desdeTarjeta =
    location.state?.desdeTarjeta || location.state?.desdeTarjetaRegalo || false;
  // Con tarjeta regalo se reservan juntas todas las plazas de la tarjeta
  const plazasTarjeta = desdeTarjeta ? plazasDeTarjetaRegalo(location.state) : 0;

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
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
    const cargarFechasHabilitadas = async () => {
      try {
        const snap = await get(ref(dbRealtime, "fechasHabilitadas"));
        if (snap.exists()) {
          setFechasHabilitadas(snap.val() || {});
        } else {
          setFechasHabilitadas({});
        }
      } catch (error) {
        console.error("Error al cargar fechas habilitadas:", error);
        setFechasHabilitadas({});
      }
    };

    cargarFechasHabilitadas();
  }, []);
  useEffect(() => {
  const cargarReservasGrupos = async () => {
    try {
      const snap = await get(ref(dbRealtime, "reservasGrupos"));

      if (snap.exists()) {
        setReservasGrupos(snap.val() || {});
      } else {
        setReservasGrupos({});
      }
    } catch (error) {
      console.error("Error al cargar reservas de grupos:", error);
      setReservasGrupos({});
    }
  };

  cargarReservasGrupos();
}, []);


  useEffect(() => {
    if (!fecha) {
      setOcupadasTorno(0);
      setOcupadasModelado(0);
      return;
    }

    contarPlazasPorMetodo(fecha, turno).then(({ torno, modelado }) => {
      setOcupadasTorno(torno);
      setOcupadasModelado(modelado);
    });
  }, [fecha, turno]);

  const turnosHabituales = useMemo(() => {
    return getTurnosDesdeHorarios(claseConfig?.horarios, fecha);
  }, [claseConfig, fecha]);

  const fechaHabilitadaManual = useMemo(() => {
    if (!fecha) return null;

    const habilitacion = fechasHabilitadas?.[fecha];
    if (habilitacion?.habilitada) {
      return habilitacion;
    }

    return null;
  }, [fecha, fechasHabilitadas]);

  const turnosDisponibles = useMemo(() => {
  const turnos = [...turnosHabituales];

  
    if (fechaHabilitadaManual) {
  const todosLosTurnos = normalizarTurnos(claseConfig?.turnos);
  const turnosConfig = fechaHabilitadaManual.turnosHabilitados;

  let turnosPermitidos = todosLosTurnos;

 if (turnosConfig) {
  turnosPermitidos = normalizarTurnos(turnosConfig).map((t) =>
    t.replaceAll(" a ", "-")
  );
}

  turnosPermitidos.forEach((t) => {
    if (!turnos.includes(t)) {
      turnos.push(t);
    }
  });
}

  Object.values(reservasGrupos || {}).forEach((grupo) => {
    if (
      grupo?.fecha === fecha &&
      grupo?.estado === "Confirmada" &&
      Number(grupo?.plazas || 0) >= 5 &&
      grupo?.turno
    ) {
      if (!turnos.includes(grupo.turno)) {
        turnos.push(grupo.turno);
      }
    }
  });

  return turnos;
}, [
  turnosHabituales,
  fechaHabilitadaManual,
  claseConfig,
  reservasGrupos,
  fecha,
]);
  const precios = useMemo(() => {
    return claseConfig?.precios || {};
  }, [claseConfig]);

  const maxTorno = Number(claseConfig?.plazas?.maxTorno || MAX_TORNO_FALLBACK);
  const maxTotales = Number(
    claseConfig?.plazas?.maxTotales || MAX_TOTALES_FALLBACK
  );

  const plazasTotalesOcupadas = ocupadasTorno + ocupadasModelado;

  const plazasDisponibles = useMemo(() => {
    if (!metodo) return 0;

    if (metodo === "torno") {
      return Math.max(
        Math.min(maxTorno - ocupadasTorno, maxTotales - plazasTotalesOcupadas),
        0
      );
    }

    if (metodo === "modelado a mano") {
      return Math.max(maxTotales - plazasTotalesOcupadas, 0);
    }

    return 0;
  }, [
    metodo,
    maxTorno,
    maxTotales,
    ocupadasTorno,
    plazasTotalesOcupadas,
  ]);

  const precioUnitario = useMemo(() => {
    return mapearPrecioDesdeFirebase(metodo, precios);
  }, [metodo, precios]);

  const precioTotal = useMemo(() => {
    const plazasNum = plazasTarjeta || (Number(plazas) > 0 ? Number(plazas) : 1);
    return precioUnitario * plazasNum;
  }, [precioUnitario, plazas, plazasTarjeta]);

  const nombreMetodo = useMemo(() => {
    return getNombreMetodo(metodo);
  }, [metodo]);

  const fechaBloqueada = useMemo(() => {
    if (!fecha) return null;

    const bloqueo = fechasBloqueadas?.[fecha];
    if (bloqueo?.bloqueado) {
      return bloqueo;
    }

    return null;
  }, [fecha, fechasBloqueadas]);

  const diaNoDisponible = useMemo(() => {
    if (!fecha) return false;
    return turnosDisponibles.length === 0;
  }, [fecha, turnosDisponibles]);

  const handleMetodoChange = (valor) => {
    setMetodo(valor);
    setTurno("");
    setPlazas(1);
  };

  const handleFechaChange = (e) => {
    setFecha(e.target.value);
    setMetodo("");
    setTurno("");
    setPlazas(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Debes iniciar sesión para reservar.");
      return;
    }

    if (!fecha || !turno || !metodo) {
      alert("Selecciona fecha, método y turno.");
      return;
    }

    if (fechaBloqueada) {
      alert(
        `No se puede reservar el día ${fechaDMA(fecha)}. Motivo: ${
          fechaBloqueada.motivo || "día bloqueado"
        }.`
      );
      return;
    }

    if (diaNoDisponible) {
      alert("Esta clase no se imparte el día seleccionado.");
      return;
    }

    const plazasNum = plazasTarjeta || (Number(plazas) > 0 ? Number(plazas) : 1);

    if (plazasDisponibles <= 0 || plazasNum > plazasDisponibles) {
      alert("No hay suficientes plazas disponibles para este método.");
      return;
    }

    if (!(precioUnitario > 0) && !desdeTarjeta) {
      alert("No se ha podido calcular el precio de la clase.");
      return;
    }

    if (desdeTarjeta && !location.state?.tarjetaRegaloId) {
      alert("No se ha encontrado la tarjeta regalo asociada.");
      return;
    }

    try {
      const orderId = Date.now().toString().slice(-12);
      const timestamp = new Date().toISOString();

      const reserva = {
        clase: claseConfig?.nombre || "Crea tu bandeja de hogar",
        claseId: CLASE_ID,
        fecha,
        turno,
        metodo,
        nombreTipoClase: nombreMetodo,
        plazas: plazasNum,
        desdeTarjeta,
        precio: precioTotal,
        precioUnitario,
        precioTotal,
        estado: desdeTarjeta ? "Confirmada" : "Pendiente",
        estadoPago: desdeTarjeta ? "pagado" : "pendiente",
        orderId,
        timestamp,
      };

      const generalRef = ref(
        dbRealtime,
        `reservas/${RESERVAS_PATH_KEY}/${fecha}/${turno}/${metodo}`
      );

      const nuevaReservaRef = push(generalRef);
      await update(nuevaReservaRef, {
        uid: user.uid,
        ...reserva,
      });

      if (desdeTarjeta) {
        const tarjetaRegaloId = location.state?.tarjetaRegaloId || "";
        const codigoTarjeta = location.state?.codigoTarjeta || "";

        await push(ref(dbRealtime, `usuarios/${user.uid}/listaReservas`), {
          ...reserva,
          uid: user.uid,
          tarjetaRegaloId,
          codigoTarjeta,
          creadaDesde: "tarjeta_regalo",
        });

        const tarjetaGlobalRef = ref(
          dbRealtime,
          `tarjetasRegalo/${tarjetaRegaloId}`
        );
        const tarjetaGlobalSnap = await get(tarjetaGlobalRef);
        const tarjetaGlobal = tarjetaGlobalSnap.exists()
          ? tarjetaGlobalSnap.val()
          : null;
        const uidComprador = tarjetaGlobal?.uidComprador || "";

        const datosActualizacionTarjeta = {
          canjeado: true,
          usado: true,
          estadoCanje: "canjeado",
          canjeadoPorUID: user.uid,
          usadoPorUID: user.uid,
          fechaCanje: timestamp,
          fechaUso: timestamp,
          actualizadoEn: timestamp,
          reservaId: nuevaReservaRef.key || "",
          fechaReserva: fecha,
          turnoReserva: turno,
          metodoReserva: metodo,
          nombreTipoClaseReserva: nombreMetodo,
        };

        await update(tarjetaGlobalRef, datosActualizacionTarjeta);

        if (uidComprador) {
          await update(
            ref(
              dbRealtime,
              `usuarios/${uidComprador}/tarjetasRegalo/${tarjetaRegaloId}`
            ),
            datosActualizacionTarjeta
          );
        }

        navigate("/pago/exito", {
          state: {
            desdeTarjeta: true,
            clase: claseConfig?.nombre || "Crea tu bandeja de hogar",
            claseId: CLASE_ID,
            fecha,
            turno,
            metodo,
            plazas: plazasNum,
            precio: 0,
            precioUnitario: 0,
            precioTotal: 0,
            codigoTarjeta,
            orderId,
          },
        });

        return;
      }

      navigate("/resumen-pago", {
        state: {
          tipo: "clase",
          clase: claseConfig?.nombre || "Crea tu bandeja de hogar",
          claseId: CLASE_ID,
          precio: precioTotal,
          precioUnitario,
          precioTotal,
          fecha,
          turno,
          metodo,
          plazas: plazasNum,
          orderId,
        },
      });
    } catch (err) {
      console.error("Error al guardar la reserva:", err);
      alert("No se pudo guardar la reserva.");
    }
  };

  const plazasNum = plazasTarjeta || (Number(plazas) > 0 ? Number(plazas) : 1);
  const puedeElegirMetodo = !!fecha && !fechaBloqueada && !diaNoDisponible;
  const puedeElegirTurno =
    !!fecha && !!metodo && !fechaBloqueada && !diaNoDisponible;
  const puedeElegirPlazas = puedeElegirTurno && !!turno && plazasDisponibles > 0;

  return (
    <div className="bg-[#fffef4] min-h-screen flex items-center justify-center px-4 py-8">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6">
        <BotonVolver />

        <h1 className="text-center text-2xl text-[#5c3c00] font-serif mb-4">
          Reserva – {claseConfig?.nombre || "Crea tu bandeja de hogar"}
        </h1>

        {desdeTarjeta && (
          <p className="text-sm text-green-700 text-center font-medium mb-4">
            Estás usando una tarjeta regalo 🎁
            {plazasTarjeta > 1 ? ` para ${plazasTarjeta} personas` : ""}
          </p>
        )}

        {cargandoConfig ? (
          <p className="text-center text-gray-500 py-8">
            Cargando configuración de la clase...
          </p>
        ) : !claseConfig ? (
          <p className="text-center text-red-600 py-8">
            No se ha encontrado la configuración de esta clase en Firebase.
          </p>
        ) : (
          <BloqueoReserva>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fecha" className="block font-bold text-sm mb-1">
                  Selecciona el día:
                </label>
                <DateInputReserva
                  id="fecha"
                  value={fecha}
                  onChange={handleFechaChange}
                />
                {fechaBloqueada && (
                  <p className="mt-2 text-sm text-red-600 font-medium">
                    Este día no está disponible para reservar.
                    {fechaBloqueada.motivo
                      ? ` Motivo: ${fechaBloqueada.motivo}.`
                      : ""}
                  </p>
                )}
                {fecha && !fechaBloqueada && fechaHabilitadaManual && (
                  <p className="mt-2 text-sm text-green-700 font-medium">
                    Esta fecha ha sido habilitada manualmente desde administración.
                    
                  </p>
                )}
                {fecha &&
                  !fechaBloqueada &&
                  !fechaHabilitadaManual &&
                  diaNoDisponible && (
                    <p className="mt-2 text-sm text-red-600 font-medium">
                      Esta clase no se imparte el día seleccionado. Días disponibles:{" "}
                      {Object.keys(claseConfig?.horarios || {}).join(", ")}.
                    </p>
                  )}
              </div>

              <div>
                <label
                  htmlFor="metodo"
                  className="block font-bold text-sm mb-1"
                >
                  Método:
                </label>
                <select
                  id="metodo"
                  value={metodo}
                  onChange={(e) => handleMetodoChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base disabled:bg-gray-100 disabled:text-gray-400"
                  required
                  disabled={!puedeElegirMetodo}
                >
                  <option value="">
                    {!fecha
                      ? "-- Primero selecciona el día --"
                      : diaNoDisponible
                      ? "-- Esta clase no está disponible ese día --"
                      : "-- Selecciona método --"}
                  </option>
                  <option value="torno">
                    Torno — {Number(precios.torno || 0)}€
                  </option>
                  <option value="modelado a mano">
                    Modelado a mano — {Number(precios.modelado || 0)}€
                  </option>
                </select>
              </div>

              <div>
                <label htmlFor="turno" className="block font-bold text-sm mb-1">
                  Selecciona el turno:
                </label>
                <select
                  id="turno"
                  value={turno}
                  onChange={(e) => {
                    setTurno(e.target.value);
                    setPlazas(1);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base disabled:bg-gray-100 disabled:text-gray-400"
                  required
                  disabled={!puedeElegirTurno}
                >
                  <option value="">
                    {!fecha
                      ? "-- Primero selecciona el día --"
                      : !metodo
                      ? "-- Primero selecciona el método --"
                      : diaNoDisponible
                      ? "-- No hay turnos para este día --"
                      : "-- Elige turno --"}
                  </option>
                  {turnosDisponibles.map((turnoItem) => (
                    <option key={turnoItem} value={turnoItem}>
                      {turnoItem}
                    </option>
                  ))}
                </select>
              </div>

              {metodo && fecha && !diaNoDisponible && (
                <p className="text-sm text-green-700">
                  Quedan {plazasDisponibles} plazas disponibles para este método.
                </p>
              )}

              <div className="text-sm text-gray-600">
                Máximo {maxTotales} plazas por día ({maxTorno} para torno).
              </div>
              <div className="text-sm text-[#7a5a1e] bg-[#fff8df] border border-[#f1e7c6] rounded-xl p-3">
  <strong>¿Sois 5 o más personas?</strong>
  <br />
  Si queréis reservar en una fecha especial o fuera del horario habitual, haced la reserva desde la sección de <strong>Reservas para grupos</strong>.
</div>

              <div>
                <label className="block font-bold text-sm mb-2">
                  ¿Cuántas plazas deseas reservar?
                </label>

                <div className="flex items-center justify-between border border-gray-300 rounded-xl px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setPlazas(Math.max(1, plazasNum - 1))}
                    disabled={!puedeElegirPlazas || !!plazasTarjeta}
                    className="text-xl font-bold px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    −
                  </button>

                  <span className="text-lg font-semibold">
  {puedeElegirPlazas ? plazasNum : "—"}
</span>

                  <button
                    type="button"
                    onClick={() =>
                      setPlazas(Math.min(plazasDisponibles || 1, plazasNum + 1))
                    }
                    disabled={!puedeElegirPlazas || !!plazasTarjeta}
                    className="text-xl font-bold px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  {!fecha
                    ? "Primero selecciona el día."
                    : !metodo
                    ? "Primero selecciona el método."
                    : !turno
                    ? "Primero selecciona el turno."
                    : diaNoDisponible
                    ? "No hay plazas porque esta clase no se imparte ese día."
                    : `Máximo ${plazasDisponibles} plazas disponibles.`}
                </p>
              </div>

              <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
                <p>
                  <strong>Método elegido:</strong> {nombreMetodo || "—"}
                </p>
                <p>
                  <strong>Precio unitario:</strong>{" "}
                  {desdeTarjeta ? "Tarjeta regalo" : `${precioUnitario}€`}
                </p>
                <p>
                  <strong>Precio total:</strong>{" "}
                  {desdeTarjeta ? "0€" : `${precioTotal}€`}
                </p>
              </div>

              <button
                type="submit"
                className="w-full mt-4 px-6 py-3 rounded-full text-white font-semibold
                bg-gradient-to-b from-[#F6D66A] to-[#F4C542]
                shadow-md hover:shadow-lg
                hover:from-[#F4C542] hover:to-[#E5B92F]
                transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={
                  !!fechaBloqueada ||
                  diaNoDisponible ||
                  !metodo ||
                  !turno ||
                  plazasNum > plazasDisponibles ||
                  plazasDisponibles <= 0 ||
                  (!desdeTarjeta && !(precioUnitario > 0))
                }
              >
                {desdeTarjeta ? "Confirmar reserva" : "Confirmar y pagar"}
              </button>
            </form>
          </BloqueoReserva>
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