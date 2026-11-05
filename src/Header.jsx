// src/Header.jsx
// Cabecera global: lleva al inicio y a la cuenta (perfil / iniciar sesión)
// desde cualquier página. A los administradores les añade el acceso al panel.
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { esAdministrador } from "./utils/administradores";

const icono = "w-5 h-5 shrink-0";

const IconoPerfil = () => (
  <svg className={icono} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
  </svg>
);

const IconoPanel = () => (
  <svg className={icono} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

const base =
  "inline-flex items-center justify-center gap-2 min-h-[40px] rounded-full px-3 sm:px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b36a4a] focus-visible:ring-offset-2";
const suave = `${base} text-[#6b4f3f] hover:bg-[#f3ebe1]`;
const contorno = `${base} border border-[#b36a4a] text-[#b36a4a] hover:bg-[#f9ece6]`;
const relleno = `${base} bg-[#b36a4a] text-white hover:bg-[#9e5c3f]`;

export default function Header() {
  const { pathname } = useLocation();
  // undefined = todavía comprobando la sesión; null = sin sesión
  const [usuario, setUsuario] = useState(undefined);

  useEffect(() => {
    const cancelar = onAuthStateChanged(auth, (user) => setUsuario(user || null));
    return () => cancelar();
  }, []);

  const cargando = usuario === undefined;
  const hayUsuario = !!usuario;
  const esInvitado = hayUsuario && usuario.isAnonymous;
  const admin = hayUsuario && !esInvitado && esAdministrador(usuario);

  const nombre = String(usuario?.displayName || "").trim().split(/\s+/)[0] || "";
  const inicial = (nombre || usuario?.email || "").charAt(0).toUpperCase();

  const enPanel = pathname.startsWith("/admin");
  const enPerfil = pathname === "/perfil" || pathname === "/editar-perfil";

  return (
    <header className="sticky top-0 z-40 border-b border-[#eadfd2] bg-[#fffef4]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
        <Link
          to="/portada"
          aria-label="La Purísima Conchi: ir al inicio"
          className="flex min-w-0 items-center gap-2 rounded-full pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b36a4a] focus-visible:ring-offset-2"
        >
          <img
            src="/img/logoPCsin.png"
            alt=""
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="hidden truncate font-serif text-lg font-semibold text-[#3f3128] sm:block">
            La Purísima Conchi
          </span>
        </Link>

        <nav aria-label="Cuenta" className="flex items-center gap-1 sm:gap-2">
          {cargando ? (
            <span className="h-10 w-24" aria-hidden="true" />
          ) : (
            <>
              {admin && (
                <Link
                  to="/admin-dashboard"
                  aria-current={enPanel ? "page" : undefined}
                  className={`${base} ${
                    enPanel
                      ? "bg-[#3f3128] text-white"
                      : "bg-[#f2c500] text-[#3b3025] hover:bg-[#e4b800]"
                  }`}
                >
                  <IconoPanel />
                  <span>
                    <span className="sm:hidden">Admin</span>
                    <span className="hidden sm:inline">Panel admin</span>
                  </span>
                </Link>
              )}

              {!hayUsuario && (
                <>
                  <Link to="/login" className={contorno}>
                    Iniciar sesión
                  </Link>
                  <Link to="/registro" className={`${relleno} hidden sm:inline-flex`}>
                    Crear cuenta
                  </Link>
                </>
              )}

              {esInvitado && (
                <Link to="/registro" className={`${contorno} hidden sm:inline-flex`}>
                  Crear cuenta
                </Link>
              )}

              {hayUsuario && (
                <Link
                  to="/perfil"
                  aria-current={enPerfil ? "page" : undefined}
                  className={`${suave} ${enPerfil ? "bg-[#f3ebe1]" : ""}`}
                >
                  {inicial && !esInvitado ? (
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#b36a4a] text-xs font-bold text-white"
                    >
                      {inicial}
                    </span>
                  ) : (
                    <IconoPerfil />
                  )}
                  <span>
                    <span className="sm:hidden">Perfil</span>
                    <span className="hidden max-w-[9rem] truncate sm:inline">
                      {nombre && !esInvitado ? `Hola, ${nombre}` : "Mi perfil"}
                    </span>
                  </span>
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
