// src/ReservaTallerDinamico.jsx
// Reserva de un taller gestionado desde el panel admin (clases/{id} con
// dinamica: true), sean talleres nuevos o de los de siempre ya migrados.
// Sigue el mismo flujo que las reservas de siempre: reservas/{ruta}/...
// con estado Pendiente → /resumen-pago → Redsys, o confirmada con tarjeta regalo.
// Los bonos tienen su propia pantalla (ReservaBonoDinamico).
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get, push, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import { plazasOcupadasDeTaller, plazasOcupadasPorMetodo } from "./utils/disponibilidad";
import { plazasDeTarjetaRegalo } from "./utils/tarjetasRegalo";
import {
  esTurnoConsulta,
  estadoDiaTaller,
  useContextoReserva,
  useDiaDeReserva,
} from "./utils/turnosTaller";
import {
  estadoTaller,
  metodosDelTaller,
  variantesDelTaller,
} from "./catalogoTalleres";
import BloqueoReserva from "./BloqueoReserva";
import PantallaReserva from "./components/PantallaReserva";
import SelectorDiaReserva from "./components/SelectorDiaReserva";
import SelectorTurnoReserva from "./components/SelectorTurnoReserva";
import BotonConfirmarReserva from "./components/BotonConfirmarReserva";
import DatosContactoInvitado from "./components/DatosContactoInvitado";
import ReservaBonoDinamico from "./ReservaBonoDinamico";

const MAX_TORNO_FALLBACK = 12;
const MAX_TOTALES_FALLBACK = 45;

const sumar28Dias = (fechaISO) => {
  const d = new Date(`${fechaISO}T12:00:00`);
  d.setDate(d.getDate() + 28);
  return d.toISOString().slice(0, 10);
};

export default function ReservaTallerDinamico() {
  const { claseId } = useParams();
  const [estado, setEstado] = useState({ cargando: true, clase: null });

  useEffect(() => {
    let cancelado = false;

    get(ref(dbRealtime, `clases/${claseId}`))
      .then((snap) => {
        const datos = snap.exists() ? snap.val() : null;
        if (!cancelado) {
          setEstado({ cargando: false, clase: datos?.dinamica ? datos : null });
        }
      })
      .catch((error) => {
        console.error("Error al cargar configuración de la clase:", error);
        if (!cancelado) setEstado({ cargando: false, clase: null });
      });

    return () => {
      cancelado = true;
    };
  }, [claseId]);

  const { cargando, clase } = estado;

  if (cargando) {
    return (
      <PantallaReserva>
        <p className="text-center text-gray-500 py-8">
          Cargando configuración del taller...
        </p>
      </PantallaReserva>
    );
  }

  if (!clase || estadoTaller(clase) !== "activa") {
    return (
      <PantallaReserva>
        <p className="text-center text-red-600 py-8">
          Este taller no está disponible para reservar ahora mismo.
        </p>
      </PantallaReserva>
    );
  }

  return clase.tipoProducto === "bono" ? (
    <ReservaBonoDinamico claseId={claseId} clase={clase} />
  ) : (
    <FormularioReserva claseId={claseId} clase={clase} />
  );
}

export function FormularioReserva({ claseId, clase }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    fechasBloqueadas,
    fechasHabilitadas,
    reservasGrupos,
    error: errorContexto,
    cargado: contextoCargado,
  } = useContextoReserva();

  const [fecha, setFecha] = useState("");
  const [turno, setTurno] = useState("");
  const [metodo, setMetodo] = useState("");
  const [varianteId, setVarianteId] = useState("");
  const [plazas, setPlazas] = useState(1);

  const [ocupadasTorno, setOcupadasTorno] = useState(0);
  const [ocupadasModelado, setOcupadasModelado] = useState(0);
  const [ocupadasTaller, setOcupadasTaller] = useState(0);
  const [user, setUser] = useState(null);
  const [guardando, setGuardando] = useState(false);
  // Sin plazas contadas no se sabe si queda sitio: no se deja reservar
  const [errorPlazas, setErrorPlazas] = useState(false);
  // Las plazas se cuentan por turno: hasta tener las del turno elegido no se muestran
  const [plazasListas, setPlazasListas] = useState(false);

  // Datos de contacto de quien reserva sin cuenta: se piden al guardar
  const [pidiendoDatos, setPidiendoDatos] = useState(false);
  const resolverDatos = useRef(null);

  const desdeTarjeta =
    location.state?.desdeTarjeta || location.state?.desdeTarjetaRegalo || false;
  const codigoTarjeta = location.state?.codigoTarjeta || "";
  const tarjetaRegaloId = location.state?.tarjetaRegaloId || "";
  // Con tarjeta regalo se reservan juntas todas las plazas de la tarjeta
  const plazasTarjeta = desdeTarjeta ? plazasDeTarjetaRegalo(location.state) : 0;

  const metodos = useMemo(() => metodosDelTaller(clase), [clase]);
  const variantes = useMemo(() => variantesDelTaller(clase), [clase]);
  const conMetodo = metodos.length > 0;
  const conVariante = variantes.length > 0;
  const rutaReservas = clase.reservasPath || claseId;
  const sesiones = Number(clase.sesiones || 1);
  const nombreClase = clase.nombre || "Taller";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), setUser);
    return () => unsubscribe();
  }, []);

  // Tarjeta regalo de una variante concreta (tipo de pieza, tamaño…) o de un
  // método concreto (torno y modelado con distinto precio)
  const varianteTarjeta = useMemo(() => {
    if (!desdeTarjeta || !conVariante) return "";
    const subtipo = String(location.state?.subtipo || "").trim().toLowerCase();
    return (
      variantes.find((v) => v.id === location.state?.tipoPieza)?.id ||
      variantes.find((v) => v.nombre.toLowerCase() === subtipo)?.id ||
      ""
    );
  }, [desdeTarjeta, conVariante, variantes, location.state]);

  const metodoTarjeta = useMemo(() => {
    if (!desdeTarjeta || conVariante) return "";
    const subtipo = String(location.state?.subtipo || "").trim().toLowerCase();
    return metodos.find((m) => m.nombre.toLowerCase() === subtipo)?.id || "";
  }, [desdeTarjeta, conVariante, location.state, metodos]);

  useEffect(() => {
    if (varianteTarjeta) setVarianteId(varianteTarjeta);
  }, [varianteTarjeta]);

  // Método u opción elegidos en la página del taller (?metodo= / ?variante=)
  const variantePrevia = useMemo(() => {
    const id = new URLSearchParams(location.search).get("variante");
    return variantes.find((v) => v.id === id)?.id || "";
  }, [location.search, variantes]);

  const metodoPrevio = useMemo(() => {
    const id = new URLSearchParams(location.search).get("metodo");
    return metodos.find((m) => m.id === id)?.id || "";
  }, [location.search, metodos]);

  useEffect(() => {
    if (variantePrevia) setVarianteId(variantePrevia);
  }, [variantePrevia]);

  useEffect(() => {
    if (metodoPrevio) setMetodo(metodoPrevio);
  }, [metodoPrevio]);

  useEffect(() => {
    if (metodoTarjeta) setMetodo(metodoTarjeta);
  }, [metodoTarjeta]);

  // Si solo hay un método no hace falta elegirlo
  useEffect(() => {
    if (metodos.length === 1) setMetodo(metodos[0].id);
  }, [metodos]);

  useEffect(() => {
    if (!fecha || !turno) {
      setOcupadasTorno(0);
      setOcupadasModelado(0);
      setOcupadasTaller(0);
      setErrorPlazas(false);
      setPlazasListas(false);
      return;
    }

    let cancelado = false;
    setPlazasListas(false);

    const lectura = conMetodo
      ? plazasOcupadasPorMetodo(fecha, turno).then(({ torno, modelado }) => {
          if (cancelado) return;
          setOcupadasTorno(torno);
          setOcupadasModelado(modelado);
        })
      : plazasOcupadasDeTaller(rutaReservas, fecha, turno).then((ocupadas) => {
          if (!cancelado) setOcupadasTaller(ocupadas);
        });

    lectura
      .then(() => {
        if (cancelado) return;
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
  }, [fecha, turno, conMetodo, rutaReservas]);

  const { turnosDisponibles, fechaHabilitadaManual, fechaBloqueada, diaNoDisponible } =
    useDiaDeReserva({ clase, fecha, fechasBloqueadas, fechasHabilitadas, reservasGrupos });

  const turnoConsulta = esTurnoConsulta(turnosDisponibles);

  // «Horario a consultar»: único turno, se elige solo
  useEffect(() => {
    if (turnoConsulta) {
      setTurno(turnosDisponibles[0]);
    } else if (turno && !turnosDisponibles.includes(turno)) {
      setTurno("");
    }
  }, [turnoConsulta, turnosDisponibles, turno]);

  const maxTorno = Number(clase.plazas?.maxTorno || MAX_TORNO_FALLBACK);
  const maxTotales = Number(clase.plazas?.maxTotales || MAX_TOTALES_FALLBACK);

  // Plazas que quedan en el turno para un método: el torno tiene su propio tope
  // y todos comparten el total
  const disponiblesDe = (idMetodo) => {
    const totalesOcupadas = ocupadasTorno + ocupadasModelado;

    if (idMetodo === "torno") {
      return Math.max(Math.min(maxTorno - ocupadasTorno, maxTotales - totalesOcupadas), 0);
    }

    return Math.max(maxTotales - totalesOcupadas, 0);
  };

  const plazasDisponibles = !conMetodo
    ? Math.max(maxTotales - ocupadasTaller, 0)
    : metodo
    ? disponiblesDe(metodo)
    : 0;

  const variante = variantes.find((v) => v.id === varianteId) || null;
  const metodoElegido = metodos.find((m) => m.id === metodo) || null;

  const precioUnitario = conVariante
    ? variante?.precio || 0
    : conMetodo
    ? metodoElegido?.precio || 0
    : Number(clase.precio || 0);

  const plazasNum = plazasTarjeta || (Number(plazas) > 0 ? Number(plazas) : 1);
  const precioTotal = precioUnitario * plazasNum;
  const nombreMetodo = metodoElegido?.nombre || "";

  const handleVarianteChange = (valor) => {
    setVarianteId(valor);
    setTurno("");
    setPlazas(1);
  };

  const estadoDia = (iso) =>
    estadoDiaTaller({ clase, fecha: iso, fechasBloqueadas, fechasHabilitadas, reservasGrupos });

  const handleFechaChange = (iso) => {
    setFecha(iso);
    if (!metodoTarjeta && !metodoPrevio && metodos.length !== 1) setMetodo("");
    setTurno("");
    setPlazas(1);
  };

  // El turno se conserva: los turnos no dependen del método, y así quien ve que su
  // método está completo puede cambiarlo sin volver a elegir el turno
  const handleMetodoChange = (valor) => {
    setMetodo(valor);
    setPlazas(1);
  };

  const pedirDatosInvitado = () =>
    new Promise((resolve) => {
      resolverDatos.current = resolve;
      setPidiendoDatos(true);
    });

  const cerrarDatosInvitado = (usuario) => {
    setPidiendoDatos(false);
    resolverDatos.current?.(usuario || null);
    resolverDatos.current = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (errorContexto || errorPlazas) {
      alert("No se ha podido comprobar la disponibilidad. Recarga la página e inténtalo de nuevo.");
      return;
    }

    if (!fecha || !turno || (conMetodo && !metodo) || (conVariante && !varianteId)) {
      alert("Selecciona todas las opciones, la fecha y el turno.");
      return;
    }

    if (fechaBloqueada) {
      alert(
        `No se puede reservar el día ${fecha}. Motivo: ${
          fechaBloqueada.motivo || "día bloqueado"
        }.`
      );
      return;
    }

    if (diaNoDisponible) {
      alert("Este taller no se imparte el día seleccionado.");
      return;
    }

    if (plazasDisponibles <= 0 || plazasNum > plazasDisponibles) {
      alert(
        plazasTarjeta > 1
          ? `Tu tarjeta regalo es para ${plazasTarjeta} personas y en este turno no quedan plazas suficientes. Prueba otro día o turno.`
          : "No hay suficientes plazas disponibles."
      );
      return;
    }

    if (!(precioUnitario > 0) && !desdeTarjeta) {
      alert("No se ha podido calcular el precio del taller.");
      return;
    }

    if (desdeTarjeta && !tarjetaRegaloId) {
      alert("No se ha encontrado la tarjeta regalo asociada.");
      return;
    }

    // Sin sesión se piden los datos de contacto ahora; la cuenta de invitado se
    // abre al enviarlos, no al entrar en la pantalla
    let usuario = user || getAuth().currentUser;
    if (!usuario) {
      usuario = await pedirDatosInvitado();
      if (!usuario) return;
    }

    setGuardando(true);

    try {
      const orderId = Date.now().toString().slice(-12);
      const timestamp = new Date().toISOString();
      const campoVariante = clase.variante?.campo || "tipoPieza";
      const campoNombreVariante = clase.variante?.campoNombre || "nombreTipoPieza";

      const reserva = {
        clase: nombreClase,
        claseId,
        tipoTaller: sesiones > 1 ? "dos_sesiones" : clase.grupo || "",
        fecha,
        turno,
        metodo: conMetodo ? metodo : "",
        ...(conMetodo && !conVariante ? { nombreTipoClase: nombreMetodo } : {}),
        ...(conVariante
          ? { [campoVariante]: varianteId, [campoNombreVariante]: variante.nombre }
          : {}),
        plazas: plazasNum,
        desdeTarjeta,
        precio: precioTotal,
        precioUnitario,
        precioTotal,
        estado: desdeTarjeta ? "Confirmada" : "Pendiente",
        estadoPago: desdeTarjeta ? "pagado" : "pendiente",
        orderId,
        timestamp,
        ...(sesiones > 1
          ? {
              fechaPrimeraSesion: fecha,
              segundaSesion: {
                habilitada: false,
                fechaDisponible: sumar28Dias(fecha),
                reservada: false,
                fechaReserva: null,
              },
            }
          : {}),
      };

      const carpeta = conMetodo
        ? `reservas/${rutaReservas}/${fecha}/${turno}/${metodo}`
        : `reservas/${rutaReservas}/${fecha}/${turno}`;

      const nuevaReservaRef = push(ref(dbRealtime, carpeta));
      await update(nuevaReservaRef, { uid: usuario.uid, ...reserva });

      if (desdeTarjeta) {
        await push(ref(dbRealtime, `usuarios/${usuario.uid}/listaReservas`), {
          ...reserva,
          uid: usuario.uid,
          tarjetaRegaloId,
          codigoTarjeta,
          creadaDesde: "tarjeta_regalo",
        });

        const tarjetaGlobalRef = ref(dbRealtime, `tarjetasRegalo/${tarjetaRegaloId}`);
        const tarjetaGlobalSnap = await get(tarjetaGlobalRef);
        const uidComprador = tarjetaGlobalSnap.exists()
          ? tarjetaGlobalSnap.val()?.uidComprador || ""
          : "";

        const datosActualizacionTarjeta = {
          canjeado: true,
          usado: true,
          estadoCanje: "canjeado",
          canjeadoPorUID: usuario.uid,
          usadoPorUID: usuario.uid,
          fechaCanje: timestamp,
          fechaUso: timestamp,
          actualizadoEn: timestamp,
          reservaId: nuevaReservaRef.key || "",
          fechaReserva: fecha,
          turnoReserva: turno,
          metodoReserva: reserva.metodo,
          nombreTipoClaseReserva: conVariante ? variante.nombre : nombreMetodo,
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
            clase: nombreClase,
            claseId,
            ...(conVariante ? { subtipo: variante.nombre, tipoPieza: varianteId } : {}),
            fecha,
            turno,
            metodo: reserva.metodo,
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
          desdeTarjeta,
          tipo: "clase",
          clase: nombreClase,
          claseId,
          ...(conVariante ? { subtipo: variante.nombre, tipoPieza: varianteId } : {}),
          precio: precioTotal,
          precioUnitario,
          precioTotal,
          fecha,
          turno,
          metodo: reserva.metodo,
          modalidad: nombreMetodo,
          plazas: plazasNum,
          orderId,
        },
      });
    } catch (err) {
      console.error("Error al guardar la reserva:", err);
      const detalle = err?.code || String(err?.message || "").split(":")[0].trim();
      alert(`No se pudo guardar la reserva${detalle ? ` (${detalle})` : ""}.`);
    } finally {
      setGuardando(false);
    }
  };

  const eleccionesPrevias = (!conVariante || !!varianteId) && (!conMetodo || !!metodo);
  const puedeElegirMetodo =
    !!fecha && !fechaBloqueada && !diaNoDisponible && !metodoTarjeta && (!conVariante || !!varianteId);
  const puedeElegirTurno =
    !!fecha && eleccionesPrevias && !fechaBloqueada && !diaNoDisponible;
  const puedeElegirPlazas = puedeElegirTurno && !!turno && plazasListas && plazasDisponibles > 0;

  // Sin plazas en el método elegido: si otro método tiene sitio en este turno se
  // dice, pero no se cambia solo (el precio puede ser distinto)
  const alternativas =
    conMetodo && metodo
      ? metodos
          .filter((m) => m.id !== metodo)
          .map((m) => ({ nombre: m.nombre, quedan: disponiblesDe(m.id) }))
          .filter((m) => m.quedan > 0)
      : [];

  const avisoSinPlazas = alternativas.length
    ? `No quedan plazas de ${(metodoElegido?.nombre || "este método").toLowerCase()} en este turno. ` +
      `Quedan ${alternativas
        .map((m) => `${m.quedan} de ${m.nombre.toLowerCase()}`)
        .join(" y ")}: cámbialo en «Método» o elige otro turno.`
    : "No quedan plazas en este turno. Prueba con otro turno o con otro día.";

  const mensajePrevio = !fecha
    ? "Primero selecciona el día."
    : conVariante && !varianteId
    ? "Primero elige una opción."
    : conMetodo && !metodo
    ? "Primero selecciona el método."
    : !turno
    ? "Primero selecciona el turno."
    : diaNoDisponible
    ? "No hay plazas porque este taller no se imparte ese día."
    : !plazasListas
    ? "Comprobando plazas…"
    : plazasDisponibles <= 0
    ? "No quedan plazas disponibles."
    : `Máximo ${plazasDisponibles} plazas disponibles.`;

  return (
    <PantallaReserva ancho="max-w-4xl">
      <h1 className="text-center text-2xl text-[#5c3c00] font-serif mb-4">
        Reserva – {nombreClase}
      </h1>

      {desdeTarjeta && (
        <p className="text-sm text-green-700 text-center font-medium mb-4">
          Estás usando una tarjeta regalo 🎁
          {plazasTarjeta > 1 ? ` para ${plazasTarjeta} personas` : ""}
        </p>
      )}

      <BloqueoReserva permitirVisitante>
        {(errorContexto || errorPlazas) && (
          <p className="text-sm text-red-600 text-center mb-4">
            No se ha podido comprobar la disponibilidad. Recarga la página e
            inténtalo de nuevo.
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2 md:gap-x-10">
          {sesiones > 1 && (
            <div className="md:col-span-2 bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
              <p>
                <strong>Incluye {sesiones} sesiones.</strong>
              </p>
              <p>
                La primera sesión se reserva ahora. La segunda se habilitará a
                partir de 4 semanas después de la primera, y antes deberás
                contactar con el taller para confirmar que tu pieza ya está lista.
              </p>
            </div>
          )}

          {/* Izquierda: qué y cuándo (opción y día) */}
          <div className="space-y-4">
          {conVariante && (
            <div>
              <label htmlFor="variante" className="block font-bold text-sm mb-1">
                {clase.variante?.etiqueta || "Opción"}:
              </label>
              <select
                id="variante"
                value={varianteId}
                onChange={(e) => handleVarianteChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base disabled:bg-gray-100 disabled:text-gray-400"
                required
                disabled={!!varianteTarjeta}
              >
                <option value="">-- Elige una opción --</option>
                {variantes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre} — {v.precio}€
                  </option>
                ))}
              </select>
            </div>
          )}

          <SelectorDiaReserva
            etiqueta={sesiones > 1 ? "Selecciona el día de la primera sesión:" : "Selecciona el día:"}
            value={fecha}
            onChange={handleFechaChange}
            estadoDia={estadoDia}
            cargando={!contextoCargado}
            fechaBloqueada={fechaBloqueada}
            fechaHabilitadaManual={fechaHabilitadaManual}
            diaNoDisponible={diaNoDisponible}
            clase={clase}
            producto="Este taller"
          />

          </div>

          {/* Derecha: método, turno, plazas, resumen y pago */}
          <div className="space-y-4">
          {conMetodo && (
            <div>
              <label htmlFor="metodo" className="block font-bold text-sm mb-1">
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
                    : conVariante && !varianteId
                    ? "-- Primero elige una opción --"
                    : diaNoDisponible
                    ? "-- Este taller no está disponible ese día --"
                    : "-- Selecciona método --"}
                </option>
                {metodos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                    {!conVariante && m.precio > 0 ? ` — ${m.precio}€` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <SelectorTurnoReserva
            value={turno}
            onChange={(valor) => {
              setTurno(valor);
              setPlazas(1);
            }}
            turnos={turnosDisponibles}
            deshabilitado={!puedeElegirTurno}
            placeholder={
              !fecha
                ? "-- Primero selecciona el día --"
                : conVariante && !varianteId
                ? "-- Primero elige una opción --"
                : conMetodo && !metodo
                ? "-- Primero selecciona el método --"
                : diaNoDisponible
                ? "-- No hay turnos para este día --"
                : "-- Elige turno --"
            }
          />

          {puedeElegirTurno && !!turno && plazasListas && plazasDisponibles > 0 && (
            <p className="text-sm text-green-700">
              Quedan {plazasDisponibles} plazas disponibles
              {conMetodo ? " para este método" : " en este turno"}.
            </p>
          )}

          {puedeElegirTurno && !!turno && plazasListas && plazasDisponibles <= 0 && (
            <p className="text-sm text-red-600 font-medium" role="alert">
              {avisoSinPlazas}
            </p>
          )}

          <div className="text-sm text-[#7a5a1e] bg-[#fff8df] border border-[#f1e7c6] rounded-xl p-3">
            <strong>¿Sois 5 o más personas?</strong>
            <br />
            Si queréis reservar en una fecha especial o fuera del horario habitual, haced la reserva desde la sección de <strong>Reservas para grupos</strong>.
          </div>

          <div>
            <label className="block font-bold text-sm mb-2">
              {plazasTarjeta ? "Plazas de tu tarjeta regalo" : "¿Cuántas plazas deseas reservar?"}
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
                {puedeElegirPlazas || plazasTarjeta ? plazasNum : "—"}
              </span>

              <button
                type="button"
                onClick={() => setPlazas(Math.min(plazasDisponibles || 1, plazasNum + 1))}
                disabled={!puedeElegirPlazas || !!plazasTarjeta}
                className="text-xl font-bold px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-1">{mensajePrevio}</p>
          </div>

          <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
            {conVariante && (
              <p>
                <strong>{clase.variante?.etiqueta || "Opción"}:</strong>{" "}
                {variante?.nombre || "—"}
              </p>
            )}
            {conMetodo && (
              <p>
                <strong>Método elegido:</strong> {nombreMetodo || "—"}
              </p>
            )}
            <p>
              <strong>Precio unitario:</strong>{" "}
              {desdeTarjeta ? "Tarjeta regalo" : `${precioUnitario}€`}
            </p>
            <p>
              <strong>Precio total:</strong> {desdeTarjeta ? "0€" : `${precioTotal}€`}
            </p>
          </div>

          <BotonConfirmarReserva
            guardando={guardando}
            desdeTarjeta={desdeTarjeta}
            deshabilitado={
              errorContexto ||
              errorPlazas ||
              (!!turno && !plazasListas) ||
              !!fechaBloqueada ||
              diaNoDisponible ||
              (conVariante && !varianteId) ||
              (conMetodo && !metodo) ||
              !turno ||
              plazasNum > plazasDisponibles ||
              plazasDisponibles <= 0 ||
              (!desdeTarjeta && !(precioUnitario > 0))
            }
          />
          </div>
        </form>
      </BloqueoReserva>

      {pidiendoDatos && (
        <DatosContactoInvitado
          onListo={cerrarDatosInvitado}
          onCancelar={() => cerrarDatosInvitado(null)}
        />
      )}
    </PantallaReserva>
  );
}
