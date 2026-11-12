import React, { useEffect, useMemo, useState } from "react";
import { ref, get } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";

import { fechaDMA } from "./utils/formatoFecha";
function obtenerEstadoVisibleBono(bono) {
  if (!bono) return "—";

  const restantes = Number(bono.clasesRestantes || 0);
  const estadoGuardado = String(bono.estadoBono || "").toLowerCase();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let fechaCaducidad = null;
  if (bono.fechaCaducidadBono) {
    fechaCaducidad = new Date(`${bono.fechaCaducidadBono}T00:00:00`);
  }

  const estaCaducado =
    fechaCaducidad instanceof Date &&
    !isNaN(fechaCaducidad.getTime()) &&
    hoy > fechaCaducidad;

  if (estadoGuardado === "caducado" || estaCaducado) {
    return "Caducado";
  }

  if (estadoGuardado === "agotado" || restantes <= 0) {
    return "Agotado";
  }

  return "Activo";
}

const AdminBonosNuevo = () => {
  const navigate = useNavigate();

  const [bonos, setBonos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [esMovil, setEsMovil] = useState(() => window.innerWidth <= 768);

  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPago, setFiltroPago] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");

  useEffect(() => {
    const handleResize = () => {
      setEsMovil(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const cargarBonos = async () => {
      setCargando(true);

      try {
        const usuariosSnap = await get(ref(dbRealtime, "usuarios"));
        const listaBonos = [];

        if (usuariosSnap.exists()) {
          usuariosSnap.forEach((usuarioSnap) => {
            const uid = usuarioSnap.key;
            const usuario = usuarioSnap.val() || {};
            const bonosUsuario = usuario.bonos || {};

            Object.entries(bonosUsuario).forEach(([bonoId, bono]) => {
              if (!bono || typeof bono !== "object") return;

              const notasObj = bono.notasInternas || {};
              const totalNotas =
                notasObj && typeof notasObj === "object"
                  ? Object.keys(notasObj).length
                  : 0;

              listaBonos.push({
                bonoId,
                uid,
               nombreUsuario: usuario.nombre || "",
emailUsuario: usuario.email || "",
telefonoUsuario:
  usuario.telefono ||
  usuario.phoneNumber ||
  usuario.phone ||
  "",
                clase: bono.clase || "Bono",
                claseId: bono.claseId || "",
                fechaInicio: bono.fechaInicio || "",
                fechaCaducidadBono: bono.fechaCaducidadBono || "",
                numeroClases: Number(bono.numeroClases || 0),
                clasesConsumidas: Number(bono.clasesConsumidas || 0),
                clasesRestantes: Number(bono.clasesRestantes || 0),
                estadoBono: bono.estadoBono || "activo",
                estadoPago: bono.estadoPago || "—",
                precioTotal: Number(bono.precioTotal || bono.precioBase || 0),
                creadoEn: bono.creadoEn || "",
                actualizadoEn: bono.actualizadoEn || "",
                orderId: bono.orderId || bonoId,
                totalNotas,
                tieneNotas: totalNotas > 0,
              });
            });
          });
        }

        listaBonos.sort((a, b) => {
          const fechaA = new Date(a.actualizadoEn || a.creadoEn || 0);
          const fechaB = new Date(b.actualizadoEn || b.creadoEn || 0);
          return fechaB - fechaA;
        });

        setBonos(listaBonos);
      } catch (error) {
        console.error("Error al cargar bonos:", error);
        setBonos([]);
      } finally {
        setCargando(false);
      }
    };

    cargarBonos();
  }, []);

  const bonosFiltrados = useMemo(() => {
    return bonos.filter((bono) => {
      const estadoVisible = obtenerEstadoVisibleBono(bono);
      const texto = filtroTexto.trim().toLowerCase();

      const cumpleEstado = !filtroEstado || estadoVisible === filtroEstado;
      const cumplePago = !filtroPago || bono.estadoPago === filtroPago;

      const cumpleTexto =
        !texto ||
        bono.clase.toLowerCase().includes(texto) ||
        bono.uid.toLowerCase().includes(texto) ||
        bono.nombreUsuario.toLowerCase().includes(texto) ||
        bono.emailUsuario.toLowerCase().includes(texto) ||
        bono.orderId.toLowerCase().includes(texto);

      return cumpleEstado && cumplePago && cumpleTexto;
    });
  }, [bonos, filtroEstado, filtroPago, filtroTexto]);

  const limpiarFiltros = () => {
    setFiltroEstado("");
    setFiltroPago("");
    setFiltroTexto("");
  };

  const renderEstado = (bono) => {
    const estado = obtenerEstadoVisibleBono(bono);

    if (estado === "Caducado") {
      return <span style={styles.badgeCaducado}>Caducado</span>;
    }

    if (estado === "Agotado") {
      return <span style={styles.badgeAgotado}>Agotado</span>;
    }

    return <span style={styles.badgeActivo}>Activo</span>;
  };

  const renderNotasBadge = (bono) => {
    if (!bono.tieneNotas) {
      return <span style={styles.badgeSinNotas}>Sin notas</span>;
    }

    return (
      <span style={styles.badgeConNotas}>
        {bono.totalNotas === 1
          ? "1 nota"
          : `${bono.totalNotas} notas`}
      </span>
    );
  };

  const irADetalleBono = (bono) => {
    navigate(`/admin-detalle-bono?id=${bono.bonoId}&uid=${bono.uid}`);
  };

  return (
    <div
  style={{
    ...styles.body,
    ...(esMovil ? styles.bodyMobile : {}),
  }}
>
  <div
    style={{
      ...styles.container,
      ...(esMovil ? styles.containerMobile : {}),
    }}
  >
        <BotonVolver />

        <h1 style={styles.titulo}>Bonos</h1>
        <p style={styles.subtitulo}>
          Vista general de los bonos comprados por los usuarios.
        </p>

        <div style={styles.filtrosBox}>
          <div style={styles.filtrosGrid}>
            <div style={styles.campo}>
              <label style={styles.label}>Buscar</label>
              <input
                type="text"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Clase, usuario, email, orderId..."
                style={styles.input}
              />
            </div>

            <div style={styles.campo}>
              <label style={styles.label}>Estado bono</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                style={styles.input}
              >
                <option value="">Todos</option>
                <option value="Activo">Activo</option>
                <option value="Agotado">Agotado</option>
                <option value="Caducado">Caducado</option>
              </select>
            </div>

            <div style={styles.campo}>
              <label style={styles.label}>Estado pago</label>
              <select
                value={filtroPago}
                onChange={(e) => setFiltroPago(e.target.value)}
                style={styles.input}
              >
                <option value="">Todos</option>
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
          </div>

          <button onClick={limpiarFiltros} style={styles.botonSecundario}>
            Limpiar filtros
          </button>
        </div>

        <div style={styles.resumen}>
          <span style={styles.resumenTexto}>
            Total mostrados: <strong>{bonosFiltrados.length}</strong>
          </span>
        </div>

        {cargando ? (
          <p style={styles.mensaje}>Cargando bonos...</p>
        ) : bonosFiltrados.length === 0 ? (
          <p style={styles.mensaje}>No hay bonos para mostrar.</p>
        ) : esMovil ? (
          <div style={styles.cardsWrapper}>
            {bonosFiltrados.map((bono) => (
              <div
                key={bono.bonoId}
                style={styles.cardMovil}
                onClick={() => irADetalleBono(bono)}
              >
                <div style={styles.cardTop}>
                  <div>
                    <p style={styles.cardFecha}>{bono.fechaInicio || "—"}</p>
                    <p style={styles.cardTurno}>
                      Caduca: {fechaDMA(bono.fechaCaducidadBono) || "—"}
                    </p>
                  </div>
                  <div>{renderEstado(bono)}</div>
                </div>

                <div style={styles.cardBloque}>
                  <p style={styles.cardTitulo}>{bono.clase}</p>

                  <div style={styles.badgesFila}>
                    {renderNotasBadge(bono)}
                  </div>

                 <p style={styles.cardTexto}>
  <strong>Usuario:</strong>{" "}
  {bono.nombreUsuario || bono.emailUsuario || bono.uid}
</p>

{bono.telefonoUsuario && (
  <>
    <p style={styles.cardTexto}>
      <strong>Teléfono:</strong> {bono.telefonoUsuario}
    </p>

    <a
      href={`https://wa.me/34${String(
        bono.telefonoUsuario
      ).replace(/\D/g, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      style={styles.btnWhatsApp}
      onClick={(e) => e.stopPropagation()}
    >
      WhatsApp usuario
    </a>
  </>
)}

                  <div style={styles.cardGrid}>
                    <p style={styles.cardTexto}>
                      <strong>Incluidas:</strong> {bono.numeroClases}
                    </p>
                    <p style={styles.cardTexto}>
                      <strong>Consumidas:</strong> {bono.clasesConsumidas}
                    </p>
                    <p style={styles.cardTexto}>
                      <strong>Restantes:</strong> {bono.clasesRestantes}
                    </p>
                    <p style={styles.cardTexto}>
                      <strong>Pago:</strong> {bono.estadoPago}
                    </p>
                    <p style={styles.cardTexto}>
                      <strong>Precio:</strong> {bono.precioTotal}€
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.tablaWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.thInicio}>Inicio</th>
                  <th style={styles.thBono}>Bono</th>
                  <th style={styles.thUsuario}>Usuario</th>
                  <th style={styles.thNotas}>Notas</th>
                  <th style={styles.thEstado}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {bonosFiltrados.map((bono) => (
                  <tr
                    key={bono.bonoId}
                    style={styles.trClickable}
                    onClick={() => irADetalleBono(bono)}
                  >
                    <td style={styles.tdInicio}>{bono.fechaInicio || "—"}</td>
                    <td style={styles.tdClase}>{bono.clase}</td>
                   <td style={styles.tdUsuario}>
  <strong>
    {bono.nombreUsuario || bono.emailUsuario || bono.uid}
  </strong>

  {bono.telefonoUsuario && (
    <>
      <br />
      <span>{bono.telefonoUsuario}</span>

      <br />

      <a
        href={`https://wa.me/34${String(
          bono.telefonoUsuario
        ).replace(/\D/g, "")}`}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.btnWhatsAppMini}
        onClick={(e) => e.stopPropagation()}
      >
        WhatsApp
      </a>
    </>
  )}
</td>
                    <td style={styles.tdNotas}>{renderNotasBadge(bono)}</td>
                    <td style={styles.tdEstado}>{renderEstado(bono)}</td>
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
    backgroundColor: "#fdf8ee",
    minHeight: "100vh",
    padding: 30,
    fontFamily: "'Segoe UI', sans-serif",
  },
  bodyMobile: {
  padding: 4,
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
  titulo: {
    margin: 0,
    textAlign: "center",
    color: "#2f2f2f",
    fontSize: "2rem",
  },
  subtitulo: {
    textAlign: "center",
    color: "#7a7a7a",
    marginTop: 8,
    marginBottom: 24,
  },
  filtrosBox: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  filtrosGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
    marginBottom: 14,
    alignItems: "end",
  },
  campo: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
  },
  label: {
    fontSize: "0.92rem",
    fontWeight: 600,
    color: "#5b4a2d",
  },
  input: {
    width: "100%",
    minHeight: "44px",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5d8b8",
    fontSize: "0.95rem",
    backgroundColor: "#fffaf0",
    boxSizing: "border-box",
    appearance: "auto",
  },
  botonSecundario: {
    padding: "10px 14px",
    border: "1px solid #e5d8b8",
    backgroundColor: "#fff8da",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    color: "#5b4a2d",
    alignSelf: "flex-start",
  },
  btnWhatsApp: {
  display: "inline-block",
  marginTop: 8,
  backgroundColor: "#25D366",
  color: "white",
  padding: "8px 14px",
  borderRadius: 20,
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "0.85rem",
  alignSelf: "flex-start",
},

btnWhatsAppMini: {
  display: "inline-block",
  marginTop: 6,
  backgroundColor: "#25D366",
  color: "white",
  padding: "5px 10px",
  borderRadius: 16,
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "0.78rem",
},
  resumen: {
    marginBottom: 14,
  },
  resumenTexto: {
    color: "#4b3a2a",
    fontSize: "0.96rem",
  },
  mensaje: {
    textAlign: "center",
    color: "#7a7a7a",
    padding: 20,
  },
  tablaWrapper: {
    overflowX: "hidden",
    borderRadius: 18,
    border: "1px solid #f0e5cf",
    backgroundColor: "#fffdf7",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#fffdf7",
    overflow: "hidden",
    tableLayout: "fixed",
  },
  thInicio: {
    textAlign: "left",
    padding: "12px 10px",
    backgroundColor: "#fff8da",
    color: "#5b4a2d",
    borderBottom: "1px solid #f0e5cf",
    fontSize: "0.95rem",
    whiteSpace: "nowrap",
    width: "14%",
  },
  thBono: {
    textAlign: "left",
    padding: "12px 10px",
    backgroundColor: "#fff8da",
    color: "#5b4a2d",
    borderBottom: "1px solid #f0e5cf",
    fontSize: "0.95rem",
    width: "34%",
  },
  thUsuario: {
    textAlign: "left",
    padding: "12px 10px",
    backgroundColor: "#fff8da",
    color: "#5b4a2d",
    borderBottom: "1px solid #f0e5cf",
    fontSize: "0.95rem",
    width: "22%",
  },
  thNotas: {
    textAlign: "left",
    padding: "12px 10px",
    backgroundColor: "#fff8da",
    color: "#5b4a2d",
    borderBottom: "1px solid #f0e5cf",
    fontSize: "0.95rem",
    width: "14%",
  },
  thEstado: {
    textAlign: "left",
    padding: "12px 10px",
    backgroundColor: "#fff8da",
    color: "#5b4a2d",
    borderBottom: "1px solid #f0e5cf",
    fontSize: "0.95rem",
    whiteSpace: "nowrap",
    width: "16%",
  },
  tdInicio: {
    padding: "12px 10px",
    borderBottom: "1px solid #f3ead7",
    color: "#333",
    fontSize: "0.95rem",
    verticalAlign: "middle",
    wordBreak: "break-word",
  },
  tdClase: {
    padding: "12px 10px",
    borderBottom: "1px solid #f3ead7",
    color: "#333",
    fontSize: "0.95rem",
    verticalAlign: "middle",
    wordBreak: "break-word",
  },
  tdUsuario: {
    padding: "12px 10px",
    borderBottom: "1px solid #f3ead7",
    color: "#333",
    fontSize: "0.95rem",
    verticalAlign: "middle",
    wordBreak: "break-word",
  },
  tdNotas: {
    padding: "12px 10px",
    borderBottom: "1px solid #f3ead7",
    verticalAlign: "middle",
  },
  tdEstado: {
    padding: "12px 10px",
    borderBottom: "1px solid #f3ead7",
    color: "#333",
    fontSize: "0.95rem",
    verticalAlign: "middle",
  },
  trClickable: {
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  cardsWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
 cardMovil: {
  backgroundColor: "#fffdf7",
  border: "1px solid #f0e5cf",
  borderRadius: 18,
  padding: 12,
  boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
  cursor: "pointer",
},
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  cardFecha: {
    margin: 0,
    fontWeight: 700,
    color: "#4b3a2a",
    fontSize: "1rem",
  },
  cardTurno: {
    margin: "4px 0 0 0",
    color: "#7a6a58",
    fontSize: "0.9rem",
  },
  cardBloque: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  cardTitulo: {
    margin: 0,
    color: "#2f2f2f",
    fontWeight: 700,
    fontSize: "1rem",
  },
  cardTexto: {
    margin: 0,
    color: "#4a4a4a",
    fontSize: "0.93rem",
    lineHeight: 1.45,
  },
  cardGrid: {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 6,
  marginTop: 4,
},
  badgesFila: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
    marginBottom: 2,
  },
  badgeActivo: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    backgroundColor: "#e7f7e7",
    border: "1px solid #b7dfb7",
    color: "#2f6b2f",
    fontSize: "0.85rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  badgeAgotado: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    backgroundColor: "#f1ece4",
    border: "1px solid #d8cbbb",
    color: "#6f5d47",
    fontSize: "0.85rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  badgeCaducado: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    backgroundColor: "#fbe1e1",
    border: "1px solid #e7b7b7",
    color: "#8a3b3b",
    fontSize: "0.85rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  badgeConNotas: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    backgroundColor: "#fff4dd",
    border: "1px solid #e8d0a1",
    color: "#7a6331",
    fontSize: "0.82rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  badgeSinNotas: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    backgroundColor: "#f7f3ec",
    border: "1px solid #ddd2c0",
    color: "#7b6f60",
    fontSize: "0.82rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
};

export default AdminBonosNuevo;