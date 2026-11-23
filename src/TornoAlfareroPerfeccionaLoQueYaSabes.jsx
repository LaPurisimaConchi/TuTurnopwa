import React, { useEffect, useState } from "react";
import BotonReserva from "./BotonReserva";
import PantallaConVolver from "./PantallaConVolver";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";

export default function TornoAlfareroPerfeccionaLoQueYaSabes() {
  const navigate = useNavigate();

  const imagenes = [
    "/img/tornoperfecciona/torno-perfecciona1.jpg",
    "/img/tornoperfecciona/torno-perfecciona2.jpg",
    "/img/tornoperfecciona/torno-perfecciona3.jpg",
    "/img/tornoperfecciona/torno-perfecciona4.jpg",
    "/img/tornoperfecciona/torno-perfecciona5.jpg",
  ];

  const [imagenActiva, setImagenActiva] = useState(imagenes[0]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [datosClase, setDatosClase] = useState(null);

  useEffect(() => {
    const cargarClase = async () => {
      try {
        const snap = await get(
          ref(dbRealtime, "clases/tornoperfeccionamiento6clases")
        );

        if (snap.exists()) {
          setDatosClase(snap.val());
        }
      } catch (error) {
        console.error(
          "Error al cargar datos de Torno alfarero perfecciona lo que ya sabes:",
          error
        );
      }
    };

    cargarClase();
  }, []);

  const nombreClase =
    datosClase?.nombre ||
    "Torno alfarero. Empezar bien desde cero o perfecciona lo que ya sabes";

  const precioClase =
    typeof datosClase?.precio === "number"
      ? `${datosClase.precio.toFixed(2).replace(".", ",")} €`
      : datosClase?.precioDesde
      ? `${datosClase.precioDesde}€`
      : "145,00 €";

  const descripcionCorta =
    datosClase?.descripcionCorta ||
    "Un curso pensado para quienes quieren aprender torno desde cero o para quienes ya lo han probado, pero sienten que algo no acaba de salir bien.";

  const descripcionLarga =
    datosClase?.descripcionLarga ||
    "Durante 6 clases prácticas aprenderás a dominar las bases reales del torno, corrigiendo errores habituales y entendiendo por fin qué hace que una pieza salga equilibrada, centrada y firme.";

  const incluyeLista =
    Array.isArray(datosClase?.incluye) && datosClase.incluye.length > 0
      ? datosClase.incluye
      : [
          "6 clases de 3 horas cada una.",
          "Todos los materiales, herramientas y cocciones.",
          "Formación práctica personalizada en cada paso.",
          "Cocción de todas tus piezas realizadas durante el curso.",
        ];

  const notaImportanteFirebase =
    datosClase?.notaImportante ||
    "Las tarifas están sujetas a cambios. Si no asististe a tu curso o bono en la fecha original y deseas reprogramarlo cuando las tarifas hayan cambiado, deberás abonar la diferencia o elegir una formación acorde a la cantidad ya pagada.";

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
                alt="Torno alfarero perfecciona lo que ya sabes"
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
                    imagenActiva === img ? "border-mostaza" : "border-linea"
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

            <p className="text-base text-tinta font-medium mb-1 leading-relaxed break-words">
              6 clases de 3 horas
            </p>

            <p className="text-lg sm:text-xl font-semibold text-tinta mb-4 leading-relaxed break-words">
              {precioClase}
            </p>

            <BotonReserva destino="/reserva-torno-alfarero-perfecciona-lo-que-ya-sabes" className="shrink-0" />

            <div className="mb-5 min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">
                Información del producto
              </h2>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                {descripcionCorta}
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                {descripcionLarga}
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Aquí no se trata de decorar, sino de aprender a tornear de
                verdad: desde el centrado hasta el retorneado, con piezas que
                luego se cuecen y podrás recoger totalmente terminadas
                <strong> (sin color)</strong>.
              </p>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Ideal si quieres construir una base sólida o pulir la técnica
                  que creías dominar.
                </p>
              </div>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Qué aprenderás
              </p>

              <p className="text-sm text-tinta mb-2 leading-relaxed break-words">
                Durante las 6 sesiones (3 horas cada una):
              </p>

              <ul className="text-sm text-tinta space-y-2 mb-4 leading-relaxed break-words">
                <li>• Preparar correctamente el barro antes de tornear.</li>
                <li>• Entender cómo controlar la presión, el agua y la velocidad.</li>
                <li>• Centrar, abrir y levantar paredes con equilibrio y precisión.</li>
                <li>• Detectar y corregir errores comunes.</li>
                <li>• Descentrado o tambaleo del barro.</li>
                <li>• Paredes torcidas o demasiado finas.</li>
                <li>• Falta de control de forma o altura.</li>
                <li>• Retornear (afinar bases y bordes) para dar acabado profesional.</li>
                <li>• Crear piezas progresivas: desde cuencos y tazas pequeñas hasta piezas más grandes y estables.</li>
                <li>• Conocer las fases de secado y cocción en horno cerámico.</li>
              </ul>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Empezarás con lo esencial, y terminarás comprendiendo cómo
                  “leer” el barro y responder a sus movimientos.
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

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  <strong>Este curso no incluye decoración ni color.</strong> Si
                  más adelante deseas darles acabado o esmalte, podrás hacerlo
                  contratando un bono mensual o clases sueltas de continuidad.
                </p>
              </div>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Horario y duración:
              </p>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                Formación de 6 sesiones de 3 horas cada una, con horarios flexibles.
              </p>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                Las clases de torno se imparten principalmente los viernes por la
                tarde, aunque podemos adaptar tu horario según la disponibilidad
                del estudio.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Cada nivel se completa en un ciclo de 6 clases consecutivas.
              </p>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Tras completar este nivel, podrás continuar perfeccionando tu
                  técnica o avanzar hacia decoraciones y esmaltados.
                </p>
              </div>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Entrega de tus piezas:
              </p>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                Tus piezas se cocerán en el estudio una vez finalizadas y
                estarán listas para recoger tras el proceso de cocción.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                El plazo estimado de entrega oscila aproximadamente entre
                <strong> 2 y 4 semanas</strong>, según el secado y la carga del horno.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Cuando tus piezas estén listas, se subirán fotos a la carpeta correspondiente para que puedas identificarlas.
                <br />
                <br />
                Para saber si tu pieza ya está disponible y cómo recogerla, entra en “Quiero recoger mi pieza” dentro de tu perfil.
                Ahí encontrarás siempre la información actualizada.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Este curso te permitirá entender de verdad el torno y conseguir
                resultados firmes y equilibrados, tanto si es tu primera vez
                como si ya lo has intentado antes sin lograr estabilidad o control.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Aprenderás a trabajar con calma, técnica y seguridad,
                disfrutando del proceso tanto como del resultado.
              </p>

              <p className="text-sm text-tinta leading-relaxed break-words">
                ¡Te esperamos en el estudio para empezar desde cero (o volver a empezar mejor)!
              </p>
            </div>

            <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-5">
              <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
                <strong>Nota importante:</strong> {notaImportanteFirebase}
              </p>

              <p className="text-sm text-tinta italic leading-relaxed break-words">
                <strong>Antes de reservar:</strong> por favor revisa nuestra
                Política de Reserva. Al proceder con la reserva, confirmas que
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
              alt="Torno alfarero perfecciona lo que ya sabes ampliada"
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </PantallaConVolver>
  );
}