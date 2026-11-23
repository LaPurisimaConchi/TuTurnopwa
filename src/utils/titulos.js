// Título de la pestaña según la ruta. Los talleres lo ponen ellos con su nombre
// (usarTituloPagina), porque salen de la base de datos.
export const NOMBRE_WEB = "La Purísima Conchi";

const TITULOS = [
  ["/portada", "Talleres de cerámica en Córdoba"],
  ["/clases", "Talleres"],
  ["/talleres", "Talleres"],
  ["/categoria", "Talleres"],
  ["/grupos", "Reservas para grupos"],
  ["/reserva-grupos", "Reservar para grupos"],
  ["/regalar-taller", "Regalar un taller"],
  ["/comprar-tarjeta-regalo", "Comprar tarjeta regalo"],
  ["/canjear-tarjeta", "Canjear tarjeta regalo"],
  ["/gestionar-reserva", "Gestionar mi reserva"],
  ["/reprogramar", "Reprogramar reserva"],
  ["/resumen-pago", "Resumen del pago"],
  ["/pago/exito", "Pago realizado"],
  ["/pago/error", "Pago no completado"],
  ["/pago-fallido", "Pago no completado"],
  ["/login", "Iniciar sesión"],
  ["/registro", "Crear cuenta"],
  ["/auth/accion", "Tu cuenta"],
  ["/perfil", "Mi perfil"],
  ["/editar-perfil", "Editar perfil"],
  ["/aviso-legal", "Aviso legal"],
  ["/politicacancelacion", "Política de reservas y cancelaciones"],
  ["/condicionesuso", "Condiciones de uso"],
  ["/politica-privacidad", "Política de privacidad"],
  ["/politica-piezas", "Política sobre roturas de piezas"],
  ["/condiciones-pago", "Condiciones de pago"],
  ["/admin", "Panel de administración"],
];

export function tituloDeRuta(pathname) {
  const ruta = String(pathname || "/");
  const coincide = TITULOS.find(([prefijo]) => ruta === prefijo || ruta.startsWith(`${prefijo}/`) || (prefijo === "/admin" && ruta.startsWith("/admin")));
  return coincide ? `${coincide[1]} · ${NOMBRE_WEB}` : NOMBRE_WEB;
}
