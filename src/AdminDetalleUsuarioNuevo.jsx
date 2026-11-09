import React, { useEffect, useState } from "react";
import { ref, get, push, remove } from "firebase/database";
import { useNavigate, useSearchParams } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";

import { fechaDMA } from "./utils/formatoFecha";
function formatearFechaNota(fecha) {
  if (!fecha) return "Sin fecha";

  const fechaParseada = new Date(fecha);

  if (!isNaN(fechaParseada.getTime())) {
    return fechaParseada.toLocaleString("es-ES");
  }

  return fecha;
}

const AdminDetalleUsuarioNuevo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const uid = searchParams.get("uid");

  const [usuario, setUsuario] = useState(null);
  const [reservasUsuario, setReservasUsuario] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [notasInternas, setNotasInternas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [eliminandoNotaId, setEliminandoNotaId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

useEffect(() => {
  const onResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", onResize);

  return () => window.removeEventListener("resize", onResize);
}, []);

  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        if (!uid) {
          setCargando(false);
          return;
        }

        const snapshot = await get(ref(dbRealtime, `usuarios/${uid}`));

        if (!snapshot.exists()) {
          setUsuario(null);
          setReservasUsuario([]);
          setCargando(false);
          return;
        }

        const data = snapshot.val() || {};

        setUsuario({
          uid,
          nombre: data.nombre || data.displayName || "Sin nombre",
          email: data.email || "Sin email",
          telefono: data.telefono || data.phoneNumber || "",
        });

        let lista = [];

        if (data.reservas && typeof data.reservas === "object") {
          lista = Object.entries(data.reservas).map(([id, reserva]) => ({
            id,
            ...(reserva || {}),
          }));
        } else if (data.listaReservas && typeof data.listaReservas === "object") {
          lista = Object.entries(data.listaReservas).map(([id, reserva]) => ({
            id,
            ...(reserva || {}),
          }));
        }

        lista.sort((a, b) => {
          const fechaA = new Date(`${a.fecha || ""}T00:00:00`);
          const fechaB = new Date(`${b.fecha || ""}T00:00:00`);
          return fechaB - fechaA;
        });

        setReservasUsuario(lista);
      } catch (error) {
        console.error("Error al cargar detalle de usuario:", error);
        setUsuario(null);
        setReservasUsuario([]);
      } finally {
        setCargando(false);
      }
    };

    cargarUsuario();
  }, [uid]);

  useEffect(() => {
    const cargarNotasInternas = async () => {
      try {
        if (!uid) return;

        const notasSnap = await get(
          ref(dbRealtime, `usuariosNotas/${uid}/notasInternas`)
        );

        const listaNotas = [];

        if (notasSnap.exists()) {
          notasSnap.forEach((notaSnap) => {
            const nota = notaSnap.val();
            if (nota) {
              listaNotas.push({
                id: notaSnap.key,
                texto: nota.texto || "",
                fecha: nota.fecha || "Sin fecha",
              });
            }
          });
        }

        listaNotas.sort((a, b) => {
          const fechaA = new Date(a.fecha || 0);
          const fechaB = new Date(b.fecha || 0);
          return fechaB - fechaA;
        });

        setNotasInternas(listaNotas);
      } catch (error) {
        console.error("Error al cargar notas  del usuario:", error);
        setNotasInternas([]);
      }
    };

    cargarNotasInternas();
  }, [uid]);

  const guardarNotaInterna = async () => {
    const texto = nuevaNota.trim();

    if (!texto) {
      alert("Escribe una nota antes de guardar.");
      return;
    }

    try {
      setGuardandoNota(true);

      const nota = {
        texto,
        fecha: new Date().toISOString(),
      };

      const nuevaNotaRef = await push(
        ref(dbRealtime, `usuariosNotas/${uid}/notasInternas`),
        nota
      );

      setNotasInternas((prev) => [
        {
          id: nuevaNotaRef.key,
          ...nota,
        },
        ...prev,
      ]);

      setNuevaNota("");
    } catch (error) {
      console.error("Error al guardar nota interna del usuario:", error);
      alert(`No se pudo guardar la nota interna: ${error.message}`);
    } finally {
      setGuardandoNota(false);
    }
  };

  const eliminarNotaInterna = async (notaId) => {
    const confirmar = window.confirm(
      "¿Seguro que quieres borrar esta nota interna?"
    );

    if (!confirmar) return;

    try {
      setEliminandoNotaId(notaId);

      await remove(ref(dbRealtime, `usuariosNotas/${uid}/notasInternas/${notaId}`));

      setNotasInternas((prev) => prev.filter((nota) => nota.id !== notaId));
    } catch (error) {
      console.error("Error al borrar nota interna del usuario:", error);
      alert("No se pudo borrar la nota interna.");
    } finally {
      setEliminandoNotaId(null);
    }
  };

  if (cargando) {
    return <p style={styles.mensaje}>Cargando usuario...</p>;
  }

  if (!usuario) {
    return <p style={styles.mensaje}>Usuario no encontrado.</p>;
  }

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

        <h1 style={styles.titulo}>Detalle de usuario</h1>

        <div style={styles.card}>
          <p><strong>Nombre:</strong> {usuario.nombre}</p>
          <p><strong>Email:</strong> {usuario.email}</p>
          <p><strong>Teléfono:</strong> {usuario.telefono || "—"}</p>
          <p><strong>UID:</strong> {usuario.uid}</p>
          <p><strong>Total reservas guardadas:</strong> {reservasUsuario.length}</p>
        </div>

        <div style={styles.bloque}>
          <h2 style={styles.subtitulo}>Notas sobre el usuario</h2>

          {notasInternas.length === 0 ? (
            <p style={styles.textoVacio}>Aún no hay notas para este usuario.</p>
          ) : (
            <div style={styles.listaNotas}>
              {notasInternas.map((nota) => (
               <div
  key={nota.id}
  style={{
    ...styles.notaItem,
    ...(isMobile ? styles.notaItemMobile : {}),
  }}
>
                  <div
  style={{
    ...styles.notaHeader,
    ...(isMobile ? styles.notaHeaderMobile : {}),
  }}
>
                    <div>
                      <p style={styles.notaTexto}>{nota.texto}</p>
                      <p style={styles.notaFecha}>
                        {formatearFechaNota(nota.fecha)}
                      </p>
                    </div>

                    <button
                      onClick={() => eliminarNotaInterna(nota.id)}
                      style={styles.botonEliminar}
                      disabled={eliminandoNotaId === nota.id}
                    >
                      {eliminandoNotaId === nota.id ? "Borrando..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={nuevaNota}
            onChange={(e) => setNuevaNota(e.target.value)}
            placeholder="Escribe aquí una nota sobre este usuario..."
            style={styles.textarea}
            rows={4}
          />

          <button
            onClick={guardarNotaInterna}
            style={styles.botonGuardar}
            disabled={guardandoNota}
          >
            {guardandoNota ? "Guardando..." : "Guardar nota"}
          </button>
        </div>

        <div style={styles.bloque}>
          <h2 style={styles.subtitulo}>Reservas del usuario</h2>

          {reservasUsuario.length === 0 ? (
            <p style={styles.textoVacio}>Este usuario no tiene reservas guardadas.</p>
          ) : (
            <div style={styles.lista}>
              {reservasUsuario.map((r, index) => {
                const destino = r.orderId
                  ? `/admin-detalle-reserva?id=${r.orderId}`
                  : null;

                return (
                  <div
                    key={`${r.id}-${index}`}
                    style={styles.reservaItem}
                    onClick={() => {
                      if (destino) navigate(destino);
                    }}
                  >
                    <p style={styles.linea}>
                      <strong>Clase:</strong> {r.clase || "—"}
                    </p>
                    <p style={styles.linea}>
                      <strong>Fecha:</strong> {fechaDMA(r.fecha) || "—"}
                    </p>
                    <p style={styles.linea}>
                      <strong>Turno:</strong> {r.turno || "—"}
                    </p>
                    <p style={styles.linea}>
                      <strong>Estado:</strong> {r.estado || "—"}
                    </p>
                    <p style={styles.linea}>
                      <strong>Pago:</strong> {r.estadoPago || "—"}
                    </p>
                    <p style={styles.linea}>
                      <strong>Order ID:</strong> {r.orderId || "—"}
                    </p>
                  </div>
                );
              })}
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
notaItemMobile: {
  padding: 10,
},
notaHeaderMobile: {
  flexDirection: "column",
  alignItems: "stretch",
},
  container: {
    maxWidth: 800,
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
    margin: "0 0 20px 0",
    color: "#2f2f2f",
    fontSize: "2rem",
  },
  subtitulo: {
    margin: "0 0 14px 0",
    color: "#4b3a2a",
    fontSize: "1.2rem",
  },
  card: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    display: "grid",
    gap: 8,
  },
  bloque: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  lista: {
    display: "grid",
    gap: 12,
  },
  reservaItem: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#fffaf0",
    border: "1px solid #eadfbe",
    cursor: "pointer",
    transition: "0.2s",
  },
  linea: {
    margin: "4px 0",
    color: "#333",
    fontSize: "0.94rem",
  },
  listaNotas: {
    display: "grid",
    gap: 10,
    marginBottom: 14,
  },
  notaItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    border: "1px solid #eee",
  },
  notaHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  notaTexto: {
    margin: 0,
    color: "#333",
    whiteSpace: "pre-wrap",
  },
  notaFecha: {
    margin: "6px 0 0 0",
    fontSize: "0.82rem",
    color: "#777",
  },
  textarea: {
    width: "100%",
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    border: "1px solid #ddd",
    fontSize: "0.95rem",
    fontFamily: "'Segoe UI', sans-serif",
    resize: "vertical",
    boxSizing: "border-box",
  },
  botonGuardar: {
    marginTop: 10,
    padding: "10px 14px",
    border: "1px solid #e5d8b8",
    backgroundColor: "#fff8da",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    color: "#5b4a2d",
  },
  botonEliminar: {
    padding: "8px 12px",
    border: "1px solid #e7c9c9",
    backgroundColor: "#fff1f1",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    color: "#8a3b3b",
    flexShrink: 0,
  },
  textoVacio: {
    margin: 0,
    color: "#7a7a7a",
  },
  mensaje: {
    textAlign: "center",
    padding: 40,
    color: "#7a7a7a",
  },
};

export default AdminDetalleUsuarioNuevo;