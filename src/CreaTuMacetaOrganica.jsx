import React, { useEffect, useState } from "react";
import BotonReserva from "./BotonReserva";
import PantallaConVolver from "./PantallaConVolver";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";

export default function CreaTuMacetaOrganica() {
  const navigate = useNavigate();

  const imagenes = [
    "/img/macetaorganica/macetaorganica1.jpg",
    "/img/macetaorganica/macetaorganica2.jpg",
    "/img/macetaorganica/macetaorganica3.jpg",
    "/img/macetaorganica/macetaorganica4.jpg",
    "/img/macetaorganica/macetaorganica5.jpg",
  ];

  const [imagenActiva, setImagenActiva] = useState(imagenes[0]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [datosClase, setDatosClase] = useState(null);

  useEffect(() => {
    const cargarClase = async () => {
      try {
        const snap = await get(ref(dbRealtime, "clases/macetaorganica"));

        if (snap.exists()) {
          setDatosClase(snap.val());
        }
      } catch (error) {
        console.error("Error al cargar datos de Crea tu maceta orgánica:", error);
      }
    };

    cargarClase();
  }, []);

  const nombreClase = String(
    datosClase?.nombre || "Crea tu maceta orgánica"
  );

  const precioClase =
    typeof datosClase?.precio === "number"
      ? `${datosClase.precio.toFixed(2).replace(".", ",")} €`
      : datosClase?.precioDesde
      ? `${datosClase.precioDesde}€`
      : "59,00 €";

  const descripcionCorta =
    datosClase?.descripcionCorta ||
    "Descubre la cerámica más natural y libre con esta formación de dos sesiones, donde podrás modelar y esmaltar un cuenco o una maceta de forma orgánica, inspirada en la textura, el gesto y el movimiento del barro.";

  const descripcionLarga =
    datosClase?.descripcionLarga ||
    "Durante la primera sesión trabajarás el modelado de la pieza, explorando formas irregulares, curvas suaves, relieves y texturas aplicadas con herramientas o elementos naturales. En la segunda sesión podrás decorarla con esmaltes y pigmentos, eligiendo entre una gran variedad de colores y acabados que realzarán sus superficies y contrastes.";

  const incluyeLista =
    Array.isArray(datosClase?.incluye) && datosClase.incluye.length > 0
      ? datosClase.incluye
      : [
          "Todos los materiales, herramientas y esmaltes necesarios.",
          "Cocciones completas en horno cerámico.",
          "Esmaltado de una pieza incluido (cuenco o maceta).",
          "Formación personalizada y acompañamiento técnico durante ambas sesiones.",
        ];

  const notaImportanteFirebase =
    datosClase?.notaImportante ||
    "Las tarifas están sujetas a cambios. Si no asististe a tu formación o bono en la fecha original y deseas reprogramarlo cuando las tarifas hayan cambiado, deberás abonar la diferencia o elegir una formación acorde a la cantidad ya pagada.";

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
                alt="Crea tu maceta orgánica"
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

            <p className="text-lg sm:text-xl font-semibold text-tinta mb-4 leading-snug break-words">
              {precioClase}
            </p>

            <BotonReserva destino="/reserva-crea-tu-maceta-organica" className="shrink-0" />

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

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  En este taller las piezas se realizarán con un tamaño máximo
                  aproximado de <strong>15 × 15 cm</strong>, manteniendo
                  proporciones equilibradas y adecuadas para el secado y la
                  cocción. Este formato permite trabajar con libertad creativa
                  sin comprometer la estabilidad de la pieza.
                </p>
              </div>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Qué aprenderás:
              </p>

              <p className="text-sm text-tinta font-semibold mb-2">
                Primera sesión – Modelado y texturizado
              </p>

              <ul className="text-sm text-tinta space-y-2 mb-4 leading-relaxed break-words">
                <li>• Crear un cuenco o una maceta mediante técnicas manuales (churros, planchas o pellizco).</li>
                <li>• Dar forma de manera libre y orgánica, trabajando curvas, irregularidades y volúmenes naturales.</li>
                <li>• Aplicar texturas con herramientas, sellos o materiales naturales (hojas, tejidos, cuerda, piedra…).</li>
                <li>• Controlar el grosor y la estabilidad en piezas con relieves o bordes irregulares.</li>
                <li>• Preparar la pieza para la primera cocción (bizcochado).</li>
              </ul>

              <p className="text-sm text-tinta font-semibold mb-2">
                Segunda sesión – Decoración y esmaltado
              </p>

              <ul className="text-sm text-tinta space-y-2 mb-4 leading-relaxed break-words">
                <li>• Aplicar esmaltes y pigmentos cerámicos sobre superficies texturadas.</li>
                <li>• Observar cómo los esmaltes reaccionan en diferentes profundidades y relieves.</li>
                <li>• Combinar colores, brillos y mates para destacar la textura y el movimiento de la pieza.</li>
              </ul>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Contamos con una gran variedad de esmaltes y pigmentos
                  perfectos para realzar las texturas naturales y los acabados
                  artesanales.
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
                Formación de dos sesiones de aproximadamente 3 horas cada una.
                La segunda sesión se programa tras el secado y primera cocción
                (bizcochado), para garantizar que la pieza esté lista para
                esmaltar.
              </p>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Entre la primera y la segunda sesión pueden pasar entre 2 y 4
                  semanas, según el ritmo de secado y la carga del horno.
                </p>
              </div>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Entrega de tu pieza:
              </p>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                Tu pieza no se entrega el mismo día de la segunda sesión.
                Después del esmaltado realizaremos la cocción final.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                El plazo estimado de entrega oscila entre <strong>2 y 3 semanas tras el esmaltado</strong>.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Cuando tus piezas estén listas, se subirán fotos a la carpeta correspondiente para que puedas identificarlas.
                <br />
                <br />
                Para saber si tu pieza ya está disponible y cómo recogerla, entra en “Quiero recoger mi pieza” dentro de tu perfil.
                Ahí encontrarás siempre la información actualizada.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Esta formación te permitirá disfrutar del proceso cerámico de
                forma intuitiva y sensorial, explorando el modelado orgánico, la
                textura y el color en una pieza de formato medio y carácter
                artesanal.
              </p>

              <p className="text-sm text-tinta leading-relaxed break-words">
                ¡Te esperamos en el estudio para crear con tus manos una pieza
                única y llena de movimiento!
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
              alt="Crea tu maceta orgánica ampliada"
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </PantallaConVolver>
  );
}