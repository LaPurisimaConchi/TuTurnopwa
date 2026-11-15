import React from "react";
import BotonVolver from "./BotonVolver";

export default function PoliticaPrivacidad() {
  return (
    <div className="text-gray-800 px-4 py-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <img src="/img/logoPCsin.png" alt="Logo del taller" className="mx-auto mb-6 w-36" />

        <BotonVolver />
        <h1 className="text-2xl font-bold text-center text-orange-800 mb-8">
          Política de Privacidad
        </h1>

        <section className="mb-6">
          <p>
            En <strong>La Purísima Conchi</strong> nos tomamos muy en serio la protección de tus datos personales.
            Esta Política explica qué información recogemos, cómo la utilizamos y cuáles son tus derechos,
            en cumplimiento del RGPD y la LOPDGDD.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-bold text-orange-800 mb-2">1. Responsable del tratamiento</h2>
          <p>
            <strong>BERTO LEÓN CEBALLOS (LA PURÍSIMA CONCHI)</strong><br />
            NIF: 45741240J<br />
            Domicilio: C/ Israel, local 5, 14009, Córdoba (España)<br />
            Email: <a className="underline text-orange-700" href="mailto:lapurisimaconchioficial@gmail.com">lapurisimaconchioficial@gmail.com</a>
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-bold text-orange-800 mb-2">2. Datos que recogemos</h2>
          <ul className="list-disc list-inside ml-4">
            <li>Nombre y apellidos</li>
            <li>Correo electrónico y teléfono de contacto</li>
            <li>Clases reservadas y/o bonos comprados o canjeados</li>
            <li>Historial de reservas</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-bold text-orange-800 mb-2">3. Finalidad del tratamiento</h2>
          <ul className="list-disc list-inside ml-4">
            <li>Gestionar reservas y pagos</li>
            <li>Emitir y canjear bonos o tarjetas regalo</li>
            <li>Enviar notificaciones relacionadas con tus reservas</li>
            <li>Permitir el acceso a tu historial desde tu perfil</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-bold text-orange-800 mb-2">4. Base legal</h2>
          <p>
            Consentimiento del usuario y ejecución de un contrato (prestación del servicio de clases de cerámica).
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-bold text-orange-800 mb-2">5. Almacenamiento y seguridad</h2>
          <p>
            Tus datos se guardan de forma segura en <strong>Firebase</strong> (Google), cumpliendo RGPD.
            Aplicamos medidas técnicas y organizativas para proteger tu información.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-bold text-orange-800 mb-2">6. Comunicación de datos</h2>
          <p>
            No vendemos ni cedemos tus datos. Solo accede el personal autorizado y, si fuese necesario,
            la desarrolladora de la app (<strong>TuTurno</strong>) como encargada del tratamiento, bajo contrato de confidencialidad.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-bold text-orange-800 mb-2">7. Derechos del usuario</h2>
          <p>
            Puedes ejercer acceso, rectificación, supresión, limitación y oposición escribiendo a
            {" "}<a className="underline text-orange-700" href="mailto:lapurisimaconchioficial@gmail.com">lapurisimaconchioficial@gmail.com</a>.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="font-bold text-orange-800 mb-2">8. Eliminación de la cuenta</h2>
          <p>
            Para eliminar tu cuenta y todos tus datos, solicita la baja en
            {" "}<strong>lapurisimaconchioficial@gmail.com</strong>.
          </p>
        </section>

        <div className="text-center text-sm text-gray-600">
          Última actualización: <strong>27/05/2025</strong>
        </div>
      </div>
    </div>
  );
}


