// src/RegalarTaller.jsx — presentación de «Regalar un taller»
import PaginaPresentacion from "./components/PaginaPresentacion";

export default function RegalarTaller() {
  return (
    <PaginaPresentacion
      pagina="regalo"
      titulo="Regala un taller de cerámica"
      entradilla="Un regalo para quien ya lo tiene todo: una experiencia para crear algo con sus manos."
      imagenPrincipal="/img/creatupiezafavoritaregalo.jpg"
      descripcion={[
        "La tarjeta regalo sirve para cualquier taller del estudio. La persona que la recibe elige el taller y la fecha que mejor le vaya, sin prisas ni caducidades incómodas.",
        "No hace falta saber de cerámica: en cada taller te acompañamos paso a paso y se lleva su pieza terminada.",
      ]}
      ventajas={[
        { icono: "🎁", titulo: "Vale para todo", texto: "Cualquier taller del estudio." },
        { icono: "📅", titulo: "Fecha a su gusto", texto: "Reserva cuando le venga bien." },
        { icono: "✨", titulo: "Sin experiencia", texto: "Apto para principiantes." },
      ]}
      galeria={["/img/2clasesregalo.jpg", "/img/4clasesregalo.jpg", "/img/creatupiezafavoritaregalo.jpg"]}
      pasos={[
        "Compra la tarjeta regalo.",
        "Recibes un comprobante con un código.",
        "Entrega el código a la persona que recibe el regalo.",
        "Ella lo canjea en la web y reserva su plaza cuando quiera.",
      ]}
      tituloRecomendados="Talleres que mejor funcionan como regalo"
    />
  );
}
