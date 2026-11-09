import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { ref, push, get, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import { crearBonoActivo } from "./utils/bonos";
import { marcarTarjetaRegaloComoUsada } from "./utils/tarjetasRegalo";
import BotonVolver from "./BotonVolver";
import BloqueoReserva from "./BloqueoReserva";
import DateInputReserva from "./components/DateInputReserva";

import { fechaDMA } from "./utils/formatoFecha";
const actualizarContadorReservas = async (uid) => {
  const userRef = ref(dbRealtime, "usuarios/" + uid);
  const snapshot = await get(userRef);

  if (snapshot.exists()) {
    const datos = snapshot.val();
    const nuevasReservas = (datos.reservas || 0) + 1;
    await update(userRef, { reservas: nuevasReservas });
  }
};

const sumar28Dias = (fechaISO) => {
  const d = new Date(fechaISO + "T12:00:00");
  d.setDate(d.getDate() + 28);
  return d.toISOString().slice(0, 10);
};

const sumarUnMes = (fechaISO) => {
  const d = new Date(fechaISO + "T12:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

const sumarTresMeses = (fechaISO) => {
  const d = new Date(fechaISO + "T12:00:00");
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
};

const TALLERES = [
  {
    key: "crea-tu-pieza-favorita-desde-cero",
    clase: "Crea tu pieza favorita desde cero",
    precio: 55,
    tipo: "una_sesion",
    turnos: [
      { value: "11:00-15:00", label: "11:00 – 15:00 (mañana)" },
      { value: "17:00-20:00", label: "17:00 – 20:00 (tarde)" },
    ],
  },
  {
    key: "crea-tu-brunch-bowl",
    clase: "Crea tu brunch bowl",
    precio: 55,
    tipo: "una_sesion",
    turnos: [
      { value: "11:00-15:00", label: "11:00 – 15:00 (mañana)" },
      { value: "17:00-20:00", label: "17:00 – 20:00 (tarde)" },
    ],
  },
  {
    key: "crea-tu-cuenco-ramen",
    clase: "Crea tu cuenco para ramen",
    precio: 55,
    tipo: "una_sesion",
    turnos: [
      { value: "11:00-15:00", label: "11:00 – 15:00 (mañana)" },
      { value: "17:00-20:00", label: "17:00 – 20:00 (tarde)" },
    ],
  },
  {
    key: "crea-tu-bandeja-hogar",
    clase: "Crea tu bandeja de hogar",
    precio: 55,
    tipo: "una_sesion",
    turnos: [
      { value: "11:00-15:00", label: "11:00 – 15:00 (mañana)" },
      { value: "17:00-20:00", label: "17:00 – 20:00 (tarde)" },
    ],
  },
  {
    key: "crea-tu-taza-favorita",
    clase: "Crea tu taza favorita",
    precio: 55,
    tipo: "una_sesion",
    turnos: [
      { value: "11:00-15:00", label: "11:00 – 15:00 (mañana)" },
      { value: "17:00-20:00", label: "17:00 – 20:00 (tarde)" },
    ],
  },
  {
    key: "crea-tu-maceta",
    clase: "Crea tu maceta",
    precio: 55,
    tipo: "una_sesion",
    turnos: [
      { value: "11:00-15:00", label: "11:00 – 15:00 (mañana)" },
      { value: "17:00-20:00", label: "17:00 – 20:00 (tarde)" },
    ],
  },
  {
    key: "crea-tu-gran-centro-mesa",
    clase: "Crea tu gran centro de mesa",
    precio: 65,
    tipo: "una_sesion",
    turnos: [
      { value: "11:00-15:00", label: "11:00 – 15:00 (mañana)" },
      { value: "17:00-20:00", label: "17:00 – 20:00 (tarde)" },
    ],
  },
  {
    key: "crea-tu-jarra-jarron-grande",
    clase: "Crea tu jarra / jarrón grande",
    precio: 75,
    tipo: "una_sesion",
    turnos: [
      { value: "11:00-15:00", label: "11:00 – 15:00 (mañana)" },
      { value: "17:00-20:00", label: "17:00 – 20:00 (tarde)" },
    ],
  },
  {
    key: "crea-tu-set-matcha",
    clase: "Crea tu set de matcha",
    precio: 60,
    tipo: "dos_sesiones",
    turnos: [
      { value: "11:00-15:00", label: "11:00 – 15:00 (mañana)" },
      { value: "17:00-20:00", label: "17:00 – 20:00 (tarde)" },
    ],
  },
  {
    key: "crea-tu-set-sake",
    clase: "Crea tu set de sake",
    precio: 60,
    tipo: "dos_sesiones",
    turnos: [
      { value: "11:00-15:00", label: "11:00 – 15:00 (mañana)" },
      { value: "17:00-20:00", label: "17:00 – 20:00 (tarde)" },
    ],
  },
  {
    key: "crea-tu-taza-escultorica",
    clase: "Crea tu taza escultórica",
    precio: 58,
    tipo: "dos_sesiones",
    turnos: [
      { value: "11:00-15:00", label: "11:00 – 15:00 (mañana)" },
      { value: "17:00-20:00", label: "17:00 – 20:00 (tarde)" },
    ],
  },
  {
    key: "crea-tu-maceta-organica",
    clase: "Crea tu maceta orgánica",
    precio: 59,
    tipo: "dos_sesiones",
    turnos: [
      { value: "11:00-15:00", label: "11:00 – 15:00 (mañana)" },
      { value: "17:00-20:00", label: "17:00 – 20:00 (tarde)" },
    ],
  },
  {
    key: "modela-a-mano-y-decora-tus-piezas-favoritas",
    clase: "Modela a mano y decora tus piezas favoritas",
    precio: 79,
    tipo: "bono",
    subtipo: "4_clases_3h_mes",
    numeroClases: 4,
    duracionClase: "3 horas",
    turnos: [
      { value: "11:00-14:00", label: "11:00 – 14:00" },
      { value: "17:00-20:00", label: "17:00 – 20:00" },
    ],
  },
  {
    key: "torno-alfarero-y-decoracion",
    clase: "Torno alfarero y decoración",
    precio: 99,
    tipo: "bono",
    subtipo: "4_clases_3h_mes",
    numeroClases: 4,
    duracionClase: "3 horas",
    turnos: [
      { value: "11:00-14:00", label: "11:00 – 14:00" },
      { value: "17:00-20:00", label: "17:00 – 20:00" },
    ],
  },
  {
    key: "torno-alfarero-empezar-desde-cero",
    clase: "Torno alfarero. Empezar bien desde cero o perfecciona lo que ya sabes",
    precio: 120,
    tipo: "bono",
    subtipo: "4_clases_3h_torno",
    numeroClases: 4,
    duracionClase: "3 horas",
    turnos: [
      { value: "viernes-tarde", label: "Viernes por la tarde" },
      { value: "otro-horario", label: "Otro horario según disponibilidad" },
    ],
  },
  {
    key: "torno-alfarero-perfecciona-lo-que-ya-sabes",
    clase: "Torno alfarero. Empezar bien desde cero o perfecciona lo que ya sabes",
    precio: 145,
    tipo: "bono",
    subtipo: "6_clases_3h_torno",
    numeroClases: 6,
    duracionClase: "3 horas",
    turnos: [
      { value: "viernes-tarde", label: "Viernes por la tarde" },
      { value: "otro-horario", label: "Otro horario según disponibilidad" },
    ],
  },
  {
    key: "pinta-tu-pieza",
    clase: "Pinta tu pieza de cerámica",
    precio: 25,
    tipo: "pinta_decora",
    duracionClase: "2 horas y media",
    turnos: [
      { value: "11:00-13:30", label: "11:00 – 13:30" },
      { value: "17:00-19:30", label: "17:00 – 19:30" },
    ],
  },
  {
    key: "especial-pinta-tu-pieza",
    clase: "Especial pinta tu pieza de cerámica",
    precio: 35,
    tipo: "pinta_decora",
    duracionClase: "2 horas y media",
    turnos: [
      { value: "11:00-13:30", label: "11:00 – 13:30" },
      { value: "17:00-19:30", label: "17:00 – 19:30" },
    ],
  },
];

export default function ReservaConTarjetaRegalo() {
  const navigate = useNavigate();
  const location = useLocation();

  const { codigo, importe, saldo } = location.state || {};

  const [tallerKey, setTallerKey] = useState("");
  const [fecha, setFecha] = useState("");
  const [turno, setTurno] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [fechasBloqueadas, setFechasBloqueadas] = useState({});

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

  const tallerSeleccionado = useMemo(
    () => TALLERES.find((t) => t.key === tallerKey),
    [tallerKey]
  );

  const saldoDisponible = Number(importe || saldo || 0);

  const fechaBloqueada = useMemo(() => {
    if (!fecha) return null;

    const bloqueo = fechasBloqueadas?.[fecha];
    if (bloqueo?.bloqueado) {
      return bloqueo;
    }

    return null;
  }, [fecha, fechasBloqueadas]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("Debes iniciar sesión.");
      return;
    }

    if (!codigo) {
      alert("No se ha detectado ningún código de tarjeta regalo.");
      return;
    }

    if (!tallerSeleccionado || !fecha || !turno) {
      alert("Selecciona taller, fecha y turno.");
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

    if (saldoDisponible < tallerSeleccionado.precio) {
      alert(
        `El importe de esta tarjeta regalo (${saldoDisponible}€) no cubre este taller (${tallerSeleccionado.precio}€).`
      );
      return;
    }

    try {
      setGuardando(true);

      const orderId = Date.now().toString().slice(-12);

      let reserva = {
        clase: tallerSeleccionado.clase,
        tipoTaller: tallerSeleccionado.tipo,
        fecha,
        turno,
        desdeTarjeta: true,
        codigoTarjeta: codigo,
        importeTarjeta: saldoDisponible,
        precio: tallerSeleccionado.precio,
        precioTotal: tallerSeleccionado.precio,
        estadoPago: "pagado_con_tarjeta_regalo",
        orderId,
        timestamp: new Date().toISOString(),
      };

      if (tallerSeleccionado.tipo === "dos_sesiones") {
        reserva = {
          ...reserva,
          fechaPrimeraSesion: fecha,
          segundaSesion: {
            habilitada: false,
            fechaDisponible: sumar28Dias(fecha),
            reservada: false,
            fechaReserva: null,
          },
        };
      }

      if (tallerSeleccionado.tipo === "bono") {
        reserva = {
          ...reserva,
          subtipo: tallerSeleccionado.subtipo,
          fechaInicio: fecha,
          fechaFinMes: sumarUnMes(fecha),
          fechaCaducidadBono: sumarTresMeses(fecha),
          numeroClases: tallerSeleccionado.numeroClases,
          duracionClase: tallerSeleccionado.duracionClase,
          clasesConsumidas: 0,
          clasesRestantes: tallerSeleccionado.numeroClases,
        };
      }

      if (tallerSeleccionado.tipo === "pinta_decora") {
        reserva = {
          ...reserva,
          duracion: "2 horas y media",
        };
      }

      const generalRef = ref(
        dbRealtime,
        `reservasTarjetaRegalo/${tallerSeleccionado.key}/${fecha}/${turno}`
      );
      await push(generalRef, { uid: user.uid, ...reserva });

      const userListaReservasRef = ref(
        dbRealtime,
        `usuarios/${user.uid}/listaReservas`
      );
      await push(userListaReservasRef, reserva);

      if (tallerSeleccionado.tipo === "bono") {
        await crearBonoActivo({
          uid: user.uid,
          clase: tallerSeleccionado.clase,
          subtipo: tallerSeleccionado.subtipo,
          numeroClases: tallerSeleccionado.numeroClases,
          fechaInicio: fecha,
          fechaFinMes: sumarUnMes(fecha),
          fechaCaducidadBono: sumarTresMeses(fecha),
          turno,
          orderId,
          datosExtra: {
            desdeTarjeta: true,
            codigoTarjeta: codigo,
            precio: tallerSeleccionado.precio,
            precioBase: tallerSeleccionado.precio,
            precioTotal: tallerSeleccionado.precio,
            duracionClase: tallerSeleccionado.duracionClase,
          },
        });
      }

      await marcarTarjetaRegaloComoUsada({
        codigo,
        uid: user.uid,
      });

      await actualizarContadorReservas(user.uid);

      navigate("/pago/exito", {
        state: {
          clase: tallerSeleccionado.clase,
          fecha,
          turno,
          precio: 0,
          usandoTarjetaRegalo: true,
          codigoTarjeta: codigo,
          orderId,
        },
      });
    } catch (error) {
      console.error("Error al reservar con tarjeta regalo:", error);
      alert("No se pudo completar la reserva con la tarjeta regalo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-[#fffef4] min-h-screen px-4 py-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <BotonVolver />

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-yellow-900 font-serif mb-2">
            Reservar con tarjeta regalo
          </h1>
          <p className="text-sm text-gray-600">
            Elige el taller, la fecha y el turno para hacer tu reserva.
          </p>
        </div>

        <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-4 mb-5 text-sm text-[#5c3c00]">
          <p>
            <strong>Código de tarjeta:</strong> {codigo || "No disponible"}
          </p>
          <p className="mt-1">
            <strong>Saldo disponible:</strong> {saldoDisponible} €
          </p>
        </div>

        <BloqueoReserva>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-bold text-sm mb-1">
                Elige el taller
              </label>
              <select
                value={tallerKey}
                onChange={(e) => {
                  setTallerKey(e.target.value);
                  setTurno("");
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                required
              >
                <option value="">-- Selecciona un taller --</option>
                {TALLERES.map((taller) => (
                  <option key={taller.key} value={taller.key}>
                    {taller.clase} — {taller.precio}€
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-sm mb-1">
                {tallerSeleccionado?.tipo === "bono"
                  ? "Selecciona el día de inicio"
                  : "Selecciona el día"}
              </label>
              <DateInputReserva
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
              {fechaBloqueada && (
                <p className="mt-2 text-sm text-red-600 font-medium">
                  Este día no está disponible para reservar.
                  {fechaBloqueada.motivo
                    ? ` Motivo: ${fechaBloqueada.motivo}.`
                    : ""}
                </p>
              )}
            </div>

            <div>
              <label className="block font-bold text-sm mb-1">
                Selecciona el turno
              </label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                required
                disabled={!tallerSeleccionado}
              >
                <option value="">-- Elige turno --</option>
                {tallerSeleccionado?.turnos?.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {tallerSeleccionado && (
              <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-4 text-sm text-[#5c3c00]">
                <p>
                  <strong>Taller seleccionado:</strong> {tallerSeleccionado.clase}
                </p>
                <p>
                  <strong>Importe del taller:</strong> {tallerSeleccionado.precio}€
                </p>
                <p>
                  <strong>Saldo tarjeta:</strong> {saldoDisponible}€
                </p>

                {saldoDisponible < tallerSeleccionado.precio ? (
                  <p className="mt-2 text-red-700 font-semibold">
                    Esta tarjeta no tiene saldo suficiente para este taller.
                  </p>
                ) : (
                  <p className="mt-2 text-green-700 font-semibold">
                    Este taller puede reservarse con tu tarjeta regalo.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={
                guardando ||
                !!fechaBloqueada ||
                !tallerSeleccionado ||
                !fecha ||
                !turno ||
                saldoDisponible < (tallerSeleccionado?.precio || 0)
              }
              className="w-full mt-4 px-6 py-3 rounded-full text-white font-semibold
              bg-gradient-to-b from-[#F6D66A] to-[#F4C542]
              shadow-md hover:shadow-lg
              hover:from-[#F4C542] hover:to-[#E5B92F]
              transition-all duration-200 disabled:opacity-60"
            >
              {guardando ? "Reservando..." : "Confirmar reserva con tarjeta regalo"}
            </button>
          </form>
        </BloqueoReserva>
      </div>
    </div>
  );
}