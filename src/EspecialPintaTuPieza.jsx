import React, { useEffect, useState } from "react";
import BotonReserva from "./BotonReserva";
import PantallaConVolver from "./PantallaConVolver";
import { useNavigate, useLocation } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";

export default function EspecialPintaTuPieza() {
  const navigate = useNavigate();
  const location = useLocation();

  const desdeGrupos = location.state?.desdeGrupos || false;
  const volverA = location.state?.volverA || "/reserva-grupos";

  const imagenes = [
    "/img/especialpinta/pintatupiezaespecial1.jpg",
    "/img/especialpinta/pintatupiezaespecial2.jpg",
    "/img/especialpinta/pintatupiezaespecial3.jpg",
    "/img/especialpinta/pintatupiezaespecial4.jpg",
  ];

  const [imagenActiva, setImagenActiva] = useState(imagenes[0]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [datosClase, setDatosClase] = useState(null);

  useEffect(() => {
    const cargarClase = async () => {
      try {
        const snap = await get(ref(dbRealtime, "clases/especialpintatupieza"));

        if (snap.exists()) {
          setDatosClase(snap.val());
        }
      } catch (error) {
        console.error("Error al cargar datos de Especial pinta tu pieza:", error);
      }
    };

    cargarClase();
  }, []);

  const nombreClase = String(
    datosClase?.nombre || "Especial pinta tu pieza de cerámica"
  );

  const precioClase =
    typeof datosClase?.precio === "number"
      ? `${datosClase.precio.toFixed(2).replace(".", ",")} €`
      : "35,00 €";

  const descripcionCorta =
    datosClase?.descripcionCorta ||
    "En nuestro taller de cerámica encontrarás una amplia variedad de piezas, colores y herramientas de la mejor calidad para pintar tu bizcocho.";

  const descripcionLarga =
    datosClase?.descripcionLarga ||
    "No necesitas experiencia; nuestro equipo te guiará a través de todo el proceso.";

  const notaImportanteFirebase =
    datosClase?.notaImportante ||
    "Las tarifas están sujetas a cambios. Si no asististe a tu curso o bono en la fecha original y deseas reprogramarlo cuando las tarifas hayan cambiado, deberás abonar la diferencia o elegir un taller acorde a la cantidad ya pagada.";

  const estadoClase = datosClase?.estado
    ? datosClase.estado
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
                alt="Especial pinta tu pieza de cerámica"
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

          {/* TEXTO */}
          <div className="p-4 sm:p-6 flex flex-col justify-start min-w-0">
            <div className="flex flex-col gap-3 mb-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-tinta mb-0 leading-tight break-words">
                  {nombreClase}
                </h1>
                <p className="text-lg sm:text-xl font-semibold text-tinta leading-relaxed break-words">
                  {precioClase}
                </p>
              </div>
              {!desdeGrupos && (
                <BotonReserva destino="/reserva-especial-pinta-tu-pieza" className="self-start" />
              )}
            </div>

            {desdeGrupos && (
              <div className="bg-mostaza-suave border border-linea rounded-xl p-4 mb-5">
                <p className="text-sm text-tinta-suave leading-relaxed break-words">
                  Estás viendo esta clase en modo informativo para una reserva
                  de grupo. Si os interesa este taller, vuelve a la pantalla de
                  grupos para seleccionarlo y continuar con la reserva.
                </p>
              </div>
            )}

            <div className="mb-5 min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">
                Información del producto
              </h2>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  <strong>Antes de reservar tu plaza:</strong> por favor revisa
                  nuestra Política de Reservas. Al proceder con la reserva,
                  confirmas que has leído y aceptado los términos.
                </p>
              </div>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                {descripcionCorta}
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                {descripcionLarga}
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
               Trabaja el color y la decoración en un entorno creativo en el  taller con acompañamiento guiado.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Reserva tu sesión y dispondrás de hasta <strong>dos horas y media</strong> para desarrollar tu pieza.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                No se requiere experiencia previa; solo interés por la pintura cerámica.
              </p>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  El precio base para pintar una pieza blanca de cerámica en
                  nuestro taller es de 25€. Puedes elegir entre una amplia
                  variedad de piezas: tazas, jarras, cuencos, platos y
                  bandejas, de distintos tamaños y formas. Si prefieres
                  combinar dos pequeñas o cambiar a una de mayor valor, solo
                  tendrás que abonar la diferencia.
                </p>
              </div>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Podrás elegir la pieza que prefieras y trabajar su decoración durante la sesión.
              </p>

              <p className="text-sm text-tinta leading-relaxed break-words">
                ¡Te esperamos!
              </p>
            </div>

            <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-5">
              <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
                <strong>Nota importante:</strong> {notaImportanteFirebase}
              </p>

              <p className="text-sm text-tinta italic leading-relaxed break-words">
                Antes de reservar, por favor revisa nuestra Política de
                Reservas. Al proceder con la reserva, confirmas que has leído y
                aceptado los términos.
              </p>
            </div>

            <div className="mt-auto">
              {desdeGrupos ? (
                <button
                  onClick={() => navigate(volverA)}
                  className="w-full px-6 py-3 rounded-full bg-terracota text-white font-semibold hover:bg-terracota-oscuro transition"
                >
                  Volver a reservas de grupo
                </button>
              ) : (
                <div></div>
              )}
            </div>
          </div>
        </div>
      </div>

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
              alt="Especial pinta tu pieza ampliada"
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </PantallaConVolver>
  );
}