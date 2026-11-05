// src/ReservaBonoDinamico.jsx
// Compra de un bono mensual gestionado desde el panel admin
// (clases/{id} con dinamica: true y tipoProducto: "bono"). Misma lógica que las
// pantallas de bono de siempre: el bono se guarda en usuarios/{uid}/bonos al
// confirmarse el pago (webhook), o al momento si se paga con tarjeta regalo.
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import { crearBonoActivo } from "./utils/bonos";
import { turnosDisponiblesEnFecha, useContextoReserva } from "./utils/turnosTaller";
import BotonVolver from "./BotonVolver";
import DateInputReserva from "./components/DateInputReserva";

const sumarUnMes = (fechaISO) => {
  const d = new Date(`${fechaISO}T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

export default function ReservaBonoDinamico({ claseId, clase }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { fechasBloqueadas, fechasHabilitadas, reservasGrupos } = useContextoReserva();

  const [fechaInicio, setFechaInicio] = useState("");
  const [turno, setTurno] = useState("");
  const [convertirTorno, setConvertirTorno] = useState(false);
  const [user, setUser] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const desdeTarjeta =
    location.state?.desdeTarjeta || location.state?.desdeTarjetaRegalo || false;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), setUser);
    return () => unsubscribe();
  }, []);

  const nombreClase = clase.nombre || "Bono mensual";
  const precioBase = Number(clase.precio || 0);
  const permiteCambioTorno = clase.permiteCambioTorno === true;
  const extraCambioTorno = Number(clase.extraCambioTorno ?? clase.ExtraCambioTorno ?? 0);
  const extraTorno = permiteCambioTorno && convertirTorno ? extraCambioTorno : 0;
  const precioTotal = precioBase + extraTorno;

  const numeroClases = Number(clase.numeroClases ?? clase.NumeroClases ?? 4);
  const duracionClase = clase.duracionClase || clase.duracion || "3 horas";
  const modalidad = clase.modalidad || "";
  const subtipo = clase.subtipo || `${numeroClases}_clases`;
  const distribucionClases = clase.distribucionClases || "";
  const incluyeDecoracion = Boolean(clase.incluyeDecoracion ?? false);

  const turnosDisponibles = useMemo(
    () =>
      turnosDisponiblesEnFecha({
        clase,
        fecha: fechaInicio,
        fechasHabilitadas,
        reservasGrupos,
      }),
    [clase, fechaInicio, fechasHabilitadas, reservasGrupos]
  );

  const fechaHabilitadaManual = useMemo(() => {
    if (!fechaInicio) return null;
    const habilitacion = fechasHabilitadas?.[fechaInicio];
    return habilitacion?.habilitada ? habilitacion : null;
  }, [fechaInicio, fechasHabilitadas]);

  const fechaBloqueada = useMemo(() => {
    if (!fechaInicio) return null;
    const bloqueo = fechasBloqueadas?.[fechaInicio];
    return bloqueo?.bloqueado ? bloqueo : null;
  }, [fechaInicio, fechasBloqueadas]);

  const diaNoDisponible = !!fechaInicio && turnosDisponibles.length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Debes identificarte para comprar el bono.");
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

    const tarjetaRegaloId = location.state?.tarjetaRegaloId || "";
    if (desdeTarjeta && !tarjetaRegaloId) {
      alert("No se ha encontrado la tarjeta regalo asociada.");
      return;
    }

    setGuardando(true);

    try {
      const orderId = Date.now().toString().slice(-12);
      const timestamp = new Date().toISOString();
      const fechaFinMes = sumarUnMes(fechaInicio);
      const codigoTarjeta = location.state?.codigoTarjeta || "";

      const datosBono = {
        claseId,
        clase: nombreClase,
        tipo: "bono",
        subtipo,
        numeroClases,
        clasesConsumidas: 0,
        clasesRestantes: numeroClases,
        fechaInicio,
        fechaFinMes,
        fechaCaducidadBono: fechaFinMes,
        turnoHabitual: turno,
        duracionClase,
        modalidad,
        ...(distribucionClases ? { distribucionClases } : {}),
        ...(clase.incluyeDecoracion !== undefined ? { incluyeDecoracion } : {}),
        ...(permiteCambioTorno
          ? { incluyeCambioTorno: convertirTorno, extraCambioTorno: extraTorno }
          : {}),
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
        const bonosSnap = await get(ref(dbRealtime, `usuarios/${user.uid}/bonos`));
        const bonoYaExiste = Object.values(bonosSnap.exists() ? bonosSnap.val() || {} : {}).some(
          (bono) => bono?.tarjetaRegaloId === tarjetaRegaloId || bono?.orderId === orderId
        );

        if (!bonoYaExiste) {
          await crearBonoActivo({
            uid: user.uid,
            clase: nombreClase,
            claseId,
            tipoTaller: "bono_mensual",
            subtipo,
            numeroClases,
            fechaInicio,
            fechaFinMes,
            fechaCaducidadBono: fechaFinMes,
            turno,
            orderId,
            datosExtra: {
              duracionClase,
              modalidad,
              ...(distribucionClases ? { distribucionClases } : {}),
              ...(clase.incluyeDecoracion !== undefined ? { incluyeDecoracion } : {}),
              ...(permiteCambioTorno
                ? { incluyeCambioTorno: convertirTorno, extraCambioTorno: extraTorno }
                : {}),
              precioBase,
              precioTotal,
              tarjetaRegaloId,
              codigoTarjeta,
              creadaDesde: "tarjeta_regalo",
            },
          });
        }

        const tarjetaGlobalRef = ref(dbRealtime, `tarjetasRegalo/${tarjetaRegaloId}`);
        const tarjetaGlobalSnap = await get(tarjetaGlobalRef);
        const uidComprador = tarjetaGlobalSnap.exists()
          ? tarjetaGlobalSnap.val()?.uidComprador || ""
          : "";

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
        };

        await update(tarjetaGlobalRef, datosActualizacionTarjeta);

        if (uidComprador) {
          await update(
            ref(dbRealtime, `usuarios/${uidComprador}/tarjetasRegalo/${tarjetaRegaloId}`),
            datosActualizacionTarjeta
          );
        }

        navigate("/pago/exito", {
          state: {
            desdeTarjeta: true,
            tipo: "bono",
            clase: nombreClase,
            claseId,
            fechaInicio,
            fechaFinMes,
            fechaCaducidadBono: fechaFinMes,
            turno,
            numeroClases,
            duracionClase,
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
          clase: nombreClase,
          claseId,
          precio: precioTotal,
          precioBase,
          precioTotal,
          fechaInicio,
          fechaFinMes,
          fechaCaducidadBono: fechaFinMes,
          turno,
          numeroClases,
          duracionClase,
          orderId,
          datosBono,
        },
      });
    } catch (err) {
      console.error("Error al guardar el bono:", err);
      alert("No se pudo guardar la reserva.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-[#fffef4] min-h-screen flex items-center justify-center px-4 py-8">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6">
        <BotonVolver />

        <h1 className="text-center text-2xl text-[#5c3c00] font-serif mb-4">
          Reserva – {nombreClase}
        </h1>

        {desdeTarjeta && (
          <p className="text-sm text-green-700 text-center font-medium mb-4">
            Estás usando una tarjeta regalo 🎁
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
            <p>
              <strong>Bono mensual de {numeroClases} clases.</strong>
            </p>
            <p>
              Incluye {numeroClases} sesiones de {duracionClase}.{" "}
              {distribucionClases && (
                <>
                  <strong>Distribución:</strong> {distribucionClases}.{" "}
                </>
              )}
              El mes comienza con tu primera sesión y finaliza el mismo día del
              mes siguiente.
            </p>
          </div>

          {permiteCambioTorno && extraCambioTorno > 0 && (
            <label className="flex items-start gap-2 text-sm text-[#5c3c00] bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={convertirTorno}
                onChange={(e) => setConvertirTorno(e.target.checked)}
              />
              <span>
                Convertir una de las clases de modelado en una de torno alfarero
                (+{extraCambioTorno}€).
              </span>
            </label>
          )}

          <div>
            <label htmlFor="fechaInicio" className="block font-bold text-sm mb-1">
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
                {fechaBloqueada.motivo ? ` Motivo: ${fechaBloqueada.motivo}.` : ""}
              </p>
            )}
            {fechaInicio && !fechaBloqueada && fechaHabilitadaManual && (
              <p className="mt-2 text-sm text-green-700 font-medium">
                Esta fecha ha sido habilitada manualmente desde administración.
              </p>
            )}
            {fechaInicio && !fechaBloqueada && !fechaHabilitadaManual && diaNoDisponible && (
              <p className="mt-2 text-sm text-red-600 font-medium">
                Esta clase no se imparte el día seleccionado. Días disponibles:{" "}
                {Object.keys(clase.horarios || {}).join(", ") || "—"}.
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
            {modalidad && (
              <p>
                <strong>Modalidad:</strong> {modalidad}
              </p>
            )}
            <p>
              <strong>Clases incluidas:</strong> {numeroClases} sesiones de {duracionClase}
            </p>
            {distribucionClases && (
              <p>
                <strong>Distribución:</strong> {distribucionClases}
              </p>
            )}
          </div>

          {fechaInicio && (
            <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
              <p>
                <strong>Precio total:</strong> {desdeTarjeta ? "0€" : `${precioTotal}€`}
              </p>
              <p>
                <strong>Fin del bono mensual:</strong> {sumarUnMes(fechaInicio)}
              </p>
              <p>
                <strong>Validez máxima del bono:</strong> {sumarUnMes(fechaInicio)}
              </p>
            </div>
          )}

          <button
            type="submit"
            className="w-full mt-4 px-6 py-3 rounded-full text-white font-semibold
            bg-gradient-to-b from-[#F6D66A] to-[#F4C542]
            shadow-md hover:shadow-lg
            hover:from-[#F4C542] hover:to-[#E5B92F]
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              guardando ||
              !!fechaBloqueada ||
              diaNoDisponible ||
              !fechaInicio ||
              !turno ||
              (!desdeTarjeta && !(precioBase > 0))
            }
          >
            {guardando
              ? "Guardando..."
              : desdeTarjeta
              ? "Confirmar reserva"
              : "Confirmar y pagar"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <img src="/img/logoPCsin.png" alt="La Purísima Conchi" className="w-20 mx-auto" />
        </div>
      </div>
    </div>
  );
}
