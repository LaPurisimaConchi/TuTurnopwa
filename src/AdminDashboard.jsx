import React, { useCallback, useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import { calcularEstadisticas, formatearEuros } from "./utils/estadisticasAdmin";

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
          <div style={styles.card}>
            <p style={styles.cardLabel}>Reservas totales</p>
            <p style={styles.cardValue}>
              {valor("reservasTotales")}
            </p>
            <p style={styles.cardNota}>
              {stats && !cargando
                ? `${stats.reservasConfirmadas} confirmadas y pagadas`
                : "\u00A0"}
            </p>
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>Clases activas</p>
            <p style={styles.cardValue}>
              {valor("clasesActivas")}
            </p>
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>Usuarios</p>
            <p style={styles.cardValue}>
              {valor("usuariosTotales")}
            </p>
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>Ingresos estimados</p>
            <p style={styles.cardValue}>
              {valor("ingresosEstimados", formatearEuros)}
            </p>
          </div>
        </div>

        <div style={styles.accesosBox}>
          <h2 style={styles.accesosTitulo}>Accesos rápidos</h2>

          <div style={styles.botonesGrid}>
           <button
  style={styles.boton}
  onClick={() => navigate("/admin-calendario-reservas-nuevo")}
>
  <span aria-hidden="true" style={styles.icono}>📅</span>
  Ver calendario
</button>

            <button
              style={styles.boton}
              onClick={() => navigate("/admin-reservas-nuevo")}
            >
              <span aria-hidden="true" style={styles.icono}>📋</span>
              Ver reservas
            </button>

            <button
              style={styles.boton}
              onClick={() => navigate("/admin-reservas-grupos")}
            >
              <span aria-hidden="true" style={styles.icono}>👥</span>
              Ver reservas de grupo
            </button>

            <button
              style={styles.boton}
              onClick={() => navigate("/admin-clases")}
            >
              <span aria-hidden="true" style={styles.icono}>🏺</span>
              Ver clases
            </button>

            <button
              style={styles.boton}
              onClick={() => navigate("/admin-ordenar-clases")}
            >
              <span aria-hidden="true" style={styles.icono}>↕️</span>
              Ordenar clases
            </button>

            <button
              style={styles.boton}
              onClick={() => navigate("/admin-taller")}
            >
              <span aria-hidden="true" style={styles.icono}>➕</span>
              Añadir taller nuevo
            </button>

            <button
              style={styles.boton}
              onClick={() => navigate("/admin-categorias")}
            >
              <span aria-hidden="true" style={styles.icono}>🏷️</span>
              Categorías de talleres
            </button>

            <button
              style={styles.boton}
              onClick={() => navigate("/admin-usuarios-nuevo")}
            >
              <span aria-hidden="true" style={styles.icono}>👤</span>
              Ver usuarios
            </button>


            <button
              style={styles.boton}
              onClick={() => navigate("/admin-tarjetas-regalo")}
            >
              <span aria-hidden="true" style={styles.icono}>🎁</span>
              Ver tarjetas regalo
            </button>
            <button
  style={styles.boton}
  onClick={() => navigate("/admin-bloqueos-fechas")}
>
  <span aria-hidden="true" style={styles.icono}>🚫</span>
  Bloquear fechas
</button>
<button
  style={styles.boton}
  onClick={() => navigate("/admin-habilitar-fechas")}
>
  <span aria-hidden="true" style={styles.icono}>✅</span>
  Habilitar fechas y Turnos
</button>
<button
  style={styles.boton}
  onClick={() => navigate("/admin-bonos-nuevo")}
>
  <span aria-hidden="true" style={styles.icono}>🎫</span>
  Ver bonos
</button>
          </div>
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