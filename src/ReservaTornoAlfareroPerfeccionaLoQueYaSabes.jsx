import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import DateInputReserva from "./components/DateInputReserva";
import { crearBonoActivo } from "./utils/bonos";

const CLASE_ID = "tornoperfeccionamiento6clases";
const RESERVAS_PATH_KEY = "TornoAlfareroPerfeccionaLoQueYaSabes";

const sumarUnMes = (fechaISO) => {
  const d = new Date(fechaISO + "T12:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};


  const sumarUnMesCaducidad = (fechaISO) => {
  const d = new Date(fechaISO + "T12:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

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

 return normalizarTurnos(turnosDia).map((t) =>
  String(t).replaceAll(" a ", "-").trim()
);
};

export default function ReservaTornoAlfareroPerfeccionaLoQueYaSabes() {
  const [fechaInicio, setFechaInicio] = useState("");
  const [turno, setTurno] = useState("");
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
        console.error("Error al cargar configuración del bono:", error);
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

  const turnosHabituales = useMemo(() => {
    return getTurnosDesdeHorarios(claseConfig?.horarios, fechaInicio);
  }, [claseConfig, fechaInicio]);

  const fechaHabilitadaManual = useMemo(() => {
  if (!fechaInicio) return null;

  const habilitacion = fechasHabilitadas?.[fechaInicio];

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
}, [fechaInicio, fechasHabilitadas]);

  const turnosDisponibles = useMemo(() => {
  const turnos = [...turnosHabituales];

  if (fechaHabilitadaManual) {
  const todosLosTurnos = normalizarTurnos(claseConfig?.turnos);
 const turnosConfig =
  fechaHabilitadaManual.turnosHabilitados ||
  fechaHabilitadaManual.turnos ||
  fechaHabilitadaManual.turnosDisponibles ||
  [];

let turnosPermitidos = todosLosTurnos;

if (turnosConfig) {
  turnosPermitidos = normalizarTurnos(turnosConfig).map((t) =>
    String(t).replaceAll(" a ", "-").trim()
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
      grupo?.fecha === fechaInicio &&
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
  fechaInicio,
]);

  const precioBase = Number(claseConfig?.precio || 145);
  const precioTotal = precioBase;

  const numeroClases = Number(claseConfig?.numeroClases || 6);
  const duracionClase = claseConfig?.duracionClase || "3 horas";
  const modalidad = claseConfig?.modalidad || "torno";
  const subtipo = claseConfig?.subtipo || "6_clases_3h_torno";
  const incluyeDecoracion = Boolean(claseConfig?.incluyeDecoracion ?? false);

  const fechaBloqueada = useMemo(() => {
    if (!fechaInicio) return null;

    const bloqueo = fechasBloqueadas?.[fechaInicio];
    if (bloqueo?.bloqueado) {
      return bloqueo;
    }

    return null;
  }, [fechaInicio, fechasBloqueadas]);

  const diaNoDisponible = useMemo(() => {
    if (!fechaInicio) return false;
    return turnosDisponibles.length === 0;
  }, [fechaInicio, turnosDisponibles]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Debes iniciar sesión para reservar.");
      return;
    }

    if (!fechaInicio || !turno) {
      alert("Selecciona la fecha de inicio y el turno.");
      return;
    }

    if (fechaBloqueada) {
      alert(
        `No se puede reservar el día ${fechaInicio}. Motivo: ${
          fechaBloqueada.motivo || "día bloqueado"
        }.`
      );
      return;
    }

    if (diaNoDisponible) {
      alert("Esta clase no se imparte el día seleccionado.");
      return;
    }

    if (!(precioBase > 0) && !desdeTarjeta) {
      alert("No se ha podido calcular el precio del bono.");
      return;
    }

    if (desdeTarjeta && !location.state?.tarjetaRegaloId) {
      alert("No se ha encontrado la tarjeta regalo asociada.");
      return;
    }

    try {
      const orderId = Date.now().toString().slice(-12);
      const timestamp = new Date().toISOString();

      const datosBono = {
        claseId: CLASE_ID,
        clase:
          claseConfig?.nombre || "Torno alfarero perfecciona lo que ya sabes",
        tipo: "bono",
        subtipo,
        numeroClases,
        clasesConsumidas: 0,
        clasesRestantes: numeroClases,
        fechaInicio,
        fechaFinMes: sumarUnMes(fechaInicio),
        fechaCaducidadBono: sumarUnMesCaducidad(fechaInicio),
        turnoHabitual: turno,
        duracionClase,
        modalidad,
        incluyeDecoracion,
        precioBase,
        precioTotal,
        estadoBono: "activo",
        estadoPago: desdeTarjeta ? "pagado" : "pendiente",
        orderId,
        creadoEn: timestamp,
        actualizadoEn: timestamp,
        sesionesConsumidas: {},
      };

      if (desdeTarjeta) {
        const tarjetaRegaloId = location.state?.tarjetaRegaloId || "";
        const codigoTarjeta = location.state?.codigoTarjeta || "";

        const bonosRef = ref(dbRealtime, `usuarios/${user.uid}/bonos`);
        const bonosSnap = await get(bonosRef);

        let bonoYaExiste = false;

        if (bonosSnap.exists()) {
          const bonos = bonosSnap.val() || {};

          for (const bono of Object.values(bonos)) {
            if (
              bono?.tarjetaRegaloId === tarjetaRegaloId ||
              bono?.orderId === orderId
            ) {
              bonoYaExiste = true;
              break;
            }
          }
        }

        if (!bonoYaExiste) {
          await crearBonoActivo({
            uid: user.uid,
            clase: claseConfig?.nombre || "Torno alfarero perfecciona lo que ya sabes",
            claseId: CLASE_ID,
            tipoTaller: "bono_mensual",
            subtipo,
            numeroClases,
            fechaInicio,
            fechaFinMes: sumarUnMes(fechaInicio),
            fechaCaducidadBono: sumarUnMesCaducidad(fechaInicio),
            turno,
            orderId,
            datosExtra: {
              duracionClase,
              modalidad,
              incluyeDecoracion,
              precioBase,
              precioTotal,
              tarjetaRegaloId,
              codigoTarjeta,
              creadaDesde: "tarjeta_regalo",
            },
          });
        }

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
          fechaReserva: fechaInicio,
          turnoReserva: turno,
          subtipoReserva: subtipo,
          numeroClasesReserva: numeroClases,
          modalidadReserva: modalidad,
          incluyeDecoracionReserva: incluyeDecoracion,
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
            tipo: "bono",
            clase:
              claseConfig?.nombre || "Torno alfarero perfecciona lo que ya sabes",
            claseId: CLASE_ID,
            fechaInicio,
            fechaFinMes: sumarUnMes(fechaInicio),
            fechaCaducidadBono: sumarUnMesCaducidad(fechaInicio),
            turno,
            numeroClases,
            duracionClase,
            modalidad,
            incluyeDecoracion,
            precio: 0,
            precioBase: 0,
            precioTotal: 0,
            codigoTarjeta,
            orderId,
          },
        });

        return;
      }

      navigate("/resumen-pago", {
        state: {
          desdeTarjeta,
          tipo: "bono",
          clase:
            claseConfig?.nombre || "Torno alfarero perfecciona lo que ya sabes",
          claseId: CLASE_ID,
          precio: precioTotal,
          precioBase,
          precioTotal,
          fechaInicio,
          fechaFinMes: sumarUnMes(fechaInicio),
          fechaCaducidadBono: sumarUnMesCaducidad(fechaInicio),
          turno,
          numeroClases,
          duracionClase,
          modalidad,
          incluyeDecoracion,
          orderId,
          datosBono,
        },
      });
    } catch (err) {
      console.error("Error al guardar la reserva:", err);
      alert("No se pudo guardar la reserva.");
    }
  };

  return (
    <div className="bg-[#fffef4] min-h-screen flex items-center justify-center px-4 py-8">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6">
        <BotonVolver />

        <h1 className="text-center text-2xl text-[#5c3c00] font-serif mb-4">
          Reserva –{" "}
          {claseConfig?.nombre || "Torno alfarero perfecciona lo que ya sabes"}
        </h1>

        {desdeTarjeta && (
          <p className="text-sm text-green-700 text-center font-medium mb-4">
            Estás usando una tarjeta regalo 🎁
          </p>
        )}

        {cargandoConfig ? (
          <p className="text-center text-gray-500 py-8">
            Cargando configuración del bono...
          </p>
        ) : !claseConfig ? (
          <p className="text-center text-red-600 py-8">
            No se ha encontrado la configuración de este bono en Firebase.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
              <p>
                <strong>Curso de {numeroClases} clases.</strong>
              </p>
              <p>
                Incluye {numeroClases} sesiones de {duracionClase} centradas en{" "}
                {modalidad},{" "}
                {incluyeDecoracion ? "con decoración" : "sin decoración"}.
                El mes comienza con tu primera sesión y finaliza el mismo día
                del mes siguiente.
              </p>
            </div>

            <div>
              <label
                htmlFor="fechaInicio"
                className="block font-bold text-sm mb-1"
              >
                Selecciona la fecha de inicio de tu bono:
              </label>
              <DateInputReserva
                id="fechaInicio"
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value);
                  setTurno("");
                }}
              />
              {fechaBloqueada && (
                <p className="mt-2 text-sm text-red-600 font-medium">
                  Este día no está disponible para reservar.
                  {fechaBloqueada.motivo
                    ? ` Motivo: ${fechaBloqueada.motivo}.`
                    : ""}
                </p>
              )}
              {fechaInicio && !fechaBloqueada && fechaHabilitadaManual && (
                <p className="mt-2 text-sm text-green-700 font-medium">
                  Esta fecha ha sido habilitada manualmente desde administración.
                  
                </p>
              )}
              {fechaInicio &&
                !fechaBloqueada &&
                !fechaHabilitadaManual &&
                diaNoDisponible && (
                  <p className="mt-2 text-sm text-red-600 font-medium">
                    Esta clase no se imparte el día seleccionado. Días disponibles:{" "}
                    {Object.keys(claseConfig?.horarios || {}).join(", ")}.
                  </p>
                )}
                <div className="mt-2 bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
                La fecha de inicio del bono no constituye una reserva de clase.
                Deberás gestionar cada reserva desde tu perfil, en “Mis bonos”.
                </div>
            </div>

            <div>
              <label htmlFor="turno" className="block font-bold text-sm mb-1">
                Selecciona el turno habitual:
              </label>
              <select
                id="turno"
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                required
                disabled={!fechaInicio || diaNoDisponible}
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
                <strong>Modalidad:</strong> {modalidad}
              </p>
              <p>
                <strong>Clases incluidas:</strong> {numeroClases} sesiones de{" "}
                {duracionClase}
              </p>
              <p>
                <strong>Decoración:</strong>{" "}
                {incluyeDecoracion ? "Incluida" : "No incluida"}
              </p>
            </div>

            {fechaInicio && (
              <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
                <p>
                  <strong>Precio total:</strong>{" "}
                  {desdeTarjeta ? "0€" : `${precioTotal}€`}
                </p>
                <p>
                  <strong>Fin del bono mensual:</strong>{" "}
                  {sumarUnMes(fechaInicio)}
                </p>
                <p>
  <strong>Validez máxima del bono:</strong>{" "}
  {sumarUnMesCaducidad(fechaInicio)}
</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-4 px-6 py-3 rounded-full text-white font-semibold
              bg-gradient-to-b from-[#F6D66A] to-[#F4C542]
              shadow-md hover:shadow-lg
              hover:from-[#F4C542] hover:to-[#E5B92F]
              transition-all duration-200"
              disabled={
                !!fechaBloqueada ||
                diaNoDisponible ||
                !fechaInicio ||
                !turno ||
                (!desdeTarjeta && !(precioBase > 0))
              }
            >
              {desdeTarjeta ? "Confirmar reserva" : "Confirmar y pagar"}
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