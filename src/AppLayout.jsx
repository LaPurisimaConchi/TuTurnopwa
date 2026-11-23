// src/AppLayout.jsx
import React, { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "./Footer";
import Header from "./Header";
import PageContainer from "./PageContainer";
import BotonWhatsApp from "./components/BotonWhatsApp";
import { useGuardiaVerificacion } from "./utils/guardiaVerificacion";
import { tituloDeRuta } from "./utils/titulos";

export default function AppLayout() {
  const location = useLocation();
  useGuardiaVerificacion();

  // Título de la pestaña por página (los talleres lo cambian con su nombre al cargar)
  useEffect(() => {
    document.title = tituloDeRuta(location.pathname);
  }, [location.pathname]);
  const ocultarFooterEn = [];

  // ✅ Rutas que NO deben ir dentro de PageContainer (portada y el calendario del
  // admin, que necesita todo el ancho de la pantalla)
  const sinContenedor = ["/", "/portada", "/admin-calendario-reservas"];
  const usaContenedor = !sinContenedor.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-crema font-sans">
      <Header />

      <main className="flex-grow">
        {usaContenedor ? (
          <PageContainer>
            <Suspense fallback={<p className="py-16 text-center text-tinta-suave">Cargando…</p>}>
              <Outlet />
            </Suspense>
          </PageContainer>
        ) : (
          // La portada se renderiza sin contenedor para que ocupe y centre bien
          <Suspense fallback={<p className="py-16 text-center text-tinta-suave">Cargando…</p>}>
            <Outlet />
          </Suspense>
        )}
      </main>

      {/* Footer visible en portada y en el resto, excepto donde lo ocultas */}
      {(!ocultarFooterEn.includes(location.pathname)) && <Footer />}

      {/* Botón flotante de WhatsApp: en todas las páginas menos el panel de admin */}
      {!location.pathname.startsWith("/admin") && <BotonWhatsApp />}
    </div>
  );
}




