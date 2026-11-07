import React, { useCallback, useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { Link, useNavigate } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import "./AdminDashboard.css";
import {
  calcularEstadisticas,
  describirPlazo,
  formatearEuros,
} from "./utils/estadisticasAdmin";

const SECCIONES_ACCESOS = [
  {
    titulo: "Reservas",
    accesos: [
      { to: "/admin-calendario-reservas-nuevo", icono: "📅", texto: "Ver calendario" },
      { to: "/admin-reservas-nuevo", icono: "📋", texto: "Ver reservas" },
      { to: "/admin-reservas-grupos", icono: "👥", texto: "Ver reservas de grupo" },
    ],
  },
  {
    titulo: "Talleres",
    accesos: [
      { to: "/admin-clases", icono: "🏺", texto: "Ver clases" },
      { to: "/admin-ordenar-clases", icono: "↕️", texto: "Ordenar clases" },
      { to: "/admin-taller", icono: "➕", texto: "Añadir taller nuevo" },
      { to: "/admin-categorias", icono: "🏷️", texto: "Categorías de talleres" },
    ],
  },
  {
    titulo: "Clientes",
    accesos: [
      { to: "/admin-usuarios-nuevo", icono: "👤", texto: "Ver usuarios" },
      { to: "/admin-bonos-nuevo", icono: "🎫", texto: "Ver bonos" },
      { to: "/admin-tarjetas-regalo", icono: "🎁", texto: "Ver tarjetas regalo" },
    ],
  },
  {
    titulo: "Calendario y disponibilidad",
    accesos: [
      { to: "/admin-bloqueos-fechas", icono: "🚫", texto: "Bloquear fechas" },
      { to: "/admin-habilitar-fechas", icono: "✅", texto: "Habilitar fechas y Turnos" },
    ],
  },
];

const TARJETAS = [
  { campo: "reservasTotales", etiqueta: "Reservas totales", to: "/admin-reservas-nuevo" },
  { campo: "clasesActivas", etiqueta: "Clases activas", to: "/admin-clases" },
  { campo: "usuariosTotales", etiqueta: "Usuarios", to: "/admin-usuarios-nuevo" },
  { campo: "ingresosEstimados", etiqueta: "Ingresos estimados", formato: formatearEuros },
];

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargarDashboard = useCallback(async () => {
    setCargando(true);
    setError(false);

    try {
      const [reservasSnap, reservasGruposSnap, clasesSnap, usuariosSnap] =
        await Promise.all([
          get(ref(dbRealtime, "reservas")),
          get(ref(dbRealtime, "reservasGrupos")),
          get(ref(dbRealtime, "clases")),
          get(ref(dbRealtime, "usuarios")),
        ]);

      setStats(
        calcularEstadisticas({
          reservasSnap,
          reservasGruposSnap,
          clasesSnap,
          usuariosSnap,
        })
      );
    } catch (err) {
      console.error("Error al cargar dashboard:", err);
      setStats(null);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

  // Esqueleto mientras carga, "—" si falló, el valor si todo fue bien
  const valor = (campo, formato = (v) => v) => {
    if (cargando) {
      return <span className="ad-skeleton" role="status" aria-label="Cargando" />;
    }
    if (!stats) return "—";
    return formato(stats[campo]);
  };

  return (
    <main className="ad-body">
      <div className="ad-container">
        <BotonVolver />

        <header className="ad-header">
          <h1 className="ad-titulo">Panel admin</h1>
          <p className="ad-subtitulo">Resumen general del taller.</p>
        </header>

        {error && (
          <div role="alert" className="ad-error">
            <span>No se pudieron cargar los datos del resumen.</span>
            <button
              type="button"
              className="ad-boton-reintentar"
              onClick={cargarDashboard}
              disabled={cargando}
            >
              {cargando ? "Cargando..." : "Reintentar"}
            </button>
          </div>
        )}

        <div className="ad-grid" aria-busy={cargando}>
          {TARJETAS.map(({ campo, etiqueta, to, formato }) => {
            const contenido = (
              <>
                <p className="ad-card-label">{etiqueta}</p>
                <p className="ad-card-valor">{valor(campo, formato)}</p>
                {campo === "reservasTotales" && (
                  <p className="ad-card-nota">
                    {stats && !cargando
                      ? `${stats.reservasConfirmadas} confirmadas y pagadas`
                      : null}
                  </p>
                )}
              </>
            );

            return to ? (
              <Link key={campo} to={to} className="ad-card">
                {contenido}
              </Link>
            ) : (
              <div key={campo} className="ad-card">
                {contenido}
              </div>
            );
          })}
        </div>

        {stats && !cargando && (
          <section className="ad-panel" aria-labelledby="ad-pendientes">
            <h2 id="ad-pendientes" className="ad-panel-titulo">
              Pendientes de atender
            </h2>

            <div className="ad-proximas">
              <button
                type="button"
                className="ad-proxima"
                onClick={() => navigate("/admin-calendario-reservas-nuevo")}
              >
                <strong>{stats.reservasHoy}</strong> reservas hoy
              </button>
              <button
                type="button"
                className="ad-proxima"
                onClick={() => navigate("/admin-calendario-reservas-nuevo")}
              >
                <strong>{stats.reservasManana}</strong> reservas mañana
              </button>
            </div>

            {stats.gruposPagoPendiente.length === 0 ? (
              <p className="ad-vacio">
                Ninguna reserva de grupo con el plazo de pago a punto de vencer.
              </p>
            ) : (
              <ul className="ad-lista">
                {stats.gruposPagoPendiente.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className={`ad-pendiente${g.vencido ? " ad-pendiente--vencido" : ""}`}
                      onClick={() =>
                        navigate(
                          g.fecha
                            ? `/admin-reservas-grupos?fecha=${g.fecha}`
                            : "/admin-reservas-grupos"
                        )
                      }
                    >
                      <span>
                        {g.nombre}
                        {g.fecha ? ` · ${g.fecha}` : ""}
                      </span>
                      <span>{describirPlazo(g.limite)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <nav
          className="ad-panel ad-panel-sep"
          aria-labelledby="ad-accesos"
        >
          <h2 id="ad-accesos" className="ad-panel-titulo">
            Accesos rápidos
          </h2>

          {SECCIONES_ACCESOS.map((seccion) => (
            <section key={seccion.titulo} className="ad-seccion">
              <h3 className="ad-seccion-titulo">{seccion.titulo}</h3>

              <div className="ad-botones">
                {seccion.accesos.map((acceso) => (
                  <Link key={acceso.to} to={acceso.to} className="ad-boton">
                    <span aria-hidden="true" className="ad-icono">
                      {acceso.icono}
                    </span>
                    {acceso.texto}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </div>
    </main>
  );
};

export default AdminDashboard;