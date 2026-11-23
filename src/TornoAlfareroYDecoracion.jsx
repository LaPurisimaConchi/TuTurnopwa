import React, { useEffect, useState } from "react";
import BotonReserva from "./BotonReserva";
import PantallaConVolver from "./PantallaConVolver";
import { useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";

export default function TornoAlfareroYDecoracion() {
  const navigate = useNavigate();

  const imagenes = [
    "/img/tornoalfarero/torno-decoracion1.jpg",
    "/img/tornoalfarero/torno-decoracion2.jpg",
    "/img/tornoalfarero/torno-decoracion3.jpg",
    "/img/tornoalfarero/torno-decoracion4.jpg",
    "/img/tornoalfarero/torno-decoracion5.jpg",
  ];

  const [imagenActiva, setImagenActiva] = useState(imagenes[0]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [datosClase, setDatosClase] = useState(null);

  useEffect(() => {
    const cargarClase = async () => {
      try {
        const snap = await get(
          ref(dbRealtime, "clases/tornodecoracion4clases")
        );

        if (snap.exists()) {
          setDatosClase(snap.val());
        }
      } catch (error) {
        console.error(
          "Error al cargar datos de Torno alfarero y decoración:",
          error
        );
      }
    };

    cargarClase();
  }, []);

  const nombreClase = String(
    datosClase?.nombre || "Torno alfarero y decoración"
  );

  const precioClase =
    typeof datosClase?.precio === "number"
      ? `${datosClase.precio.toFixed(2).replace(".", ",")} €`
      : datosClase?.precioDesde
      ? `${datosClase.precioDesde}€`
      : "99,00 €";

  const descripcionCorta =
    datosClase?.descripcionCorta ||
    "Sumérgete en el proceso completo de la cerámica con este bono formativo de 4 sesiones, diseñado para quienes desean aprender torno y técnicas de decoración cerámica.";

  const descripcionLarga =
    datosClase?.descripcionLarga ||
    "El recorrido combina dos sesiones centradas en el torno alfarero y dos sesiones dedicadas a la decoración con engobes o esmaltes, guiadas paso a paso en el estudio. Podrás crear tus propias piezas torneadas —cuencos, tazas, jarrones o piezas con tapa— y después decorarlas aplicando color, efectos y acabados personales.";

  const incluyeLista =
    Array.isArray(datosClase?.incluye) && datosClase.incluye.length > 0
      ? datosClase.incluye
      : [
          "4 sesiones de 3 horas (2 de torno + 2 de decoración).",
          "Todos los materiales, herramientas y cocciones necesarias.",
          "Formación personalizada y acompañamiento técnico en todo el proceso.",
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
                alt="Torno alfarero y decoración"
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
              4 clases de 3 horas al mes
            </p>

            <p className="text-lg sm:text-xl font-semibold text-tinta mb-4 leading-relaxed break-words">
              {precioClase}
            </p>

            <BotonReserva destino="/reserva-torno-alfarero-y-decoracion" className="shrink-0" />

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

              <p className="text-sm text-tinta mb-2 font-semibold">
                Qué aprenderás
              </p>

              <p className="text-sm text-tinta font-semibold mb-2">
                Sesiones de torno (2 clases):
              </p>

              <ul className="text-sm text-tinta space-y-2 mb-4 leading-relaxed break-words">
                <li>• Conocer y usar las herramientas esenciales para el torno alfarero.</li>
                <li>• Aprender a centrar, abrir y levantar paredes controlando el grosor y la forma.</li>
                <li>• Practicar el retorneado y remate de bases.</li>
                <li>• Crear piezas utilitarias o decorativas como cuencos, tazas o pequeños jarrones.</li>
              </ul>

              <p className="text-sm text-tinta font-semibold mb-2">
                Sesiones de decoración (2 clases):
              </p>

              <ul className="text-sm text-tinta space-y-2 mb-4 leading-relaxed break-words">
                <li>• Aplicar engobes o esmaltes sobre piezas ya bizcochadas o crudas.</li>
                <li>• Experimentar con diferentes efectos, mezclas y acabados (brillantes, mates o satinados).</li>
                <li>• Desarrollar tu propio estilo de color y textura sobre piezas torneadas.</li>
                <li>• Comprender cómo los materiales reaccionan durante la cocción.</li>
              </ul>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Este bono te permite vivir el proceso completo: desde el torno
                  hasta la pieza final decorada.
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
                  En las tarifas de bono no está incluida la acción de esmaltar
                  piezas por parte del personal del estudio. Sin embargo,
                  tendrás la oportunidad de esmaltar tú mismo tus piezas,
                  personalizando cada detalle según tus preferencias.
                </p>
              </div>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Duración y validez del bono:
              </p>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                El bono está compuesto por <strong>4 sesiones de 3 horas</strong> cada una.
              </p>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                Podrás asistir cuando tú decidas, dentro del mismo mes, según el
                horario disponible.
              </p>

              <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                El mes comienza con tu primera sesión y finaliza el mismo día
                del mes siguiente.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                <strong>Validez del bono:</strong> 3 meses desde la fecha de compra.
              </p>

              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4">
                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  Si lo deseas, puedes ampliar el bono con sesiones adicionales.
                  Solo tienes que comunicarlo.
                </p>
              </div>

              <p className="text-sm text-tinta mb-2 font-semibold">
                Resultados:
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Aprenderás a dominar el torno y a decorar tus propias piezas
                desde una base técnica sólida, comprendiendo todas las fases del
                proceso cerámico.
              </p>

              <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                Podrás crear objetos únicos, tanto funcionales como decorativos,
                y desarrollar una autonomía real en el torno.
              </p>
            </div>

            <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-5">
              <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
                <strong>Política de reservas y condiciones:</strong> {notaImportanteFirebase}
              </p>

              <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
                <strong>Política de venta:</strong> Validez 3 meses desde la
                fecha de compra. Si las tarifas cambian, deberás abonar la
                diferencia o elegir otro bono equivalente o superior. Si no se
                utiliza dentro del plazo, no se reembolsará el importe.
              </p>

              <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
                <strong>Cancelaciones:</strong> En caso de cancelación voluntaria
                sin causa justificada, La Purísima Conchi podrá, de forma
                excepcional, ofrecer una devolución parcial, deduciendo un 20%
                en concepto de gastos de gestión y reserva de plaza.
              </p>

              <p className="text-sm text-tinta italic leading-relaxed break-words">
                Te recomendamos leer nuestros términos y condiciones y políticas
                de devolución antes de realizar tu compra.
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
              alt="Torno alfarero y decoración ampliada"
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </PantallaConVolver>
  );
}