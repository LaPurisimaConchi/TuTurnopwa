// src/PaginaGrupos.jsx — presentación de «Reservas para grupos»
import PaginaPresentacion from "./components/PaginaPresentacion";

export default function PaginaGrupos() {
  return (
    <PaginaPresentacion
      pagina="grupos"
      titulo="Reservas para grupos"
      entradilla="Cumpleaños, despedidas, equipos o planes con amigas: un rato distinto para pasarlo bien juntos."
      imagenPrincipal="/img/grupos/portadagrupos.jpg"
      descripcion={[
        "Reserva el espacio para tu grupo en la fecha y el horario que prefieras. Elegís el taller y nosotros lo preparamos todo para que solo tengáis que disfrutar.",
        "Cada persona crea su propia pieza y se la lleva a casa como recuerdo del día.",
      ]}
      ventajas={[
        { icono: "👥", titulo: "Para todo tipo de grupos", texto: "Amigas, familia, empresa…" },
        { icono: "🗓️", titulo: "Tú eliges el día", texto: "Fecha y horario a medida." },
        { icono: "🏺", titulo: "Todos se llevan su pieza", texto: "Un recuerdo hecho a mano." },
      ]}
      galeria={["/img/grupos/portadagrupos.jpg", "/img/grupos/desdecero.jpg", "/img/grupos/enjoy.jpg"]}
      pasos={[
        "Elige el día y el turno en el calendario.",
        "Indica cuántas personas sois y el taller.",
        "Rellena tus datos y paga para confirmar la reserva.",
        "Os esperamos en el estudio el día elegido.",
      ]}
      tituloRecomendados="Talleres recomendados para grupos"
    />
  );
}
