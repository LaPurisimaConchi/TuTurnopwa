import React, { useEffect, useMemo, useState } from "react";
import { ref, get } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import Icono from "./components/Icono";
import "./AdminDashboard.css";
import { formatearEuros } from "./utils/estadisticasAdmin";
import GestionPlantillasTarjetaRegalo from "./components/GestionPlantillasTarjetaRegalo";
import { fechaDMA } from "./utils/formatoFecha";
import EtiquetaInvitado from "./components/EtiquetaInvitado";

const AdminTarjetasRegalo = () => {
  const navigate = useNavigate();

  const [tarjetasRegalo, setTarjetasRegalo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEstadoCanje, setFiltroEstadoCanje] = useState("");
  const [filtroEstadoPago, setFiltroEstadoPago] = useState("");

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);

      try {
        const datosTarjetas = [];

        const [usuariosSnap, notasSnap, tarjetasRaizSnap] = await Promise.all([
          get(ref(dbRealtime, "usuarios")),
          get(ref(dbRealtime, "reservasNotas")),
          get(ref(dbRealtime, "tarjetasRegalo")),
        ]);

        const mapaNotas = {};

        if (notasSnap.exists()) {
          notasSnap.forEach((notaReservaSnap) => {
            const orderId = notaReservaSnap.key;
            const notasInternas = notaReservaSnap.child("notasInternas");

            let totalNotas = 0;

            if (notasInternas.exists()) {
              notasInternas.forEach(() => {
                totalNotas += 1;
              });
            }

            mapaNotas[orderId] = totalNotas;
          });
        }

        const usuarios = usuariosSnap.exists() ? usuariosSnap.val() || {} : {};
        const yaListadas = new Set();

        const agregar = (tarjetaId, tarjeta, uid) => {
          const t = tarjeta || {};
          const userData = usuarios[uid] || {};
          const orderIdReal = t.orderId || tarjetaId;

          yaListadas.add(String(tarjetaId));
          datosTarjetas.push({
            id: tarjetaId,
            tipoRegistro: "tarjeta_regalo",
            claseId: "tarjeta_regalo",
            clase: t.clase || "Tarjeta regalo",
            fecha:
              typeof t.fechaCompra === "string" && t.fechaCompra.length >= 10
                ? t.fechaCompra.slice(0, 10)
                : "—",
            turno: "—",
            metodo: t.codigo || "—",
            plazas: Number(t.plazas || 1),
            estado: t.estadoCanje || "pendiente",
            estadoPago: t.estadoPago || "—",
            precioTotal: Number(t.precioTotal || 0),
            uid: uid,
            invitado: userData.invitado === true,
            orderId: orderIdReal,
            procesado: t.procesado ?? false,
            codigo: t.codigo || "",
            nombreDestinatario: t.nombreDestinatario || "",
            emailDestinatario: t.emailDestinatario || "",
            mensajePersonalizado: t.mensajePersonalizado || "",
            subtipo: t.subtipo || "",
            tipo: t.tipo || "",
            numeroClases: Number(t.numeroClases || 0),
            nombreUsuario: userData.nombre || "",
            emailUsuario: userData.email || "",
            notasInternas: mapaNotas[orderIdReal] || 0,
          });
        };

        // La lista de verdad es /tarjetasRegalo (la copia de cada comprador puede faltar
        // o ir por detrás); las copias que no estén allí (muy antiguas) se añaden después
        if (tarjetasRaizSnap.exists()) {
          tarjetasRaizSnap.forEach((tarjetaSnap) => {
            const t = tarjetaSnap.val() || {};
            agregar(tarjetaSnap.key, t, String(t.uidComprador || ""));
          });
        }

        Object.entries(usuarios).forEach(([uid, userData]) => {
          Object.entries(userData?.tarjetasRegalo || {}).forEach(([tarjetaId, tarjeta]) => {
            if (!yaListadas.has(String(tarjetaId))) agregar(tarjetaId, tarjeta, uid);
          });
        });

        datosTarjetas.sort((a, b) => {
          const fechaA = new Date(a.fecha === "—" ? 0 : `${a.fecha}T00:00:00`);
          const fechaB = new Date(b.fecha === "—" ? 0 : `${b.fecha}T00:00:00`);
          return fechaB - fechaA;
        });

        setTarjetasRegalo(datosTarjetas);
      } catch (error) {
        console.error("Error al cargar tarjetas regalo:", error);
        setTarjetasRegalo([]);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  const tarjetasFiltradas = useMemo(() => {
    return tarjetasRegalo.filter((t) => {
      const cumpleFecha = !filtroFecha || t.fecha === filtroFecha;
      const cumpleEstadoCanje =
        !filtroEstadoCanje || t.estado === filtroEstadoCanje;
      const cumpleEstadoPago =
        !filtroEstadoPago || t.estadoPago === filtroEstadoPago;

      return cumpleFecha && cumpleEstadoCanje && cumpleEstadoPago;
    });
  }, [tarjetasRegalo, filtroFecha, filtroEstadoCanje, filtroEstadoPago]);

  const totalTarjetas = tarjetasRegalo.length;

  const totalPagadas = tarjetasRegalo.filter(
    (t) => String(t.estadoPago).toLowerCase() === "pagado"
  ).length;

  const totalCanjeadas = tarjetasRegalo.filter(
    (t) => String(t.estado).toLowerCase() === "canjeado"
  ).length;

  const ingresosEstimados = tarjetasRegalo.reduce((acc, t) => {
    if (String(t.estadoPago).toLowerCase() === "pagado") {
      return acc + Number(t.precioTotal || 0);
    }
    return acc;
  }, 0);

  const limpiarFiltros = () => {
    setFiltroFecha("");
    setFiltroEstadoCanje("");
    setFiltroEstadoPago("");
  };

  const irADetalle = (orderId) => {
    navigate(`/admin-detalle-tarjeta-regalo?id=${orderId}`);
  };

  return (
    <div style={{ ...styles.body, ...(isMobile ? styles.bodyMobile : {}) }}>
      <div
        style={{
          ...styles.container,
          ...(isMobile ? styles.containerMobile : {}),
        }}
      >
        <BotonVolver />

        <h1 style={{ ...styles.titulo, ...(isMobile ? styles.tituloMobile : {}) }}>
          Tarjetas regalo
        </h1>
        <p
          style={{
            ...styles.subtitulo,
            ...(isMobile ? styles.subtituloMobile : {}),
          }}
        >
          Vista general de todas las tarjetas regalo compradas.
        </p>

        <div className="pa-grid" aria-busy={cargando}>
          {[
            { etiqueta: "Total tarjetas", icono: "regalo", tono: "terracota", valor: totalTarjetas },
            { etiqueta: "Pagadas", icono: "confirmado", tono: "verde", valor: totalPagadas },
            { etiqueta: "Canjeadas", icono: "bono", tono: "azul", valor: totalCanjeadas },
            { etiqueta: "Ingresos estimados", icono: "euro", tono: "mostaza", valor: formatearEuros(ingresosEstimados) },
          ].map(({ etiqueta, icono, tono, valor }) => (
            <div key={etiqueta} className="pa-card">
              <div className="pa-card-cabecera">
                <span aria-hidden="true" className={`pa-card-icono pa-card-icono--${tono}`}>
                  <Icono nombre={icono} tamano={24} />
                </span>
                <p className="pa-card-label">{etiqueta}</p>
              </div>
              <p className="pa-card-valor">
                {cargando ? <span className="pa-skeleton" role="status" aria-label="Cargando" /> : valor}
              </p>
            </div>
          ))}
        </div>

        <GestionPlantillasTarjetaRegalo />

        <div
          style={{
            ...styles.filtrosBox,
            ...(isMobile ? styles.filtrosBoxMobile : {}),
          }}
        >
          <div
            style={{
              ...styles.filtrosGrid,
              ...(isMobile ? styles.filtrosGridMobile : {}),
            }}
          >
            <div style={styles.campo}>
              <label style={styles.label}>Fecha</label>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.campo}>
              <label style={styles.label}>Estado canje</label>
              <select
                value={filtroEstadoCanje}
                onChange={(e) => setFiltroEstadoCanje(e.target.value)}
                style={styles.input}
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="canjeado">Canjeada</option>
                <option value="caducada">Caducada</option>
              </select>
            </div>

            <div style={styles.campo}>
              <label style={styles.label}>Estado pago</label>
              <select
                value={filtroEstadoPago}
                onChange={(e) => setFiltroEstadoPago(e.target.value)}
                style={styles.input}
              >
                <option value="">Todos</option>
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
                <option value="fallido">Fallido</option>
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
            Total mostradas: <strong>{tarjetasFiltradas.length}</strong>
          </span>
        </div>

        {cargando ? (
          <p style={styles.mensaje}>Cargando tarjetas regalo...</p>
        ) : tarjetasFiltradas.length === 0 ? (
          <p style={styles.mensaje}>No hay tarjetas regalo para mostrar.</p>
        ) : isMobile ? (
          <div style={styles.cardsList}>
            {tarjetasFiltradas.map((t) => (
              <button
                key={`${t.claseId}-${t.fecha}-${t.orderId}-${t.id}`}
                type="button"
                onClick={() => irADetalle(t.orderId)}
                style={styles.cardMobile}
              >
                <div style={styles.cardTop}>
                  <div>
                    <p style={styles.cardTitulo}>{t.clase}</p>
                    <p style={styles.cardFecha}>{fechaDMA(t.fecha)}</p>
                  </div>

                  <div style={styles.cardPrecio}>{t.precioTotal}€</div>
                </div>

                <div style={styles.cardGrid}>
                  <div style={styles.cardItem}>
                    <span style={styles.cardLabel}>Código</span>
                    <span style={styles.cardValue}>{t.codigo || "—"}</span>
                  </div>

                  <div style={styles.cardItem}>
                    <span style={styles.cardLabel}>Plazas</span>
                    <span style={styles.cardValue}>{t.plazas}</span>
                  </div>

                  <div style={styles.cardItem}>
                    <span style={styles.cardLabel}>Estado canje</span>
                    <span style={styles.cardValue}>{t.estado}</span>
                  </div>

                  <div style={styles.cardItem}>
                    <span style={styles.cardLabel}>Pago</span>
                    <span style={styles.cardValue}>{t.estadoPago}</span>
                  </div>

                  <div style={styles.cardItemFull}>
                    <span style={styles.cardLabel}>Destinatario</span>
                    <span style={styles.cardValue}>
                      {t.nombreDestinatario || t.emailDestinatario || "—"}
                    </span>
                  </div>

                  <div style={styles.cardItemFull}>
                    <span style={styles.cardLabel}>Usuario</span>
                    <span style={styles.cardValue}>
                      {t.nombreUsuario || t.emailUsuario || t.uid}
                      <EtiquetaInvitado invitado={t.invitado} />
                    </span>
                  </div>

                  <div style={styles.cardItemFull}>
                    <span style={styles.cardLabel}>Notas</span>
                    <span style={styles.cardValue}>
                      {t.notasInternas > 0 ? (
                        <span style={styles.badgeNotas}>
                          {t.notasInternas}{" "}
                          {t.notasInternas === 1 ? "nota" : "notas"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={styles.tablaWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Código</th>
                  <th style={styles.th}>Clase</th>
                  <th style={styles.th}>Destinatario / Info</th>
                  <th style={styles.th}>Usuario</th>
                  <th style={styles.th}>Plazas</th>
                  <th style={styles.th}>Estado canje</th>
                  <th style={styles.th}>Pago</th>
                  <th style={styles.th}>Notas</th>
                  <th style={styles.th}>Precio</th>
                </tr>
              </thead>
              <tbody>
                {tarjetasFiltradas.map((t) => (
                  <tr
                    key={`${t.claseId}-${t.fecha}-${t.orderId}-${t.id}`}
                    onClick={() => irADetalle(t.orderId)}
                    style={styles.trClickable}
                  >
                    <td style={styles.td}>{fechaDMA(t.fecha)}</td>
                    <td style={styles.td}>{t.codigo || "—"}</td>
                    <td style={styles.td}>{t.clase}</td>
                    <td style={styles.td}>
                      {t.nombreDestinatario || t.emailDestinatario || "—"}
                    </td>
                    <td style={styles.td}>
                      {t.nombreUsuario || t.emailUsuario || t.uid}
                      <EtiquetaInvitado invitado={t.invitado} />
                    </td>
                    <td style={styles.td}>{t.plazas}</td>
                    <td style={styles.td}>{t.estado}</td>
                    <td style={styles.td}>{t.estadoPago}</td>
                    <td style={styles.td}>
                      {t.notasInternas > 0 ? (
                        <span style={styles.badgeNotas}>
                          {t.notasInternas}{" "}
                          {t.notasInternas === 1 ? "nota" : "notas"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={styles.td}>{t.precioTotal}€</td>
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
    color: "#3f3128",
    fontSize: "2rem",
  },
  tituloMobile: {
    fontSize: "1.45rem",
    lineHeight: 1.2,
  },
  subtitulo: {
    textAlign: "center",
    color: "#7a6858",
    marginTop: 8,
    marginBottom: 24,
  },
  subtituloMobile: {
    fontSize: "0.95rem",
    lineHeight: 1.4,
    marginBottom: 18,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  statsGridMobile: {
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  statCard: {
    backgroundColor: "#fff6d6",
    border: "1px solid #eadfd2",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  },
  statLabel: {
    margin: 0,
    color: "#3f3128",
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  statValue: {
    margin: "12px 0 0 0",
    color: "#333",
    fontSize: "2rem",
    fontWeight: "bold",
  },
  statValueMobile: {
    fontSize: "1.45rem",
  },
  filtrosBox: {
    backgroundColor: "#fdfaf5",
    border: "1px solid #eadfd2",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  filtrosBoxMobile: {
    padding: 14,
    borderRadius: 16,
  },
  filtrosGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 14,
  },
  filtrosGridMobile: {
    gridTemplateColumns: "1fr",
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
    width: "100%",
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
    overflow: "hidden",
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
  trClickable: {
    cursor: "pointer",
    transition: "0.2s",
  },
  cardsList: {
    display: "grid",
    gap: 12,
  },
  cardMobile: {
    width: "100%",
    border: "1px solid #eadfd2",
    backgroundColor: "#fdfaf5",
    borderRadius: 18,
    padding: 14,
    textAlign: "left",
    cursor: "pointer",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  cardTitulo: {
    margin: 0,
    color: "#3f3128",
    fontSize: "1rem",
    fontWeight: 700,
  },
  cardFecha: {
    margin: "6px 0 0 0",
    color: "#7a6858",
    fontSize: "0.9rem",
  },
  cardPrecio: {
    color: "#333",
    fontWeight: 800,
    fontSize: "1rem",
    whiteSpace: "nowrap",
  },
cardGrid: {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 8,
},
  cardItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    backgroundColor: "#fdfaf5",
    borderRadius: 12,
    padding: 10,
    border: "1px solid #f3e7c8",
  },
  cardItemFull: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    backgroundColor: "#fdfaf5",
    borderRadius: 12,
    padding: 10,
    border: "1px solid #f3e7c8",
    gridColumn: "1 / -1",
  },
  cardLabel: {
    fontSize: "0.78rem",
    color: "#3f3128",
    fontWeight: 700,
  },
  cardValue: {
    fontSize: "0.92rem",
    color: "#333",
    lineHeight: 1.35,
    wordBreak: "break-word",
  },
  badgeNotas: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    backgroundColor: "#fff6d6",
    border: "1px solid #eadfd2",
    color: "#3f3128",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
};

export default AdminTarjetasRegalo;