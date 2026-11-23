import React, { useEffect, useState } from "react";
import BotonReserva from "./BotonReserva";
import PantallaConVolver from "./PantallaConVolver";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";

export default function ClaseSueltaContinuidad() {
  const imagenes = [
    "/img/clasesuelta/recorte.JPG",
    "/img/clasesuelta/clase-suelta2.JPG",
    "/img/clasesuelta/clase-suelta3.JPG",
    "/img/clasesuelta/clase-suelta4.JPG",
    "/img/clasesuelta/clase-suelta5.JPG",
  ];

  const [imagenActiva, setImagenActiva] = useState(imagenes[0]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [datosClase, setDatosClase] = useState(null);

  useEffect(() => {
    const cargarClase = async () => {
      try {
        const snap = await get(ref(dbRealtime, "clases/clasesueltacontinuidad"));

        if (snap.exists()) {
          setDatosClase(snap.val());
        }
      } catch (error) {
        console.error("Error al cargar datos de la clase suelta:", error);
      }
    };

    cargarClase();
  }, []);

  const descripcionCorta =
    datosClase?.descripcionCorta ||
    "La clase suelta con continuidad es una opción flexible para quienes quieren seguir aprendiendo cerámica y avanzar en sus piezas sin necesidad de contratar un bono mensual desde el principio.";

  const descripcionLarga =
    datosClase?.descripcionLarga ||
    "Puedes venir de forma puntual y comprar cada sesión por separado, continuando tu proyecto poco a poco en el taller. Es ideal tanto para personas que ya han tenido contacto con la cerámica como para quienes quieren empezar con más libertad y sin compromiso fijo.";

  const incluyeLista =
    Array.isArray(datosClase?.incluye) && datosClase.incluye.length > 0
      ? datosClase.incluye
      : [
          "Arcilla y materiales necesarios para la sesión.",
          "Uso de herramientas y espacio de trabajo del taller.",
          "Esmaltes y decoración, cuando formen parte del proceso.",
          "Cocción en horno cerámico.",
          "Acompañamiento guiado durante toda la clase.",
        ];

  const notaImportanteFirebase = datosClase?.notaImportante || "";

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
                alt="Clase suelta con continuidad"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </button>

            <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-thin">
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
              Clase suelta con continuidad
            </h1>

            <p className="text-lg sm:text-xl font-semibold text-tinta mb-4 leading-snug break-words">
              Torno: 32,00 € · Modelado a mano o decoración: 27,00 €
            </p>

            <BotonReserva destino="/reserva-clase-suelta-continuidad" className="shrink-0" />

            <div className="mb-5 min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">
                Información de la clase
              </h2>

              

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
  {descripcionCorta}
</p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Puedes venir de forma puntual y comprar cada sesión por separado,
                continuando tu proyecto poco a poco en el taller. Es ideal tanto
                para personas que ya han tenido contacto con la cerámica como
                para quienes quieren empezar con más libertad y sin compromiso
                fijo.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Durante estas clases podrás elegir entre trabajar en{" "}
                <strong>torno</strong>, realizar piezas de{" "}
                <strong>modelado a mano</strong> o dedicar la sesión a la{" "}
                <strong>decoración con esmaltes</strong>, según el momento del
                proceso en el que te encuentres.
              </p>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Si finalmente realizas <strong>4 clases</strong>, se aplicará
                  el <strong>precio de bono</strong> en lugar de cobrarlas como
                  sesiones sueltas independientes.
                </p>
              </div>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Precios:
              </p>

              <ul className="text-sm text-tinta space-y-2 mb-4 leading-relaxed break-words">
                <li>• Clase suelta de torno: 32,00 €</li>
                <li>
                  • Clase suelta de modelado a mano o decoración con esmaltes:
                  27,00 €
                </li>
              </ul>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Qué podrás hacer en esta clase:
              </p>

              <ul className="text-sm text-tinta space-y-2 mb-4 leading-relaxed break-words">
                <li>
                  • Continuar una pieza empezada anteriormente en el taller.
                </li>
                <li>
                  • Empezar un nuevo proyecto en torno o modelado a mano.
                </li>
                <li>
                  • Decorar y esmaltar piezas ya bizcochadas, si corresponde con
                  tu proceso.
                </li>
                <li>
                  • Practicar técnica, forma, volumen y acabado con
                  acompañamiento personalizado.
                </li>
              </ul>

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
                Clase de aproximadamente <strong>3 horas</strong>, pensada para
                avanzar de forma real en tu pieza o práctica, con tiempo para
                trabajar con calma y resolver dudas durante el proceso.
              </p>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Importante:
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                El tiempo necesario para finalizar una pieza dependerá del tipo
                de trabajo elegido, del ritmo de cada persona y de la técnica
                utilizada. Algunas piezas pueden requerir varias sesiones para
                completarse correctamente.
              </p>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Entrega de tus piezas:
              </p>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                Las piezas no se entregan el mismo día. Después de cada sesión,
                deben pasar por su proceso de secado, primera cocción, esmaltado
                si corresponde, y cocción final.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                El plazo estimado puede variar entre{" "}
                <strong>2 semanas y 1 mes y medio</strong>, según el clima, el
                volumen de trabajo del taller y el tipo de pieza.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Cuando tus piezas estén listas, se subirán fotos a la carpeta correspondiente para que puedas identificarlas.

Para saber si tu pieza ya está disponible y cómo recogerla, entra en <strong>"Quiero recoger mi pieza"</strong> dentro de tu <strong>perfil</strong> .
Ahí encontrarás siempre la información actualizada.
              </p>

              <p className="text-sm text-tinta leading-relaxed break-words">
                Esta modalidad está pensada para ofrecerte continuidad y
                flexibilidad, permitiéndote aprender y disfrutar del proceso
                cerámico a tu ritmo, sin perder el seguimiento de tus piezas.
              </p>
            </div>

            <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-5">
              <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
  <strong>Nota importante:</strong>{" "}
  {notaImportanteFirebase ||
    "Las tarifas están sujetas a cambios. Si no asistes a tu clase en la fecha reservada y deseas reprogramarla cuando las tarifas hayan cambiado, deberás abonar la diferencia o adaptarte a la tarifa vigente."}
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
              alt="Clase suelta con continuidad ampliada"
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </PantallaConVolver>
  );
}