import React from "react";
import { Link } from "react-router-dom";

export default function Menu() {
  const enlaces = [
    // Principales
    { texto: "Portada", ruta: "/portada" },
    { texto: "Iniciar sesión", ruta: "/login" },
    { texto: "Registro", ruta: "/registro" },
    { texto: "Perfil de usuario", ruta: "/perfil" },
    { texto: "Editar perfil", ruta: "/editar-perfil" },
    { texto: "Clases disponibles", ruta: "/clases" },
    { texto: "Clases solo vista", ruta: "/clases-solo" },

    // Clases
    { texto: "Edición Premium", ruta: "/edicion-premium" },
    { texto: "Creativo Plus", ruta: "/creativo-plus" },
    { texto: "Básico Esencial", ruta: "/basico-esencial" },
    { texto: "Pintar Cerámica", ruta: "/pintar-ceramica" },
    { texto: "Fundamental Mini", ruta: "/fundamental-mini" },
    { texto: "Exprés Continuo", ruta: "/exprescontinuo" },
    { texto: "Bono 2 Clases", ruta: "/bono-2-clases" },
    { texto: "Bono 4 Clases", ruta: "/bono-4-clases" },

    // Reservas
    { texto: "Reserva Edición Premium", ruta: "/reserva-edicion-premium" },
    { texto: "Reserva Creativo Plus", ruta: "/reserva-creativo-plus" },
    { texto: "Reserva Básico Esencial", ruta: "/reserva-basico-esencial" },
    { texto: "Reserva Pintar Cerámica", ruta: "/reserva-pintar-ceramica" },
    { texto: "Reserva Fundamental Mini", ruta: "/reserva-fundamental-mini" },
    { texto: "Reserva Exprés Continuo", ruta: "/reserva-exprescontinuo" },
    { texto: "Reserva Bono 2 Clases", ruta: "/reserva-bono-2-clases" },
    { texto: "Reserva Bono 4 Clases", ruta: "/reserva-bono-4-clases" },
    { texto: "Reserva The Club", ruta: "/reservatheclub" },
    { texto: "Reserva Tearium", ruta: "/reservatearium" },
    { texto: "Reserva Karma", ruta: "/reservakarma" },

    // Tarjetas regalo
    { texto: "Galería Tarjetas Regalo", ruta: "/tarjeta-regalo" },
    { texto: "Funcionamiento Tarjeta Regalo", ruta: "/tarjeta-regalo/funciona" },
    { texto: "Detalle 2 Clases", ruta: "/tarjeta-regalo/2clases" },
    { texto: "Detalle 4 Clases", ruta: "/tarjeta-regalo/4clases" },
    { texto: "Detalle Crea tu pieza", ruta: "/tarjeta-regalo/creapiezafavorita" },
    { texto: "Detalle Pinta tu pieza", ruta: "/tarjeta-regalo/pintatupieza" },
    { texto: "Detalle Torno intensivo", ruta: "/tarjeta-regalo/tornointensivo" },
    { texto: "Generar código regalo", ruta: "/generarcodigotarjetaregalo" },
    { texto: "Canjear código regalo", ruta: "/canjeartarjetaregalo" },

    // Pago
    { texto: "Resumen pago", ruta: "/resumen-pago" },
    { texto: "Resumen pago The Club", ruta: "/resumenpagotheclub" },
    { texto: "Resumen pago Tearium", ruta: "/resumenpagotearium" },
    { texto: "Resumen pago Karma", ruta: "/resumenpagokarma" },
    { texto: "Formulario Redsys", ruta: "/pago-redsys" },
    { texto: "Pago fallido", ruta: "/pago-fallido" },

    // Panel de administración
    { texto: "Panel Admin", ruta: "/admin" },
    { texto: "Solicitudes", ruta: "/admin/solicitudes" },
    { texto: "Solicitar eliminación clase", ruta: "/admin/clases/solicitar-eliminacion" },
    { texto: "Ver listado clases", ruta: "/admin/clases/listado" },
    { texto: "Crear nueva clase", ruta: "/admin/clases/crear" },
    { texto: "Editar clase", ruta: "/admin/clases/editar" },
    { texto: "Listado usuarios", ruta: "/admin/usuarios/listado" },
    { texto: "Buscar usuario", ruta: "/admin/usuarios/buscar" },
    { texto: "Listado reservas", ruta: "/admin/reservas/listado" },
    { texto: "Filtrar reservas", ruta: "/admin/reservas/filtrar" },
    { texto: "Uso de bonos", ruta: "/admin/reservas/uso-bonos" },
    { texto: "Historial de reservas", ruta: "/admin/historial/reservas" },
    { texto: "Historial de bonos", ruta: "/admin/historial/bonos" },
    { texto: "Notificaciones", ruta: "/admin/notificaciones" },

    // Otros
    { texto: "¿Dónde reservar?", ruta: "/dondereservar" },
    { texto: "The Club", ruta: "/theclub" },
    { texto: "Tearium y Karma", ruta: "/teariumkarma" },
  ];

  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold text-tinta mb-6">Menú de Navegación</h1>
      <div className="grid gap-3 max-w-md mx-auto">
        {enlaces.map((item, index) => (
          <Link
            key={index}
            to={item.ruta}
            className="block bg-[#f4a6b4] hover:bg-[#e78fa0] text-white font-semibold py-3 px-4 rounded-xl transition"
          >
            {item.texto}
          </Link>
        ))}
      </div>
    </div>
  );
}
