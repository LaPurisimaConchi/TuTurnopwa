import React from "react";
import BotonVolver from "./BotonVolver";

export default function AvisoLegal() {
  return (
    <div className="text-tinta px-4 py-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <img src="/img/logoPCsin.png" alt="Logo del taller" className="mx-auto mb-6 w-36" />

        <BotonVolver />
        <h1 className="text-2xl font-bold text-center text-terracota-oscuro mb-8">
          Aviso Legal
        </h1>

        <section className="mb-6">
          <p>
            En cumplimiento del artículo 10 de la Ley 34/2002 (LSSI-CE), se informa a los usuarios de los datos
            identificativos del prestador de servicios.
          </p>
          <ul className="list-disc list-inside ml-4 mt-2">
            <li><strong>Denominación social:</strong> BERTO LEÓN CEBALLOS (LA PURÍSIMA CONCHI)</li>
            <li><strong>NIF:</strong> 45741240J</li>
            <li><strong>Domicilio:</strong> C/ Israel, local 5, 14009, Córdoba (España)</li>
            <li><strong>Teléfono:</strong> +34 644 67 16 64</li>
            <li><strong>Email:</strong> <a className="underline text-terracota-oscuro" href="mailto:lapurisimaconchioficial@gmail.com">lapurisimaconchioficial@gmail.com</a></li>
            <li><strong>Actividad principal:</strong> Servicios de clases de cerámica y actividades relacionadas</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="font-bold text-terracota-oscuro mb-2">1. Objeto</h2>
          <p>
            Este Aviso Legal regula el acceso y uso de la aplicación y los servicios ofrecidos por
            <strong> La Purísima Conchi</strong>. El uso de la app implica la aceptación de este Aviso Legal.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-bold text-terracota-oscuro mb-2">2. Condiciones de uso</h2>
          <p>
            El usuario se compromete a usar la app de forma lícita, diligente y conforme a la legislación vigente,
            la buena fe y el orden público, absteniéndose de realizar acciones que impidan su funcionamiento normal.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-bold text-terracota-oscuro mb-2">3. Protección de datos</h2>
          <p>
            El tratamiento de datos personales se rige por nuestra{" "}
            <a className="underline text-terracota-oscuro" href="/politica-privacidad">Política de Privacidad</a>.
          </p>
        </section>

        <section className="mb-6">
          <h2 className="font-bold text-terracota-oscuro mb-2">4. Propiedad intelectual e industrial</h2>
          <p>
            Los contenidos, diseños, textos, imágenes y código de la app están protegidos por derechos de propiedad
            intelectual e industrial. Queda prohibida su reproducción, distribución o comunicación pública sin autorización.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="font-bold text-terracota-oscuro mb-2">5. Legislación y jurisdicción</h2>
          <p>
            Se aplica la legislación española y, para cualquier controversia, las partes se someten a los Juzgados y Tribunales de Córdoba.
          </p>
        </section>

        <div className="text-center text-sm text-tinta-suave">
          Gracias por tu confianza.
        </div>
      </div>
    </div>
  );
}

