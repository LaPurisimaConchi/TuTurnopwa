import React from "react";
import { useConfigEspacio } from "./configuracionEspacio";
import { enlaceWhatsapp } from "./utils/configEspacio";

const URL_ESMALTE = "https://drive.google.com/drive/folders/1Im70RbYcyCFs5pPLgq2ooHhowwtA8F0R";
const URL_LISTAS = "https://drive.google.com/drive/folders/1J0f79NLH--SZ9DGIaFO2n5hSNdjU7rUn";

function Paso({ numero, titulo, children }) {
  return (
    <section className="mb-6 rounded-2xl border border-terracota/30 bg-white p-4">
      <h2 className="text-lg font-semibold text-terracota-oscuro mb-2">
        {numero}. {titulo}
      </h2>
      <div className="space-y-2 text-sm">{children}</div>
    </section>
  );
}

function Enlace({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block rounded-2xl border border-terracota bg-white hover:bg-terracota-suave px-4 py-2 font-semibold text-terracota-oscuro transition"
    >
      {children}
    </a>
  );
}

export default function RecogerPieza() {
  const { config: configEspacio } = useConfigEspacio();
  // Teléfono propio de piezas y envíos (Espacio → Contacto)
  const enlaceWa = enlaceWhatsapp(configEspacio.telefonoPiezas);
  return (
    <div className="text-tinta px-4 py-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-center text-terracota-oscuro mb-8">
          Quiero recoger mi pieza
        </h1>

        <Paso numero={1} titulo="Elige esmalte y sube la foto de tu pieza">
          <p>
            ⚠️ Este paso solamente es necesario si has realizado un taller de
            "Crea tu pieza desde cero" (torno o modelado).
          </p>
          <p>
            En ese caso, deberás subir la fotografía de tu pieza dentro de la carpeta del
            esmalte que más te guste para su acabado final.
          </p>
          <Enlace href={URL_ESMALTE}>Elegir esmalte y subir foto</Enlace>
          <p>
            🎨 Si has realizado un taller de pintura sobre pieza ya cocida, no debes subir
            ninguna fotografía ni elegir esmalte, ya que el proceso de acabado de tu pieza
            es diferente.
          </p>
        </Paso>

        <Paso numero={2} titulo="Comprueba si tu pieza está lista">
          <p>Antes de contactar con nosotros, consulta siempre el siguiente enlace:</p>
          <Enlace href={URL_LISTAS}>Ver si mi pieza está lista</Enlace>
          <p>✅ Las piezas solamente están listas para recoger cuando aparecen publicadas en la carpeta.</p>
          <p>Si tu pieza aparece publicada, puedes escribirnos para organizar su recogida.</p>
          <p>
            📞 Consultas sobre piezas, para concretar cita para recoger piezas y preparación
            de envíos:
          </p>
          <a
            href={enlaceWa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-2xl bg-[#25D366] hover:bg-[#1ebe5b] px-4 py-2 font-semibold text-white transition"
          >
            Escribir por WhatsApp
          </a>
          <div className="rounded-xl bg-[#fbf4d8] border border-[#ead66d] p-3 space-y-1">
            <p className="font-semibold">⚠️ Importante: una sola persona de contacto por grupo</p>
            <p>✅ El grupo debe elegir una única persona responsable para comunicarse con nosotros.</p>
            <p>❌ No escribáis varias personas del mismo grupo.</p>
            <p>❌ No utilicéis varios canales a la vez (Instagram, WhatsApp de reservas, teléfono de piezas y envíos, etc.).</p>
            <p>
              Si una persona escribe por Instagram, otra por el WhatsApp de reservas y otra por
              el teléfono de piezas y envíos, nos resulta muy difícil localizar correctamente la
              información, identificar las piezas y hacer un seguimiento adecuado del historial
              de mensajes, consultas y avances realizados. Esto puede provocar retrasos,
              duplicidades o confusiones durante la gestión.
            </p>
          </div>
        </Paso>

        <Paso numero={3} titulo="Importante si venís en grupo">
          <p>⚠️ Las piezas de un mismo grupo no siempre terminan al mismo tiempo.</p>
          <p>
            Es completamente normal que unas piezas estén listas antes y otras aparezcan días
            o semanas después, ya que pueden entrar en distintas hornadas o requerir procesos
            diferentes.
          </p>
          <p>
            Por este motivo, si todavía faltan piezas de vuestro grupo, os recomendamos esperar
            un poco más antes de consultarnos.
          </p>
        </Paso>

        <Paso numero={4} titulo="Tiempos de producción">
          <p>
            ⏳ El plazo mínimo para que una pieza pueda estar terminada es de aproximadamente
            2 semanas, pero eso no significa que vaya a estar lista en ese tiempo.
          </p>
          <p>Cada pieza puede necesitar:</p>
          <ul className="list-disc pl-5">
            <li>Secado.</li>
            <li>Esmaltado.</li>
            <li>Cocción.</li>
            <li>Segunda cocción.</li>
            <li>Retoques de esmalte.</li>
            <li>Reparaciones.</li>
            <li>Procesos adicionales.</li>
          </ul>
          <p>Por ello, los tiempos finales pueden variar considerablemente.</p>
          <p>
            Si ha transcurrido aproximadamente un mes y medio desde vuestro taller y vuestra
            pieza sigue sin aparecer publicada, podéis contactar con nosotros para que
            revisemos vuestro caso.
          </p>
        </Paso>

        <Paso numero={5} titulo="Si necesitas consultar por una pieza o preparar un envío">
          <p>
            Para cualquier consulta sobre piezas, recogidas o envíos, es imprescindible que
            nos enviéis:
          </p>
          <p>📸 Las fotografías que realizasteis de vuestras piezas el día del taller.</p>
          <p>📸 Las fotografías de las piezas que aparecen en la carpeta donde publicamos las piezas listas para recoger.</p>
          <p>Además, indicadnos:</p>
          <ul className="list-disc pl-5">
            <li>Qué piezas aparecen en la carpeta.</li>
            <li>Qué piezas consideráis que faltan.</li>
          </ul>
          <p>
            Estas fotografías son nuestra principal referencia para localizar cada trabajo y
            poder ayudaros lo más rápido posible.
          </p>
          <p>⚠️ Si existen piezas muy parecidas, indicad cualquier detalle identificativo que recordéis:</p>
          <ul className="list-disc pl-5">
            <li>Firmas.</li>
            <li>Iniciales.</li>
            <li>Fechas.</li>
            <li>Marcas en la base.</li>
            <li>Decoraciones concretas.</li>
            <li>Cualquier característica diferenciadora.</li>
          </ul>
          <p>Cuanta más información nos facilitéis, más fácil será localizar correctamente las piezas.</p>
        </Paso>

        <Paso numero={6} titulo="Recogida de piezas">
          <p className="font-semibold">Primer mes</p>
          <p>✅ Recogida gratuita desde la fecha de publicación de la fotografía de la pieza.</p>
          <p>
            Importante: si viniste en grupo, el plazo no comenzará a contar hasta que estén
            publicadas todas las piezas del grupo.
          </p>
        </Paso>

        <Paso numero={7} titulo={'Sección "FUERA DEL ESTUDIO"'}>
          <p>
            Transcurrido 1 mes desde la publicación de la fotografía de la pieza en nuestra
            carpeta de Drive, ésta pasará a la sección "FUERA DEL ESTUDIO", una zona destinada
            al almacenamiento de piezas pendientes de recogida.
          </p>
          <p>
            Durante los 2 meses siguientes, podrás recoger tu pieza abonando un coste de
            gestión de 10 € por pieza, destinado a cubrir su traslado y gestión de
            almacenamiento.
          </p>
          <p>
            Si transcurren 3 meses desde la publicación de la fotografía y la pieza no ha sido
            recogida, pasará a ser propiedad de La Purísima Conchi, que podrá disponer de ella
            libremente, incluyendo su donación, venta, reutilización o cualquier otro destino
            que considere oportuno.
          </p>
          <p>
            Si, de forma excepcional, la pieza continúa almacenada y deseas recuperarla antes
            de que el estudio disponga de ella, se aplicará un coste de almacenamiento de 3 €
            por pieza y por cada mes o fracción de mes adicional.
          </p>
          <p>
            Las piezas que hayan pasado a la sección "FUERA DEL ESTUDIO" se almacenarán fuera
            del taller. Aunque procuramos conservarlas en las mejores condiciones posibles, no
            nos responsabilizamos de su conservación ni de los posibles desperfectos derivados
            de un almacenamiento prolongado. Asimismo, el hecho de que una pieza continúe
            almacenada una vez transcurridos los 3 meses no garantiza que siga disponible para
            su recogida, ya que el estudio podrá disponer de ella conforme a esta política.
          </p>
        </Paso>

        <Paso numero={8} titulo="🌱 Aviso importante sobre embalaje sostenible">
          <p>
            En nuestro taller estamos comprometidos con la reducción de residuos y el cuidado
            del medio ambiente. Por ello, te invitamos a traer tu propio embalaje para
            transportar tus piezas:
          </p>
          <ul className="list-disc pl-5">
            <li>📦 Cajas reutilizadas.</li>
            <li>📦 Bolsas reutilizables.</li>
            <li>📦 Papel reciclado.</li>
            <li>📦 Material de protección reutilizable.</li>
          </ul>
          <p>
            Si necesitas embalaje adicional, disponemos de material en el taller con coste
            adicional para cubrir el gasto de materiales y mantener nuestras prácticas
            sostenibles.
          </p>
          <p>
            Gracias por ayudarnos a reducir residuos y cuidar el planeta mientras disfrutamos
            juntos de la cerámica. 💚
          </p>
        </Paso>
      </div>
    </div>
  );
}
