import React, { useCallback, useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { Link, useNavigate } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  // "..." mientras carga, "—" si falló, el valor si todo fue bien
  const valor = (campo, formato = (v) => v) => {
    if (cargando) return "...";
    if (!stats) return "—";
    return formato(stats[campo]);
  };

  return (
   <div
  style={{
    ...styles.body,
    ...(isMobile ? styles.bodyMobile : {}),
  }}
>
  <div
    style={{
      ...styles.container,
      ...(isMobile ? styles.containerMobile : {}),
    }}
  >
        <BotonVolver />

        <div style={styles.header}>
          <h1 style={styles.titulo}>Panel admin</h1>
          <p style={styles.subtitulo}>
            Resumen general del taller.
          </p>
        </div>

        {error && (
          <div role="alert" style={styles.error}>
            <span>No se pudieron cargar los datos del resumen.</span>
            <button
              type="button"
              style={styles.botonReintentar}
              onClick={cargarDashboard}
              disabled={cargando}
            >
              {cargando ? "Cargando..." : "Reintentar"}
            </button>
          </div>
        )}

        <div style={styles.grid} aria-busy={cargando}>
          {TARJETAS.map(({ campo, etiqueta, to, formato }) => {
            const contenido = (
              <>
                <p style={styles.cardLabel}>{etiqueta}</p>
                <p style={styles.cardValue}>{valor(campo, formato)}</p>
                {campo === "reservasTotales" && (
                  <p style={styles.cardNota}>
                    {stats && !cargando
                      ? `${stats.reservasConfirmadas} confirmadas y pagadas`
                      : "\u00A0"}
                  </p>
                )}
              </>
            );

            return to ? (
              <Link key={campo} to={to} style={{ ...styles.card, ...styles.cardLink }}>
                {contenido}
              </Link>
            ) : (
              <div key={campo} style={styles.card}>
                {contenido}
              </div>
            );
          })}
        </div>

        {stats && !cargando && (
          <div style={styles.pendientesBox}>
            <h2 style={styles.accesosTitulo}>Pendientes de atender</h2>

            <div style={styles.proximas}>
              <button
                type="button"
                style={styles.proximaItem}
                onClick={() => navigate("/admin-calendario-reservas-nuevo")}
              >
                <strong>{stats.reservasHoy}</strong> reservas hoy
              </button>
              <button
                type="button"
                style={styles.proximaItem}
                onClick={() => navigate("/admin-calendario-reservas-nuevo")}
              >
                <strong>{stats.reservasManana}</strong> reservas mañana
              </button>
            </div>

            {stats.gruposPagoPendiente.length === 0 ? (
              <p style={styles.vacio}>
                Ninguna reserva de grupo con el plazo de pago a punto de vencer.
              </p>
            ) : (
              <ul style={styles.listaPendientes}>
                {stats.gruposPagoPendiente.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      style={{
                        ...styles.pendienteItem,
                        ...(g.vencido ? styles.pendienteVencido : {}),
                      }}
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
          </div>
        )}

        <div style={styles.accesosBox}>
          <h2 style={styles.accesosTitulo}>Accesos rápidos</h2>

          {SECCIONES_ACCESOS.map((seccion) => (
            <section key={seccion.titulo} style={styles.seccion}>
              <h3 style={styles.seccionTitulo}>{seccion.titulo}</h3>

              <div style={styles.botonesGrid}>
                {seccion.accesos.map((acceso) => (
                  <Link key={acceso.to} to={acceso.to} style={styles.boton}>
                    <span aria-hidden="true" style={styles.icono}>
                      {acceso.icono}
                    </span>
                    {acceso.texto}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  body: {
    backgroundColor: "#fdf8ee",
    minHeight: "100vh",
    padding: 30,
    fontFamily: "'Segoe UI', sans-serif",
  },
  bodyMobile: {
  padding: 4,
},
  container: {
    maxWidth: 1100,
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 28,
    boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
  },
  containerMobile: {
  width: "100%",
  maxWidth: "100%",
  borderRadius: 16,
  padding: 10,
  boxSizing: "border-box",
},
  header: {
    textAlign: "center",
    marginBottom: 28,
  },
  titulo: {
    margin: 0,
    color: "#2f2f2f",
    fontSize: "2rem",
  },
  subtitulo: {
    marginTop: 8,
    color: "#7a7a7a",
    fontSize: "1rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 28,
  },
  card: {
    backgroundColor: "#fff8da",
    border: "1px solid #f1e7c6",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  },
  cardLabel: {
    margin: 0,
    color: "#7a6331",
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  cardValue: {
    margin: "12px 0 0 0",
    color: "#333",
    fontSize: "2rem",
    fontWeight: "bold",
  },
  cardLink: {
    display: "block",
    textDecoration: "none",
    color: "inherit",
  },
  seccion: {
    marginTop: 18,
  },
  seccionTitulo: {
    margin: "0 0 10px 0",
    color: "#7a6331",
    fontSize: "0.9rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  cardNota: {
    margin: "6px 0 0 0",
    color: "#7a6331",
    fontSize: "0.8rem",
  },
  error: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    backgroundColor: "#fdecea",
    border: "1px solid #f3b8b0",
    color: "#8a1f11",
    borderRadius: 14,
    padding: "12px 16px",
    marginBottom: 16,
  },
  botonReintentar: {
    padding: "8px 14px",
    backgroundColor: "#8a1f11",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
  },
  pendientesBox: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
  },
  proximas: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  proximaItem: {
    padding: "10px 16px",
    backgroundColor: "#fff8da",
    color: "#3d3126",
    border: "1px solid #f1e7c6",
    borderRadius: 14,
    fontSize: "1rem",
    cursor: "pointer",
  },
  vacio: {
    margin: 0,
    color: "#7a7a7a",
    fontSize: "0.95rem",
  },
  listaPendientes: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gap: 8,
  },
  pendienteItem: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    padding: "12px 14px",
    backgroundColor: "#fffaf0",
    color: "#3d3126",
    border: "1px solid #eadfbe",
    borderRadius: 12,
    fontSize: "0.95rem",
    textAlign: "left",
    cursor: "pointer",
  },
  pendienteVencido: {
    backgroundColor: "#fdecea",
    border: "1px solid #f3b8b0",
    color: "#8a1f11",
  },
  accesosBox: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 22,
    padding: 22,
  },
  accesosTitulo: {
    margin: "0 0 18px 0",
    color: "#4b3a2a",
    fontSize: "1.25rem",
  },
  botonesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  icono: {
    fontSize: "1.4rem",
    lineHeight: 1,
    width: 28,
    textAlign: "center",
    flexShrink: 0,
  },
  boton: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    boxSizing: "border-box",
    textDecoration: "none",
    padding: "14px 16px",
    backgroundColor: "#fffaf0",
    color: "#3d3126",
    border: "1px solid #eadfbe",
    borderRadius: 14,
    fontSize: "1rem",
    textAlign: "left",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  },
};

export default AdminDashboard;