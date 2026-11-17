import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import DatosContactoInvitado from "./components/DatosContactoInvitado";
import { consultarTarjetaRegalo } from "./utils/canjeServidor";
import { OPCIONES_TARJETA_REGALO } from "./opcionesTarjetaRegalo";

const CanjearTarjetaRegalo = () => {
  const [codigo, setCodigo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [validando, setValidando] = useState(false);
  const navigate = useNavigate();

  // Sin sesión se piden los datos de contacto al validar (leer la tarjeta exige
  // sesión); la cuenta de invitado se abre al enviarlos
  const [pidiendoDatos, setPidiendoDatos] = useState(false);
  const resolverDatos = useRef(null);
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

  // La tarjeta la busca el servidor: las reglas no dejan leer /tarjetasRegalo
  const buscarTarjetaPorCodigo = (codigoBuscado) => consultarTarjetaRegalo(codigoBuscado);

  const obtenerOpcionRegalo = (tarjeta) => {
    if (!tarjeta) return null;

    return (
      OPCIONES_TARJETA_REGALO.find((opcion) => {
        const mismoClaseId = opcion.claseId === tarjeta.claseId;
        if (!mismoClaseId) return false;

        const subtipoTarjeta = String(tarjeta.subtipo || "").trim();
        const subtipoOpcion = String(opcion.subtipo || "").trim();

        const tipoPiezaTarjeta = String(tarjeta.tipoPieza || "").trim();
        const tipoPiezaOpcion = String(opcion.tipoPieza || "").trim();

        if (subtipoTarjeta && subtipoOpcion) {
          return subtipoTarjeta === subtipoOpcion;
        }

        if (tipoPiezaTarjeta && tipoPiezaOpcion) {
          return tipoPiezaTarjeta === tipoPiezaOpcion;
        }

        if (!subtipoTarjeta && !tipoPiezaTarjeta) {
          return true;
        }

        return false;
      }) || null
    );
  };

  // Talleres creados desde el admin: se reservan en /reservar/:claseId
  const obtenerTallerNuevo = async (tarjeta) => {
    if (!tarjeta?.claseId) return null;

    const snap = await get(ref(dbRealtime, `clases/${tarjeta.claseId}`));
    const clase = snap.exists() ? snap.val() : null;
    if (!clase?.dinamica) return null;

    return {
      clase: clase.nombre || tarjeta.clase || "",
      claseId: tarjeta.claseId,
      subtipo: tarjeta.subtipo || "",
      tipoPieza: tarjeta.tipoPieza || "",
      tipoTaller: clase.grupo || "",
      precio: Number(tarjeta.precioTotal || 0),
      rutaReserva: `/reservar/${tarjeta.claseId}`,
      requiereMetodo: !!tarjeta.subtipo,
      requiereTipoPieza: false,
    };
  };

  const handleValidar = async () => {
    setMensaje("");
    setValidando(true);

    const auth = getAuth();
    let user = auth.currentUser;
    const code = codigo.trim();

    if (!code) {
      setMensaje("Por favor, introduce un código.");
      setValidando(false);
      return;
    }

    if (!user) {
      user = await pedirDatosInvitado();
      if (!user) {
        setValidando(false);
        return;
      }
    }

    try {
      const tarjeta = await buscarTarjetaPorCodigo(code);

      if (!tarjeta) {
        setMensaje("Código no válido. Revisa que lo has escrito bien.");
        setValidando(false);
        return;
      }

      if (!tarjeta.pagada) {
        setMensaje("Esta tarjeta regalo aún no consta como pagada.");
        setValidando(false);
        return;
      }

      if (tarjeta.usada) {
        setMensaje("Este código ya ha sido usado.");
        setValidando(false);
        return;
      }

      if (tarjeta.deOtraPersona) {
        setMensaje("Este código ya ha sido canjeado por otro usuario.");
        setValidando(false);
        return;
      }

      const opcionRegalo =
        obtenerOpcionRegalo(tarjeta) || (await obtenerTallerNuevo(tarjeta));

      if (!opcionRegalo || !opcionRegalo.rutaReserva) {
        setMensaje(
          "No se ha podido identificar la clase de esta tarjeta regalo."
        );
        setValidando(false);
        return;
      }

      setMensaje("Código válido. Redirigiendo a tu reserva...");

      navigate(opcionRegalo.rutaReserva, {
        state: {
          desdeTarjeta: true,
          desdeTarjetaRegalo: true,
          codigoTarjeta: tarjeta.codigo,
          tarjetaRegaloId: tarjeta.id,
          clase: tarjeta.clase || opcionRegalo.clase,
          claseId: tarjeta.claseId || opcionRegalo.claseId,
          subtipo: tarjeta.subtipo || opcionRegalo.subtipo || "",
          tipoPieza: tarjeta.tipoPieza || opcionRegalo.tipoPieza || "",
          metodo: tarjeta.metodo || "",
          tipoTaller: tarjeta.tipoTaller || opcionRegalo.tipoTaller || "",
          precio: tarjeta.precioTotal || opcionRegalo.precio || 0,
          precioTotal: tarjeta.precioTotal || opcionRegalo.precio || 0,
          rutaReserva: opcionRegalo.rutaReserva,
          requiereMetodo: !!opcionRegalo.requiereMetodo,
          requiereTipoPieza: !!opcionRegalo.requiereTipoPieza,
          plazasTarjeta: Number(tarjeta.plazas || 1),
        },
      });
   } catch (error) {
  console.error("Error al validar el código:", error);
  setMensaje(`Error al validar: ${error?.message || "desconocido"}`);
} finally {
  setValidando(false);
}
  };

  return (
    <div className="max-w-xl mx-auto">
      <section className="bg-white rounded-2xl border border-linea shadow-sm p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleValidar();
          }}
          className="space-y-4"
        >
          <label className="block text-sm font-medium text-tinta">
            Código de la tarjeta regalo
            <input
              type="text"
              placeholder="Introduce tu código"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              autoComplete="off"
              className="mt-1 block w-full min-h-[48px] rounded-xl border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-terracota"
            />
          </label>

          <button
            type="submit"
            disabled={validando}
            className="inline-flex items-center justify-center w-full min-h-[48px] rounded-xl px-6 font-bold bg-terracota text-white hover:bg-terracota-oscuro transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-terracota focus-visible:ring-offset-2"
          >
            {validando ? "Validando…" : "Validar código"}
          </button>
        </form>

        {mensaje && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {mensaje}
          </p>
        )}
      </section>

      {pidiendoDatos && (
        <DatosContactoInvitado
          compra
          onListo={cerrarDatosInvitado}
          onCancelar={() => cerrarDatosInvitado(null)}
        />
      )}
    </div>
  );
};

export default CanjearTarjetaRegalo;
