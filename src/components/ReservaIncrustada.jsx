// src/components/ReservaIncrustada.jsx
// Piezas comunes de la reserva (taller o bono) cuando va dentro de la ficha pública
// del taller en lugar de en su propia pantalla.
import AccesoCompra from "../AccesoCompra";
import BloqueoReserva from "../BloqueoReserva";
import { exigeCuenta } from "../catalogoTalleres";

// La ficha se ve sin sesión, así que el acceso se resuelve aquí en lugar de en la
// ruta. Los talleres «solo con cuenta» piden registrarse en el sitio; el resto deja
// ver el calendario sin sesión. Los bonos también: la pantalla del bono pide
// registrarse al confirmar (y recuerda lo elegido); los talleres normales piden los
// datos de contacto al guardar.
export function AccesoReservaIncrustada({ clase, children }) {
  if (exigeCuenta(clase) && clase.tipoProducto !== "bono") {
    return <BloqueoReserva soloCuenta>{children}</BloqueoReserva>;
  }
  return <AccesoCompra permitirVisita>{children}</AccesoCompra>;
}

// Un recuadro dentro de la ficha: sin botón de volver ni logo
export function ContenedorIncrustado({ children }) {
  return <div className="rounded-2xl border border-linea bg-white p-4 mb-4">{children}</div>;
}
