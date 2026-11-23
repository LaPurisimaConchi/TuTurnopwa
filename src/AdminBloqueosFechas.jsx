import React, { useEffect, useMemo, useState } from "react";
import { ref, get, update, remove } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";

import { fechaDMA, hoyMadrid } from "./utils/formatoFecha";
import { plazasEnBloqueo } from "./utils/aforo";
import { preguntar } from "./utils/avisos";
const AdminBloqueosFechas = () => {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [motivo, setMotivo] = useState("");
  const [bloqueos, setBloqueos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [eliminandoFecha, setEliminandoFecha] = useState("");
  const [verPasados, setVerPasados] = useState(false);
  const [limpiando, setLimpiando] = useState(false);
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

    const fechas = generarRangoFechas(fechaInicio, fechaFin);

    // Avisa si ya hay gente reservada: bloquear no cancela las reservas ni avisa al cliente
    try {
      const [reservasSnap, gruposSnap] = await Promise.all([
        get(ref(dbRealtime, "reservas")),
        get(ref(dbRealtime, "reservasGrupos")),
      ]);
      const { plazas, porFecha } = plazasEnBloqueo(reservasSnap, gruposSnap, fechas);
      if (plazas > 0) {
        const detalle = Object.keys(porFecha)
          .sort()
          .map((f) => `• ${fechaDMA(f)}: ${porFecha[f]} plaza${porFecha[f] !== 1 ? "s" : ""}`)
          .join("\n");
        const seguir = await preguntar(
          `Ya hay ${plazas} plaza${plazas !== 1 ? "s" : ""} reservada${plazas !== 1 ? "s" : ""} en esas fechas:\n${detalle}\n\n` +
            "Bloquear no cancela esas reservas ni avisa a los clientes: solo impide reservas nuevas. " +
            "Si hay que cancelarlas, hazlo desde el detalle de cada reserva. ¿Bloquear igualmente?"
        );
        if (!seguir) return;
      }
    } catch (error) {
      console.warn("No se pudieron comprobar las reservas existentes:", error);
    }

    try {
      setGuardando(true);

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
    const confirmar = await preguntar(
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

  const hoy = hoyMadrid();
  const bloqueosActivos = useMemo(() => {
    return bloqueos.filter((b) => b.bloqueado);
  }, [bloqueos]);
  // Los de días que ya pasaron no bloquean nada: se esconden salvo que se pidan
  const bloqueosPasados = bloqueosActivos.filter((b) => b.fecha < hoy);
  const bloqueosVisibles = verPasados ? bloqueosActivos : bloqueosActivos.filter((b) => b.fecha >= hoy);

  const limpiarPasados = async () => {
    if (!bloqueosPasados.length) return;
    const seguir = await preguntar(
      `¿Borrar los ${bloqueosPasados.length} bloqueos de días que ya han pasado? No afecta a ninguna reserva.`
    );
    if (!seguir) return;

    try {
      setLimpiando(true);
      const cambios = {};
      bloqueosPasados.forEach((b) => {
        cambios[`bloqueosFechas/${b.fecha}`] = null;
      });
      await update(ref(dbRealtime), cambios);
      await cargarBloqueos();
      alert("Bloqueos pasados borrados.");
    } catch (error) {
      console.error("Error al borrar bloqueos pasados:", error);
      alert("No se pudieron borrar los bloqueos pasados.");
    } finally {
      setLimpiando(false);
    }
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

          {bloqueosPasados.length > 0 && (
            <p style={styles.textoVacio}>
              {verPasados
                ? `Se enseñan también los ${bloqueosPasados.length} bloqueos de días pasados. `
                : `${bloqueosPasados.length} bloqueos de días pasados escondidos. `}
              <button
                type="button"
                onClick={() => setVerPasados((v) => !v)}
                style={{ background: "none", border: "none", color: "#1d4ed8", textDecoration: "underline", cursor: "pointer", padding: 0 }}
              >
                {verPasados ? "Esconderlos" : "Verlos"}
              </button>
              {" · "}
              <button
                type="button"
                onClick={limpiarPasados}
                disabled={limpiando}
                style={{ background: "none", border: "none", color: "#b91c1c", textDecoration: "underline", cursor: "pointer", padding: 0 }}
              >
                {limpiando ? "Borrando…" : "Borrarlos"}
              </button>
            </p>
          )}

          {bloqueosVisibles.length === 0 ? (
            <p style={styles.textoVacio}>No hay fechas bloqueadas.</p>
          ) : (
            <div style={styles.lista}>
              {bloqueosVisibles.map((b) => (
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
    color: "#3f3128",
    fontSize: "2rem",
  },
  subtitulo: {
    textAlign: "center",
    color: "#7a6858",
    marginTop: 8,
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#fdfaf5",
    border: "1px solid #eadfd2",
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
    color: "#3f3128",
  },
  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #eadfd2",
    fontSize: "0.95rem",
    backgroundColor: "#fdfaf5",
  },
  botonGuardar: {
    padding: "12px 16px",
    border: "1px solid #eadfd2",
    backgroundColor: "#fff6d6",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    color: "#3f3128",
  },
  subtituloBloque: {
    marginTop: 0,
    marginBottom: 14,
    color: "#3f3128",
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
    backgroundColor: "#fdfaf5",
    border: "1px solid #eadfd2",
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