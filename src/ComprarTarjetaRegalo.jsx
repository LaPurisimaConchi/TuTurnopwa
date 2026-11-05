import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BotonVolver from "./BotonVolver";
import { OPCIONES_TARJETA_REGALO } from "./opcionesTarjetaRegalo";
import {
  cargarTalleres,
  filtrarOpcionesRegaloEstaticas,
  opcionesRegaloDinamicas,
} from "./catalogoTalleres";
import { MAX_PLAZAS_TARJETA_REGALO } from "./utils/tarjetasRegalo";

// Los bonos mensuales se regalan de uno en uno (cada bono es de una persona)
const admiteVariasPlazas = (opcion) => opcion?.tipoTaller !== "bono_mensual";

export default function ComprarTarjetaRegalo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tallerPreseleccionado = searchParams.get("taller") || "";

  const [opcionSeleccionadaId, setOpcionSeleccionadaId] = useState("");
  const [plazas, setPlazas] = useState(1);
  // Todos los talleres (ocultos incluidos); null mientras se cargan
  const [talleres, setTalleres] = useState(null);

  useEffect(() => {
    cargarTalleres({ incluirOcultos: true })
      .then(setTalleres)
      .catch((error) => console.error("Error al cargar los talleres:", error));
  }, []);

  // Las opciones de siempre salen mientras el taller no esté migrado, oculto ni
  // borrado; los talleres del panel (nuevos y migrados) aportan las suyas
  const opciones = useMemo(
    () => [
      ...filtrarOpcionesRegaloEstaticas(OPCIONES_TARJETA_REGALO, talleres),
      ...opcionesRegaloDinamicas((talleres || []).filter((t) => t.estado === "activa")),
    ],
    [talleres]
  );

  // Desde la página de un taller: "Regalar este taller"
  useEffect(() => {
    if (!tallerPreseleccionado || opcionSeleccionadaId) return;
    const opcion = opciones.find((op) => op.claseId === tallerPreseleccionado);
    if (opcion) setOpcionSeleccionadaId(opcion.id);
  }, [tallerPreseleccionado, opciones, opcionSeleccionadaId]);

  const opcionSeleccionada = opciones.find(
    (op) => op.id === opcionSeleccionadaId
  );

  const variasPlazas = admiteVariasPlazas(opcionSeleccionada);
  const plazasNum = variasPlazas ? plazas : 1;
  const precioTotal = Number(opcionSeleccionada?.precio || 0) * plazasNum;

  const handleContinuar = () => {
    if (!opcionSeleccionada) {
      alert("Selecciona una opción válida para regalar.");
      return;
    }

    navigate("/resumen-pago", {
      state: {
        tipo: "tarjeta_regalo",
        desdeCompraTarjeta: true,

        clase: opcionSeleccionada.clase,
        claseId: opcionSeleccionada.claseId,
        subtipo: opcionSeleccionada.subtipo || "",
        tipoPieza: opcionSeleccionada.tipoPieza || "",
        tipoTaller: opcionSeleccionada.tipoTaller || "",
        rutaReserva: opcionSeleccionada.rutaReserva || "",
        requiereMetodo: opcionSeleccionada.requiereMetodo || false,
        requiereTipoPieza: opcionSeleccionada.requiereTipoPieza || false,

        precio: precioTotal,
        precioBase: opcionSeleccionada.precio,
        precioUnitario: opcionSeleccionada.precio,
        precioTotal,
        plazas: plazasNum,
      },
    });
  };

  return (
    <div className="bg-[#fffef4] min-h-screen px-4 py-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <BotonVolver />

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-yellow-900 font-serif mb-2">
            Comprar tarjeta regalo
          </h1>
          <p className="text-sm text-gray-600">
            Elige el taller o experiencia que quieres regalar y para cuántas personas.
          </p>
        </div>

        <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-4 mb-5 text-sm text-[#5c3c00]">
          <p className="mb-2">
            <strong>La tarjeta regalo será válida solo para la opción elegida.</strong>
          </p>
          <p>
            La persona que la reciba podrá canjear el código más adelante y reservar
            su fecha para ese taller concreto. Si la tarjeta es para varias personas,
            todas las plazas se reservan juntas, el mismo día y en el mismo turno.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block font-bold text-sm mb-2">
              Selecciona el taller o regalo
            </label>
            <select
              value={opcionSeleccionadaId}
              onChange={(e) => {
                setOpcionSeleccionadaId(e.target.value);
                setPlazas(1);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
            >
              <option value="">-- Elige una opción --</option>
              {opciones.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </div>

          {opcionSeleccionada && (
            <div>
              <label className="block font-bold text-sm mb-2">
                ¿Para cuántas personas?
              </label>

              {variasPlazas ? (
                <>
                  <div className="flex items-center justify-between border border-gray-300 rounded-xl px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setPlazas(Math.max(1, plazas - 1))}
                      disabled={plazas <= 1}
                      className="text-xl font-bold px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Una plaza menos"
                    >
                      −
                    </button>

                    <span className="text-lg font-semibold">
                      {plazas} {plazas === 1 ? "plaza" : "plazas"}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setPlazas(Math.min(MAX_PLAZAS_TARJETA_REGALO, plazas + 1))
                      }
                      disabled={plazas >= MAX_PLAZAS_TARJETA_REGALO}
                      className="text-xl font-bold px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Una plaza más"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo {MAX_PLAZAS_TARJETA_REGALO} plazas por tarjeta. Para grupos
                    más grandes, usa las reservas para grupos.
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  Los bonos mensuales son personales: la tarjeta es para 1 persona.
                </p>
              )}
            </div>
          )}

          {opcionSeleccionada && (
            <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-4 text-sm text-[#5c3c00]">
              <p>
                <strong>Regalo seleccionado:</strong> {opcionSeleccionada.clase}
              </p>

              {opcionSeleccionada.subtipo && (
                <p className="mt-1">
                  <strong>Opción:</strong> {opcionSeleccionada.subtipo}
                </p>
              )}

              <p className="mt-1">
                <strong>Precio por persona:</strong> {opcionSeleccionada.precio} €
              </p>

              <p className="mt-1">
                <strong>Plazas:</strong> {plazasNum}
              </p>

              <p className="mt-1 text-base">
                <strong>Total:</strong> {precioTotal} €
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleContinuar}
            className="w-full mt-2 px-6 py-3 rounded-full text-white font-semibold
            bg-gradient-to-b from-[#F6D66A] to-[#F4C542]
            shadow-md hover:shadow-lg
            hover:from-[#F4C542] hover:to-[#E5B92F]
            transition-all duration-200"
          >
            Continuar al pago
          </button>
        </div>
      </div>
    </div>
  );
}
