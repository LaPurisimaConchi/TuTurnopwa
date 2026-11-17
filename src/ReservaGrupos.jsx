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
  variantesDelTaller,
} from "./catalogoTalleres";
import { useContextoReserva } from "./utils/turnosTaller";
import { useConfigEspacio } from "./configuracionEspacio";
import BloqueoReserva from "./BloqueoReserva";
import PantallaReserva from "./components/PantallaReserva";
import SelectorDiaReserva from "./components/SelectorDiaReserva";
import SelectorTurnoReserva from "./components/SelectorTurnoReserva";
import BotonConfirmarReserva from "./components/BotonConfirmarReserva";
import DatosContactoInvitado from "./components/DatosContactoInvitado";
import { leerDatosContacto } from "./utils/invitado";

import { fechaDMA } from "./utils/formatoFecha";
const WHATSAPP_BERTO = "34644671664";

const MAX_PERSONAS = MAX_PERSONAS_GRUPO;

// Los grupos reservan en estos turnos, sea cual sea el horario habitual del taller
const TURNOS_GRUPO = ["11:30-14:30", "17:30-20:30"];

// Un grupo puede reservar cualquier día que no esté cerrado desde el panel
const CLASE_GRUPOS = { horarios: {} };

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
  const { fechasBloqueadas, error: errorContexto, cargado: contextoCargado } =
    useContextoReserva();

  const [talleres, setTalleres] = useState([]);
  const [cargandoTalleres, setCargandoTalleres] = useState(true);

  const [tallerId, setTallerId] = useState("");
  const [opcionId, setOpcionId] = useState("");
  const [metodoId, setMetodoId] = useState("");
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
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
  }, [talleres, location.search, location.state]);

  const taller = talleres.find((t) => t.id === tallerId) || null;
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

  const estadoDia = (iso) => {
    const bloqueo = fechasBloqueadas?.[iso];
    return bloqueo?.bloqueado
      ? { estado: "bloqueado", motivo: bloqueo.motivo || "" }
      : { estado: "disponible" };
  };
  const fechaBloqueada = fecha && fechasBloqueadas?.[fecha]?.bloqueado ? fechasBloqueadas[fecha] : null;

  const whatsappUrl = `https://wa.me/${WHATSAPP_BERTO}?text=${construirMensajeWhatsApp({
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
                    <strong>{opciones.etiqueta}:</strong> {opcion.nombre} — {opcion.precio}€
                  </p>
                )}
                {metodo && (
                  <p>
                    <strong>Método:</strong> {metodo.nombre}
                    {opciones.clave === "metodo" && metodo.precio > 0 ? ` — ${metodo.precio}€` : ""}
                    {opciones.clave === "variante" && metodo.extra > 0 ? ` (+${metodo.extra}€)` : ""}
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
              clase={CLASE_GRUPOS}
              producto="Este día"
            />
          </div>

          {/* Derecha: turno, personas, datos, resumen y pago */}
          <div className="space-y-4">
            <SelectorTurnoReserva
              etiqueta="Selecciona el turno:"
              value={horario}
              onChange={setHorario}
              turnos={TURNOS_GRUPO}
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
                <strong>Precio unitario:</strong> {precioUnitario > 0 ? `${precioUnitario}€` : "—"}
              </p>
              <p>
                <strong>Precio total:</strong> {precioTotal > 0 ? `${precioTotal}€` : "—"}
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
                className="inline-flex items-center justify-center w-full px-5 py-2 rounded-full bg-green-500 text-white font-semibold hover:bg-green-600 transition"
              >
                Hablar con Berto por WhatsApp
              </a>
              <label className="flex items-start mt-3 text-sm text-tinta">
                <input
                  type="checkbox"
                  className="mr-2 mt-1"
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
