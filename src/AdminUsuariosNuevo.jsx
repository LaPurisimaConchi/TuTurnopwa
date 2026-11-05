import React, { useEffect, useMemo, useState } from "react";
import { ref, get } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";

const AdminUsuariosNuevo = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

useEffect(() => {
  const onResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", onResize);

  return () => window.removeEventListener("resize", onResize);
}, []);
  const navigate = useNavigate();

  useEffect(() => {
    const cargarUsuarios = async () => {
      try {
        const [usuariosSnap, usuariosNotasSnap] = await Promise.all([
          get(ref(dbRealtime, "usuarios")),
          get(ref(dbRealtime, "usuariosNotas")),
        ]);

        const mapaNotas = {};

        if (usuariosNotasSnap.exists()) {
          usuariosNotasSnap.forEach((usuarioNotaSnap) => {
            const uid = usuarioNotaSnap.key;
            const notasInternas = usuarioNotaSnap.child("notasInternas");

            let totalNotas = 0;

            if (notasInternas.exists()) {
              notasInternas.forEach(() => {
                totalNotas += 1;
              });
            }

            mapaNotas[uid] = totalNotas;
          });
        }

        const datos = [];

        if (usuariosSnap.exists()) {
          usuariosSnap.forEach((usuarioSnap) => {
            const uid = usuarioSnap.key;
            const data = usuarioSnap.val() || {};

            const reservasUsuario =
              data.reservas && typeof data.reservas === "object"
                ? Object.keys(data.reservas).length
                : data.listaReservas && typeof data.listaReservas === "object"
                ? Object.keys(data.listaReservas).length
                : 0;

            datos.push({
              uid,
              nombre: data.nombre || data.displayName || "Sin nombre",
              email: data.email || "Sin email",
              telefono: data.telefono || data.phoneNumber || "",
              reservas: reservasUsuario,
              notasInternas: mapaNotas[uid] || 0,
              invitado: data.invitado === true,
            });
          });
        }

        datos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        setUsuarios(datos);
      } catch (error) {
        console.error("Error al cargar usuarios:", error);
        setUsuarios([]);
      } finally {
        setCargando(false);
      }
    };

    cargarUsuarios();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return usuarios;

    return usuarios.filter((u) => {
      return (
        u.nombre.toLowerCase().includes(texto) ||
        u.email.toLowerCase().includes(texto) ||
        u.uid.toLowerCase().includes(texto) ||
        (u.telefono || "").toLowerCase().includes(texto)
      );
    });
  }, [usuarios, busqueda]);

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
          <h1 style={styles.titulo}>Usuarios</h1>
          <p style={styles.subtitulo}>
            Listado general de usuarios registrados en la app.
          </p>
        </div>

        <div style={styles.buscadorBox}>
          <label style={styles.label}>Buscar usuario</label>
          <input
            type="text"
            placeholder="Busca por nombre, email, teléfono o UID"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.resumen}>
          <span style={styles.resumenTexto}>
            Total mostrados: <strong>{usuariosFiltrados.length}</strong>
          </span>
        </div>

        {cargando ? (
          <p style={styles.mensaje}>Cargando usuarios...</p>
        ) : usuariosFiltrados.length === 0 ? (
          <p style={styles.mensaje}>No hay usuarios para mostrar.</p>
        ) : (
        <div
  style={{
    ...styles.grid,
    ...(isMobile ? styles.gridMobile : {}),
  }}
>
            {usuariosFiltrados.map((usuario) => (
              <div
                key={usuario.uid}
                style={{
  ...styles.card,
  ...(isMobile ? styles.cardMobile : {}),
}}
                onClick={() =>
                  navigate(`/admin-detalle-usuario?uid=${usuario.uid}`)
                }
              >
                <div
  style={{
    ...styles.cardTop,
    ...(isMobile ? styles.cardTopMobile : {}),
  }}
>
                  <div>
                    <h2 style={styles.nombre}>{usuario.nombre}</h2>
                    <p style={styles.email}>{usuario.email}</p>
                    {usuario.invitado && (
                      <p style={styles.email}>Compra sin registro (invitado)</p>
                    )}
                  </div>

                  <div style={styles.badgesCol}>
                    <span style={styles.badge}>
                      {usuario.reservas} reserva{usuario.reservas !== 1 ? "s" : ""}
                    </span>

                    {usuario.notasInternas > 0 ? (
                      <span style={styles.badgeNotas}>
                        {usuario.notasInternas} nota{usuario.notasInternas !== 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span style={styles.badgeNotasVacio}>Sin notas</span>
                    )}
                  </div>
                </div>

                <div style={styles.infoBox}>
                  <p style={styles.linea}>
                    <strong>UID:</strong> {usuario.uid}
                  </p>
                  <p style={styles.linea}>
  <strong>Teléfono:</strong> {usuario.telefono || "—"}
</p>

{usuario.telefono && (
  <a
    href={`https://wa.me/34${String(usuario.telefono).replace(/\D/g, "")}`}
    target="_blank"
    rel="noopener noreferrer"
    style={styles.btnWhatsApp}
    onClick={(e) => e.stopPropagation()}
  >
    WhatsApp usuario
  </a>
)}
                </div>
              </div>
            ))}
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
  header: {
    textAlign: "center",
    marginBottom: 24,
  },
  titulo: {
    margin: 0,
    color: "#2f2f2f",
    fontSize: "2rem",
  },
  subtitulo: {
    marginTop: 8,
    color: "#7a7a7a",
  },
  buscadorBox: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  label: {
    display: "block",
    marginBottom: 8,
    fontSize: "0.92rem",
    fontWeight: 600,
    color: "#5b4a2d",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #e5d8b8",
    fontSize: "0.95rem",
    backgroundColor: "#fffaf0",
    boxSizing: "border-box",
  },
  resumen: {
    marginBottom: 16,
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 18,
  },
  gridMobile: {
  gridTemplateColumns: "1fr",
  gap: 14,
},
  card: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 22,
    padding: 20,
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
    cursor: "pointer",
    transition: "0.2s",
  },
  cardMobile: {
  padding: 14,
},
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  cardTopMobile: {
  flexDirection: "column",
  alignItems: "stretch",
},
  nombre: {
    margin: 0,
    color: "#4b3a2a",
    fontSize: "1.1rem",
  },
  email: {
    margin: "6px 0 0 0",
    color: "#7a7a7a",
    fontSize: "0.92rem",
    wordBreak: "break-word",
  },
  badgesCol: {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  alignItems: "flex-start",
},
  badge: {
    backgroundColor: "#fff8da",
    color: "#7a6331",
    border: "1px solid #f1e7c6",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: "0.88rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  badgeNotas: {
    backgroundColor: "#f4f7ff",
    color: "#415a9c",
    border: "1px solid #d8e1ff",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: "0.85rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  badgeNotasVacio: {
    backgroundColor: "#fafafa",
    color: "#888",
    border: "1px solid #e5e5e5",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: "0.85rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  infoBox: {
    display: "grid",
    gap: 8,
  },
  linea: {
    margin: 0,
    color: "#333",
    fontSize: "0.94rem",
    wordBreak: "break-word",
  },
  btnWhatsApp: {
  display: "inline-block",
  marginTop: 6,
  backgroundColor: "#25D366",
  color: "white",
  padding: "8px 14px",
  borderRadius: 20,
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "0.85rem",
  width: "fit-content",
},
};

export default AdminUsuariosNuevo;