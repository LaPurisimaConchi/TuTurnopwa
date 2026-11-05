import React, { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    reservasTotales: 0,
    clasesActivas: 0,
    usuariosTotales: 0,
    ingresosEstimados: 0,
  });

  const [cargando, setCargando] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

useEffect(() => {
  const onResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", onResize);

  return () => window.removeEventListener("resize", onResize);
}, []);

  useEffect(() => {
    const cargarDashboard = async () => {
      try {
        const [reservasSnap, reservasGruposSnap, clasesSnap, usuariosSnap] =
          await Promise.all([
            get(ref(dbRealtime, "reservas")),
            get(ref(dbRealtime, "reservasGrupos")),
            get(ref(dbRealtime, "clases")),
            get(ref(dbRealtime, "usuarios")),
          ]);

        let reservasTotales = 0;
        let ingresosEstimados = 0;
        let clasesActivas = 0;
        let usuariosTotales = 0;

        if (clasesSnap.exists()) {
          clasesSnap.forEach((claseSnap) => {
            const clase = claseSnap.val();
            if (clase?.activa !== false) {
              clasesActivas += 1;
            }
          });
        }

        if (usuariosSnap.exists()) {
          usuariosTotales = Object.keys(usuariosSnap.val()).length;
        }

        // ---------- RESERVAS NORMALES ----------
        if (reservasSnap.exists()) {
          reservasSnap.forEach((claseSnap) => {
            claseSnap.forEach((fechaSnap) => {
              fechaSnap.forEach((turnoSnap) => {
                turnoSnap.forEach((nivelSnap) => {
                  const nivelVal = nivelSnap.val();

                  if (!nivelVal || typeof nivelVal !== "object") return;

                  const pareceReservaDirecta =
                    "fecha" in nivelVal ||
                    "estado" in nivelVal ||
                    "estadoPago" in nivelVal ||
                    "uid" in nivelVal ||
                    "orderId" in nivelVal;

                  if (pareceReservaDirecta) {
                    reservasTotales += 1;

                    if (
                      nivelVal.estado === "Confirmada" &&
                      nivelVal.estadoPago === "pagado"
                    ) {
                      ingresosEstimados += Number(
                        nivelVal.precioTotal || nivelVal.precio || 0
                      );
                    }

                    return;
                  }

                  nivelSnap.forEach((reservaSnap) => {
                    const reserva = reservaSnap.val();
                    if (!reserva || typeof reserva !== "object") return;

                    reservasTotales += 1;

                    if (
                      reserva.estado === "Confirmada" &&
                      reserva.estadoPago === "pagado"
                    ) {
                      ingresosEstimados += Number(
                        reserva.precioTotal || reserva.precio || 0
                      );
                    }
                  });
                });
              });
            });
          });
        }

        // ---------- RESERVAS DE GRUPO ----------
        if (reservasGruposSnap.exists()) {
          reservasGruposSnap.forEach((grupoSnap) => {
            if (grupoSnap.key === "placeholder") return;

            const grupo = grupoSnap.val();
            if (!grupo || typeof grupo !== "object") return;

            reservasTotales += 1;

            if (
              grupo.estado === "Confirmada" &&
              grupo.estadoPago === "pagado"
            ) {
              ingresosEstimados += Number(
                grupo.precioTotal || grupo.precio || 0
              );
            }
          });
        }

        setStats({
          reservasTotales,
          clasesActivas,
          usuariosTotales,
          ingresosEstimados,
        });
      } catch (error) {
        console.error("Error al cargar dashboard:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarDashboard();
  }, []);

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

        <div style={styles.grid}>
          <div style={styles.card}>
            <p style={styles.cardLabel}>Reservas totales</p>
            <p style={styles.cardValue}>
              {cargando ? "..." : stats.reservasTotales}
            </p>
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>Clases activas</p>
            <p style={styles.cardValue}>
              {cargando ? "..." : stats.clasesActivas}
            </p>
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>Usuarios</p>
            <p style={styles.cardValue}>
              {cargando ? "..." : stats.usuariosTotales}
            </p>
          </div>

          <div style={styles.card}>
            <p style={styles.cardLabel}>Ingresos estimados</p>
            <p style={styles.cardValue}>
              {cargando ? "..." : `${stats.ingresosEstimados}€`}
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
  Ver calendario
</button>

            <button
              style={styles.boton}
              onClick={() => navigate("/admin-reservas-nuevo")}
            >
              Ver reservas
            </button>

            <button
              style={styles.boton}
              onClick={() => navigate("/admin-reservas-grupos")}
            >
              Ver reservas de grupo
            </button>

            <button
              style={styles.boton}
              onClick={() => navigate("/admin-clases-nuevo")}
            >
              Ver clases
            </button>

            <button
              style={styles.boton}
              onClick={() => navigate("/admin-taller")}
            >
              Añadir taller nuevo
            </button>

            <button
              style={styles.boton}
              onClick={() => navigate("/admin-usuarios-nuevo")}
            >
              Ver usuarios
            </button>


            <button
              style={styles.boton}
              onClick={() => navigate("/admin-tarjetas-regalo")}
            >
              Ver tarjetas regalo
            </button>
            <button
  style={styles.boton}
  onClick={() => navigate("/admin-bloqueos-fechas")}
>
  Bloquear fechas
</button>
<button
  style={styles.boton}
  onClick={() => navigate("/admin-habilitar-fechas")}
>
  Habilitar fechas y Turnos
</button>
<button
  style={styles.boton}
  onClick={() => navigate("/admin-bonos-nuevo")}
>
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
  boton: {
    display: "block",
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