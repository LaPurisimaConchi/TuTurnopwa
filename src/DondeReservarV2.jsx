import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Footer from "./Footer";
import BotonVolver from "./BotonVolver";

export default function DondeReservarV2() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [nombre, setNombre] = useState("");

  const correosAdmin = [
    "aliciasmelero@gmail.com",
    "lapurisimaconchioficial@gmail.com",
  ];

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email || "");
        setNombre(user.displayName || "");
      }
    });
    return () => unsubscribe();
  }, []);

  const esAdmin = correosAdmin.includes(userEmail);

  return (
    <div className="min-h-screen bg-[#fffef4] p-4 font-sans relative">
      <BotonVolver />

      <div className="max-w-6xl mx-auto">
        {/* CABECERA */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
          <img
            src="/img/logoPCsin.png"
            alt="Logo La Purísima Conchi"
            className="h-20 w-auto"
          />

          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-yellow-900 font-serif text-center md:text-left">
              Reserva tu experiencia
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-2 text-center md:text-left">
              Elige qué tipo de actividad quieres hacer
            </p>
          </div>

          <button
            onClick={() => navigate("/clases-online")}
            className="mt-2 md:mt-0 md:ml-auto bg-gradient-to-r from-pink-400 to-red-400 text-white px-2.5 py-1 rounded-full text-[11px] font-semibold shadow-sm hover:scale-105 transition text-center leading-tight w-32"
          >
            🌟 Novedad:
            <br /> ¡Reserva tu clase online!
          </button>
        </div>

     {/* ACCESOS RÁPIDOS MÓVIL */}
<div className="grid grid-cols-2 gap-3 mb-8 md:hidden">

  <button
    onClick={() => navigate("/reserva-grupos")}
    className="rounded-2xl bg-white border border-[#eadfd2] p-3 shadow-sm flex flex-col items-center"
  >
    <img
      src="/img/grupos/portadagrupos.jpg"
      alt="Reserva en grupo"
      className="w-16 h-16 object-cover rounded-xl mb-2"
    />

    <span className="text-sm font-bold text-[#5f3f2b] text-center leading-tight">
      Reservar
      <br />
      en grupo
    </span>
  </button>

  <button
    onClick={() => navigate("/talleres/pinta-decora")}
    className="rounded-2xl bg-white border border-[#eadfd2] p-3 shadow-sm flex flex-col items-center"
  >
    <img
      src="/img/pintartearium.jpg"
      alt="Pinta tu pieza"
      className="w-16 h-16 object-cover rounded-xl mb-2"
    />

    <span className="text-sm font-bold text-[#5f3f2b] text-center leading-tight">
      Pinta tu
      <br />
      pieza
    </span>
  </button>

</div>

        {/* BLOQUE PRINCIPAL */}
        <section className="mb-10">
          <div className="mb-4 text-center md:text-left">
            <h2 className="text-2xl font-bold text-[#5f3f2b]">
              Elige cómo quieres reservar
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Estas son las dos opciones principales
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* CREAR DESDE CERO */}
            <div
              className="cursor-pointer rounded-3xl border border-[#eadfd2] bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition"
              onClick={() => navigate("/clases")}
            >
              <div className="flex flex-col h-full">
                <div className="mb-5">
                  <img
                    src="/img/logoPCsin.png"
                    alt="Crear desde cero"
                    className="w-24 h-24 object-contain mx-auto"
                  />
                </div>

               <h3 className="text-2xl font-bold text-[#3f3128] text-center">
                  Crear desde cero
                </h3>

                <p className="text-sm text-gray-600 mt-3 leading-6 text-center">
                  Elige entre nuestras clases de cerámica para crear tu pieza
                  desde el principio.
                </p>

                <div className="mt-4 text-sm text-[#7b6d62] leading-6 text-center md:text-left">
                  <p>
                    Entra aquí y <strong>reserva tu clase</strong>, <strong>compra tu bono </strong>, etc.
                  </p>
                </div>

                <div className="mt-6 flex justify-center">
                  <span className="inline-block rounded-full bg-[#f4eadf] px-5 py-2 text-sm font-semibold text-[#6b4f3f]">
                    Ver opciones
                  </span>
                </div>
              </div>
            </div>

            {/* PINTAR TU PIEZA */}
            <div
              className="cursor-pointer rounded-3xl border border-[#eadfd2] bg-[#fffaf3] p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition"
             onClick={() => navigate("/talleres/pinta-decora")}
            >
              <div className="flex flex-col h-full">
                <div className="mb-5 flex justify-center">
                  <img
                    src="/img/pintartearium.jpg"
                    alt="Pintar tu pieza"
                    className="w-32 h-32 object-cover rounded-2xl mx-auto md:mx-0"
                  />
                </div>

                <h3 className="text-2xl font-bold text-[#3f3128] text-center">
                  Pinta tu pieza
                </h3>

                <p className="text-sm text-gray-600 mt-3 leading-6 text-center">
                  Reserva tu sesión para aprender a  <strong>pintar una pieza</strong> ya preparada en
                  el taller.
                </p>

                <div className="mt-4 text-sm text-[#7b6d62] leading-6 text-center md:text-left">
                  <p>
                    Ideal si buscas una actividad sencilla, creativa y lista para
                    disfrutar.
                  </p>
                </div>

                <div className="mt-6 flex justify-center">
                  <span className="inline-block rounded-full bg-[#f3dfbf] px-5 py-2 text-sm font-semibold text-[#6b4f3f]">
                    Reservar ahora
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BLOQUE SECUNDARIO */}
        <section className="mb-10">
          <div className="mb-4 text-center md:text-left">
            <h2 className="text-xl font-bold text-[#5f3f2b]">
              Otras opciones
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              También puedes acceder a estas secciones
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-3">
            {/* GRUPOS */}
            <div
              className="cursor-pointer rounded-2xl border border-[#ece7df] bg-white p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition"
              onClick={() => navigate("/reserva-grupos")}
            >
             <img
  src="/img/grupos/portadagrupos.jpg"
  alt="Reservas para grupos"
  className="w-28 h-28 object-cover rounded-xl mx-auto mb-4"
/>
              <h3 className="text-xl font-semibold text-gray-800 text-center">
                Reservas para grupos
              </h3>
              <p className="text-sm text-gray-600 mt-2 text-center leading-6">
  Si sois <strong>5 personas o más</strong>, reserva aquí vuestra experiencia en grupo.
</p>
              
            </div>

            {/* TARJETA REGALO */}
            <div
              className="cursor-pointer rounded-2xl border border-[#ece7df] bg-[#fffaf0] p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition"
              onClick={() => navigate("/tarjeta-regalo")}
            >
              <img
  src="/img/tarjetaregalo.jpg"
  alt="Tarjeta regalo"
  className="w-28 h-28 object-cover rounded-xl mx-auto mb-4"
/>
              <h3 className="text-xl font-semibold text-gray-800 text-center">
                Tarjeta regalo
              </h3>
              <p className="text-sm text-gray-600 mt-2 text-center leading-6">
                Regala un taller sin fecha fija. <strong>Compra aquí tu tarjeta regalo.</strong>
              </p>

              <button
                className="mt-5 mx-auto px-6 py-3 rounded-full text-white font-semibold bg-gradient-to-b from-[#F6D66A] to-[#F4C542] shadow-md hover:shadow-lg hover:from-[#F4C542] hover:to-[#E5B92F] transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/tarjeta-regalo");
                }}
              >
                Ver talleres
              </button>
            </div>

            {/* PERFIL */}
            <div
              className="cursor-pointer rounded-2xl border border-[#ece7df] bg-white p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition"
              onClick={() => navigate("/perfil")}
            >
              <img
                src="/img/perfilsinfondo.jpg"
                alt="Mi perfil"
                className="w-28 h-28 object-contain rounded-xl mx-auto mb-4"
              />

              <h3 className="text-xl font-semibold text-gray-800 text-center">
                Mi perfil
              </h3>

              <p className="text-sm text-[#7b6d62] mt-0.5 text-center font-medium">
                {nombre || "Tu espacio personal"}
              </p>

              <p className="text-sm text-gray-600 mt-2 text-center leading-6">
                Consulta tus reservas, edita tus datos y gestiona tu cuenta.
              </p>
            </div>
          </div>
        </section>

        {/* PANEL ADMIN */}
        {esAdmin && (
          <div className="mt-10 flex flex-col items-center">
            <div
              onClick={() => navigate("/admin-dashboard")}
              className="bg-yellow-300 p-4 rounded-2xl shadow-lg hover:scale-105 transition duration-300 cursor-pointer"
            >
              <img
                src="/img/panel-admin-sinfondo.png"
                alt="Panel admin"
                className="w-28 h-28 object-contain mx-auto"
              />
            </div>
            <p className="mt-2 text-sm text-gray-700 font-medium text-center">
              Panel admin
            </p>
          </div>
        )}

        {/* INSTAGRAM */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-1">
            Descubre el ambiente del taller
          </p>

          <h3 className="text-lg font-semibold text-[#333] mb-3">
            La Purísima Conchi
          </h3>

          <a
            href="https://www.instagram.com/lapurisimaconchi/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-pink-200 bg-white text-sm font-medium text-[#E1306C] hover:shadow-sm transition"
          >
            📸 @lapurisimaconchi
          </a>

          <p className="text-xs text-gray-400 mt-2">Más de 6.000 seguidores</p>
        </div>
      </div>

      <Footer />

      {/* BOTÓN AYUDA */}
      <button
        onClick={() => navigate("/ayuda")}
        className="fixed bottom-20 right-4 z-50 group"
        aria-label="Abrir chat de ayuda"
      >
        <div className="flex items-center gap-3 rounded-full border border-[#ead7c5] bg-white/95 backdrop-blur-sm px-3 py-3 shadow-[0_10px_30px_rgba(95,63,43,0.18)] transition duration-300 group-hover:scale-[1.03] group-hover:shadow-[0_14px_36px_rgba(95,63,43,0.22)]">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#d8b08c] text-white shadow-inner">
            <span className="text-xl">💬</span>
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-400"></span>
          </div>

          <div className="pr-1 text-left leading-tight">
            <span className="block text-sm font-semibold text-[#6b4f3f]">
              ¿Tienes dudas?
            </span>
            <span className="block text-xs text-[#8a6a57]">
              Habla con Junquillo
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}