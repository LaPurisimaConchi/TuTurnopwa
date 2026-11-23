import React, { useEffect, useState } from "react";
import BotonReserva from "./BotonReserva";
import PantallaConVolver from "./PantallaConVolver";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";

export default function CreaTuPiezaFavorita() {
  const navigate = useNavigate();

  const imagenes = [
    "/img/creatupiezafavorita/creatupieza1.jpg",
    "/img/creatupiezafavorita/creatupieza2.jpg",
    "/img/creatupiezafavorita/creatupieza3.jpg",
    "/img/creatupiezafavorita/creatupieza4.jpg",
    "/img/creatupiezafavorita/creatupieza5.jpg",
  ];

  const [imagenActiva, setImagenActiva] = useState(imagenes[0]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [datosClase, setDatosClase] = useState(null);

  useEffect(() => {
    const cargarClase = async () => {
      try {
        const snap = await get(ref(dbRealtime, "clases/creatupiezafavorita"));

        if (snap.exists()) {
          setDatosClase(snap.val());
        }
      } catch (error) {
        console.error("Error al cargar datos de Crea tu pieza favorita:", error);
      }
    };

    cargarClase();
  }, []);

  const nombreClase = String(
    datosClase?.nombre || "Crea tu pieza favorita desde cero"
  );

  const precioClase =
    typeof datosClase?.precio === "number"
      ? `${datosClase.precio.toFixed(2).replace(".", ",")} €`
      : datosClase?.precioDesde
      ? `Desde ${datosClase.precioDesde}€`
      : "Desde 55,00 €";

  const descripcionCorta =
    datosClase?.descripcionCorta ||
    "Explora el mundo de la cerámica y da vida a tus creaciones en un ambiente acogedor y sin experiencia previa requerida. En nuestro estudio, te guiaremos paso a paso a través de diferentes técnicas de modelado manual y decoración cerámica para que puedas diseñar tu propia pieza única.";

  const descripcionLarga =
    datosClase?.descripcionLarga ||
    "Después de la verificación de la reserva, únete a nosotros el día elegido y disfruta de crear una pieza propia. Tras las cocciones, podrás llevarte a casa tu creación única y personalizada.";

  const incluyeLista =
    Array.isArray(datosClase?.incluye) && datosClase.incluye.length > 0
      ? datosClase.incluye
      : [
          "Formación guiada para crear tu pieza favorita desde cero.",
          "Posibilidad de elegir modelado a mano o torno alfarero.",
          "Materiales y cocciones incluidos.",
          "Esmaltado de una pieza culinaria o decorativa.",
        ];

  const notaImportanteFirebase =
    datosClase?.notaImportante ||
    "Las tarifas están sujetas a cambios. Si no asistes a tu formación o bono en la fecha original y deseas reprogramar cuando las tarifas hayan cambiado, deberás abonar la diferencia o elegir una formación acorde a la cantidad ya pagada.";

  const estadoClase = datosClase?.estado
    ? datosClase.estado.trim().toLowerCase()
    : datosClase?.activa === false
    ? "oculta"
    : "activa";

  if (estadoClase !== "activa") {
    return (
      <PantallaConVolver>
        <div className="bg-white text-[#333] font-sans max-w-3xl w-full shadow-md rounded-2xl overflow-hidden p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-tinta mb-4">
            Este taller no está disponible ahora mismo
          </h1>

          <p className="text-sm text-tinta leading-relaxed mb-6">
            Esta clase está temporalmente oculta o pausada y no puede reservarse
            en este momento.
          </p>

          <button
            onClick={() => navigate("/clases")}
            className="px-6 py-3 rounded-full bg-terracota text-white font-semibold hover:bg-terracota-oscuro transition"
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
          {/* GALERÍA */}
          <div className="p-4 sm:p-5">
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="w-full rounded-2xl overflow-hidden bg-arena flex items-center justify-center min-h-[260px] sm:min-h-[320px] md:min-h-[420px]"
            >
              <img
                src={imagenActiva}
                alt="Crea tu pieza favorita desde cero"
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
                      ? "border-mostaza"
                      : "border-linea"
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

            <p className="text-xs text-tinta-suave mt-2">
              Toca la imagen para verla en grande
            </p>
          </div>

          {/* CONTENIDO */}
          <div className="p-4 sm:p-6 flex flex-col justify-start min-w-0">
            <div className="flex flex-col gap-3 mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-tinta leading-tight break-words">
                  {nombreClase}
                </h1>
                <p className="text-lg sm:text-xl font-semibold text-tinta leading-snug break-words">
                  {precioClase}
                </p>
              </div>
              <BotonReserva destino="/reserva-crea-tu-pieza-favorita" className="self-start" />
            </div>

            <div className="mb-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">
                Opciones disponibles
              </h2>

              <ul className="text-sm text-tinta space-y-2 leading-relaxed break-words">
                <li>• Cuenco o taza — 55€</li>
                <li>• Frutero / cuenco grande — 65€</li>
                <li>• Jarrón grande — 75€</li>
              </ul>
            </div>

            <div className="mb-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">
                Información del producto
              </h2>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                {descripcionCorta}
              </p>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Lo que incluye:
              </p>

              <ul className="text-sm text-tinta space-y-2 mb-4 leading-relaxed break-words">
                {incluyeLista.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Duración del taller:
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Elige el tiempo y el estilo de pieza. Consulta nuestro horario y
                elige el momento que mejor se ajusta a tus necesidades.
              </p>

              <p className="text-sm text-tinta leading-relaxed break-words">
                {descripcionLarga}
              </p>
            </div>

            <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-5">
              <p className="text-sm text-tinta italic leading-relaxed break-words">
                <strong>Nota importante:</strong> {notaImportanteFirebase}
              </p>
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
              type="button"
              onClick={() => setModalAbierto(false)}
              className="absolute top-2 right-2 bg-white text-black rounded-full w-10 h-10 text-xl font-bold shadow"
            >
              ×
            </button>

            <img
              src={imagenActiva}
              alt="Crea tu pieza favorita ampliada"
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </PantallaConVolver>
  );
}