// src/ReservaGrupos.jsx
// Reserva para grupos (5 o más personas). Mismo formato que las demás pantallas de
// reserva: tarjeta de dos columnas, calendario, turnos y botón de confirmar.
// El taller sale del catálogo (clases/{id}); desde la página de un taller se llega
// con ?taller=<id>&variante=<id>&metodo=<id> y llega ya elegido.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get, push, set } from "firebase/database";
import { dbRealtime } from "./firebase";
import {
  cargarTalleres,
  formatearEuros,
  metodosDelTaller,
  variantesDelTaller,
} from "./catalogoTalleres";
import { useContextoReserva } from "./utils/turnosTaller";
import BloqueoReserva from "./BloqueoReserva";
import PantallaReserva from "./components/PantallaReserva";
import SelectorDiaReserva from "./components/SelectorDiaReserva";
import SelectorTurnoReserva from "./components/SelectorTurnoReserva";
import BotonConfirmarReserva from "./components/BotonConfirmarReserva";

const WHATSAPP_BERTO = "34644671664";

const MIN_PERSONAS = 5;
const MAX_PERSONAS = 45;

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
  const location = useLocation();
  const { fechasBloqueadas, error: errorContexto, cargado: contextoCargado } =
    useContextoReserva();

  const [talleres, setTalleres] = useState([]);
  const [cargandoTalleres, setCargandoTalleres] = useState(true);

  const [tallerId, setTallerId] = useState("");
  const [opcionId, setOpcionId] = useState("");
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  const [personas, setPersonas] = useState(MIN_PERSONAS);

  const [user, setUser] = useState(null);
  const [nombreReserva, setNombreReserva] = useState("");
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [notas, setNotas] = useState("");
  const [contactoConfirmado, setContactoConfirmado] = useState(false);
  const [guardando, setGuardando] = useState(false);

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
  }, [talleres, location.search, location.state]);

  const taller = talleres.find((t) => t.id === tallerId) || null;
  const opciones = useMemo(
    () => (taller ? opcionesDelTaller(taller) : { etiqueta: "", clave: "", lista: [] }),
    [taller]
  );
  const opcion = opciones.lista.find((o) => o.id === opcionId) || null;

  const precioUnitario = !taller
    ? 0
    : opciones.lista.length
    ? opcion?.precio || 0
    : Number(taller.precio) || taller.precioDesde || 0;

  const personasNum = Number(personas) || 0;
  const precioTotal = precioUnitario * personasNum;
  const nombreTaller = taller
    ? opcion
      ? `${taller.nombre} — ${opcion.nombre}`
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

  const elegirTaller = (id) => {
    const nuevo = talleres.find((t) => t.id === id);
    setTallerId(id);
    const { lista } = nuevo ? opcionesDelTaller(nuevo) : { lista: [] };
    setOpcionId(lista.length === 1 ? lista[0].id : "");
  };

  const faltaOpcion = opciones.lista.length > 0 && !opcionId;

  const deshabilitado =
    !!errorContexto ||
    !contextoCargado ||
    !taller ||
    faltaOpcion ||
    !fecha ||
    !!fechaBloqueada ||
    !horario ||
    !nombreReserva.trim() ||
    !telefono.trim() ||
    !nombreGrupo.trim() ||
    personasNum < MIN_PERSONAS ||
    !(precioUnitario > 0) ||
    !contactoConfirmado;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      alert("Debes iniciar sesión para reservar.");
      return;
    }
    if (errorContexto) {
      alert("No se ha podido comprobar la disponibilidad. Recarga la página e inténtalo de nuevo.");
      return;
    }
    if (!taller || faltaOpcion || !fecha || !horario || !nombreReserva.trim() || !telefono.trim() || !nombreGrupo.trim()) {
      alert("Completa todos los campos obligatorios.");
      return;
    }
    if (fechaBloqueada) {
      alert(
        `No se puede reservar el día ${fecha}. Motivo: ${fechaBloqueada.motivo || "día bloqueado"}.`
      );
      return;
    }
    if (personasNum < MIN_PERSONAS) {
      alert("El mínimo para reservar en grupo es de 5 personas.");
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

    try {
      setGuardando(true);
      const orderId = Date.now().toString().slice(-12);
      const ahoraISO = new Date().toISOString();
      const grupoRef = push(ref(dbRealtime, "reservasGrupos"));

      const reservaGrupo = {
        uid: user.uid,
        nombreReserva,
        nombreGrupo: nombreGrupo.trim(),
        nombreOrganizador: nombreReserva,
        telefonoOrganizador: telefono,
        modoPago: "completo",
        telefono,
        email: email || "",
        clase: nombreTaller,
        claseId: "reserva-grupo",
        tallerId: taller.id,
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
          telefono,
          email: email || "",
          nombreReserva,
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
      <h1 className="text-center text-2xl text-[#5c3c00] font-serif mb-2">
        Reserva para grupos
      </h1>
      <p className="text-center text-sm text-gray-700 max-w-2xl mx-auto mb-5">
        Para grupos de <strong>5 o más personas</strong>. Antes de pagar, habla con el taller por
        WhatsApp para confirmar fecha y horario.
      </p>

      <BloqueoReserva>
        {errorContexto && (
          <p className="text-sm text-red-600 text-center mb-4">
            No se ha podido comprobar la disponibilidad. Recarga la página e inténtalo de nuevo.
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2 md:gap-x-10">
          <p className="md:col-span-2 text-xs text-center text-[#7a5a1e]">
            Los campos marcados con <span className="font-bold text-red-600">*</span> son obligatorios.
          </p>

          {/* Izquierda: qué y cuándo */}
          <div className="space-y-4">
            <div>
              <label htmlFor="taller" className="block font-bold text-sm mb-1">
                Taller <span className="text-red-600">*</span>
              </label>
              <select
                id="taller"
                value={tallerId}
                onChange={(e) => elegirTaller(e.target.value)}
                className={campo}
                required
                disabled={cargandoTalleres}
              >
                <option value="">
                  {cargandoTalleres ? "Cargando talleres..." : "-- Elige un taller --"}
                </option>
                {talleres.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                    {!opcionesDelTaller(t).lista.length && t.precioDesde
                      ? ` — ${formatearEuros(t.precioDesde)}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {opciones.lista.length > 1 && (
              <div>
                <label htmlFor="opcion" className="block font-bold text-sm mb-1">
                  {opciones.etiqueta} <span className="text-red-600">*</span>
                </label>
                <select
                  id="opcion"
                  value={opcionId}
                  onChange={(e) => setOpcionId(e.target.value)}
                  className={campo}
                  required
                >
                  <option value="">-- Elige una opción --</option>
                  {opciones.lista.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nombre} — {formatearEuros(o.precio)}
                    </option>
                  ))}
                </select>
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
                Número de personas <span className="text-red-600">*</span>
              </label>
              <div className="flex items-center justify-between border border-gray-300 rounded-xl px-3 py-2">
                <button
                  type="button"
                  onClick={() => setPersonas(Math.max(MIN_PERSONAS, personasNum - 1))}
                  className="text-xl font-bold px-3 py-1 rounded-lg bg-gray-100"
                >
                  −
                </button>
                <span className="text-lg font-semibold">{personasNum}</span>
                <button
                  type="button"
                  onClick={() => setPersonas(Math.min(MAX_PERSONAS, personasNum + 1))}
                  className="text-xl font-bold px-3 py-1 rounded-lg bg-gray-100"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
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

            <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
              <p>
                <strong>Taller:</strong> {nombreTaller || "—"}
              </p>
              <p>
                <strong>Turno:</strong> {horario || "—"}
              </p>
              <p>
                <strong>Precio por persona:</strong> {precioUnitario > 0 ? `${precioUnitario}€` : "—"}
              </p>
              <p>
                <strong>Precio total:</strong> {precioTotal > 0 ? `${precioTotal}€` : "—"}
              </p>
            </div>

            <div className="bg-[#f7f7f7] border border-gray-200 rounded-xl p-3">
              <p className="text-sm text-gray-700 mb-3">
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
              <label className="flex items-start mt-3 text-sm text-gray-700">
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
    </PantallaReserva>
  );
}
