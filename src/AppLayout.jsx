// src/AppLayout.jsx
import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "./Footer";
import Header from "./Header";
import PageContainer from "./PageContainer";

export default function AppLayout() {
  const location = useLocation();
  const ocultarFooterEn = ["/perfil", "/dondereservar"];

  // ✅ Rutas que NO deben ir dentro de PageContainer (portada)
  const sinContenedor = ["/", "/portada"];
  const usaContenedor = !sinContenedor.includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-[#fffef4] font-sans">
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




