// src/components/PantallaReserva.jsx
// Tarjeta de las pantallas de reserva (talleres y bonos): botón de volver, contenido
// y logo. Con ancho="max-w-4xl" deja sitio para dos columnas.
import BotonVolver from "../BotonVolver";

export default function PantallaReserva({ children, ancho = "max-w-md" }) {
  return (
    <div className="bg-[#fffef4] min-h-screen flex items-center justify-center px-4 py-8">
      <div className={`bg-white ${ancho} w-full rounded-2xl shadow-md p-6`}>
        <BotonVolver />
        {children}
        <div className="mt-8 text-center">
          <img src="/img/logoPCsin.png" alt="La Purísima Conchi" className="w-20 mx-auto" />
        </div>
      </div>
    </div>
  );
}
