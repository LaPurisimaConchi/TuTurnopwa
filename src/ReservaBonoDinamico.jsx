// src/ReservaBonoDinamico.jsx
// Compra de un bono mensual gestionado desde el panel admin
// (clases/{id} con dinamica: true y tipoProducto: "bono"). Misma lógica que las
// pantallas de bono de siempre: el bono se guarda en usuarios/{uid}/bonos al
// confirmarse el pago (webhook), o al momento si se paga con tarjeta regalo.
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get, update, push } from "firebase/database";
import { dbRealtime } from "./firebase";
import { crearBonoActivo, datosPrimeraSesionBono, usarSesionDeBono } from "./utils/bonos";
import { plazasOcupadasPorMetodo } from "./utils/disponibilidad";
import { plazasLibres } from "./utils/plazasOcupadas";
import {
  estadoDiaTaller,
  useContextoReserva,
  useDiaDeReserva,
} from "./utils/turnosTaller";
import PantallaReserva from "./components/PantallaReserva";
import SelectorDiaReserva from "./components/SelectorDiaReserva";
import SelectorTurnoReserva from "./components/SelectorTurnoReserva";
import BotonConfirmarReserva from "./components/BotonConfirmarReserva";

const sumarUnMes = (fechaISO) => {
  const d = new Date(`${fechaISO}T12:00:00`);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

export default function ReservaBonoDinamico({ claseId, clase }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    fechasBloqueadas,
    fechasHabilitadas,
    reservasGrupos,
    cargado: contextoCargado,
  } = useContextoReserva();

  const [fechaInicio, setFechaInicio] = useState("");
  const [turno, setTurno] = useState("");
  const [convertirTorno, setConvertirTorno] = useState(false);
  const [user, setUser] = useState(null);
  const [guardando, setGuardando] = useState(false);
  // La primera sesión se reserva con la compra: se cuentan las plazas del turno
  const [ocupadas, setOcupadas] = useState({ torno: 0, modelado: 0 });
  const [plazasListas, setPlazasListas] = useState(false);
  const [errorPlazas, setErrorPlazas] = useState(false);

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

  const { turnosDisponibles, fechaHabilitadaManual, fechaBloqueada, diaNoDisponible } =
    useDiaDeReserva({
      clase,
      fecha: fechaInicio,
      fechasBloqueadas,
      fechasHabilitadas,
      reservasGrupos,
    });

  const esTorno = /torno/i.test(modalidad);
  const plazasQuedan = plazasLibres({
    ...ocupadas,
    esTorno,
    maxTorno: Number(clase.plazas?.maxTorno || 12),
    maxTotales: Number(clase.plazas?.maxTotales || clase.plazas?.plazasTotales || 45),
  });

  useEffect(() => {
    if (!fechaInicio || !turno) {
      setOcupadas({ torno: 0, modelado: 0 });
      setPlazasListas(false);
      setErrorPlazas(false);
      return;
    }

    let cancelado = false;
    setPlazasListas(false);

    plazasOcupadasPorMetodo(fechaInicio, turno)
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
  }, [fechaInicio, turno]);

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

    if (errorPlazas || !plazasListas) {
      alert("No se ha podido comprobar las plazas del turno. Inténtalo de nuevo.");
      return;
    }

    if (plazasQuedan <= 0) {
      alert("No quedan plazas en este turno. Elige otro turno u otro día.");
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

      // Primera sesión del bono: se reserva con la compra, con la misma forma que
      // las que se reservan después desde el perfil (UsarBono). Pendiente hasta
      // que se paga (no cuenta para las plazas); con tarjeta regalo, ya confirmada
      const turnoElegido = String(turno).replaceAll(" a ", "-").trim();
      const reservaRef = push(
        ref(
          dbRealtime,
          `reservas/${clase.reservasPath || claseId}/${fechaInicio}/${turnoElegido}`
        )
      );
      const reservaId = reservaRef.key || "";
      const reservaPrimeraSesion = {
        clase: nombreClase,
        claseId,
        fecha: fechaInicio,
        turno: turnoElegido,
        modalidad,
        metodo: modalidad,
        precio: 0,
        precioBase: 0,
        precioTotal: 0,
        plazas: 1,
        desdeBono: true,
        bonoId: orderId,
        primeraSesionBono: true,
        estado: desdeTarjeta ? "Confirmada" : "Pendiente",
        estadoPago: desdeTarjeta ? "pagado" : "pendiente",
        orderId,
        timestamp,
      };

      const datosBono = {
        claseId,
        clase: nombreClase,
        tipo: "bono",
        subtipo,
        numeroClases,
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
        estadoPago: desdeTarjeta ? "pagado" : "pendiente",
        orderId,
        creadoEn: timestamp,
        actualizadoEn: timestamp,
        // La primera sesión cuenta como usada
        ...datosPrimeraSesionBono({
          numeroClases,
          fecha: fechaInicio,
          turno: turnoElegido,
          taller: nombreClase,
          reservaId,
          timestamp,
        }),
      };

      if (desdeTarjeta) {
        const bonosSnap = await get(ref(dbRealtime, `usuarios/${user.uid}/bonos`));
        const bonoYaExiste = Object.values(bonosSnap.exists() ? bonosSnap.val() || {} : {}).some(
          (bono) => bono?.tarjetaRegaloId === tarjetaRegaloId || bono?.orderId === orderId
        );

        if (!bonoYaExiste) {
          await update(reservaRef, { uid: user.uid, ...reservaPrimeraSesion });

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

          await usarSesionDeBono({
            uid: user.uid,
            bonoId: orderId,
            fechaSesion: fechaInicio,
            turno: turnoElegido,
            taller: nombreClase,
            reservaId,
            clase: nombreClase,
          });

          await push(ref(dbRealtime, `usuarios/${user.uid}/listaReservas`), {
            ...reservaPrimeraSesion,
            uid: user.uid,
            reservaId,
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

      // Pendiente hasta que se pague; el aviso de pago la confirma junto con el bono
      await update(reservaRef, { uid: user.uid, ...reservaPrimeraSesion });

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
    <PantallaReserva ancho="max-w-4xl">
      <h1 className="text-center text-2xl text-[#5c3c00] font-serif mb-4">
        Reserva – {nombreClase}
      </h1>

      {desdeTarjeta && (
        <p className="text-sm text-green-700 text-center font-medium mb-4">
          Estás usando una tarjeta regalo 🎁
        </p>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2 md:gap-x-10">
        {/* Izquierda: qué es el bono y desde cuándo */}
        <div className="space-y-4">
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
              mes siguiente. Al comprar el bono reservamos tu primera clase.
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

          <SelectorDiaReserva
            etiqueta="Selecciona la fecha de inicio de tu bono:"
            value={fechaInicio}
            onChange={(iso) => {
              setFechaInicio(iso);
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
            producto="Esta clase"
          >
            <div className="mt-2 bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
              Tu primera clase queda reservada en la fecha y el turno que elijas.
              Las demás las reservas desde tu perfil, en “Mis bonos”.
            </div>
          </SelectorDiaReserva>
        </div>

        {/* Derecha: turno, plazas, resumen y pago */}
        <div className="space-y-4">
          <SelectorTurnoReserva
            etiqueta="Selecciona el turno (el de tu primera clase y tu turno habitual):"
            value={turno}
            onChange={setTurno}
            turnos={turnosDisponibles}
            deshabilitado={!fechaInicio || diaNoDisponible}
            placeholder={!fechaInicio ? "-- Primero selecciona el día --" : "-- Elige turno --"}
          />

          {!!turno && errorPlazas && (
            <p className="text-sm text-red-600" role="alert">
              No se ha podido comprobar las plazas. Recarga la página e inténtalo de nuevo.
            </p>
          )}

          {!!turno && plazasListas && plazasQuedan > 0 && (
            <p className="text-sm text-green-700">
              Quedan {plazasQuedan} plazas disponibles en este turno.
            </p>
          )}

          {!!turno && plazasListas && plazasQuedan <= 0 && (
            <p className="text-sm text-red-600 font-medium" role="alert">
              No quedan plazas en este turno. Elige otro turno u otro día.
            </p>
          )}

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

          <BotonConfirmarReserva
            guardando={guardando}
            desdeTarjeta={desdeTarjeta}
            deshabilitado={
              !!fechaBloqueada ||
              diaNoDisponible ||
              !fechaInicio ||
              !turno ||
              !plazasListas ||
              errorPlazas ||
              plazasQuedan <= 0 ||
              (!desdeTarjeta && !(precioBase > 0))
            }
          />
        </div>
      </form>
    </PantallaReserva>
  );
}
