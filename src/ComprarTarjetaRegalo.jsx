import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BotonVolver from "./BotonVolver";
import { OPCIONES_TARJETA_REGALO } from "./opcionesTarjetaRegalo";
import {
  cargarGaleria,
  cargarMiniatura,
  imagenPorDefecto,
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

  // Imagen principal del taller de origen: galería, miniatura o la de por defecto
  const [imagenTaller, setImagenTaller] = useState("");

  useEffect(() => {
    if (!tallerPreseleccionado) return;
    let activo = true;
    const cargar = async () => {
      const galeria = await cargarGaleria(tallerPreseleccionado).catch(() => []);
      let src = galeria.find((img) => img.src)?.src || "";
      if (!src) {
        const mini = await cargarMiniatura(tallerPreseleccionado).catch(() => null);
        src = (typeof mini === "string" ? mini : mini?.src) || "";
      }
      if (activo) setImagenTaller(src || imagenPorDefecto(tallerPreseleccionado));
    };
    cargar();
    return () => {
      activo = false;
    };
  }, [tallerPreseleccionado]);

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
    // Esperar a que carguen los talleres: antes solo están las opciones estáticas,
    // y el id que se fijara ahí desaparece al llegar las dinámicas
    if (!tallerPreseleccionado || opcionSeleccionadaId || !talleres) return;
    const opcion = opciones.find((op) => op.claseId === tallerPreseleccionado);
    if (opcion) setOpcionSeleccionadaId(opcion.id);
  }, [tallerPreseleccionado, opciones, opcionSeleccionadaId, talleres]);

  // Opciones del taller de origen (varias si tiene tamaños o métodos con precio propio)
  const opcionesDelTaller = useMemo(
    () =>
      tallerPreseleccionado
        ? opciones.filter((op) => op.claseId === tallerPreseleccionado)
        : [],
    [opciones, tallerPreseleccionado]
  );
  // Mientras cargan los talleres no se sabe aún si viene de uno válido
  const cargandoOrigen = !!tallerPreseleccionado && !talleres;
  const modoTaller = opcionesDelTaller.length > 0;

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
    <div className="bg-crema min-h-screen px-4 py-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md p-6">
        <BotonVolver />

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-tinta font-serif mb-2">
            Comprar tarjeta regalo
          </h1>
        </div>

        <div className="bg-crema border border-linea rounded-xl p-4 mb-5 text-sm text-tinta">
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
          {modoTaller ? (
            <div className="rounded-2xl overflow-hidden border border-linea bg-crema">
              {imagenTaller && (
                <img
                  src={imagenTaller}
                  alt={opcionesDelTaller[0].clase}
                  className="w-full h-56 sm:h-72 object-cover"
                />
              )}
              <div className="p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-tinta-suave mb-1">
                  Regalas
                </p>
                <h2 className="text-2xl font-bold font-serif text-tinta">
                  {opcionesDelTaller[0].clase}
                </h2>

                {opcionesDelTaller.length > 1 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {opcionesDelTaller.map((op) => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setOpcionSeleccionadaId(op.id)}
                        className={`px-4 py-2 rounded-full border text-sm font-semibold transition ${
                          op.id === opcionSeleccionadaId
                            ? "bg-terracota text-white border-terracota"
                            : "border-terracota text-terracota hover:bg-terracota-suave"
                        }`}
                      >
                        {op.subtipo || op.label} — {op.precio} €
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : cargandoOrigen ? (
            <p className="text-center text-sm text-tinta-suave">Cargando…</p>
          ) : (
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
          )}

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
                      className="text-xl font-bold px-3 py-1 rounded-lg bg-arena disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="text-xl font-bold px-3 py-1 rounded-lg bg-arena disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Una plaza más"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-xs text-tinta-suave mt-1">
                    Máximo {MAX_PLAZAS_TARJETA_REGALO} plazas por tarjeta. Para grupos
                    más grandes, usa las reservas para grupos.
                  </p>
                </>
              ) : (
                <p className="text-sm text-tinta-suave">
                  Los bonos mensuales son personales: la tarjeta es para 1 persona.
                </p>
              )}
            </div>
          )}

          {opcionSeleccionada && (
            <div className="bg-crema border border-linea rounded-xl p-4 text-sm text-tinta">
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
            bg-terracota
            shadow-md hover:shadow-lg
            hover:bg-terracota-oscuro
            transition-all duration-200"
          >
            Continuar al pago
          </button>
        </div>
      </div>
    </div>
  );
}
