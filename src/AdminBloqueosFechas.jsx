import React, { useEffect, useMemo, useState } from "react";
import { ref, get, update, remove } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";

import { fechaDMA } from "./utils/formatoFecha";
const AdminBloqueosFechas = () => {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [bloqueos, setBloqueos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoFecha, setEliminandoFecha] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

useEffect(() => {
  const onResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", onResize);

  return () => window.removeEventListener("resize", onResize);
}, []);

  useEffect(() => {
    cargarBloqueos();
  }, []);

  const cargarBloqueos = async () => {
    try {
      const snap = await get(ref(dbRealtime, "bloqueosFechas"));

      const lista = [];

      if (snap.exists()) {
        snap.forEach((fechaSnap) => {
          const fecha = fechaSnap.key;
          const data = fechaSnap.val() || {};

          lista.push({
            fecha,
            bloqueado: data.bloqueado ?? false,
            motivo: data.motivo || "",
          });
        });
      }

      lista.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      setBloqueos(lista);
    } catch (error) {
      console.error("Error al cargar bloqueos:", error);
      setBloqueos([]);
    }
  };

  const generarRangoFechas = (inicio, fin) => {
    const fechas = [];
    const actual = new Date(`${inicio}T00:00:00`);
    const final = new Date(`${fin}T00:00:00`);

    while (actual <= final) {
      const yyyy = actual.getFullYear();
      const mm = String(actual.getMonth() + 1).padStart(2, "0");
      const dd = String(actual.getDate()).padStart(2, "0");

      fechas.push(`${yyyy}-${mm}-${dd}`);
      actual.setDate(actual.getDate() + 1);
    }

    return fechas;
  };

  const guardarBloqueo = async () => {
    if (!fechaInicio || !fechaFin) {
      alert("Selecciona fecha de inicio y fecha de fin.");
      return;
    }

    if (fechaFin < fechaInicio) {
      alert("La fecha fin no puede ser anterior a la fecha inicio.");
      return;
    }

    try {
      setGuardando(true);

      const fechas = generarRangoFechas(fechaInicio, fechaFin);
      const updates = {};

      fechas.forEach((fecha) => {
        updates[`bloqueosFechas/${fecha}`] = {
          bloqueado: true,
          motivo: motivo.trim() || "No especificado",
        };
      });

      await update(ref(dbRealtime), updates);

      setFechaInicio("");
      setFechaFin("");
      setMotivo("");

      await cargarBloqueos();
      alert("Fechas bloqueadas correctamente.");
    } catch (error) {
      console.error("Error al guardar bloqueo:", error);
      alert("No se pudieron guardar las fechas bloqueadas.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarBloqueo = async (fecha) => {
    const confirmar = window.confirm(
      `¿Seguro que quieres desbloquear la fecha ${fechaDMA(fecha)}?`
    );

    if (!confirmar) return;

    try {
      setEliminandoFecha(fecha);
      await remove(ref(dbRealtime, `bloqueosFechas/${fecha}`));
      await cargarBloqueos();
    } catch (error) {
      console.error("Error al eliminar bloqueo:", error);
      alert("No se pudo eliminar el bloqueo.");
    } finally {
      setEliminandoFecha("");
    }
  };

  const bloqueosActivos = useMemo(() => {
    return bloqueos.filter((b) => b.bloqueado);
  }, [bloqueos]);

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

        <h1 style={styles.titulo}>Bloqueo de fechas</h1>
        <p style={styles.subtitulo}>
          Aquí puedes bloquear días para que no se puedan reservar.
        </p>

        <div style={styles.card}>
          <div style={styles.grid}>
            <div style={styles.campo}>
              <label style={styles.label}>Fecha inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.campo}>
              <label style={styles.label}>Fecha fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.campo}>
            <label style={styles.label}>Motivo</label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: vacaciones, festivo, taller cerrado..."
              style={styles.input}
            />
          </div>

          <button
            onClick={guardarBloqueo}
            style={styles.botonGuardar}
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Bloquear fechas"}
          </button>
        </div>

        <div style={styles.card}>
          <h2 style={styles.subtituloBloque}>Fechas bloqueadas</h2>

          {bloqueosActivos.length === 0 ? (
            <p style={styles.textoVacio}>No hay fechas bloqueadas.</p>
          ) : (
            <div style={styles.lista}>
              {bloqueosActivos.map((b) => (
                <div
  key={b.fecha}
  style={{
    ...styles.item,
    ...(isMobile ? styles.itemMobile : {}),
  }}
>
                  <div>
                    <p style={styles.fecha}>{fechaDMA(b.fecha)}</p>
                    <p style={styles.motivo}>{b.motivo || "Sin motivo"}</p>
                  </div>

                  <button
                    onClick={() => eliminarBloqueo(b.fecha)}
                    style={styles.botonEliminar}
                    disabled={eliminandoFecha === b.fecha}
                  >
                    {eliminandoFecha === b.fecha
                      ? "Quitando..."
                      : "Desbloquear"}
                  </button>
                </div>
              ))}
            </div>
          )}
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
    maxWidth: 900,
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
  titulo: {
    textAlign: "center",
    margin: 0,
    color: "#2f2f2f",
    fontSize: "2rem",
  },
  subtitulo: {
    textAlign: "center",
    color: "#7a7a7a",
    marginTop: 8,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 14,
  },
  campo: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 14,
  },
  label: {
    fontSize: "0.92rem",
    fontWeight: 600,
    color: "#5b4a2d",
  },
  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5d8b8",
    fontSize: "0.95rem",
    backgroundColor: "#fffaf0",
  },
  botonGuardar: {
    padding: "12px 16px",
    border: "1px solid #e5d8b8",
    backgroundColor: "#fff8da",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    color: "#5b4a2d",
  },
  subtituloBloque: {
    marginTop: 0,
    marginBottom: 14,
    color: "#4b3a2a",
    fontSize: "1.2rem",
  },
  lista: {
    display: "grid",
    gap: 12,
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#fffaf0",
    border: "1px solid #eadfbe",
  },
  fecha: {
    margin: 0,
    fontWeight: 700,
    color: "#333",
  },
  motivo: {
    margin: "4px 0 0 0",
    color: "#777",
    fontSize: "0.92rem",
  },
  itemMobile: {
  flexDirection: "column",
  alignItems: "stretch",
},
  botonEliminar: {
    padding: "10px 12px",
    border: "1px solid #e7c9c9",
    backgroundColor: "#fff1f1",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    color: "#8a3b3b",
    flexShrink: 0,
  },
  textoVacio: {
    color: "#777",
    fontStyle: "italic",
  },
};

export default AdminBloqueosFechas;