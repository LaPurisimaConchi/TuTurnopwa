import React from "react";
import Icono from "./components/Icono";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";
import { useConfigEspacio } from "./configuracionEspacio";

export default function PoliticaCancelacion() {
  const navigate = useNavigate();
  const { config } = useConfigEspacio();

  return (
    <div className="text-tinta px-4 py-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <img
          src="/img/logoPCsin.png"
          alt="Logo del taller"
          className="mx-auto mb-6 w-36"
        />

        <BotonVolver />

        <h1 className="text-2xl font-bold text-center text-terracota-oscuro mb-8">
          Política de Reservas y Cancelaciones
        </h1>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-terracota-oscuro mb-2">
            <Icono nombre="confirmado" className="mr-1.5" />Confirmación de Reserva
          </h2>
          <p>
            Para garantizar tu plaza en el taller, es necesario abonar el
            <strong> 100% del importe </strong> en el momento de realizar la
            reserva.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="text-xl font-semibold text-terracota-oscuro mb-2">
            <Icono nombre="repetir" className="mr-1.5" />Cambios, Cancelaciones y Cesiones
          </h2>
          <p>
            <strong>No se realizan devoluciones de dinero</strong> bajo ninguna circunstancia.
          </p>
          <p className="mt-2">
            Si no puedes asistir, puedes:
          </p>
          <ul className="list-disc list-inside ml-4 mt-2">
            <li>
              <strong>Reprogramar tu clase</strong> a otra fecha disponible, una sola vez,
              avisando con al menos <strong>{config.horasCambioReserva} horas de antelación</strong>.
              Puedes hacerlo tú mismo, sin iniciar sesión, desde{" "}
              <a href="/gestionar-reserva" className="underline">
                Cambiar la fecha de mi reserva
              </a>{" "}
              con tu código de reserva y tu email, o desde tu perfil si tienes cuenta.
            </li>
            <li>
              Las <strong>clases de un bono</strong> se reprograman (una vez por clase) o se cancelan
              desde tu perfil, en «Bonos», con al menos{" "}
              <strong>{config.horasCambioBono} horas de antelación</strong> y dentro de la validez del
              bono. Si cancelas, la clase vuelve a tu bono.
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
          <h2 className="text-xl font-semibold text-terracota-oscuro mb-2">
            <Icono nombre="estrella" className="mr-1.5" />Importancia de esta Política
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

        <div className="text-center text-sm text-tinta-suave">
          ¿Tienes dudas? Contacta con nosotros directamente.
        </div>
      </div>
    </div>
  );
}

