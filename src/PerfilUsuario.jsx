import React, { useEffect, useState } from "react";
import Icono from "./components/Icono";
import { useNavigate } from "react-router-dom";
import { auth, dbRealtime } from "./firebase";
import { ref, get } from "firebase/database";
import { signOut, onAuthStateChanged } from "firebase/auth";
import BarraDeslizable from "./components/BarraDeslizable";
import {
  sesionesPendientes as cargarSesionesPendientes,
  cancelarSesionBono,
} from "./utils/canjeServidor";
import { useConfigEspacio } from "./configuracionEspacio";
import { enlaceWhatsapp, telefonoVisible } from "./utils/configEspacio";
import { ahoraMadridMs, horasAntelacionDe, inicioClaseMs } from "./utils/cambioFecha";
import PantallaConVolver from "./PantallaConVolver";
import { BotonPlantilla, usePlantillasTarjetaRegalo } from "./components/DescargasTarjetaRegalo";

import { fechaDMA } from "./utils/formatoFecha";
function obtenerFechaReserva(reserva) {
  if (!reserva) return null;

  const fecha = reserva.fecha;
  if (!fecha) return null;

  let horaInicio = "00:00";

  if (reserva.turno && String(reserva.turno).includes("-")) {
    horaInicio = String(reserva.turno).split("-")[0].trim();
  }

  const fechaHora = new Date(`${fecha}T${horaInicio}:00`);
  return isNaN(fechaHora.getTime()) ? null : fechaHora;
}

function esReservaReprogramada(reserva) {
  if (!reserva) return false;

  return (
    reserva.reprogramada === true ||
    reserva.reprogramada === "true" ||
    !!reserva.fechaOriginal ||
    !!reserva.turnoOriginal ||
    !!reserva.reprogramadaEn ||
    !!reserva.avisoPerfil ||
    !!reserva.fechaReprogramada ||
    !!reserva.turnoReprogramado ||
    !!reserva.ultimaFechaAnterior ||
    !!reserva.ultimoTurnoAnterior
  );
}

function esReservaCancelada(reserva) {
  if (!reserva) return false;

  return (
    reserva.cancelada === true ||
    reserva.cancelada === "true" ||
    reserva.estado === "Cancelada"
  );
}

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

  if (estadoGuardado === "caducado" || estaCaducado) {
    return "Caducado";
  }

  if (estadoGuardado === "agotado" || restantes <= 0) {
    return "Agotado";
  }

  return "Activo";
}

function AvisoReprogramacion({ reserva }) {
  const reprogramada = esReservaReprogramada(reserva);

  if (!reprogramada) return null;

  const fechaAnterior =
    reserva.fechaOriginal || reserva.ultimaFechaAnterior || "—";
  const turnoAnterior =
    reserva.turnoOriginal || reserva.ultimoTurnoAnterior || "";

  return (
    <div className="mt-3 rounded-xl border border-[#ecd8a6] bg-crema px-3 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-[#f6e7b8] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#7a5a1f]">
          Reprogramada
        </span>

        {reserva.reprogramadaEn && (
          <span className="text-[11px] text-[#9a8351]">
            {reserva.reprogramadaEn}
          </span>
        )}
      </div>

      <p className="text-sm text-[#6f5727] leading-relaxed">
        <span className="font-semibold">Antes:</span> {fechaDMA(fechaAnterior)}
        {turnoAnterior ? ` · ${turnoAnterior}` : ""}
      </p>

      <p className="text-sm text-[#6f5727] leading-relaxed mt-1">
        <span className="font-semibold">Ahora:</span> {fechaDMA(reserva.fecha) || "—"}
        {reserva.turno ? ` · ${reserva.turno}` : ""}
      </p>
    </div>
  );
}

function AvisoCancelacion({ reserva }) {
  const navigate = useNavigate();

  // Cancelada por el estudio y ya vuelta a reservar con su código
  if (reserva?.recuperada === true && !esReservaCancelada(reserva)) {
    return (
      <div className="mt-3 rounded-xl border border-[#8fbf9f] bg-[#eef6f0] px-3 py-3">
        <p className="text-sm font-semibold text-[#2f6b44]">Reserva recuperada</p>
        <p className="text-sm text-[#2f6b44] leading-relaxed mt-1">
          Elegiste nueva fecha tras la cancelación
          {reserva.canceladaEnOriginal ? ` del ${reserva.canceladaEnOriginal}` : ""}.
        </p>
      </div>
    );
  }

  if (!esReservaCancelada(reserva)) return null;

  const hoy = new Date().toISOString().slice(0, 10);
  const puedeRecuperar =
    reserva.cancelacionEstudio === true &&
    !reserva.recuperada &&
    !!reserva.codigoReserva &&
    String(reserva.recuperableHasta || "") >= hoy;
  const codigoBonito = String(reserva.codigoReserva || "").replace(/^(.{4})(.{4})$/, "$1-$2");

  return (
    <div className="mt-3 rounded-xl border border-[#e5bcbc] bg-[#fff5f5] px-3 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center rounded-full bg-[#f7d7d7] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a3b3b]">
          Cancelada
        </span>

        {reserva.canceladaEn && (
          <span className="text-[11px] text-[#a56b6b]">
            {reserva.canceladaEn}
          </span>
        )}
      </div>

      <p className="text-sm text-[#7a4747] leading-relaxed">
        {reserva.avisoPerfil ||
          "Esta reserva ha sido cancelada. Si lo necesitas, contacta con el taller."}
      </p>

      {reserva.motivoCancelacion && (
        <p className="text-sm text-[#7a4747] leading-relaxed mt-1">
          <span className="font-semibold">Motivo:</span>{" "}
          {reserva.motivoCancelacion}
        </p>
      )}

      {puedeRecuperar && (
        <>
          <p className="text-sm text-[#7a4747] leading-relaxed mt-1">
            Puedes volver a reservar hasta el {fechaDMA(reserva.recuperableHasta)}.
          </p>
          <button
            type="button"
            onClick={() =>
              navigate(`/gestionar-reserva?codigo=${encodeURIComponent(reserva.codigoReserva)}&auto=1`)
            }
            className="mt-3 w-full rounded-full bg-terracota px-4 py-2.5 text-sm font-semibold text-white hover:bg-terracota-oscuro transition"
          >
            Elegir nueva fecha
          </button>
          <p className="mt-2 text-center text-xs text-[#7a4747]">
            Tu código: <span className="font-mono tracking-widest">{codigoBonito}</span>
          </p>
        </>
      )}
    </div>
  );
}

const tarjetaItem = "bg-crema border border-linea rounded-xl p-3 text-sm text-tinta";
const botonSecundario =
  "w-full text-center bg-arena hover:bg-[#ebe4da] text-tinta-suave font-semibold py-2.5 px-4 rounded-full transition border border-[#e7dccb] text-sm";
const botonContorno =
  "w-full text-center border border-terracota text-terracota hover:bg-terracota-suave font-semibold py-2.5 px-4 rounded-full transition text-sm";

function Chip({ tono = "neutro", className = "", children }) {
  const tonos = {
    verde: "bg-[#e0f0dc] text-[#2f6b2f]",
    ambar: "bg-[#fdebc8] text-[#8a5a00]",
    rojo: "bg-[#f7d7d7] text-[#8a3b3b]",
    neutro: "bg-arena text-tinta-suave",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tonos[tono]} ${className}`}>
      {children}
    </span>
  );
}

function TituloSeccion({ children, aside }) {
  return (
    <div className="flex items-baseline justify-between gap-2 mb-2">
      <h2 className="font-serif text-lg font-bold text-tinta">{children}</h2>
      {aside}
    </div>
  );
}

// Siguiente sesión de un taller de varias sesiones: se ve siempre; el botón se activa
// cuando llega la fecha a partir de la que se puede reservar
export function SesionPorReservar({ sesion: p, hoy, onReservar }) {
  const yaSePuede = !p.fechaDisponible || !hoy || hoy >= p.fechaDisponible;
  return (
    <li className={tarjetaItem}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{p.clase}</p>
          <p className="text-tinta-suave">
            Sesión {p.numeroSesion || 2} · la anterior: {fechaDMA(p.fechaSesionAnterior) || "—"}
          </p>
        </div>
        <Chip tono={yaSePuede ? "verde" : "ambar"} className="shrink-0">
          {yaSePuede ? "Ya puedes reservarla" : "Aún no disponible"}
        </Chip>
      </div>

      {!yaSePuede && (
        <p className="mt-2 text-xs text-tinta-suave">
          Todavía no se puede reservar: estará disponible a partir del{" "}
          <strong>{fechaDMA(p.fechaDisponible)}</strong>.
        </p>
      )}

      {yaSePuede && (
        <p className="mt-2 text-xs text-tinta-suave">
          Antes de reservar, habla con el taller para confirmar que todo está listo para la siguiente sesión.
        </p>
      )}

      <button
        type="button"
        disabled={!yaSePuede}
        onClick={onReservar}
        className="mt-3 w-full px-4 py-2.5 bg-terracota hover:bg-terracota-oscuro text-white font-semibold rounded-full transition text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-terracota"
      >
        Reservar sesión {p.numeroSesion || 2}
      </button>
    </li>
  );
}

const HORA_MS = 3_600_000;

// ¿Se puede reprogramar esta reserva desde el perfil? Reservas normales pagadas: no
// monográficos (otra edición) ni bonos (se gestionan en la pestaña Bonos), y una sola vez.
// La primera sesión de un taller de varias sesiones sí.
function sePuedeReprogramar(reserva) {
  if (!reserva || esReservaCancelada(reserva)) return false;
  if (reserva.edicionId || reserva.desdeBono) return false;
  if (!reserva.orderId) return false;
  const estado = String(reserva.estado || "").toLowerCase();
  const pago = String(reserva.estadoPago || "").toLowerCase();
  if (estado !== "confirmada" || pago !== "pagado") return false;
  return Number(reserva.numCambiosCliente || 0) < 1 && !reserva.reprogramada;
}

// Horas que faltan para la clase menos el plazo (negativo: ya no se puede)
const horasDeMargen = (reserva, config) =>
  (inicioClaseMs(reserva.fecha, reserva.turno) - ahoraMadridMs()) / HORA_MS - horasAntelacionDe(reserva, config);

// Reprogramar una reserva normal: abre la pantalla común /reprogramar
function BotonReprogramar({ reserva, config }) {
  const navigate = useNavigate();
  if (!sePuedeReprogramar(reserva)) return null;

  const horas = horasAntelacionDe(reserva, config);
  if (!(horasDeMargen(reserva, config) >= 0)) {
    return (
      <p className="mt-3 text-xs text-tinta-suave">
        Ya no se puede reprogramar: hay que avisar con al menos {horas} horas de antelación.
      </p>
    );
  }

  const abrir = () =>
    navigate(
      `/reprogramar/reserva/${encodeURIComponent(reserva.orderId)}${
        reserva.sesionCurso ? `?sesion=${Number(reserva.sesionCurso)}` : ""
      }`
    );

  return (
    <div className="mt-3">
      <button type="button" onClick={abrir} className={botonContorno}>
        Reprogramar
      </button>
      <p className="mt-1 text-center text-xs text-tinta-suave">
        Se puede hasta {horas} horas antes de la clase.
      </p>
    </div>
  );
}

// «tumba · torno · 2 plazas»: lo que se eligió además del taller (sin repetir lo que ya
// dice el nombre del taller, p. ej. «Crea tu taza favorita — Torno»)
function detalleDeReserva(reserva) {
  const nombre = String(reserva?.clase || "").toLowerCase();
  const partes = [
    reserva?.nombreTipoPieza || reserva?.tipoPieza,
    reserva?.nombreTipoClase || reserva?.metodo,
  ]
    .map((p) => String(p || "").trim())
    .filter((p) => p && !nombre.includes(p.toLowerCase()))
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1));
  const plazas = Number(reserva?.plazas) || 1;
  if (plazas > 1) partes.push(`${plazas} plazas`);
  return [...new Set(partes)].join(" · ");
}

// Una reserva en las listas: fecha destacada, taller y turno
function FilaReserva({ reserva, historial = false, config }) {
  const cancelada = esReservaCancelada(reserva);
  return (
    <li className={tarjetaItem}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{reserva.clase}</p>
          <p className="text-tinta-suave">
            {fechaDMA(reserva.fecha)} · {reserva.turno}
            {reserva.ubicacion ? ` · ${reserva.ubicacion}` : ""}
          </p>
          {detalleDeReserva(reserva) && (
            <p className="text-sm text-tinta-suave">{detalleDeReserva(reserva)}</p>
          )}
        </div>
        {/* En el historial ya lo dice el aviso de cancelación de debajo */}
        {cancelada && !historial && <Chip tono="rojo">Cancelada</Chip>}
      </div>

      {historial && <AvisoCancelacion reserva={reserva} />}
      {(!historial || !cancelada) && <AvisoReprogramacion reserva={reserva} />}
      {!historial && <BotonReprogramar reserva={reserva} config={config} />}
    </li>
  );
}

function ReservaDestacada({ reserva, config }) {
  return (
    <div className="rounded-2xl border border-terracota/40 bg-terracota-suave/40 p-4 text-tinta">
      <p className="text-xs font-semibold uppercase tracking-wider text-terracota mb-1">
        Tu próxima reserva
      </p>
      <p className="font-serif text-xl font-bold leading-tight">{reserva.clase}</p>
      <p className="mt-1 text-sm">
        <strong>{fechaDMA(reserva.fecha)}</strong> · {reserva.turno}
        {reserva.ubicacion ? ` · ${reserva.ubicacion}` : ""}
      </p>
      {detalleDeReserva(reserva) && <p className="text-sm">{detalleDeReserva(reserva)}</p>}
      <AvisoReprogramacion reserva={reserva} />
      <AvisoCancelacion reserva={reserva} />
      <BotonReprogramar reserva={reserva} config={config} />
    </div>
  );
}

// Sesiones futuras de un bono que se pueden gestionar (llevan el id de su reserva)
function sesionesGestionables(bono) {
  const hoy = new Date().toISOString().slice(0, 10);
  return Object.entries(bono?.sesionesConsumidas || {})
    .map(([clave, s]) => ({ clave, ...s }))
    .filter((s) => s.reservaId && s.fecha && s.fecha >= hoy)
    .sort((a, b) => `${a.fecha} ${a.turno}`.localeCompare(`${b.fecha} ${b.turno}`));
}

function SesionBono({ bono, sesion, config, onCambio }) {
  const navigate = useNavigate();
  const [cancelando, setCancelando] = useState(false);
  const margen = horasDeMargen({ ...sesion, desdeBono: true }, config);
  const horas = config.horasCambioBono;
  const enPlazo = margen >= 0;

  const cancelar = async () => {
    if (
      !window.confirm(
        `¿Cancelar la sesión del ${fechaDMA(sesion.fecha)} (${sesion.turno})? La clase volverá a tu bono.`
      )
    ) {
      return;
    }
    setCancelando(true);
    try {
      await cancelarSesionBono({ bonoId: bono.bonoId, reservaId: sesion.reservaId });
      onCambio();
    } catch (e) {
      console.error("Error al cancelar la sesión del bono:", e);
      alert(e?.message || "No se pudo cancelar la sesión.");
    } finally {
      setCancelando(false);
    }
  };

  return (
    <li className="rounded-lg border border-linea bg-white px-3 py-2">
      <p className="text-sm font-semibold">
        {fechaDMA(sesion.fecha)} · {sesion.turno}
      </p>
      {enPlazo ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate(`/reprogramar/bono/${bono.bonoId}?reserva=${encodeURIComponent(sesion.reservaId)}`)}
            className="rounded-full border border-terracota px-3 py-2 text-xs font-semibold text-terracota hover:bg-terracota-suave transition"
          >
            Reprogramar
          </button>
          <button
            type="button"
            onClick={cancelar}
            disabled={cancelando}
            className="rounded-full border border-linea px-3 py-2 text-xs font-semibold text-tinta-suave hover:bg-arena transition disabled:opacity-60"
          >
            {cancelando ? "Cancelando…" : "Cancelar"}
          </button>
        </div>
      ) : (
        <p className="mt-1 text-xs text-tinta-suave">
          Ya no se puede reprogramar ni cancelar: hay que avisar con al menos {horas} horas de antelación.
        </p>
      )}
    </li>
  );
}

export default function PerfilUsuario() {
  const plantillasTarjeta = usePlantillasTarjetaRegalo();
  const navigate = useNavigate();
  const { config: configEspacio } = useConfigEspacio();
  // Sube al cancelar una sesión de bono para volver a cargar los datos
  const [version, setVersion] = useState(0);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [reservaActiva, setReservaActiva] = useState(null);
  const [reservasActivas, setReservasActivas] = useState([]);
  const [reservasPasadas, setReservasPasadas] = useState([]);
  const [tarjetasRegalo, setTarjetasRegalo] = useState([]);
  const [bonos, setBonos] = useState([]);
  const [esInvitado, setEsInvitado] = useState(false);
  const [pestana, setPestana] = useState("reservas");
  // Talleres de varias sesiones reservados solo con la primera: sesiones por reservar
  const [sesionesPend, setSesionesPend] = useState([]);
  const [hoyServidor, setHoyServidor] = useState("");
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setEmail(user.email);
        setEsInvitado(user.isAnonymous);

        const userRef = ref(dbRealtime, "usuarios/" + user.uid);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const datosUsuario = snapshot.val();
          setNombre(datosUsuario.nombre || "");
          setTelefono(datosUsuario.telefono || "");
          // Los invitados no tienen email en Auth, solo el que dejaron al reservar
          if (!user.email) setEmail(datosUsuario.email || "");
        }

        const refListaReservas = ref(
          dbRealtime,
          `usuarios/${user.uid}/listaReservas`
        );
        const snapListaReservas = await get(refListaReservas);

        if (snapListaReservas.exists()) {
          const todas = Object.values(snapListaReservas.val()).filter(Boolean);
          const ahora = new Date();

          const futuras = [];
          const pasadas = [];

          todas.forEach((reserva) => {
            const fechaReserva = obtenerFechaReserva(reserva);
            const cancelada = esReservaCancelada(reserva);

            if (cancelada) {
              pasadas.push(reserva);
              return;
            }

            if (fechaReserva && fechaReserva >= ahora) {
              futuras.push(reserva);
            } else {
              pasadas.push(reserva);
            }
          });

          futuras.sort((a, b) => {
            const fechaA = obtenerFechaReserva(a)?.getTime() || 0;
            const fechaB = obtenerFechaReserva(b)?.getTime() || 0;
            return fechaA - fechaB;
          });

          pasadas.sort((a, b) => {
            const fechaA = obtenerFechaReserva(a)?.getTime() || 0;
            const fechaB = obtenerFechaReserva(b)?.getTime() || 0;
            return fechaB - fechaA;
          });

          if (futuras.length > 0) {
            setReservaActiva(futuras[0]);
            setReservasActivas(futuras.slice(1));
          } else {
            setReservaActiva(null);
            setReservasActivas([]);
          }

          setReservasPasadas(pasadas);
        } else {
          setReservaActiva(null);
          setReservasActivas([]);
          setReservasPasadas([]);
        }
        const refTarjetasRegalo = ref(
          dbRealtime,
          `usuarios/${user.uid}/tarjetasRegalo`
        );
        const snapTarjetasRegalo = await get(refTarjetasRegalo);

        if (snapTarjetasRegalo.exists()) {
          const tarjetas = Object.values(snapTarjetasRegalo.val()).sort(
            (a, b) => {
              const fechaA = new Date(a.actualizadoEn || a.fechaCompra || 0);
              const fechaB = new Date(b.actualizadoEn || b.fechaCompra || 0);
              return fechaB - fechaA;
            }
          );

          setTarjetasRegalo(tarjetas);
        } else {
          setTarjetasRegalo([]);
        }

        const refBonos = ref(dbRealtime, `usuarios/${user.uid}/bonos`);
        const snapBonos = await get(refBonos);

        if (snapBonos.exists()) {
          const listaBonos = Object.values(snapBonos.val())
            .filter(Boolean)
            .sort((a, b) => {
              const fechaA = new Date(a.actualizadoEn || a.creadoEn || 0);
              const fechaB = new Date(b.actualizadoEn || b.creadoEn || 0);
              return fechaB - fechaA;
            });

          setBonos(listaBonos);
        } else {
          setBonos([]);
        }

        // Las siguientes sesiones de talleres de varias sesiones (si falla, no se muestran)
        try {
          const pendientes = await cargarSesionesPendientes();
          setSesionesPend(pendientes.sesiones || []);
          setHoyServidor(pendientes.hoy || "");
        } catch (errorSesiones) {
          console.error("No se pudieron cargar las sesiones pendientes:", errorSesiones);
          setSesionesPend([]);
        }
      } else {
        navigate("/login", { state: { from: { pathname: "/perfil" } }, replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate, version]);

  const handleLogout = () => {
    if (
      esInvitado &&
      !window.confirm(
        "Estás como invitado. Si cierras la sesión no podrás volver a ver estas reservas desde la app (el taller las conserva). ¿Cerrar sesión igualmente?"
      )
    ) {
      return;
    }
    signOut(auth).then(() => navigate("/"));
  };

  const pestanas = [
    { id: "reservas", etiqueta: "Reservas", cuenta: reservasActivas.length + (reservaActiva ? 1 : 0) },
    { id: "bonos", etiqueta: "Bonos", cuenta: bonos.length },
    { id: "tarjetas", etiqueta: "Tarjetas regalo", cuenta: tarjetasRegalo.length },
    { id: "pieza", etiqueta: "Mi pieza" },
  ];
  const inicial = (nombre || email || "?").trim().charAt(0).toUpperCase();

  return (
    <PantallaConVolver volverA="/portada">
      <div className="max-w-5xl w-full mx-auto bg-white rounded-2xl shadow-md p-5 sm:p-6 text-tinta">
        <h1 className="text-center font-serif text-tinta mb-5">
          <span className="block text-sm font-sans font-semibold uppercase tracking-wider text-terracota">
            Tu cuenta
          </span>
          <span className="block text-3xl md:text-4xl font-bold leading-tight mt-1">Tu perfil</span>
        </h1>

        {esInvitado && (
          <div className="bg-mostaza-suave border border-linea rounded-xl px-4 py-3 mb-5 text-sm text-tinta-suave md:flex md:items-center md:justify-between md:gap-4">
            <div>
              <p className="font-semibold mb-1">Estás usando la app como invitado</p>
              <p className="leading-relaxed">
                Crea una contraseña para guardar tus reservas y compras y poder verlas desde cualquier
                dispositivo.
              </p>
            </div>
            <button
              onClick={() => navigate("/registro")}
              className="mt-3 md:mt-0 md:shrink-0 w-full md:w-auto bg-terracota hover:bg-terracota-oscuro text-white font-semibold py-2.5 px-5 rounded-full transition"
            >
              Crear mi cuenta
            </button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[17rem_1fr] md:gap-x-10">
          {/* Izquierda: cuenta y accesos */}
          <aside className="space-y-4 md:sticky md:top-24 md:self-start">
            <div className={tarjetaItem}>
              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-terracota text-white font-serif text-xl font-bold">
                  {inicial}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{nombre || "Sin nombre"}</p>
                  <p className="text-xs text-tinta-suave truncate">{email || "—"}</p>
                </div>
              </div>
              <p className="text-sm mb-3">
                <span className="font-semibold">Teléfono:</span> {telefono || "—"}
              </p>
              <button onClick={() => navigate("/editar-perfil")} className={botonSecundario}>
                Editar perfil
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
              <button
                className="bg-terracota hover:bg-terracota-oscuro text-white font-bold py-3 rounded-full text-sm shadow-md transition"
                onClick={() => navigate("/portada")}
              >
                Reservar
              </button>
              <button
                className="bg-white border border-terracota text-terracota hover:bg-terracota-suave font-bold py-3 rounded-full text-sm transition"
                onClick={() => navigate("/gestionar-reserva?tab=tarjeta")}
              >
                Canjear tarjeta regalo
              </button>
            </div>

            <details className={`${tarjetaItem} hidden md:block`} open>
              <summary className="cursor-pointer font-semibold">
                <Icono nombre="ubicacion" className="mr-1.5" />Contacto
              </summary>
              <ul className="mt-3 space-y-2">
                <li><Icono nombre="telefono" className="mr-1.5" />{telefonoVisible(configEspacio.telefonoWhatsapp)}</li>
                <li className="[overflow-wrap:anywhere]">
                  <Icono nombre="correo" className="mr-1.5" />
                  {/* Se parte por la @ si no cabe, no en mitad del dominio */}
                  <a href="mailto:lapurisimaconchioficial@gmail.com" className="hover:underline">
                    lapurisimaconchioficial<wbr />@gmail.com
                  </a>
                </li>
                <li><Icono nombre="casa" className="mr-1.5" />Calle Israel Nº5, Córdoba</li>
              </ul>
              <button
                onClick={() => window.open("https://maps.google.com/?q=Calle+Israel+5+Córdoba", "_blank")}
                className={`${botonSecundario} mt-3`}
              >
                <Icono nombre="ubicacion" className="mr-1.5" />Cómo llegar
              </button>
            </details>
          </aside>

          {/* Derecha: contenido por pestañas */}
          <section className="min-w-0">
            <BarraDeslizable role="tablist" claseExterior="mb-4" className="gap-2 -mx-1 px-1">
                {pestanas.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={pestana === t.id}
                    onClick={(e) => {
                      setPestana(t.id);
                      e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                    }}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition border ${
                      pestana === t.id
                        ? "bg-terracota text-white border-terracota shadow-sm"
                        : "bg-white text-tinta-suave border-linea hover:bg-arena"
                    }`}
                  >
                    {t.etiqueta}
                    {t.cuenta > 0 ? ` (${t.cuenta})` : ""}
                  </button>
                ))}
            </BarraDeslizable>

            {pestana === "reservas" && (
              <div className="space-y-5">
                {reservaActiva ? (
                  <ReservaDestacada reserva={reservaActiva} config={configEspacio} />
                ) : (
                  <div className={tarjetaItem}>
                    <p className="text-tinta-suave">No tienes reservas activas.</p>
                    <button onClick={() => navigate("/portada")} className={`${botonContorno} mt-3 sm:w-auto`}>
                      Reservar un taller
                    </button>
                  </div>
                )}

                {sesionesPend.length > 0 && (
                  <div>
                    <TituloSeccion>Sesiones por reservar</TituloSeccion>
                    <ul className="grid gap-2">
                      {sesionesPend.map((p) => (
                        <SesionPorReservar
                          key={p.orderId}
                          sesion={p}
                          hoy={hoyServidor}
                          onReservar={() => navigate(`/reservar-siguiente-sesion/${p.orderId}`)}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <TituloSeccion>Próximas reservas</TituloSeccion>
                  {reservasActivas.length > 0 ? (
                    <ul className="grid gap-2">
                      {reservasActivas.map((r, i) => (
                        <FilaReserva key={i} reserva={r} config={configEspacio} />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-tinta-suave">No tienes más reservas futuras.</p>
                  )}
                </div>

                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <TituloSeccion
                      aside={<span className="text-xs text-tinta-suave group-open:hidden">Mostrar</span>}
                    >
                      Historial de reservas
                    </TituloSeccion>
                  </summary>
                  {reservasPasadas.length > 0 ? (
                    <ul className="grid gap-2">
                      {reservasPasadas.map((r, i) => (
                        <FilaReserva key={i} reserva={r} historial />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-tinta-suave">Aún no tienes reservas anteriores.</p>
                  )}
                </details>
              </div>
            )}

            {pestana === "bonos" && (
              <div>
                <TituloSeccion>Mis bonos</TituloSeccion>
                {bonos.length > 0 ? (
                  <ul className="grid gap-3 lg:grid-cols-2">
                    {bonos.map((bono, i) => {
                      const estadoVisible = obtenerEstadoVisibleBono(bono);
                      const total = Number(bono.numeroClases || 0);
                      const usadas = Number(bono.clasesConsumidas || 0);
                      const porcentaje = total > 0 ? Math.min(100, (usadas / total) * 100) : 0;
                      return (
                        <li key={bono.bonoId || i} className={`${tarjetaItem} flex flex-col`}>
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold">{bono.clase || "Bono"}</p>
                            <Chip tono={estadoVisible === "Activo" ? "verde" : "ambar"}>{estadoVisible}</Chip>
                          </div>

                          <div className="mt-3">
                            <div className="h-2 rounded-full bg-arena overflow-hidden">
                              <div className="h-full bg-terracota" style={{ width: `${porcentaje}%` }} />
                            </div>
                            <p className="mt-1 text-xs text-tinta-suave">
                              {usadas} de {total} clases usadas · {Number(bono.clasesRestantes || 0)} restantes
                            </p>
                          </div>

                          <p className="mt-2 text-tinta-suave">
                            {fechaDMA(bono.fechaInicio) || "—"} → {fechaDMA(bono.fechaCaducidadBono) || "—"}
                          </p>

                          {sesionesGestionables(bono).length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold uppercase tracking-wider text-tinta-suave mb-1.5">
                                Sesiones reservadas
                              </p>
                              <ul className="grid gap-2">
                                {sesionesGestionables(bono).map((sesion) => (
                                  <SesionBono
                                    key={sesion.clave}
                                    bono={bono}
                                    sesion={sesion}
                                    config={configEspacio}
                                    onCambio={() => setVersion((v) => v + 1)}
                                  />
                                ))}
                              </ul>
                            </div>
                          )}

                          {estadoVisible === "Activo" && (
                            <button
                              onClick={() => navigate(`/usar-bono/${bono.bonoId}`)}
                              className="mt-3 w-full px-4 py-2.5 bg-terracota hover:bg-terracota-oscuro text-white font-semibold rounded-full transition text-sm"
                            >
                              Reservar sesión con este bono
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-tinta-suave">Aún no tienes bonos comprados.</p>
                )}
              </div>
            )}

            {pestana === "tarjetas" && (
              <div>
                <TituloSeccion>Mis tarjetas regalo</TituloSeccion>
                {tarjetasRegalo.length > 0 ? (
                  <ul className="grid gap-3">
                    {tarjetasRegalo.map((tarjeta, i) => {
                      const usada = tarjeta.estadoCanje === "usada" || tarjeta.estadoCanje === "canjeado";
                      return (
                        <li key={i} className={tarjetaItem}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{tarjeta.clase || "Tarjeta regalo"}</p>
                              <p className="text-tinta-suave">{tarjeta.precioTotal} €</p>
                            </div>
                            <Chip tono={usada ? "neutro" : "verde"}>{usada ? "Usada" : "Disponible"}</Chip>
                          </div>
                          <p className="mt-2">
                            <span className="font-semibold">Código:</span>{" "}
                            <span className="font-mono tracking-wider">{tarjeta.codigo || "—"}</span>
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            {plantillasTarjeta.map((plantilla) => (
                              <BotonPlantilla key={plantilla.id} plantilla={plantilla} className={botonSecundario} />
                            ))}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-tinta-suave">Aún no has comprado ninguna tarjeta regalo.</p>
                )}
              </div>
            )}

            {pestana === "pieza" && (
              <div className="rounded-2xl border border-[#ead66d] bg-[#fbf4d8] p-4 text-sm text-tinta space-y-4">
                <TituloSeccion>
                  <Icono nombre="taller" className="mr-1.5" />Quiero recoger mi pieza
                </TituloSeccion>
                <p>Tus piezas necesitan secado y cocción. Cuando estén listas, podrás consultarlas aquí.</p>

                <div>
                  <p className="font-semibold mb-1">Pasos a seguir:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Elige el esmalte y sube la foto de tu pieza.</li>
                    <li>Revisa si tu pieza está lista para recoger.</li>
                    <li>Cuando esté lista, escríbenos por WhatsApp para venir a recogerla.</li>
                  </ol>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <a
                    href="https://drive.google.com/drive/folders/1Im70RbYcyCFs5pPLgq2ooHhowwtA8F0R"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${botonContorno} bg-white`}
                  >
                    Elegir esmalte y subir foto
                  </a>
                  <a
                    href="https://drive.google.com/drive/folders/1J0f79NLH--SZ9DGIaFO2n5hSNdjU7rUn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${botonContorno} bg-white`}
                  >
                    Ver si mi pieza está lista
                  </a>
                </div>

                <p>
                  <span className="font-semibold">WhatsApp:</span>{" "}
                  <a
                    href={enlaceWhatsapp(configEspacio.telefonoWhatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#b58900] font-bold"
                  >
                    {telefonoVisible(configEspacio.telefonoWhatsapp)}
                  </a>
                </p>

                <div>
                  <p className="font-semibold mb-1">Importante:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Si viniste en grupo, las piezas pueden estar listas en momentos diferentes.</li>
                    <li>Tienes 1 mes para recogerla sin coste desde que se publique.</li>
                    <li>Si necesitas organizar un envío o tienes dudas, escríbenos por WhatsApp.</li>
                  </ul>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Contacto en móvil (en escritorio va en la columna izquierda) */}
        <details className={`${tarjetaItem} mt-6 md:hidden`}>
          <summary className="cursor-pointer font-semibold">
            <Icono nombre="ubicacion" className="mr-1.5" />Contacto
          </summary>
          <ul className="mt-3 space-y-2">
            <li><Icono nombre="telefono" className="mr-1.5" />{telefonoVisible(configEspacio.telefonoWhatsapp)}</li>
            <li className="[overflow-wrap:anywhere]">
                  <Icono nombre="correo" className="mr-1.5" />
                  {/* Se parte por la @ si no cabe, no en mitad del dominio */}
                  <a href="mailto:lapurisimaconchioficial@gmail.com" className="hover:underline">
                    lapurisimaconchioficial<wbr />@gmail.com
                  </a>
                </li>
            <li><Icono nombre="casa" className="mr-1.5" />Calle Israel Nº5, Córdoba</li>
          </ul>
          <button
            onClick={() => window.open("https://maps.google.com/?q=Calle+Israel+5+Córdoba", "_blank")}
            className={`${botonSecundario} mt-3`}
          >
            <Icono nombre="ubicacion" className="mr-1.5" />Cómo llegar
          </button>
        </details>

        <div className="mt-6 flex flex-col items-center gap-4">
          <button
            onClick={handleLogout}
            className="w-full sm:w-auto sm:px-10 bg-[#7a4326] hover:bg-[#633620] text-white py-3 rounded-full font-semibold shadow-md transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </PantallaConVolver>
  );
}
