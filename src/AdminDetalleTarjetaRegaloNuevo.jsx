import React, { useEffect, useState } from "react";
import { ref, get, push, remove } from "firebase/database";
import { useNavigate, useSearchParams } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";

import { fechaDMA } from "./utils/formatoFecha";
const AdminDetalleTarjetaRegaloNuevo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("id");

  const [tarjeta, setTarjeta] = useState(null);
  const [notasInternas, setNotasInternas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [cargando, setCargando] = useState(true);
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
    const cargarDetalleTarjeta = async () => {
      try {
        const [usuariosSnap, notasSnap] = await Promise.all([
          get(ref(dbRealtime, "usuarios")),
          get(ref(dbRealtime, `reservasNotas/${orderId}/notasInternas`)),
        ]);

        let encontrada = null;

        if (usuariosSnap.exists()) {
          usuariosSnap.forEach((userSnap) => {
            const uid = userSnap.key;
            const userData = userSnap.val() || {};
            const nombreUsuario = userData.nombre || "";
            const emailUsuario = userData.email || "";
            const tarjetasUsuario = userData.tarjetasRegalo || {};

            Object.entries(tarjetasUsuario).forEach(([tarjetaId, tarjeta]) => {
              const t = tarjeta || {};
              const orderIdReal = t.orderId || tarjetaId;

              if (orderIdReal === orderId && !encontrada) {
                encontrada = {
                  id: tarjetaId,
                  uid,
                  orderId: orderIdReal,
                  clase: t.clase || "Tarjeta regalo",
                  codigo: t.codigo || "",
                  fechaCompra:
                    typeof t.fechaCompra === "string" ? t.fechaCompra : "—",
                  fecha:
                    typeof t.fechaCompra === "string" &&
                    t.fechaCompra.length >= 10
                      ? t.fechaCompra.slice(0, 10)
                      : "—",
                  estado: t.estadoCanje || "pendiente",
                  estadoPago: t.estadoPago || "—",
                  precioTotal: Number(t.precioTotal || 0),
                  precioUnitario: Number(
                    t.precioUnitario || t.precio || t.precioTotal || 0
                  ),
                  plazas: Number(t.plazas || 1),
                  nombreDestinatario: t.nombreDestinatario || "",
                  emailDestinatario: t.emailDestinatario || "",
                  mensajePersonalizado: t.mensajePersonalizado || "",
                  subtipo: t.subtipo || "",
                  tipo: t.tipo || "",
                  numeroClases: Number(t.numeroClases || 0),
                  procesado: t.procesado ?? false,
                  nombreUsuario,
                  emailUsuario,
                };
              }
            });
          });
        }

        setTarjeta(encontrada);

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
        console.error("Error al cargar detalle de tarjeta regalo:", error);
        setTarjeta(null);
        setNotasInternas([]);
      } finally {
        setCargando(false);
      }
    };

    cargarDetalleTarjeta();
  }, [orderId]);

  const formatearFechaNota = (fecha) => {
    if (!fecha) return "Sin fecha";

    const fechaParseada = new Date(fecha);

    if (!isNaN(fechaParseada.getTime())) {
      return fechaParseada.toLocaleString("es-ES");
    }

    return fecha;
  };

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
        ref(dbRealtime, `reservasNotas/${orderId}/notasInternas`),
        nota
      );

      setNotasInternas((prev) => [
        ...prev,
        {
          id: nuevaNotaRef.key,
          ...nota,
        },
      ]);
      setNuevaNota("");
    } catch (error) {
      console.error("Error al guardar nota interna:", error);
      alert("No se pudo guardar la nota interna.");
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

      await remove(
        ref(dbRealtime, `reservasNotas/${orderId}/notasInternas/${notaId}`)
      );

      setNotasInternas((prev) => prev.filter((nota) => nota.id !== notaId));
    } catch (error) {
      console.error("Error al borrar la nota interna:", error);
      alert("No se pudo borrar la nota interna.");
    } finally {
      setEliminandoNotaId(null);
    }
  };

  if (cargando) {
    return <p style={styles.mensaje}>Cargando tarjeta regalo...</p>;
  }

  if (!tarjeta) {
    return <p style={styles.mensaje}>Tarjeta regalo no encontrada.</p>;
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

        <h1 style={styles.titulo}>Detalle de tarjeta regalo</h1>

        <div style={styles.card}>
          <p>
            <strong>Clase:</strong>{" "}
            <span
              style={styles.linkClase}
              onClick={() =>
                navigate(
                  `/admin-detalle-clase?clase=${encodeURIComponent(
                    tarjeta.clase || ""
                  )}&nombre=${encodeURIComponent(tarjeta.clase || "")}`
                )
              }
            >
              {tarjeta.clase}
            </span>
          </p>
          <p><strong>Código:</strong> {tarjeta.codigo || "—"}</p>
          <p><strong>Fecha compra:</strong> {fechaDMA(tarjeta.fecha)}</p>
          <p><strong>Estado canje:</strong> {tarjeta.estado}</p>
          <p><strong>Estado pago:</strong> {tarjeta.estadoPago}</p>

          <hr style={styles.hr} />

          <p><strong>Precio unitario:</strong> {tarjeta.precioUnitario}€</p>
          <p><strong>Precio total:</strong> {tarjeta.precioTotal}€</p>
          <p><strong>Plazas:</strong> {tarjeta.plazas}</p>
          <p><strong>Número de clases:</strong> {tarjeta.numeroClases || 0}</p>

          <hr style={styles.hr} />

          <p><strong>Destinatario:</strong> {tarjeta.nombreDestinatario || "—"}</p>
          <p><strong>Email destinatario:</strong> {tarjeta.emailDestinatario || "—"}</p>
          <p><strong>Mensaje:</strong> {tarjeta.mensajePersonalizado || "—"}</p>
          <p><strong>Subtipo:</strong> {tarjeta.subtipo || "—"}</p>
          <p><strong>Tipo:</strong> {tarjeta.tipo || "—"}</p>

          <hr style={styles.hr} />

          <p>
            <strong>UID comprador:</strong>{" "}
            <span
              style={styles.uidLink}
              onClick={() =>
                navigate(`/admin-detalle-usuario?uid=${tarjeta.uid}`)
              }
            >
              {tarjeta.uid}
            </span>
          </p>
          <p><strong>Nombre comprador:</strong> {tarjeta.nombreUsuario || "—"}</p>
          <p><strong>Email comprador:</strong> {tarjeta.emailUsuario || "—"}</p>
          <p><strong>Order ID:</strong> {tarjeta.orderId}</p>
          <p><strong>Procesado:</strong> {tarjeta.procesado ? "Sí" : "No"}</p>
        </div>

        <div style={styles.notasBox}>
          <h2 style={styles.subtituloBloque}>Notas internas </h2>

          {notasInternas.length > 0 ? (
            notasInternas.map((nota) => (
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
                    <p style={styles.notaFecha}>{formatearFechaNota(nota.fecha)}</p>
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
            ))
          ) : (
            <p style={styles.textoVacio}>Aún no hay notas.</p>
          )}

          <textarea
            value={nuevaNota}
            onChange={(e) => setNuevaNota(e.target.value)}
            placeholder="Escribe aquí una nota..."
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
      </div>
    </div>
  );
};

const styles = {
  body: {
    backgroundColor: "#fdf8ee",
    minHeight: "100vh",
    padding: 30,
  },
  bodyMobile: {
  padding: 4,
},
  container: {
    maxWidth: 700,
    margin: "0 auto",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
  },
  containerMobile: {
  width: "100%",
  maxWidth: "100%",
  borderRadius: 16,
  padding: 10,
  boxSizing: "border-box",
},
notaItemMobile: {
  paddingBottom: 10,
},
  titulo: {
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontSize: "0.95rem",
  },
  hr: {
    margin: "10px 0",
    border: "none",
    borderTop: "1px solid #eee",
  },
  uidLink: {
    color: "#7c5c2e",
    cursor: "pointer",
    textDecoration: "underline",
    fontWeight: 500,
  },
  notaHeaderMobile: {
  flexDirection: "column",
  alignItems: "stretch",
},
  mensaje: {
    textAlign: "center",
    padding: 40,
  },
  notasBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#fffaf0",
    border: "1px solid #f0e5cf",
    borderRadius: 16,
  },
  subtituloBloque: {
    marginTop: 0,
    marginBottom: 12,
    color: "#4b3a2a",
    fontSize: "1.15rem",
  },
  notaItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottom: "1px solid #eee",
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
    margin: "4px 0 0 0",
    fontSize: "0.82rem",
    color: "#777",
  },
  textoVacio: {
    color: "#777",
    fontStyle: "italic",
  },
  textarea: {
    width: "100%",
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    border: "1px solid #ddd",
    fontSize: "0.95rem",
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
  bloqueVolverLista: {
    marginBottom: 16,
  },
  botonVolverLista: {
    padding: "10px 14px",
    border: "1px solid #e5d8b8",
    backgroundColor: "#fff8da",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    color: "#5b4a2d",
  },
  linkClase: {
    color: "#7c5c2e",
    cursor: "pointer",
    textDecoration: "underline",
    fontWeight: 500,
  },
};

export default AdminDetalleTarjetaRegaloNuevo;