import React, { useEffect, useState } from "react";
import BotonReserva from "./BotonReserva";
import PantallaConVolver from "./PantallaConVolver";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";

export default function CreaTuGranCentroMesa() {
  const navigate = useNavigate();

  const imagenes = [
    "/img/centrodemesa/grancentromesa1.jpg",
    "/img/centrodemesa/grancentromesa2.jpg",
    "/img/centrodemesa/grancentromesa3.jpg",
    "/img/centrodemesa/grancentromesa4.jpg",
    "/img/centrodemesa/grancentromesa5.jpg",
    "/img/centrodemesa/grancentromesa6.jpg",
  ];

  const [imagenActiva, setImagenActiva] = useState(imagenes[0]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [datosClase, setDatosClase] = useState(null);

  useEffect(() => {
    const cargarClase = async () => {
      try {
        const snap = await get(ref(dbRealtime, "clases/creatugrancentrodemesa"));

        if (snap.exists()) {
          setDatosClase(snap.val());
        }
      } catch (error) {
        console.error("Error al cargar datos de Crea tu gran centro de mesa:", error);
      }
    };

    cargarClase();
  }, []);

  const nombreClase = String(
    datosClase?.nombre || "Crea tu gran centro mesa"
  );

  const precioClase =
    typeof datosClase?.precio === "number"
      ? `${datosClase.precio.toFixed(2).replace(".", ",")} €`
      : datosClase?.precioDesde
      ? `${datosClase.precioDesde}€`
      : "65,00 €";

  const descripcionCorta =
    datosClase?.descripcionCorta ||
    "Sumérgete en una formación intensiva donde aprenderás a modelar, dar forma y decorar un frutero o ensaladera de gran tamaño, combinando técnica, observación y paciencia.";

  const descripcionLarga =
    datosClase?.descripcionLarga ||
    "Durante la clase podrás elegir el método de trabajo: modelado a mano, ideal si buscas una forma más orgánica y expresiva, o torno alfarero, si deseas precisión y simetría en una pieza amplia y estable.";

  const incluyeLista =
    Array.isArray(datosClase?.incluye) && datosClase.incluye.length > 0
      ? datosClase.incluye
      : [
          "Todos los materiales y herramientas necesarios.",
          "Cocciones completas en horno cerámico.",
          "Esmaltado de una pieza incluida (tu frutero o ensaladera).",
          "Formación guiada y acompañamiento técnico durante toda la sesión.",
        ];

  const notaImportanteFirebase =
    datosClase?.notaImportante ||
    "Las tarifas están sujetas a cambios. Si no asistes a tu formación o bono en la fecha original y deseas reprogramarlo cuando las tarifas hayan cambiado, deberás abonar la diferencia o elegir una formación acorde a la cantidad ya pagada.";

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
          <div className="p-4 sm:p-5">
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="w-full rounded-2xl overflow-hidden bg-arena flex items-center justify-center min-h-[260px] sm:min-h-[320px] md:min-h-[420px]"
            >
              <img
                src={imagenActiva}
                alt="Crea tu gran centro de mesa"
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

          <div className="p-4 sm:p-6 flex flex-col justify-start min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-tinta mb-2 leading-tight break-words">
              {nombreClase}
            </h1>

            <p className="text-lg sm:text-xl font-semibold text-tinta mb-4 leading-snug break-words">
              {precioClase}
            </p>

            <BotonReserva destino="/reserva-crea-tu-gran-centro-mesa" className="shrink-0" />

            <div className="mb-5 min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">
                Información del producto
              </h2>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
                  En esta formación trabajaremos piezas de gran tamaño
                  (alrededor de 50 cm de diámetro). Estas formas requieren mayor
                  control durante el modelado y un secado muy cuidadoso, ya que
                  las tensiones propias del barro pueden provocar deformaciones o
                  fisuras durante la cocción.
                </p>
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Este tipo de trabajo forma parte del aprendizaje avanzado de
                  cerámica y te permitirá comprender los límites y
                  comportamientos del material a gran escala.
                </p>
              </div>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                {descripcionCorta}
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                {descripcionLarga}
              </p>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Qué aprenderás:
              </p>

              <ul className="text-sm text-tinta space-y-2 mb-4 leading-relaxed break-words">
                <li>
                  • Cómo levantar y controlar volúmenes grandes de barro sin
                  perder proporción ni estabilidad.
                </li>
                <li>
                  • Técnicas para reforzar la base y los bordes, manteniendo la
                  forma durante el secado.
                </li>
                <li>
                  • Aplicar decoraciones sencillas (trazos de brocha, líneas,
                  esponja o texturas suaves) que respeten el equilibrio visual
                  de una pieza de gran formato.
                </li>
                <li>
                  • Entender los factores que afectan al secado y la cocción en
                  piezas amplias y pesadas.
                </li>
              </ul>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Durante la cocción pueden producirse pequeñas variaciones,
                  deformaciones o movimientos naturales de la arcilla. Son
                  comportamientos propios del material a estas temperaturas y
                  forman parte del proceso cerámico.
                </p>
              </div>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Qué incluye:
              </p>

              <ul className="text-sm text-tinta space-y-2 mb-4 leading-relaxed break-words">
                {incluyeLista.map((item, index) => (
                  <li key={index}>• {item}</li>
                ))}
              </ul>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Duración:
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Formación de una única sesión de aproximadamente 3 horas, donde
                aprenderás a trabajar con volumen, peso y forma de manera
                controlada.
              </p>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Debido al tamaño de la pieza, se recomienda una decoración
                  simple para centrar el tiempo en el modelado y la estructura.
                  Si finalizas antes, podrás realizar una segunda pieza más
                  pequeña dentro del tiempo disponible.
                </p>
              </div>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Entrega de tu pieza:
              </p>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                Tu pieza no se entrega el mismo día. El proceso de secado y
                cocción requiere atención y un ritmo lento para evitar tensiones
                internas.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                El plazo estimado de entrega oscila entre <strong>3 semanas y 2
                meses</strong>, según el tamaño y las condiciones climáticas.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Cuando tus piezas estén listas, se subirán fotos a la carpeta correspondiente para que puedas identificarlas.
                <br />
                <br />
                Para saber si tu pieza ya está disponible y cómo recogerla, entra en “Quiero recoger mi pieza” dentro de tu perfil.
                Ahí encontrarás siempre la información actualizada.
              </p>

              <p className="text-sm text-tinta leading-relaxed break-words">
                Esta formación te permitirá comprender los desafíos y
                satisfacciones del trabajo cerámico a gran escala, explorando el
                equilibrio entre técnica y expresión personal.
              </p>
            </div>

            <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-5">
              <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
                <strong>Nota importante:</strong> {notaImportanteFirebase}
              </p>

              <p className="text-sm text-tinta italic leading-relaxed break-words">
                <strong>Antes de reservar:</strong> por favor revisa nuestra
                Política de Reservas. Al proceder con la reserva, confirmas que
                has leído y aceptado los términos.
              </p>
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
              alt="Crea tu gran centro de mesa ampliada"
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </PantallaConVolver>
  );
}