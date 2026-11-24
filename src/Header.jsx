// src/Header.jsx
// Cabecera global: lleva al inicio y a la cuenta (perfil / iniciar sesión)
// desde cualquier página (sin cuenta, también a gestionar la reserva). A los administradores les añade el acceso al panel.
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { esEmailAdministrador } from "./utils/administradores";

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
  "inline-flex items-center justify-center gap-2 min-h-[40px] rounded-full px-3 sm:px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-terracota focus-visible:ring-offset-2";
const suave = `${base} text-tinta-suave hover:bg-arena`;
const contorno = `${base} border border-terracota text-terracota hover:bg-terracota-suave`;
const relleno = `${base} bg-terracota text-white hover:bg-terracota-oscuro`;

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
  // Con el email aún sin verificar también se enseña: el panel le dice cómo verificarlo
  const admin = hayUsuario && !esInvitado && esEmailAdministrador(usuario.email);

  const nombre = String(usuario?.displayName || "").trim().split(/\s+/)[0] || "";
  const inicial = (nombre || usuario?.email || "").charAt(0).toUpperCase();

  // Al entrar desde aquí se vuelve a la pantalla actual
  const location = useLocation();
  const volverAqui = ["/login", "/registro"].includes(pathname)
    ? undefined
    : {
        from: {
          pathname,
          search: location.search,
          hash: location.hash,
          state: location.state,
        },
      };

  const enPanel = pathname.startsWith("/admin");
  const enPerfil = pathname === "/perfil" || pathname === "/editar-perfil";
  const enGestion = pathname === "/gestionar-reserva";

  return (
    <header className="sticky top-[var(--banda-entorno,0px)] z-40 border-b border-linea bg-crema/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-6">
        <Link
          to="/portada"
          aria-label="La Purísima Conchi: ir al inicio"
          className="flex min-w-0 items-center gap-2 rounded-full pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-terracota focus-visible:ring-offset-2"
        >
          <img
            src="/img/logoPCsin.png"
            alt=""
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span className="hidden truncate font-serif text-lg font-semibold text-tinta sm:block">
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
                      ? "bg-tinta text-white"
                      : "bg-mostaza text-tinta hover:bg-mostaza-borde"
                  }`}
                >
                  <IconoPanel />
                  <span>
                    <span className="sm:hidden">Admin</span>
                    <span className="hidden sm:inline">Panel admin</span>
                  </span>
                </Link>
              )}

              {/* Sin cuenta (o con una sesión de invitado) se entra a la reserva con código + email */}
              {(!hayUsuario || esInvitado) && (
                <Link
                  to="/gestionar-reserva"
                  aria-current={enGestion ? "page" : undefined}
                  className={`${suave} ${enGestion ? "bg-arena" : ""}`}
                >
                  Gestionar reserva
                </Link>
              )}

              {/* Quien compró como invitado también puede querer entrar a su cuenta */}
              {(!hayUsuario || esInvitado) && (
                <>
                  <Link to="/login" state={volverAqui} className={contorno}>
                    Iniciar sesión
                  </Link>
                  <Link to="/registro" className={`${relleno} hidden sm:inline-flex`}>
                    Crear cuenta
                  </Link>
                </>
              )}

              {/* El invitado no tiene perfil que gestionar: su reserva se abre con código + email */}
              {hayUsuario && !esInvitado && (
                <Link
                  to="/perfil"
                  aria-current={enPerfil ? "page" : undefined}
                  className={`${suave} ${enPerfil ? "bg-arena" : ""}`}
                >
                  {inicial ? (
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-terracota text-xs font-bold text-white"
                    >
                      {inicial}
                    </span>
                  ) : (
                    <IconoPerfil />
                  )}
                  <span>
                    <span className="sm:hidden">Perfil</span>
                    <span className="hidden max-w-[9rem] truncate sm:inline">
                      {nombre ? `Hola, ${nombre}` : "Mi perfil"}
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
