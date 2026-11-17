// src/RegalarTaller.jsx — presentación de «Regalar un taller»
import PaginaPresentacion from "./components/PaginaPresentacion";
import Icono from "./components/Icono";

export default function RegalarTaller() {
  return (
    <PaginaPresentacion
      pagina="regalo"
      titulo="Regala un taller de cerámica"
      entradilla="Un regalo para quien ya lo tiene todo: una experiencia para crear algo con sus manos."
      imagenPrincipal="/img/creatupiezafavoritaregalo.jpg"
      descripcion={[
        "Eliges el taller que quieres regalar y la tarjeta es válida para ese taller. La persona que la recibe elige la fecha que mejor le vaya, sin prisas ni caducidades incómodas.",
        "No hace falta saber de cerámica: en cada taller te acompañamos paso a paso y se lleva su pieza terminada.",
      ]}
      ventajas={[
        { icono: "regalo", titulo: "Tú eliges el taller", texto: "El regalo es para ese taller." },
        { icono: "calendarioEvento", titulo: "Fecha a su gusto", texto: "Reserva cuando le venga bien." },
        { icono: "brillo", titulo: "Sin experiencia", texto: "Apto para principiantes." },
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
