// src/ReservaBonoDinamico.jsx
// Compra de un bono mensual gestionado desde el panel admin
// (clases/{id} con dinamica: true y tipoProducto: "bono"). Misma lógica que las
// pantallas de bono de siempre: el bono se guarda en usuarios/{uid}/bonos al
// confirmarse el pago (webhook), o al momento si se paga con tarjeta regalo.
import React, { useState, useEffect } from "react";
import Icono from "./components/Icono";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, update, push } from "firebase/database";
import { dbRealtime } from "./firebase";
import { datosPrimeraSesionBono } from "./utils/bonos";
import { cargarFranja } from "./utils/disponibilidad";
import { plazasLibresFranja } from "./utils/aforo";
import { reservarEnServidor } from "./utils/reservaServidor";
import { useConfigEspacio } from "./configuracionEspacio";
import {
  estadoDiaTaller,
  useContextoReserva,
  useDiaDeReserva,
} from "./utils/turnosTaller";
import PantallaReserva from "./components/PantallaReserva";
import { AccesoReservaIncrustada, ContenedorIncrustado } from "./components/ReservaIncrustada";
import SelectorDiaReserva from "./components/SelectorDiaReserva";
import SelectorTurnoReserva from "./components/SelectorTurnoReserva";
import BotonConfirmarReserva from "./components/BotonConfirmarReserva";

import { fechaDMA } from "./utils/formatoFecha";
import { canjearTarjetaRegalo, mensajeErrorCanje } from "./utils/canjeServidor";
import { diasCaducidadBono, fechaCaducidadBono } from "./utils/estadoBono";
import { euros } from "./utils/formatoPrecio";

// Último día del bono según los días de validez de su ficha (31 por defecto)
const caducidadDe = (clase, fechaISO) => fechaCaducidadBono(fechaISO, diasCaducidadBono(clase));

// Compra de un bono. Con `incrustado` va dentro de la ficha pública del bono
// (/taller/:id), en una sola columna y con el acceso resuelto en la propia ficha.
export default function ReservaBonoDinamico(props) {
  if (!props.incrustado) return <ReservaBonoInterna {...props} />;

  return (
    <AccesoReservaIncrustada clase={props.clase}>
      <ReservaBonoInterna {...props} />
    </AccesoReservaIncrustada>
  );
}

function ReservaBonoInterna({ claseId, clase, incrustado = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    fechasBloqueadas,
    fechasHabilitadas,
    diasAbiertos,
    cargado: contextoCargado,
  } = useContextoReserva();

  // Quien vuelve de registrarse o iniciar sesión recupera el día y el turno elegidos
  const elegidoAntes = location.state?.bonoElegido;
  const [fechaInicio, setFechaInicio] = useState(elegidoAntes?.fechaInicio || "");
  const [turno, setTurno] = useState(elegidoAntes?.turno || "");
  const [convertirTorno, setConvertirTorno] = useState(false);
  const [user, setUser] = useState(null);
  const [guardando, setGuardando] = useState(false);
  // La primera sesión se reserva con la compra: se cuentan las plazas del turno
  const [ocupadas, setOcupadas] = useState({ total: 0, torno: 0 });
  const { config: configEspacio } = useConfigEspacio();
  const [plazasListas, setPlazasListas] = useState(false);
  const [errorPlazas, setErrorPlazas] = useState(false);

  const desdeTarjeta =
    location.state?.desdeTarjeta || location.state?.desdeTarjetaRegalo || false;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), setUser);
    return () => unsubscribe();
  }, []);

  const sinCuenta = !user || user.isAnonymous;
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

  const { turnosDisponibles, turnosMinimo, fechaHabilitadaManual, fechaBloqueada, diaNoDisponible } =
    useDiaDeReserva({
      clase,
      fecha: fechaInicio,
      fechasBloqueadas,
      fechasHabilitadas,
      permiteAbrir: true,
      diasAbiertos,
    });
  // Un bono es de una plaza: nunca llega al mínimo, así que los turnos que lo piden y siguen
  // cerrados se enseñan en azul pero no se pueden comprar
  const turnoCerrado = !!turno && turnosMinimo.includes(turno);

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
    if (!fechaInicio || !turno) {
      setOcupadas({ total: 0, torno: 0 });
      setPlazasListas(false);
      setErrorPlazas(false);
      return;
    }

    let cancelado = false;
    setPlazasListas(false);

    cargarFranja(fechaInicio, turno)
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

    if (!fechaInicio || !turno) {
      alert("Selecciona la fecha de inicio y el turno.");
      return;
    }

    // El bono exige cuenta (un invitado tampoco vale): se lleva a registrarse y se
    // vuelve aquí con el día y el turno ya elegidos
    if (!user || user.isAnonymous) {
      navigate("/registro", {
        state: {
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: "#reservar",
            state: { ...location.state, bonoElegido: { fechaInicio, turno } },
          },
        },
      });
      return;
    }

    if (fechaBloqueada) {
      alert(
        `No se puede reservar el día ${fechaDMA(fechaInicio)}. Motivo: ${
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

    const codigoTarjeta = location.state?.codigoTarjeta || "";
    if (desdeTarjeta && !codigoTarjeta) {
      alert("No se ha encontrado la tarjeta regalo asociada.");
      return;
    }

    setGuardando(true);

    try {
      const orderId = Date.now().toString().slice(-12);
      const timestamp = new Date().toISOString();
      const fechaFinMes = caducidadDe(clase, fechaInicio);

      // Primera sesión del bono: se reserva con la compra, con la misma forma que
      // las que se reservan después desde el perfil (UsarBono). Pendiente hasta
      // que se paga; con tarjeta regalo la confirma el servidor al canjearla
      const turnoElegido = String(turno).replaceAll(" a ", "-").trim();
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
        estado: "Pendiente",
        estadoPago: "pendiente",
        orderId,
        timestamp,
      };

      // El servidor comprueba el aforo y guarda la plaza mientras se paga. En
      // desarrollo, si la función aún no está desplegada, se escribe directamente.
      let reservaRef;
      try {
        const { reservas: creadas } = await reservarEnServidor(claseId, [
          {
            fecha: fechaInicio,
            turno: turnoElegido,
            metodo: "",
            plazas: 1,
            torno: esTorno,
            reserva: reservaPrimeraSesion,
          },
        ]);
        reservaRef = ref(dbRealtime, creadas[0].ruta);
      } catch (errorServidor) {
        if (!errorServidor.sinServidor) throw errorServidor;
        console.warn("Sin función de reserva en el servidor: se escribe directamente (solo desarrollo).");
        reservaRef = push(
          ref(dbRealtime, `reservas/${clase.reservasPath || claseId}/${fechaInicio}/${turnoElegido}`)
        );
        await update(reservaRef, { uid: user.uid, ...reservaPrimeraSesion });
      }
      const reservaId = reservaRef.key || "";

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

      // Con tarjeta regalo el servidor confirma la primera sesión, crea el bono (con esa
      // clase ya usada), marca la tarjeta usada y envía el correo
      if (desdeTarjeta) {
        try {
          await canjearTarjetaRegalo({ codigo: codigoTarjeta, orderId, bono: datosBono });
        } catch (errorCanje) {
          alert(mensajeErrorCanje(errorCanje));
          return;
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
      alert(
        err?.codigo === "franja_llena" || err?.codigo === "torno_lleno"
          ? "Esa franja se acaba de llenar. Elige otro turno u otro día."
          : err?.codigo
          ? err.message
          : "No se pudo guardar la reserva."
      );
    } finally {
      setGuardando(false);
    }
  };

  const Contenedor = incrustado ? ContenedorIncrustado : PantallaReserva;

  return (
    <Contenedor ancho="max-w-4xl">
      {incrustado ? (
        <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-3">
          Compra tu bono
        </h2>
      ) : (
        <h1 className="text-center font-serif text-tinta mb-4">
          <span className="block text-sm font-sans font-semibold uppercase tracking-wider text-terracota">
            Reserva
          </span>
          <span className="block text-3xl md:text-4xl font-bold leading-tight mt-1">
            {nombreClase}
          </span>
        </h1>
      )}

      {desdeTarjeta && (
        <p className="text-sm text-green-700 text-center font-medium mb-4">
          Estás usando una tarjeta regalo <Icono nombre="regalo" />
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className={`grid gap-6 ${incrustado ? "" : "md:grid-cols-2 md:gap-x-10"}`}
      >
        {/* Izquierda: qué es el bono y desde cuándo */}
        <div className="space-y-4">
          <div className="bg-crema border border-linea rounded-xl p-3 text-sm text-tinta">
            <p>
              <strong>Bono de {numeroClases} clases.</strong>
            </p>
            <p>
              Incluye {numeroClases} sesiones de {duracionClase}.{" "}
              {distribucionClases && (
                <>
                  <strong>Distribución:</strong> {distribucionClases}.{" "}
                </>
              )}
              El bono dura {diasCaducidadBono(clase)} días desde tu primera sesión.
              Al comprar el bono reservamos tu primera clase.
            </p>
          </div>

          {permiteCambioTorno && extraCambioTorno > 0 && (
            <label className="flex items-start gap-2 text-sm text-tinta bg-crema border border-linea rounded-xl p-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={convertirTorno}
                onChange={(e) => setConvertirTorno(e.target.checked)}
              />
              <span>
                Convertir una de las clases de modelado en una de torno alfarero
                (+{euros(extraCambioTorno)}).
              </span>
            </label>
          )}

          <SelectorDiaReserva
            desplazar={!incrustado}
            etiqueta="Selecciona la fecha de inicio de tu bono:"
            value={fechaInicio}
            onChange={(iso) => {
              setFechaInicio(iso);
              setTurno("");
            }}
            estadoDia={(iso) =>
              estadoDiaTaller({ clase, fecha: iso, fechasBloqueadas, fechasHabilitadas, permiteAbrir: true, sinNumeroMinimo: true, diasAbiertos })
            }
            cargando={!contextoCargado}
            fechaBloqueada={fechaBloqueada}
            fechaHabilitadaManual={fechaHabilitadaManual}
            diaNoDisponible={diaNoDisponible}
            clase={clase}
            producto="Esta clase"
          >
            <div className="mt-2 bg-crema border border-linea rounded-xl p-3 text-sm text-tinta">
              Tu primera clase queda reservada en la fecha y el turno que elijas.
              Las demás las reservas desde tu perfil, en “Mis bonos”.
            </div>
          </SelectorDiaReserva>
        </div>

        {/* Derecha: turno, plazas, resumen y pago */}
        <div className="space-y-4">
          <SelectorTurnoReserva
            botones
            etiqueta="Selecciona el turno (el de tu primera clase y tu turno habitual):"
            value={turno}
            onChange={setTurno}
            turnos={turnosDisponibles}
            turnosMinimo={turnosMinimo}
            deshabilitado={!fechaInicio || diaNoDisponible}
            placeholder={!fechaInicio ? "-- Primero selecciona el día --" : "-- Elige turno --"}
          />

          {turnoCerrado && (
            <p className="text-sm text-red-600 font-medium" role="alert">
              Este turno está cerrado: solo se abre cuando otra reserva llega al mínimo de personas de su taller.
              Elige otro turno u otro día.
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

          {/* En la ficha esto ya se explica más arriba */}
          {!incrustado && (
          <div className="bg-crema border border-linea rounded-xl p-3 text-sm text-tinta">
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
          )}

          {fechaInicio && (
            <div className="bg-crema border border-linea rounded-xl p-3 text-sm text-tinta">
              <p>
                <strong>Precio total:</strong> {desdeTarjeta ? euros(0) : `${euros(precioTotal)}`}
              </p>
              <p>
                <strong>Válido hasta:</strong> {fechaDMA(caducidadDe(clase, fechaInicio))}{" "}
                ({diasCaducidadBono(clase)} días desde la primera clase)
              </p>
            </div>
          )}

          {sinCuenta && (
            <p className="text-sm text-tinta bg-mostaza-suave border border-mostaza rounded-xl p-3">
              <Icono nombre="candado" className="mr-1" />
              Para comprar un bono necesitas una cuenta: tus clases se reservan desde tu perfil.
              Elige tu día y turno y, al continuar, te llevamos a registrarte sin perder lo elegido.
            </p>
          )}

          <BotonConfirmarReserva
            texto={sinCuenta ? "Registrarme para comprar el bono" : undefined}
            guardando={guardando}
            desdeTarjeta={desdeTarjeta}
            deshabilitado={
              turnoCerrado ||
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
    </Contenedor>
  );
}
