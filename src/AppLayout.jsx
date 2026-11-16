// src/AppLayout.jsx
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "./Footer";
import Header from "./Header";
import PageContainer from "./PageContainer";

export default function AppLayout() {
  const location = useLocation();
  const ocultarFooterEn = ["/perfil"];

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
            <Outlet />
          </PageContainer>
        ) : (
          // La portada se renderiza sin contenedor para que ocupe y centre bien
          <Outlet />
        )}
      </main>

      {/* Footer visible en portada y en el resto, excepto donde lo ocultas */}
      {(!ocultarFooterEn.includes(location.pathname)) && <Footer />}
    </div>
  );
}




