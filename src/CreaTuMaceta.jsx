import React, { useEffect, useState } from "react";
import BotonReserva from "./BotonReserva";
import PantallaConVolver from "./PantallaConVolver";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";

export default function CreaTuMaceta() {
  const navigate = useNavigate();

  const imagenes = [
    "/img/maceta/maceta1.jpg",
    "/img/maceta/maceta2.jpg",
    "/img/maceta/maceta3.jpg",
    "/img/maceta/maceta4.jpg",
    "/img/maceta/maceta5.jpg",
    "/img/maceta/maceta6.jpg",
  ];

  const [imagenActiva, setImagenActiva] = useState(imagenes[0]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [datosClase, setDatosClase] = useState(null);

  useEffect(() => {
    const cargarClase = async () => {
      try {
        const snap = await get(ref(dbRealtime, "clases/creatumaceta"));

        if (snap.exists()) {
          setDatosClase(snap.val());
        }
      } catch (error) {
        console.error("Error al cargar datos de Crea tu maceta:", error);
      }
    };

    cargarClase();
  }, []);

  const nombreClase = String(
    datosClase?.nombre || "Crea tu maceta"
  );

  const precioClase =
    typeof datosClase?.precio === "number"
      ? `${datosClase.precio.toFixed(2).replace(".", ",")} €`
      : datosClase?.precioDesde
      ? `Desde ${datosClase.precioDesde}€`
      : "Desde 55,00 €";

  const descripcionCorta =
    datosClase?.descripcionCorta ||
    "Aprende a crear tu propia maceta artesanal en una formación práctica de una sola sesión, donde podrás diseñar una pieza funcional y decorativa adaptada a tu estilo.";

  const descripcionLarga =
    datosClase?.descripcionLarga ||
    "Podrás elegir la técnica de trabajo que prefieras: modelado a mano, ideal para formas más orgánicas, texturadas o con carácter, o torno alfarero, si buscas una maceta más simétrica y precisa.";

  const incluyeLista =
    Array.isArray(datosClase?.incluye) && datosClase.incluye.length > 0
      ? datosClase.incluye
      : [
          "Todos los materiales y herramientas necesarios.",
          "Cocciones completas en horno cerámico.",
          "Esmaltado de una pieza incluida (tu maceta).",
          "Formación guiada y acompañamiento personalizado durante toda la sesión.",
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
                alt="Crea tu maceta"
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

            <BotonReserva destino="/reserva-crea-tu-maceta" className="shrink-0" />

            <div className="mb-5 min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">
                Tamaños disponibles
              </h2>
              <ul className="text-sm text-tinta space-y-2 leading-relaxed break-words">
                <li>• Estándar hasta 12 cm — 55€</li>
                <li>• Mediano hasta 20 cm — 65€</li>
                <li>• Grande hasta 30 cm — 75€</li>
              </ul>
            </div>

            <div className="mb-5 min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">
                Información del producto
              </h2>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
                  En esta formación podrás realizar macetas de diferentes tamaños,
                  adaptando el diseño a tu gusto y nivel de experiencia.
                </p>
                <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
                  Al realizar la reserva, deberás elegir la opción de precio
                  acorde al tamaño de maceta que desees realizar, siendo el
                  tamaño máximo alrededor de 30 cm de altura.
                </p>
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Estas medidas son orientativas y se ajustarán de manera
                  equilibrada durante el modelado, para mantener la estabilidad
                  y el comportamiento adecuado del barro en el secado y la
                  cocción.
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
                  • Modelar la estructura de una maceta equilibrada y resistente,
                  adaptando el grosor y la proporción al tamaño elegido.
                </li>
                <li>
                  • Crear bordes y base estables, con opción de plato incorporado
                  o agujero de drenaje.
                </li>
                <li>• Añadir texturas, relieves o decoraciones simples.</li>
                <li>
                  • Aplicar una decoración ligera y natural, como sellos, líneas,
                  puntos o formas geométricas.
                </li>
                <li>
                  • Comprender los tiempos de secado y cocción según el tamaño y
                  el tipo de pieza.
                </li>
              </ul>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Las piezas más grandes requieren un secado más lento y
                  controlado. Durante la cocción pueden producirse pequeñas
                  variaciones naturales, propias del proceso cerámico.
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
                podrás trabajar tu maceta paso a paso con asistencia constante.
              </p>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Si dentro del tiempo disponible finalizas antes tu pieza
                  principal, podrás realizar una segunda más pequeña sin coste
                  adicional, siempre dentro del tiempo asignado.
                </p>
              </div>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Entrega de tu pieza:
              </p>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                Tu maceta no se entrega el mismo día. El proceso de secado y
                cocción requiere tiempo y cuidado, y puede variar según el clima
                y el tamaño de la pieza.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                El plazo estimado de entrega oscila entre <strong>2 semanas y 1
                mes y medio</strong>.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Cuando tus piezas estén listas, se subirán fotos a la carpeta correspondiente para que puedas identificarlas.
                <br />
                <br />
                Para saber si tu pieza ya está disponible y cómo recogerla, entra en “Quiero recoger mi pieza” dentro de tu perfil.
                Ahí encontrarás siempre la información actualizada.
              </p>

              <p className="text-sm text-tinta leading-relaxed break-words">
                Esta formación te permitirá aprender las bases del modelado
                cerámico a través de una pieza funcional, explorando proporción,
                textura y diseño para crear una maceta única hecha completamente
                por ti.
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
              alt="Crea tu maceta ampliada"
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </PantallaConVolver>
  );
}