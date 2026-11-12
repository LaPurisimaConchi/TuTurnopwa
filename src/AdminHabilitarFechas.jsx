import React, { useEffect, useMemo, useState } from "react";
import { ref, get, update, remove } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";

import { fechaDMA } from "./utils/formatoFecha";
const AdminHabilitarFechas = () => {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [fechasHabilitadas, setFechasHabilitadas] = useState([]);
  const [habilitarManana, setHabilitarManana] = useState(false);
const [habilitarTarde, setHabilitarTarde] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoFecha, setEliminandoFecha] = useState("");
  const [fechaEditando, setFechaEditando] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

useEffect(() => {
  const onResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", onResize);

  return () => window.removeEventListener("resize", onResize);
}, []);

  useEffect(() => {
    cargarFechasHabilitadas();
  }, []);

  const cargarFechasHabilitadas = async () => {
    try {
      const snap = await get(ref(dbRealtime, "fechasHabilitadas"));

      const lista = [];

      if (snap.exists()) {
        snap.forEach((fechaSnap) => {
          const fecha = fechaSnap.key;
          const data = fechaSnap.val() || {};

          lista.push({
            fecha,
            habilitada: data.habilitada ?? false,
            motivo: data.motivo || "",
            creadaEn: data.creadaEn || null,
            turnosHabilitados: data.turnosHabilitados || [],
          });
        });
      }

      lista.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      setFechasHabilitadas(lista);
    } catch (error) {
      console.error("Error al cargar fechas habilitadas:", error);
      setFechasHabilitadas([]);
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

  const guardarHabilitacion = async () => {
    if (!fechaInicio || !fechaFin) {
      alert("Selecciona fecha de inicio y fecha de fin.");
      return;
    }

    if (fechaFin < fechaInicio) {
      alert("La fecha fin no puede ser anterior a la fecha inicio.");
      return;
    }

    if (!habilitarManana && !habilitarTarde) {
      alert("Selecciona al menos un turno: mañana o tarde.");
      return;
    }

    try {
      setGuardando(true);

      const fechas = generarRangoFechas(fechaInicio, fechaFin);
      const updates = {};

      fechas.forEach((fecha) => {
        updates[`fechasHabilitadas/${fecha}`] = {
          habilitada: true,
          motivo: motivo.trim() || "Apertura especial",
          creadaEn: Date.now(),
          turnosHabilitados: [
            ...(habilitarManana ? ["11:30-14:30"] : []),
            ...(habilitarTarde ? ["17:30-20:30"] : []),
          ],
        };
      });

      await update(ref(dbRealtime), updates);

     setFechaInicio("");
setFechaFin("");
setMotivo("");
setHabilitarManana(false);
setHabilitarTarde(false);
setFechaEditando(null);

      await cargarFechasHabilitadas();
      alert("Fechas habilitadas correctamente.");
    } catch (error) {
      console.error("Error al guardar fechas habilitadas:", error);
      alert("No se pudieron guardar las fechas habilitadas.");
    } finally {
      setGuardando(false);
    }
  };

 const modificarHabilitacion = (f) => {
  setFechaEditando(f.fecha);

  setFechaInicio(f.fecha);
  setFechaFin(f.fecha);
  setMotivo(f.motivo || "");

  const turnos = f.turnosHabilitados || [];

  setHabilitarManana(turnos.includes("11:30-14:30"));
  setHabilitarTarde(turnos.includes("17:30-20:30"));

  window.scrollTo({ top: 0, behavior: "smooth" });
};

  const eliminarHabilitacion = async (fecha) => {
    const confirmar = window.confirm(
      `¿Seguro que quieres quitar la habilitación de la fecha ${fechaDMA(fecha)}?`
    );

    if (!confirmar) return;

    try {
      setEliminandoFecha(fecha);
      await remove(ref(dbRealtime, `fechasHabilitadas/${fecha}`));
      await cargarFechasHabilitadas();
    } catch (error) {
      console.error("Error al eliminar habilitación:", error);
      alert("No se pudo eliminar la habilitación.");
    } finally {
      setEliminandoFecha("");
    }
  };

  const habilitacionesActivas = useMemo(() => {
    return fechasHabilitadas.filter((f) => f.habilitada);
  }, [fechasHabilitadas]);

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

        <h1 style={styles.titulo}>Habilitar fechas y Turnos</h1>
        <p style={styles.subtitulo}>
          Aquí puedes abrir días especiales para que sí se puedan reservar.
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
              placeholder="Ej: apertura especial, grupo confirmado, taller abierto..."
              style={styles.input}
            />
          </div>

          <div style={styles.campo}>
            <label style={styles.label}>Turnos habilitados</label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={habilitarManana}
                onChange={(e) => setHabilitarManana(e.target.checked)}
              />
              Mañana
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={habilitarTarde}
                onChange={(e) => setHabilitarTarde(e.target.checked)}
              />
              Tarde
            </label>
            <p style={styles.avisoTurnos}>
  Debes marcar solo los turnos que quieras habilitar. Si marcas mañana y tarde,
  la fecha quedará abierta en ambos turnos.
</p>
{fechaEditando && (
  <p style={styles.avisoEdicion}>
    Estás modificando la fecha {fechaDMA(fechaEditando)}. Revisa bien los turnos marcados
    antes de guardar los cambios.
  </p>
)}
          </div>

          <button
            onClick={guardarHabilitacion}
            style={styles.botonGuardar}
            disabled={guardando}
          >
            {guardando
  ? "Guardando..."
  : fechaEditando
  ? "Guardar cambios"
  : "Habilitar fechas"}
          </button>
        </div>

        <div style={styles.card}>
          <h2 style={styles.subtituloBloque}>Fechas habilitadas</h2>

          {habilitacionesActivas.length === 0 ? (
            <p style={styles.textoVacio}>No hay fechas habilitadas.</p>
          ) : (
            <div style={styles.lista}>
              {habilitacionesActivas.map((f) => (
                <div
  key={f.fecha}
  style={{
    ...styles.item,
    ...(isMobile ? styles.itemMobile : {}),
  }}
>
                  <div>
                    <p style={styles.fecha}>{fechaDMA(f.fecha)}</p>
                    <p style={styles.motivo}>{f.motivo || "Sin motivo"}</p>
                    <p style={styles.turnos}>
                      Turnos:{" "}
                      {f.turnosHabilitados?.length
                        ? f.turnosHabilitados.join(" / ")
                        : "Todos los turnos"}
                    </p>
                  </div>

                  <div
  style={{
    ...styles.accionesItem,
    ...(isMobile ? styles.accionesItemMobile : {}),
  }}
>
                    <button
                      onClick={() => modificarHabilitacion(f)}
                      style={{
  ...styles.botonModificar,
  ...(isMobile ? styles.botonItemMobile : {}),
}}
                    >
                      Modificar
                    </button>

                    <button
                      onClick={() => eliminarHabilitacion(f.fecha)}
                      style={{
  ...styles.botonEliminar,
  ...(isMobile ? styles.botonItemMobile : {}),
}}
                      disabled={eliminandoFecha === f.fecha}
                    >
                      {eliminandoFecha === f.fecha
                        ? "Quitando..."
                        : "Quitar habilitación"}
                    </button>
                  </div>
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
itemMobile: {
  flexDirection: "column",
  alignItems: "stretch",
},
botonItemMobile: {
  width: "100%",
},
  container: {
    maxWidth: 900,
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 28,
    boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
  },
  accionesItemMobile: {
  width: "100%",
  flexDirection: "column",
  alignItems: "stretch",
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
  avisoTurnos: {
  margin: "4px 0 0 0",
  color: "#8a6d3b",
  fontSize: "0.85rem",
  lineHeight: 1.4,
},
avisoEdicion: {
  margin: "8px 0 0 0",
  color: "#8a3b3b",
  fontSize: "0.85rem",
  fontWeight: 600,
  lineHeight: 1.4,
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
  turnos: {
    margin: "4px 0 0 0",
    color: "#5b4a2d",
    fontSize: "0.9rem",
    fontWeight: 600,
  },
  accionesItem: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexShrink: 0,
  },
  botonModificar: {
    padding: "10px 12px",
    border: "1px solid #e5d8b8",
    backgroundColor: "#fff8da",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    color: "#5b4a2d",
    flexShrink: 0,
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
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: "0.95rem",
    color: "#5b4a2d",
  },
  textoVacio: {
    color: "#777",
    fontStyle: "italic",
  },
};

export default AdminHabilitarFechas;