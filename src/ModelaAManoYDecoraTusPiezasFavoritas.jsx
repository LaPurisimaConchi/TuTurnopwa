import React, { useEffect, useState } from "react";
import Icono from "./components/Icono";
import BotonReserva from "./BotonReserva";
import PantallaConVolver from "./PantallaConVolver";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";

export default function ModelaAManoYDecoraTusPiezasFavoritas() {
  const navigate = useNavigate();

  const imagenes = [
    "/img/modelamano/modelamano1.jpg",
    "/img/modelamano/modelamano2.jpg",
    "/img/modelamano/modelamano3.jpg",
    "/img/modelamano/modelamano4.jpg",
    "/img/modelamano/modelamano5.jpg",
  ];

  const [imagenActiva, setImagenActiva] = useState(imagenes[0]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [convertirTorno, setConvertirTorno] = useState(false);
  const [datosClase, setDatosClase] = useState(null);

  useEffect(() => {
    const cargarClase = async () => {
      try {
        const snap = await get(ref(dbRealtime, "clases/modelamano4clases"));

        if (snap.exists()) {
          setDatosClase(snap.val());
        }
      } catch (error) {
        console.error(
          "Error al cargar datos de Modela a mano y decora tus piezas favoritas:",
          error
        );
      }
    };

    cargarClase();
  }, []);

  const nombreClase =
    datosClase?.nombre || "Modela a mano y decora tus piezas favoritas";

  const precioBase =
    typeof datosClase?.precio === "number"
      ? Number(datosClase.precio)
      : typeof datosClase?.precioDesde === "number"
      ? Number(datosClase.precioDesde)
      : 79;

  const extraTorno =
    typeof datosClase?.precios?.torno === "number"
      ? Math.max(0, Number(datosClase.precios.torno) - precioBase)
      : 10;

  const precioFinal = convertirTorno ? precioBase + extraTorno : precioBase;

  const descripcionCorta =
    datosClase?.descripcionCorta ||
    "Descubre el proceso completo de la cerámica sin torno con este bono formativo de modelado manual y decoración, donde aprenderás a dar forma, textura y color a tus propias piezas desde cero.";

  const descripcionLarga =
    datosClase?.descripcionLarga ||
    "En esta formación trabajarás exclusivamente con modelado a mano, explorando distintas técnicas tradicionales para crear piezas únicas: tazas, cuencos, bandejas, jarrones o elementos decorativos. Después pasarás a la fase de decoración con engobes y esmaltes, experimentando con color, textura y diferentes acabados para personalizar tus creaciones.";

  const notaImportanteFirebase =
    datosClase?.notaImportante ||
    "Los bonos son válidos por 3 meses desde la fecha de compra. Si las tarifas cambian, deberás abonar la diferencia o elegir otro equivalente más alto.";

  const estadoClase = datosClase?.estado
    ? datosClase.estado.trim().toLowerCase()
    : datosClase?.activa === false
    ? "oculta"
    : "activa";

  if (estadoClase !== "activa") {
    return (
      <PantallaConVolver>
        <div className="bg-white text-[#333] font-sans max-w-3xl w-full shadow-md rounded-2xl overflow-hidden p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#3b3025] mb-4">
            Este taller no está disponible ahora mismo
          </h1>

          <p className="text-sm text-gray-700 leading-relaxed mb-6">
            Esta clase está temporalmente oculta o pausada y no puede reservarse
            en este momento.
          </p>

          <button
            onClick={() => navigate("/clases")}
            className="px-6 py-3 rounded-full bg-[#f4c542] text-[#5c3c00] font-semibold hover:bg-[#e8b932] transition"
          >
            Volver a talleres
          </button>
        </div>
      </PantallaConVolver>
    );
  }

  return (
    <PantallaConVolver>
      <div className="bg-white text-[#333] font-sans max-w-5xl w-full shadow-md rounded-2xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* IMÁGENES */}
          <div className="p-4 sm:p-5">
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="w-full rounded-2xl overflow-hidden bg-[#f8f8f8] flex items-center justify-center min-h-[260px] sm:min-h-[320px] md:min-h-[420px]"
            >
              <img
                src={imagenActiva}
                alt="Modela a mano y decora tus piezas favoritas"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </button>

            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {imagenes.map((img, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setImagenActiva(img)}
                  className={`shrink-0 rounded-xl overflow-hidden border-2 w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] ${
                    imagenActiva === img
                      ? "border-[#F4C542]"
                      : "border-[#f1e7c6]"
                  }`}
                >
                  <img
                    src={img}
                    alt={`Miniatura ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Toca la imagen para verla en grande
            </p>
          </div>

          {/* TEXTO */}
          <div className="p-4 sm:p-6 flex flex-col justify-start min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-[#3b3025] mb-2 leading-tight break-words">
              {nombreClase}
            </h1>

            <p className="text-base text-[#6b3700] font-medium mb-1 leading-relaxed break-words">
              4 clases de 3 horas al mes
            </p>

            <p className="text-lg sm:text-xl font-semibold text-[#6b3700] mb-4 leading-relaxed break-words">
              {precioFinal.toFixed(2).replace(".", ",")} €
            </p>

            {/* OPCIÓN TORNO */}
            <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-4 mb-5">
              <p className="text-sm font-semibold text-[#5c3c00] mb-2">
                Si quieres, convierte una de tus clases de modelado en una de torno alfarero
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setConvertirTorno(true)}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm ${
                    convertirTorno
                      ? "border-[#F4C542] bg-[#fff7da]"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  SÍ QUIERO <Icono nombre="taller" /> (+{extraTorno.toFixed(2).replace(".", ",")} €)
                </button>

                <button
                  type="button"
                  onClick={() => setConvertirTorno(false)}
                  className={`w-full text-left rounded-xl border px-4 py-3 text-sm ${
                    !convertirTorno
                      ? "border-[#F4C542] bg-[#fff7da]"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  En otra ocasión
                </button>
              </div>
            </div>

            {/* INFO */}
            <div className="mb-5 min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2">
                Información del producto
              </h2>

              <p className="text-sm text-gray-700 mb-3 leading-relaxed break-words">
                {descripcionCorta}
              </p>

              <p className="text-sm text-gray-700 mb-4 leading-relaxed break-words">
                {descripcionLarga}
              </p>
            </div>

            {/* POLÍTICA */}
            <div className="bg-[#fffaf0] border-l-4 border-[#F4C542] rounded-xl p-4 mb-5">
              <p className="text-sm text-gray-700 italic mb-2 leading-relaxed break-words">
                <strong>Política de venta:</strong> {notaImportanteFirebase}
              </p>

              <p className="text-sm text-gray-700 italic leading-relaxed break-words">
                <strong>Antes de reservar:</strong> por favor revisa nuestra
                Política de Reservas. Al proceder con la reserva, confirmas que
                has leído y aceptado los términos.
              </p>
            </div>

            <div className="mt-auto">
              <BotonReserva
                destino="/reserva-modela-a-mano-y-decora-tus-piezas-favoritas"
                state={{
                  convertirTorno,
                  precioFinal,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MODAL IMAGEN */}
      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="relative w-full max-w-4xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalAbierto(false)}
              className="absolute top-2 right-2 bg-white text-black rounded-full w-10 h-10 text-xl font-bold shadow"
            >
              ×
            </button>

            <img
              src={imagenActiva}
              alt="Imagen ampliada"
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </PantallaConVolver>
  );
}