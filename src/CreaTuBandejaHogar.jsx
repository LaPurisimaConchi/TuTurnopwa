import React, { useEffect, useState } from "react";
import BotonReserva from "./BotonReserva";
import PantallaConVolver from "./PantallaConVolver";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";

export default function CreaTuBandejaHogar() {
  const navigate = useNavigate();

  const imagenes = [
    "/img/bandeja/bandeja1.jpg",
    "/img/bandeja/bandeja2.jpg",
    "/img/bandeja/bandeja3.jpg",
    "/img/bandeja/bandeja4.jpg",
    "/img/bandeja/bandeja5.jpg",
    "/img/bandeja/bandeja6.jpg",
  ];

  const [imagenActiva, setImagenActiva] = useState(imagenes[0]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [datosClase, setDatosClase] = useState(null);

  useEffect(() => {
    const cargarClase = async () => {
      try {
        const snap = await get(ref(dbRealtime, "clases/creatubandejahogar"));

        if (snap.exists()) {
          setDatosClase(snap.val());
        }
      } catch (error) {
        console.error("Error al cargar datos de Crea tu bandeja de hogar:", error);
      }
    };

    cargarClase();
  }, []);

  const nombreClase = String(
    datosClase?.nombre || "Crea tu bandeja de hogar"
  );

  const precioClase =
    typeof datosClase?.precio === "number"
      ? `${datosClase.precio.toFixed(2).replace(".", ",")} €`
      : datosClase?.precioDesde
      ? `${datosClase.precioDesde}€`
      : "55,00 €";

  const descripcionCorta =
    datosClase?.descripcionCorta ||
    "Descubre las bases del modelado cerámico a través de esta práctica de formación de una sola sesión, donde podrás crear tus propias piezas planas artesanales, ideales para el hogar o como objetos decorativos.";

  const descripcionLarga =
    datosClase?.descripcionLarga ||
    "Durante la clase podrás elegir qué tipo de pieza realizar: una tabla para quesos, una bandeja joyera, una huevera, un plato para tostadas u otra pieza funcional de formato plano.";

  const incluyeLista =
    Array.isArray(datosClase?.incluye) && datosClase.incluye.length > 0
      ? datosClase.incluye
      : [
          "Todos los materiales y herramientas necesarios.",
          "Cocciones completas en horno cerámico.",
          "Esmaltado de una pieza incluida (tu pieza plana).",
          "Formación guiada y personalizada durante toda la sesión.",
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
                alt="Crea tu bandeja de hogar"
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

            <BotonReserva destino="/reserva-crea-tu-bandeja-hogar" className="shrink-0" />

            <div className="mb-5 min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">
                Información del producto
              </h2>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
                  En este tipo de piezas solemos realizar <strong>dos unidades</strong>,
                  ya que las formas planas son más delicadas durante el secado y
                  la cocción.
                </p>
                <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
                  Por este motivo, no deben superar los <strong>30 cm de largo o ancho</strong>,
                  ya que las piezas de mayor tamaño tienen más riesgo de
                  deformarse o fracturarse en el horno.
                </p>
                <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
                  Durante la cocción pueden producirse pequeñas variaciones o
                  movimientos naturales en la arcilla, un proceso propio del
                  material que forma parte del aprendizaje cerámico.
                </p>
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Para poder realizar ambas piezas dentro del tiempo del taller,
                  se recomiendan decoraciones sencillas, como sellos, líneas,
                  puntos, formas geométricas o aplicación con esponja.
                </p>
              </div>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                {descripcionCorta}
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                {descripcionLarga}
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Una formación pensada para quienes desean aprender o seguir
                practicando cerámica en un entorno relajado, con acompañamiento
                personalizado durante todo el proceso.
              </p>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Qué aprenderás:
              </p>

              <ul className="text-sm text-tinta space-y-2 mb-4 leading-relaxed break-words">
                <li>
                  • Modelar tus piezas planas desde cero, definiendo forma,
                  grosor y proporciones adecuadas.
                </li>
                <li>
                  • Conseguir una superficie lisa, estable y equilibrada, lista
                  para uso decorativo o culinario.
                </li>
                <li>
                  • Aplicar, si lo deseas, una decoración simple y contemporánea,
                  que realce la forma sin sobrecargarla.
                </li>
                <li>
                  • Comprender las fases finales del proceso: secado, esmaltado y
                  cocción, realizadas por el estudio.
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
                Formación de una única sesión de aproximadamente 3 horas, donde
                podrás aprender, practicar y disfrutar del proceso con total
                acompañamiento.
              </p>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Si dentro del tiempo disponible finalizas antes de tus piezas
                  principales, podrás realizar una adicional sin coste, siempre
                  dentro del tiempo asignado.
                </p>
              </div>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Entrega de tus piezas:
              </p>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                Tus piezas no estarán listas el mismo día.
                Después de la clase, necesitan pasar por un proceso de secado y
                cocción en el horno, que requiere tiempo y puede variar según el
                clima y el tamaño de las piezas.
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
                cerámico a través de piezas planas y funcionales, comprendiendo
                los tiempos, cuidados y transformaciones naturales del proceso.
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
              alt="Crea tu bandeja de hogar ampliada"
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </PantallaConVolver>
  );
}