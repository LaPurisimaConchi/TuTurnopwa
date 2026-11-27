// src/ReservaGrupos.jsx
// Reserva para grupos . Mismo formato que las demás pantallas de
// reserva: tarjeta de dos columnas, calendario, turnos y botón de confirmar.
// El taller sale del catálogo (clases/{id}); desde la página de un taller se llega
// con ?taller=<id>&variante=<id>&metodo=<id> y llega ya elegido.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get, push, set } from "firebase/database";
import { dbRealtime } from "./firebase";
import {
  cargarTalleres,
  MAX_PERSONAS_GRUPO,
  metodosDelTaller,
  minPersonasHabilitar,
  variantesDelTaller,
} from "./catalogoTalleres";
import { estadoDiaTaller, useClaseConTurnosExtra, useContextoReserva, useDiaDeReserva } from "./utils/turnosTaller";
import { useConfigEspacio } from "./configuracionEspacio";
import BloqueoReserva from "./BloqueoReserva";
import PantallaReserva from "./components/PantallaReserva";
import FaltaElegir from "./components/FaltaElegir";
import SelectorDiaReserva from "./components/SelectorDiaReserva";
import SelectorTurnoReserva from "./components/SelectorTurnoReserva";
import BotonConfirmarReserva from "./components/BotonConfirmarReserva";
import DatosContactoInvitado from "./components/DatosContactoInvitado";
import { leerDatosContacto } from "./utils/invitado";

import { fechaDMA } from "./utils/formatoFecha";
import { euros } from "./utils/formatoPrecio";

const MAX_PERSONAS = MAX_PERSONAS_GRUPO;

// Lo que se puede elegir de un taller: tipo/tamaño (variante) o método, cada uno con
// su precio. Sin ninguno de los dos, el taller tiene un único precio.
function opcionesDelTaller(taller) {
  const variantes = variantesDelTaller(taller);
  if (variantes.length) {
    return { etiqueta: taller.variante?.etiqueta || "Opción", clave: "variante", lista: variantes };
  }
  const metodos = metodosDelTaller(taller).filter((m) => m.precio > 0);
  if (metodos.length) return { etiqueta: "Método", clave: "metodo", lista: metodos };
  return { etiqueta: "", clave: "", lista: [] };
}

function construirMensajeWhatsApp({ nombre, telefono, taller, fecha, horario, personas, notas }) {
  return encodeURIComponent(
    `Hola Berto, quiero reservar un taller para grupo en La Purísima Conchi.

Nombre: ${nombre || "-"}
Teléfono: ${telefono || "-"}
Taller: ${taller || "-"}
Fecha: ${fecha || "-"}
Horario: ${horario || "-"}
Personas: ${personas || "-"}

Notas:
${notas || "-"}

¿Podemos concretarlo?`
  );
}

export default function ReservaGrupos() {
  const navigate = useNavigate();
  const { config: configEspacio } = useConfigEspacio();
  const location = useLocation();
  const {
    fechasBloqueadas,
    fechasHabilitadas,
    diasAbiertos,
    turnosExtra,
    error: errorContexto,
    cargado: contextoCargado,
  } = useContextoReserva();

  const [talleres, setTalleres] = useState([]);
  const [cargandoTalleres, setCargandoTalleres] = useState(true);

  const [tallerId, setTallerId] = useState("");
  const [opcionId, setOpcionId] = useState("");
  const [metodoId, setMetodoId] = useState("");
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  // Día y turno que ya había elegido en la reserva del taller (?fecha=&turno=): se
  // aplican cuando se sabe que valen para un grupo
  const [previa, setPrevia] = useState(null);
  const [personas, setPersonas] = useState(configEspacio.minPersonasGrupo);

  const [user, setUser] = useState(null);
  const [nombreReserva, setNombreReserva] = useState("");
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [notas, setNotas] = useState("");
  const [contactoConfirmado, setContactoConfirmado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Sin cuenta, los datos de contacto se piden al confirmar (como en las demás
  // reservas). Con cuenta se usan los del perfil y solo se piden si faltan.
  const [pedirContacto, setPedirContacto] = useState(false);
  const [pidiendoDatos, setPidiendoDatos] = useState(false);
  const resolverDatos = useRef(null);

  // Sesión y datos del perfil
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
      setUser(firebaseUser || null);
      if (!firebaseUser) return;

      setEmail(firebaseUser.email || "");
      try {
        const snap = await get(ref(dbRealtime, `usuarios/${firebaseUser.uid}`));
        if (snap.exists()) {
          const datos = snap.val() || {};
          setNombreReserva(datos.nombre || "");
          setTelefono(datos.telefono || "");
          setPedirContacto(!datos.nombre || !datos.telefono);
        } else {
          setPedirContacto(true);
        }
      } catch (error) {
        console.error("Error al cargar datos del usuario:", error);
      }
    });
    return () => unsubscribe();
  }, []);

  // Catálogo: talleres activos con precio (los bonos no se reservan en grupo)
  useEffect(() => {
    cargarTalleres()
      .then((lista) =>
        setTalleres(lista.filter((t) => t.tipoProducto !== "bono" && t.precioDesde > 0))
      )
      .catch((error) => console.error("Error al cargar talleres:", error))
      .finally(() => setCargandoTalleres(false));
  }, []);

  // Taller (y opción) que vienen elegidos desde la página del taller
  useEffect(() => {
    if (!talleres.length) return;
    const params = new URLSearchParams(location.search);
    const id = params.get("taller");
    // Enlaces antiguos: llegan con el nombre del taller en el estado de navegación
    const nombre = String(location.state?.clasePreseleccionada || "").toLowerCase();
    const previo =
      talleres.find((t) => t.id === id) ||
      (nombre && talleres.find((t) => nombre.startsWith(t.nombre.toLowerCase())));
    if (!previo) return;

    setTallerId(previo.id);
    const { clave, lista } = opcionesDelTaller(previo);
    const elegida = clave && lista.find((o) => o.id === params.get(clave));
    setOpcionId(elegida ? elegida.id : lista.length === 1 ? lista[0].id : "");

    setMetodoId(params.get("metodo") || "");

    // Personas que ya había elegido en la reserva del taller
    const previas = Math.round(Number(params.get("personas")));
    if (previas > 0) setPersonas(Math.min(MAX_PERSONAS, previas));

    const fechaPrevia = params.get("fecha");
    const turnoPrevio = params.get("turno");
    setPrevia(fechaPrevia && turnoPrevio ? { fecha: fechaPrevia, turno: turnoPrevio } : null);
  }, [talleres, location.search, location.state]);

  const taller = talleres.find((t) => t.id === tallerId) || null;
  // El taller con los turnos creados desde el panel para fechas concretas
  const tallerTurnos = useClaseConTurnosExtra(taller, taller?.id, turnosExtra);

  // Esta página solo se abre desde la ficha de un taller, con su opción y método ya
  // elegidos: sin ellos, un error en vez de un formulario que no sirve
  const tallerDeLaUrl = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const nombre = String(location.state?.clasePreseleccionada || "").toLowerCase();
    return (
      talleres.find((t) => t.id === params.get("taller")) ||
      (nombre && talleres.find((t) => nombre.startsWith(t.nombre.toLowerCase()))) ||
      null
    );
  }, [talleres, location.search, location.state]);
  const faltaDeLaUrl = useMemo(() => {
    if (!tallerDeLaUrl) return "";
    const params = new URLSearchParams(location.search);
    const { etiqueta, clave, lista } = opcionesDelTaller(tallerDeLaUrl);
    if (lista.length > 1 && !lista.some((o) => o.id === params.get(clave))) {
      return etiqueta.toLowerCase();
    }
    if (clave !== "metodo" && metodosDelTaller(tallerDeLaUrl).length > 1 && !params.get("metodo")) {
      return "método";
    }
    return "";
  }, [tallerDeLaUrl, location.search]);
  // Mínimo que fija cada taller en su ficha (5 si no lo cambia)
  const MIN_PERSONAS = configEspacio.minPersonasGrupo;
  const opciones = useMemo(
    () => (taller ? opcionesDelTaller(taller) : { etiqueta: "", clave: "", lista: [] }),
    [taller]
  );
  const opcion = opciones.lista.find((o) => o.id === opcionId) || null;
  // Método elegido en la página del taller (con tipo/tamaño no cambia el precio de grupo)
  const metodo = useMemo(() => {
    if (!taller) return null;
    if (opciones.clave === "metodo") return opcion;
    return metodosDelTaller(taller).find((m) => m.id === metodoId) || null;
  }, [taller, opciones.clave, opcion, metodoId]);

  const precioUnitario = !taller
    ? 0
    : opciones.lista.length
    ? (opcion?.precio || 0) + (opciones.clave === "variante" ? metodo?.extra || 0 : 0)
    : Number(taller.precio) || taller.precioDesde || 0;

  const personasNum = Number(personas) || 0;
  const precioTotal = precioUnitario * personasNum;
  const nombreTaller = taller
    ? opcion
      ? `${taller.nombre} — ${opcion.nombre}${
          metodo && metodo !== opcion ? ` — ${metodo.nombre}` : ""
        }`
      : taller.nombre
    : "";

  // Los grupos reservan en el horario del taller: sus turnos del día o, en un día sin
  // horario, los de días abiertos. Un día cerrado se abre con el mínimo de personas
  // que fija el taller en su ficha.
  const minAbrir = taller ? minPersonasHabilitar(taller) : 0;
  const estadoDia = (iso) => {
    if (!taller) return { estado: "sin-taller" };
    const estado = estadoDiaTaller({
      clase: tallerTurnos,
      fecha: iso,
      fechasBloqueadas,
      fechasHabilitadas,
      permiteAbrir: true,
      diasAbiertos,
    });
    return estado.estado === "solo-grupo" && Number(personas) >= estado.minimo
      ? { estado: "disponible" }
      : estado;
  };
  const {
    turnosDisponibles: turnosDelDia,
    fechaBloqueada: bloqueoDia,
    fechaHabilitadaManual,
    diaNoDisponible,
    turnosMinimo,
  } = useDiaDeReserva({
    clase: tallerTurnos,
    fecha,
    fechasBloqueadas,
    fechasHabilitadas,
    permiteAbrir: true,
    diasAbiertos,
  });
  const fechaBloqueada = fecha && bloqueoDia ? bloqueoDia : null;

  // Aplica el día y el turno que vienen de la reserva del taller, si valen aquí
  // (las mismas reglas que allí: si no valen, se queda todo por elegir)
  useEffect(() => {
    if (!previa || !taller || !contextoCargado) return;

    if (fecha !== previa.fecha) {
      if (estadoDia(previa.fecha).estado === "disponible") setFecha(previa.fecha);
      else setPrevia(null);
      return;
    }

    if (turnosDelDia.includes(previa.turno)) setHorario(previa.turno);
    setPrevia(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previa, taller, contextoCargado, fecha, turnosDelDia, personas]);
  const faltanPersonasDia = !!horario && turnosMinimo.includes(horario) && Number(personas) < minAbrir;

  const whatsappUrl = `https://wa.me/34${configEspacio.telefonoWhatsapp}?text=${construirMensajeWhatsApp({
    nombre: nombreReserva,
    telefono,
    taller: nombreTaller,
    fecha,
    horario,
    personas,
    notas,
  })}`;

  useEffect(() => {
    setPersonas((actual) => Math.max(Number(actual) || 0, MIN_PERSONAS));
  }, [MIN_PERSONAS]);

  const faltaOpcion = opciones.lista.length > 0 && !opcionId;

  const deshabilitado =
    !!errorContexto ||
    !contextoCargado ||
    !taller ||
    faltaOpcion ||
    !fecha ||
    !!fechaBloqueada ||
    !horario ||
    diaNoDisponible ||
    faltanPersonasDia ||
    (pedirContacto && (!nombreReserva.trim() || !telefono.trim())) ||
    !nombreGrupo.trim() ||
    personasNum < MIN_PERSONAS ||
    !(precioUnitario > 0) ||
    !contactoConfirmado;

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

    if (errorContexto) {
      alert("No se ha podido comprobar la disponibilidad. Recarga la página e inténtalo de nuevo.");
      return;
    }
    if (!taller || faltaOpcion || !fecha || !horario || !nombreGrupo.trim()) {
      alert("Completa todos los campos obligatorios.");
      return;
    }
    if (fechaBloqueada) {
      alert(
        `No se puede reservar el día ${fechaDMA(fecha)}. Motivo: ${fechaBloqueada.motivo || "día bloqueado"}.`
      );
      return;
    }
    if (diaNoDisponible || faltanPersonasDia) {
      alert(
        faltanPersonasDia
          ? `Ese turno está cerrado: para abrirlo hacen falta al menos ${minAbrir} personas.`
          : "Ese día no hay taller. Elige otro día."
      );
      return;
    }
    if (personasNum < MIN_PERSONAS) {
      alert(`El mínimo para reservar este taller en grupo es de ${MIN_PERSONAS} personas.`);
      return;
    }
    if (personasNum > MAX_PERSONAS) {
      alert("El máximo de plazas para grupos es de 45 personas.");
      return;
    }
    if (!(precioUnitario > 0)) {
      alert("No se ha podido calcular el precio del taller.");
      return;
    }
    if (!contactoConfirmado) {
      alert("Debes confirmar antes que ya has contactado con Berto por WhatsApp.");
      return;
    }

    // Sin sesión se piden los datos de contacto ahora; la cuenta de invitado se
    // abre al enviarlos, no al entrar en la pantalla
    let usuario = user || getAuth().currentUser;
    let nombreFinal = nombreReserva.trim();
    let telefonoFinal = telefono.trim();
    let emailFinal = email;

    if (!usuario) {
      usuario = await pedirDatosInvitado();
      if (!usuario) return;
      const datos = await leerDatosContacto(usuario.uid).catch(() => ({}));
      nombreFinal = datos.nombre || usuario.displayName || "";
      telefonoFinal = datos.telefono || "";
      emailFinal = datos.email || usuario.email || "";
    } else if (!nombreFinal || !telefonoFinal) {
      alert("Indica tu nombre y tu teléfono para que el taller pueda contactar contigo.");
      return;
    }

    try {
      setGuardando(true);
      const orderId = Date.now().toString().slice(-12);
      const ahoraISO = new Date().toISOString();
      const grupoRef = push(ref(dbRealtime, "reservasGrupos"));

      const reservaGrupo = {
        uid: usuario.uid,
        nombreReserva: nombreFinal,
        nombreGrupo: nombreGrupo.trim(),
        nombreOrganizador: nombreFinal,
        telefonoOrganizador: telefonoFinal,
        modoPago: "completo",
        telefono: telefonoFinal,
        email: emailFinal || "",
        clase: nombreTaller,
        claseId: "reserva-grupo",
        tallerId: taller.id,
        // Variante o método elegido: con él calcula el servidor el precio (api/_pedidoServidor.js)
        opcionTaller: opcion?.id || "",
        metodoTaller: metodo?.id || "",
        tipo: "grupo",
        fecha,
        turno: horario,
        metodo: "grupo",
        plazas: personasNum,
        precio: precioTotal,
        precioUnitario,
        precioTotal,
        notas: notas || "",
        contactoConfirmado: true,
        estado: "Pendiente",
        estadoPago: "pendiente",
        plazasPagadas: personasNum,
        plazasPendientes: 0,
        totalPagado: precioTotal,
        totalPendiente: 0,
        fechaCreacion: ahoraISO,
        fechaLimitePago: null,
        orderId,
        timestamp: ahoraISO,
      };

      await set(grupoRef, reservaGrupo);
      const comprobarSnap = await get(grupoRef);
      if (!comprobarSnap.exists()) {
        alert("La reserva NO se ha guardado en Firebase. No continúes.");
        return;
      }

      navigate("/resumen-pago", {
        state: {
          tipo: "grupo",
          grupoId: grupoRef.key,
          clase: nombreTaller,
          claseId: "reserva-grupo",
          precio: precioTotal,
          precioUnitario,
          precioTotal,
          fecha,
          turno: horario,
          metodo: "grupo",
          plazas: personasNum,
          orderId,
          notas: notas || "",
          telefono: telefonoFinal,
          email: emailFinal || "",
          nombreReserva: nombreFinal,
        },
      });
    } catch (error) {
      console.error("Error al guardar la reserva de grupo:", error);
      alert("No se pudo guardar la reserva de grupo.");
    } finally {
      setGuardando(false);
    }
  };

  const campo = "w-full border border-gray-300 rounded-lg px-3 py-2 text-base";

  if (!cargandoTalleres && !tallerDeLaUrl) {
    return (
      <FaltaElegir
        titulo="Falta elegir el taller"
        mensaje="La reserva para grupos se hace desde la página de un taller: elígelo allí, escoge su opción y pulsa «Reservar para grupo»."
        enlace="/clases"
        textoEnlace="Ver talleres"
      />
    );
  }
  if (!cargandoTalleres && faltaDeLaUrl) {
    return (
      <FaltaElegir
        titulo={`Falta elegir ${faltaDeLaUrl}`}
        mensaje={`Antes de reservar en grupo tienes que elegir ${faltaDeLaUrl} en la página de ${tallerDeLaUrl.nombre}.`}
        enlace={`/taller/${tallerDeLaUrl.id}`}
        textoEnlace="Volver al taller"
      />
    );
  }

  return (
    <PantallaReserva ancho="max-w-4xl">
      <h1 className="text-center font-serif text-tinta mb-4">
        <span className="block text-sm font-sans font-semibold uppercase tracking-wider text-terracota">
          Reserva para grupos
        </span>
        {taller && (
          <span className="block text-3xl md:text-4xl font-bold leading-tight mt-1">
            {taller.nombre}
          </span>
        )}
        {!taller && !cargandoTalleres && <span className="block text-2xl mt-1">Elige un taller</span>}
      </h1>
      <p className="text-center text-sm text-tinta max-w-2xl mx-auto mb-5">
        Para grupos de <strong>{MIN_PERSONAS} o más personas</strong>. Antes de pagar, habla con el taller por
        WhatsApp para confirmar fecha y horario.
      </p>

      <BloqueoReserva permitirVisitante>
        {errorContexto && (
          <p className="text-sm text-red-600 text-center mb-4">
            No se ha podido comprobar la disponibilidad. Recarga la página e inténtalo de nuevo.
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2 md:gap-x-10">

          {/* Izquierda: qué y cuándo */}
          <div className="space-y-4">
            {!cargandoTalleres && !taller && (
              <p className="rounded-lg border border-linea bg-crema px-3 py-2 text-sm text-tinta">
                Elige primero un taller en su página y pulsa su botón de reserva para grupos.{" "}
                <Link to="/portada" className="text-blue-700 underline">
                  Ver talleres
                </Link>
              </p>
            )}

            {taller && (opcion || metodo) && (
              <div className="rounded-lg border border-linea bg-crema px-3 py-2 text-sm text-tinta space-y-1">
                {opcion && opciones.clave === "variante" && (
                  <p>
                    <strong>{opciones.etiqueta}:</strong> {opcion.nombre} — {euros(opcion.precio)}
                  </p>
                )}
                {metodo && (
                  <p>
                    <strong>Método:</strong> {metodo.nombre}
                    {opciones.clave === "metodo" && metodo.precio > 0 ? ` — ${euros(metodo.precio)}` : ""}
                    {opciones.clave === "variante" && metodo.extra > 0 ? ` (+${euros(metodo.extra)})` : ""}
                  </p>
                )}
              </div>
            )}

            <SelectorDiaReserva
              etiqueta="Selecciona el día:"
              value={fecha}
              onChange={(iso) => {
                setFecha(iso);
                setHorario("");
              }}
              estadoDia={estadoDia}
              cargando={!contextoCargado}
              fechaBloqueada={fechaBloqueada}
              fechaHabilitadaManual={fechaHabilitadaManual}
              diaNoDisponible={diaNoDisponible}
              clase={taller}
              producto="Este taller"
            />
          </div>

          {/* Derecha: turno, personas, datos, resumen y pago */}
          <div className="space-y-4">
            <SelectorTurnoReserva
              etiqueta="Selecciona el turno:"
              value={horario}
              onChange={setHorario}
              turnos={turnosDelDia}
              turnosMinimo={turnosMinimo}
              minimo={minAbrir}
              botones
              deshabilitado={!fecha || !!fechaBloqueada}
              placeholder={!fecha ? "-- Primero selecciona el día --" : "-- Elige turno --"}
            />

            <div>
              <label className="block font-bold text-sm mb-2">
                ¿Cuántas personas venís? <span className="text-red-600">*</span>
              </label>
              <div className="flex items-center justify-between border border-gray-300 rounded-xl px-3 py-2">
                <button
                  type="button"
                  onClick={() => setPersonas(Math.max(MIN_PERSONAS, personasNum - 1))}
                  className="text-xl font-bold px-3 py-1 rounded-lg bg-arena"
                >
                  −
                </button>
                <span className="text-lg font-semibold">{personasNum}</span>
                <button
                  type="button"
                  onClick={() => setPersonas(Math.min(MAX_PERSONAS, personasNum + 1))}
                  className="text-xl font-bold px-3 py-1 rounded-lg bg-arena"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-tinta-suave mt-1">
                Mínimo {MIN_PERSONAS} personas. Máximo {MAX_PERSONAS} plazas.
              </p>
              {faltanPersonasDia && (
                <p className="text-sm text-red-600 font-medium mt-1">
                  Ese turno está cerrado: para abrirlo hacen falta al menos {minAbrir} personas (ahora{" "}
                  {personasNum}).
                </p>
              )}
            </div>

            <div>
              <label htmlFor="nombreGrupo" className="block font-bold text-sm mb-1">
                Nombre del grupo <span className="text-red-600">*</span>
              </label>
              <input
                id="nombreGrupo"
                type="text"
                value={nombreGrupo}
                onChange={(e) => setNombreGrupo(e.target.value)}
                className={campo}
                placeholder="Despedida Las Nenas, Cumple Laura..."
                required
              />
            </div>

            {pedirContacto && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="nombreReserva" className="block font-bold text-sm mb-1">
                  Tu nombre <span className="text-red-600">*</span>
                </label>
                <input
                  id="nombreReserva"
                  type="text"
                  value={nombreReserva}
                  onChange={(e) => setNombreReserva(e.target.value)}
                  className={campo}
                  required
                />
              </div>
              <div>
                <label htmlFor="telefono" className="block font-bold text-sm mb-1">
                  Teléfono <span className="text-red-600">*</span>
                </label>
                <input
                  id="telefono"
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className={campo}
                  required
                />
              </div>
            </div>
            )}

            <div>
              <label htmlFor="notas" className="block font-bold text-sm mb-1">
                Cuéntanos lo que necesitáis
              </label>
              <textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                className={campo}
                placeholder="Empezar antes, celebración, algún detalle importante..."
              />
            </div>

            <div className="bg-crema border border-linea rounded-xl p-3 text-sm text-tinta">
              {opcion && opciones.clave === "variante" && (
                <p>
                  <strong>{opciones.etiqueta}:</strong> {opcion.nombre}
                </p>
              )}
              {metodo && (
                <p>
                  <strong>Método elegido:</strong> {metodo.nombre}
                </p>
              )}
              <p>
                <strong>Precio unitario:</strong> {precioUnitario > 0 ? `${euros(precioUnitario)}` : "—"}
              </p>
              <p>
                <strong>Precio total:</strong> {precioTotal > 0 ? `${euros(precioTotal)}` : "—"}
              </p>
            </div>

            <div className="bg-[#f7f7f7] border border-gray-200 rounded-xl p-3">
              <p className="text-sm text-tinta mb-3">
                Antes de pagar, habla con Berto por WhatsApp para confirmar el taller, el horario
                y cualquier detalle.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-5 py-2 rounded-full bg-[#128C7E] text-white font-semibold hover:bg-[#0e6f64] transition"
              >
                Hablar con Berto por WhatsApp
              </a>
              <label className="flex items-start mt-3 text-sm text-tinta">
                <input
                  type="checkbox"
                  className="mr-3 -mt-0.5 sm:mt-0"
                  checked={contactoConfirmado}
                  onChange={(e) => setContactoConfirmado(e.target.checked)}
                />
                <span>Ya he contactado con Berto y he concretado los detalles de la reserva.</span>
              </label>
            </div>

            <BotonConfirmarReserva guardando={guardando} deshabilitado={deshabilitado} />
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
