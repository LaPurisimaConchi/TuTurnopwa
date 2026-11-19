import React, { useEffect, useMemo, useState } from "react";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import { fechaDMA } from "./utils/formatoFecha";
import { CARPETA_BONO_ANTIGUO } from "./utils/estadoBono";
import { esReservaValida } from "./utils/plazasOcupadas";

const AdminHistorialNuevo = () => {
  const [reservas, setReservas] = useState([]);
  const [clasesDisponibles, setClasesDisponibles] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [vista, setVista] = useState("pasadas"); // pasadas | canceladas | todas
  const [filtroClase, setFiltroClase] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

useEffect(() => {
  const onResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", onResize);

  return () => window.removeEventListener("resize", onResize);
}, []);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [clasesSnap, reservasSnap, gruposSnap] = await Promise.all([
          get(ref(dbRealtime, "clases")),
          get(ref(dbRealtime, "reservas")),
          get(ref(dbRealtime, "reservasGrupos")),
        ]);

        const mapaClases = {};
        // Carpeta de reservas → id del taller: los talleres migrados guardan sus
        // reservas en su carpeta antigua (reservasPath) y los bonos de siempre en la suya
        const tallerDeCarpeta = {};
        Object.entries(CARPETA_BONO_ANTIGUO).forEach(([claseId, carpeta]) => {
          tallerDeCarpeta[carpeta] = claseId;
        });
        const listaClases = [];

        if (clasesSnap.exists()) {
          clasesSnap.forEach((claseSnap) => {
            const claseId = claseSnap.key;
            const claseData = claseSnap.val() || {};
            const nombre = claseData.nombre || claseId;
            const orden = Number(claseData.orden || 9999);

            mapaClases[claseId] = {
              nombre,
              orden,
            };
            tallerDeCarpeta[claseId] = claseId;
            if (claseData.reservasPath) tallerDeCarpeta[claseData.reservasPath] = claseId;

            listaClases.push({
              id: claseId,
              nombre,
              orden,
            });
          });
        }

        const datos = [];

        if (reservasSnap.exists()) {
          reservasSnap.forEach((claseSnap) => {
            const carpeta = claseSnap.key;
            // Las carpetas que no son de ningún taller actual también salen (con su nombre)
            const claseKey = tallerDeCarpeta[carpeta] || carpeta;

            claseSnap.forEach((fechaSnap) => {
              const fechaKey = fechaSnap.key;

              fechaSnap.forEach((turnoSnap) => {
                const turnoKey = turnoSnap.key;

                turnoSnap.forEach((nivelSnap) => {
                  const nivelVal = nivelSnap.val();
                  if (!nivelVal || typeof nivelVal !== "object") return;

                  const procesarReserva = (reserva, metodoPorDefecto = "—") => {
                    if (!reserva || typeof reserva !== "object") return;

                    datos.push({
                      id:
                        reserva.orderId ||
                        reserva.id ||
                        `${claseKey}-${fechaKey}-${turnoKey}-${Math.random()}`,
                      claseId: tallerDeCarpeta[reserva.claseId] || reserva.claseId || claseKey,
                      clase:
                        reserva.clase ||
                        mapaClases[claseKey]?.nombre ||
                        claseKey,
                      fecha: reserva.fecha || fechaKey,
                      turno: reserva.turno || turnoKey,
                      metodo:
                        reserva.metodo || reserva.modalidad || reserva.tipoClase || metodoPorDefecto,
                      plazas: Number(reserva.plazas || 1),
                      estado: reserva.estado || "—",
                      estadoPago: reserva.estadoPago || "—",
                      cancelada: reserva.cancelada === true || reserva.estado === "Cancelada",
                      desdeBono: reserva.desdeBono === true,
                      precioTotal: Number(
                        reserva.precioTotal ||
                          reserva.precioUnitario ||
                          reserva.precio ||
                          0
                      ),
                    });
                  };

                  const pareceReservaDirecta =
                    "fecha" in nivelVal ||
                    "estado" in nivelVal ||
                    "estadoPago" in nivelVal ||
                    "uid" in nivelVal ||
                    "orderId" in nivelVal;

                  if (pareceReservaDirecta) {
                    procesarReserva(nivelVal);
                    return;
                  }

                  nivelSnap.forEach((reservaSnap) => {
                    procesarReserva(reservaSnap.val(), nivelSnap.key);
                  });
                });
              });
            });
          });
        }

        // Reservas de grupo (reservasGrupos), como en el listado de reservas
        if (gruposSnap.exists()) {
          gruposSnap.forEach((grupoSnap) => {
            const grupo = grupoSnap.val();
            if (!grupo || typeof grupo !== "object" || !grupo.fecha) return;

            datos.push({
              id: grupo.orderId || grupoSnap.key,
              claseId: grupo.tallerId || "reserva-grupo",
              clase: grupo.clase || "Reserva de grupo",
              fecha: grupo.fecha,
              turno: grupo.turno || "—",
              metodo: "grupo",
              plazas: Number(grupo.plazas || 1),
              estado: grupo.estado || "—",
              estadoPago: grupo.estadoPago || "—",
              cancelada: grupo.cancelada === true || grupo.estado === "Cancelada",
              desdeBono: false,
              precioTotal: Number(grupo.precioTotal || grupo.precio || 0),
            });
          });
        }

        datos.sort((a, b) => {
          const fechaA = new Date(`${a.fecha}T00:00:00`);
          const fechaB = new Date(`${b.fecha}T00:00:00`);
          if (fechaB - fechaA !== 0) return fechaB - fechaA;
          return (a.turno || "").localeCompare(b.turno || "", "es");
        });

        listaClases.sort((a, b) => {
          if (a.orden !== b.orden) return a.orden - b.orden;
          return a.nombre.localeCompare(b.nombre, "es");
        });

        setClasesDisponibles(listaClases);
        setReservas(datos);
      } catch (error) {
        console.error("Error al cargar historial:", error);
        setReservas([]);
        setClasesDisponibles([]);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  const reservasFiltradas = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return reservas.filter((r) => {
      const fecha = new Date(`${r.fecha}T00:00:00`);
      const esCancelada = r.cancelada;
      // Pasadas: las que se celebraron (confirmadas y pagadas); los pagos que no se
      // completaron no son reservas y no salen
      const esPasada = fecha < hoy && !esCancelada && esReservaValida(r);

      let cumpleVista = true;

      if (vista === "pasadas") cumpleVista = esPasada;
      if (vista === "canceladas") cumpleVista = esCancelada;
      if (vista === "todas") cumpleVista = esPasada || esCancelada;

      const cumpleClase = !filtroClase || r.claseId === filtroClase;
      const cumpleFecha = !filtroFecha || r.fecha === filtroFecha;

      return cumpleVista && cumpleClase && cumpleFecha;
    });
  }, [reservas, vista, filtroClase, filtroFecha]);

  const limpiarFiltros = () => {
    setFiltroClase("");
    setFiltroFecha("");
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
          <h1 style={styles.titulo}>Historial</h1>
          <p style={styles.subtitulo}>
            Consulta reservas pasadas y canceladas del taller.
          </p>
        </div>

        <div style={styles.filtrosBox}>
          <div style={styles.botonesVista}>
            <button
              style={vista === "pasadas" ? styles.botonActivo : styles.botonVista}
              onClick={() => setVista("pasadas")}
            >
              Pasadas
            </button>
            <button
              style={vista === "canceladas" ? styles.botonActivo : styles.botonVista}
              onClick={() => setVista("canceladas")}
            >
              Canceladas
            </button>
            <button
              style={vista === "todas" ? styles.botonActivo : styles.botonVista}
              onClick={() => setVista("todas")}
            >
              Todas
            </button>
          </div>

          <div style={styles.filtrosGrid}>
            <div style={styles.campo}>
              <label style={styles.label}>Clase</label>
              <select
                value={filtroClase}
                onChange={(e) => setFiltroClase(e.target.value)}
                style={styles.input}
              >
                <option value="">Todas</option>
                {clasesDisponibles.map((clase) => (
                  <option key={clase.id} value={clase.id}>
                    {clase.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.campo}>
              <label style={styles.label}>Fecha</label>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <button onClick={limpiarFiltros} style={styles.botonSecundario}>
            Limpiar filtros
          </button>
        </div>

        <div style={styles.resumen}>
          <span style={styles.resumenTexto}>
            Total mostradas: <strong>{reservasFiltradas.length}</strong>
          </span>
        </div>

        {cargando ? (
          <p style={styles.mensaje}>Cargando historial...</p>
        ) : reservasFiltradas.length === 0 ? (
          <p style={styles.mensaje}>No hay reservas para mostrar.</p>
        ) : (
          <div
  style={{
    ...styles.tablaWrapper,
    ...(isMobile ? styles.tablaWrapperMobile : {}),
  }}
>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Turno</th>
                  <th style={styles.th}>Clase</th>
                  <th style={styles.th}>Método</th>
                  <th style={styles.th}>Plazas</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Pago</th>
                  <th style={styles.th}>Precio</th>
                </tr>
              </thead>
              <tbody>
                {reservasFiltradas.map((r, index) => (
                  <tr key={`${r.id}-${index}`}>
                    <td style={styles.td}>{fechaDMA(r.fecha)}</td>
                    <td style={styles.td}>{r.turno}</td>
                    <td style={styles.td}>{r.clase}</td>
                    <td style={styles.td}>{r.metodo}</td>
                    <td style={styles.td}>{r.plazas}</td>
                    <td style={styles.td}>{r.estado}</td>
                    <td style={styles.td}>{r.estadoPago}</td>
                    <td style={styles.td}>{r.precioTotal}€</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
tablaWrapperMobile: {
  marginLeft: -4,
  marginRight: -4,
},
  container: {
    maxWidth: 1200,
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
    marginBottom: 24,
  },
  titulo: {
    margin: 0,
    color: "#3f3128",
    fontSize: "2rem",
  },
  subtitulo: {
    marginTop: 8,
    color: "#7a6858",
  },
  filtrosBox: {
    backgroundColor: "#fdfaf5",
    border: "1px solid #eadfd2",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  botonesVista: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  botonVista: {
    padding: "10px 14px",
    border: "1px solid #eadfd2",
    backgroundColor: "#fdfaf5",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    color: "#3f3128",
  },
  botonActivo: {
    padding: "10px 14px",
    border: "1px solid #d8c89f",
    backgroundColor: "#fff6d6",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
    color: "#3f3128",
  },
  filtrosGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 14,
  },
  campo: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
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
  botonSecundario: {
    padding: "10px 14px",
    border: "1px solid #eadfd2",
    backgroundColor: "#fff6d6",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    color: "#3f3128",
  },
  resumen: {
    marginBottom: 14,
  },
  resumenTexto: {
    color: "#3f3128",
    fontSize: "0.96rem",
  },
  mensaje: {
    textAlign: "center",
    color: "#7a6858",
    padding: 20,
  },
  tablaWrapper: {
    overflowX: "auto",
    borderRadius: 18,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#fdfaf5",
  },
  th: {
    textAlign: "left",
    padding: 14,
    backgroundColor: "#fff6d6",
    color: "#3f3128",
    borderBottom: "1px solid #eadfd2",
    fontSize: "0.95rem",
  },
  td: {
    padding: 14,
    borderBottom: "1px solid #f6efe6",
    color: "#333",
    fontSize: "0.95rem",
  },
};

export default AdminHistorialNuevo;