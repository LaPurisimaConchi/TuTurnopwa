import React, { useCallback, useEffect, useState } from "react";
import Icono from "./components/Icono";
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

import { fechaDMA } from "./utils/formatoFecha";
const SECCIONES_ACCESOS = [
  {
    titulo: "Reservas",
    accesos: [
      { to: "/admin-calendario-reservas", icono: "calendario", texto: "Ver calendario" },
      { to: "/admin-reservas-nuevo", icono: "reservas", texto: "Ver reservas" },
      { to: "/admin-reservas-grupos", icono: "usuarios", texto: "Ver reservas de grupo" },
    ],
  },
  {
    titulo: "Talleres",
    accesos: [
      { to: "/admin-clases", icono: "taller", texto: "Ver clases" },
      { to: "/admin-ordenar-clases", icono: "ordenar", texto: "Ordenar clases" },
      { to: "/admin-taller", icono: "mas", texto: "Añadir taller nuevo" },
      { to: "/admin-categorias", icono: "etiqueta", texto: "Categorías de talleres" },
      { to: "/admin-paginas-especiales", icono: "estrella", texto: "Recomendados de regalo y grupos" },
    ],
  },
  {
    titulo: "Clientes",
    accesos: [
      { to: "/admin-usuarios-nuevo", icono: "usuario", texto: "Ver usuarios" },
      { to: "/admin-bonos-nuevo", icono: "bono", texto: "Ver bonos" },
      { to: "/admin-tarjetas-regalo", icono: "regalo", texto: "Ver tarjetas regalo" },
    ],
  },
  {
    titulo: "Espacio",
    accesos: [
      { to: "/admin-espacio", icono: "casa", texto: "Aforo, grupos y horarios por defecto" },
    ],
  },
  {
    titulo: "Calendario y disponibilidad",
    accesos: [
      { to: "/admin-bloqueos-fechas", icono: "bloquear", texto: "Bloquear fechas" },
      { to: "/admin-habilitar-fechas", icono: "confirmado", texto: "Abrir días" },
    ],
  },
];

const TARJETAS = [
  { campo: "reservasTotales", etiqueta: "Reservas totales", icono: "reservas", tono: "terracota", to: "/admin-reservas-nuevo" },
  { campo: "clasesActivas", etiqueta: "Clases activas", icono: "taller", tono: "verde", to: "/admin-clases" },
  { campo: "usuariosTotales", etiqueta: "Usuarios", icono: "usuarios", tono: "azul", to: "/admin-usuarios-nuevo" },
  { campo: "ingresosEstimados", etiqueta: "Ingresos estimados", icono: "euro", tono: "mostaza", formato: formatearEuros },
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
      return <span className="pa-skeleton" role="status" aria-label="Cargando" />;
    }
    if (!stats) return "—";
    return formato(stats[campo]);
  };

  return (
    <main className="pa-body">
      <div className="pa-container">
        <BotonVolver />

        <header className="pa-header">
          <h1 className="pa-titulo">Panel admin</h1>
          <p className="pa-subtitulo">Resumen general del taller.</p>
        </header>

        {error && (
          <div role="alert" className="pa-error">
            <span>No se pudieron cargar los datos del resumen.</span>
            <button
              type="button"
              className="pa-boton-reintentar"
              onClick={cargarDashboard}
              disabled={cargando}
            >
              {cargando ? "Cargando..." : "Reintentar"}
            </button>
          </div>
        )}

        <div className="pa-grid" aria-busy={cargando}>
          {TARJETAS.map(({ campo, etiqueta, icono, tono, to, formato }) => {
            const contenido = (
              <>
                <div className="pa-card-cabecera">
                  <span aria-hidden="true" className={`pa-card-icono pa-card-icono--${tono}`}>
                    <Icono nombre={icono} tamano={24} />
                  </span>
                  <p className="pa-card-label">{etiqueta}</p>
                </div>
                <p className="pa-card-valor">{valor(campo, formato)}</p>
                {campo === "usuariosTotales" && (
                  <p className="pa-card-nota">
                    {stats && !cargando
                      ? `${stats.usuariosTotales - stats.usuariosInvitados} registrados · ${stats.usuariosInvitados} invitados`
                      : null}
                  </p>
                )}
                {campo === "reservasTotales" && (
                  <p className="pa-card-nota">
                    {stats && !cargando
                      ? `${stats.reservasConfirmadas} confirmadas y pagadas`
                      : null}
                  </p>
                )}
              </>
            );

            return to ? (
              <Link key={campo} to={to} className="pa-card">
                {contenido}
              </Link>
            ) : (
              <div key={campo} className="pa-card">
                {contenido}
              </div>
            );
          })}
        </div>

        {stats && !cargando && (
          <section className="pa-panel" aria-labelledby="pa-pendientes">
            <h2 id="pa-pendientes" className="pa-panel-titulo">
              Pendientes de atender
            </h2>

            <div className="pa-proximas">
              <button
                type="button"
                className="pa-proxima"
                onClick={() => navigate("/admin-calendario-reservas")}
              >
                <strong>{stats.reservasHoy}</strong> reservas hoy
              </button>
              <button
                type="button"
                className="pa-proxima"
                onClick={() => navigate("/admin-calendario-reservas")}
              >
                <strong>{stats.reservasManana}</strong> reservas mañana
              </button>
            </div>

            {stats.gruposPagoPendiente.length === 0 ? (
              <p className="pa-vacio">
                Ninguna reserva de grupo con el plazo de pago a punto de vencer.
              </p>
            ) : (
              <ul className="pa-lista">
                {stats.gruposPagoPendiente.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className={`pa-pendiente${g.vencido ? " pa-pendiente--vencido" : ""}`}
                      onClick={() =>
                        navigate(
                          g.fecha
                            ? `/admin-reservas-grupos?fecha=${g.fecha}`
                            : "/admin-reservas-grupos"
                        )
                      }
                    >
                      <span>
                        {String(g.nombre)}
                        {g.fecha ? ` · ${fechaDMA(String(g.fecha))}` : ""}
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
          className="pa-panel pa-panel-sep"
          aria-labelledby="pa-accesos"
        >
          <h2 id="pa-accesos" className="pa-panel-titulo">
            Accesos rápidos
          </h2>

          {SECCIONES_ACCESOS.map((seccion) => (
            <section key={seccion.titulo} className="pa-seccion">
              <h3 className="pa-seccion-titulo">{seccion.titulo}</h3>

              <div className="pa-botones">
                {seccion.accesos.map((acceso) => (
                  <Link key={acceso.to} to={acceso.to} className="pa-boton">
                    <span aria-hidden="true" className="pa-icono">
                      <Icono nombre={acceso.icono} tamano={22} />
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