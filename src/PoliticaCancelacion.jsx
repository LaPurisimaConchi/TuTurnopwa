import React from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";

export default function PoliticaCancelacion() {
  const navigate = useNavigate();

  return (
    <div className="bg-orange-50 text-gray-800 min-h-screen px-4 py-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <img
          src="/img/logoPCsin.png"
          alt="Logo del taller"
          className="mx-auto mb-6 w-36"
        />

        <BotonVolver />

        <h1 className="text-2xl font-bold text-center text-orange-800 mb-8">
          Política de Reservas y Cancelaciones
        </h1>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-orange-700 mb-2">
            ✅ Confirmación de Reserva
          </h2>
          <p>
            Para garantizar tu plaza en el taller, es necesario abonar el
            <strong> 100% del importe </strong> en el momento de realizar la
            reserva.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-orange-700 mb-2">
            🔁 Cambios, Cancelaciones y Cesiones
          </h2>
          <p>
            <strong>No se realizan devoluciones de dinero</strong> bajo ninguna circunstancia.
          </p>
          <p className="mt-2">
            Si no puedes asistir, puedes:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2">
            <li>
              <strong>Reprogramar tu clase</strong> a otra fecha disponible,
              avisando con al menos <strong>72 horas de antelación</strong>. Puedes
              hacerlo tú mismo, sin iniciar sesión, desde{" "}
              <a href="/gestionar-reserva" className="underline">
                Cambiar la fecha de mi reserva
              </a>{" "}
              con tu código de reserva y tu email.
            </li>
            <li>
              <strong>Ceder tu plaza a otra persona</strong> sin coste adicional.
            </li>
          </ul>
          <p className="mt-2">
            Si no avisas con tiempo suficiente y no acudes, la reserva se considerará utilizada.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-orange-700 mb-2">
            🌟 Importancia de esta Política
          </h2>
          <p>
            Tu reserva bloquea una plaza que no podemos ofrecer a otra persona,
            e implica una preparación previa: materiales, logística y organización.
            Las cancelaciones de última hora suponen una pérdida para nuestro pequeño negocio.
          </p>
          <p className="mt-2">
            Por eso no devolvemos el dinero, pero ofrecemos opciones flexibles
            como reprogramar o ceder tu plaza.
          </p>
        </section>

        <div className="text-center text-sm text-gray-600">
          ¿Tienes dudas? Contacta con nosotros directamente.
        </div>
      </div>
    </div>
  );
}

