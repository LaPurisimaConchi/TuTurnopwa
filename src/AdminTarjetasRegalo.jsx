import React, { useEffect, useMemo, useState } from "react";
import { ref, get } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import Icono from "./components/Icono";
import "./AdminDashboard.css";
import { formatearEuros } from "./utils/estadisticasAdmin";
import GestionPlantillasTarjetaRegalo from "./components/GestionPlantillasTarjetaRegalo";
import { fechaDMA, hoyMadrid } from "./utils/formatoFecha";
import { situacionDe } from "./utils/estadoTarjetaRegalo";
import { AvisoPagoTarjeta, EtiquetaEstadoTarjeta } from "./components/EtiquetasTarjetaRegalo";
import EtiquetaInvitado from "./components/EtiquetaInvitado";
import CancelarTarjetaRegalo from "./components/CancelarTarjetaRegalo";

// Día (en Madrid) en que se canjeó; las tarjetas antiguas pueden no tenerlo
const diaDeCanje = (t) => {
  const momento = new Date(t.fechaCanje || "");
  return Number.isNaN(momento.getTime()) ? "" : fechaDMA(hoyMadrid(momento));
};

// Para buscar sin distinguir mayúsculas ni tildes
const normalizar = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

// Hasta cuándo se puede canjear: solo interesa mientras sigue disponible
const validezDe = (t) =>
  t.fechaCaducidad && situacionDe(t, hoyMadrid()) === "disponible" ? fechaDMA(t.fechaCaducidad) : "";

const AdminTarjetasRegalo = () => {
  const navigate = useNavigate();

  const [tarjetasRegalo, setTarjetasRegalo] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroEstadoCanje, setFiltroEstadoCanje] = useState("");
  const [filtroEstadoPago, setFiltroEstadoPago] = useState("");
  const [aCancelar, setACancelar] = useState(null);

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

        const agregar = (tarjetaId, tarjeta, uid, enRaiz = false) => {
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
            cancelada: t.cancelada === true,
            fechaCaducidad: t.fechaCaducidad || "",
            fechaCanje: t.fechaCanje || t.fechaUso || "",
            // Solo las de /tarjetasRegalo se pueden canjear (y, por tanto, cancelar)
            sePuedeCancelar:
              enRaiz &&
              !t.cancelada &&
              !t.usado &&
              !t.canjeado &&
              !["usada", "canjeado"].includes(String(t.estadoCanje || "").toLowerCase()),
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
            agregar(tarjetaSnap.key, t, String(t.uidComprador || ""), true);
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
    const hoy = hoyMadrid();
    const buscado = normalizar(busqueda);

    return tarjetasRegalo.filter((t) => {
      const cumpleBusqueda =
        !buscado ||
        [t.codigo, t.nombreUsuario, t.emailUsuario, t.nombreDestinatario, t.emailDestinatario].some(
          (campo) => normalizar(campo).includes(buscado)
        );
      const cumpleFecha = !filtroFecha || t.fecha === filtroFecha;
      const cumpleEstadoCanje =
        !filtroEstadoCanje || situacionDe(t, hoy) === filtroEstadoCanje;
      const cumpleEstadoPago =
        !filtroEstadoPago || t.estadoPago === filtroEstadoPago;

      return cumpleBusqueda && cumpleFecha && cumpleEstadoCanje && cumpleEstadoPago;
    });
  }, [tarjetasRegalo, busqueda, filtroFecha, filtroEstadoCanje, filtroEstadoPago]);

  const totalTarjetas = tarjetasRegalo.length;

  const hoy = hoyMadrid();
  const totalDisponibles = tarjetasRegalo.filter(
    (t) => situacionDe(t, hoy) === "disponible"
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
    setBusqueda("");
    setFiltroFecha("");
    setFiltroEstadoCanje("");
    setFiltroEstadoPago("");
  };

  const marcarCancelada = (id) => {
    setTarjetasRegalo((lista) =>
      lista.map((t) =>
        t.id === id ? { ...t, cancelada: true, estado: "cancelada", sePuedeCancelar: false } : t
      )
    );
  };

  const botonCancelar = (t) =>
    t.sePuedeCancelar ? (
      <button
        type="button"
        className="mt-2 whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        onClick={(e) => {
          e.stopPropagation();
          setACancelar(t);
        }}
      >
        Cancelar
      </button>
    ) : null;

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
            { etiqueta: "Disponibles", icono: "confirmado", tono: "verde", valor: totalDisponibles },
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
          <div style={{ ...styles.campo, marginBottom: 14 }}>
            <label style={styles.label} htmlFor="buscar-tarjeta">Buscar</label>
            <input
              id="buscar-tarjeta"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Código, comprador o destinatario"
              style={styles.input}
            />
          </div>
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
              <label style={styles.label}>Estado</label>
              <select
                value={filtroEstadoCanje}
                onChange={(e) => setFiltroEstadoCanje(e.target.value)}
                style={styles.input}
              >
                <option value="">Todos</option>
                <option value="disponible">Disponible</option>
                <option value="canjeada">Canjeada</option>
                <option value="caducada">Caducada</option>
                <option value="cancelada">Cancelada</option>
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
              <div key={`${t.claseId}-${t.fecha}-${t.orderId}-${t.id}`} style={styles.cardConAccion}>
              <button
                type="button"
                onClick={() => irADetalle(t.orderId)}
                style={styles.cardMobile}
              >
                <div style={styles.cardTop}>
                  <div>
                    <p style={styles.cardTitulo}>{t.clase}</p>
                    {t.subtipo && <p style={styles.cardFecha}>{t.subtipo}</p>}
                    <p style={styles.cardFecha}>Comprada el {fechaDMA(t.fecha)}</p>
                  </div>

                  <div style={styles.cardPrecio}>{t.precioTotal}€</div>
                </div>

                <div style={styles.cardGrid}>
                  <div style={styles.cardItem}>
                    <span style={styles.cardLabel}>Código</span>
                    <span style={styles.cardValue}>{t.codigo || "—"}</span>
                  </div>

                  {t.plazas > 1 && (
                    <div style={styles.cardItem}>
                      <span style={styles.cardLabel}>Plazas</span>
                      <span style={styles.cardValue}>{t.plazas}</span>
                    </div>
                  )}

                  <div style={styles.cardItemFull}>
                    <span style={styles.cardLabel}>Estado</span>
                    <span className="flex flex-wrap gap-1">
                      <EtiquetaEstadoTarjeta tarjeta={t} />
                      <AvisoPagoTarjeta tarjeta={t} />
                    </span>
                    {diaDeCanje(t) && <span style={styles.cardValue}>Canjeada el {diaDeCanje(t)}</span>}
                    {validezDe(t) && <span style={styles.cardValue}>Válida hasta el {validezDe(t)}</span>}
                  </div>

                  <div style={styles.cardItemFull}>
                    <span style={styles.cardLabel}>Usuario</span>
                    <span style={styles.cardValue}>
                      {t.nombreUsuario || t.emailUsuario || t.uid}
                      <EtiquetaInvitado invitado={t.invitado} />
                    </span>
                  </div>

                </div>
              </button>
              {t.sePuedeCancelar && (
                <div className="px-3.5 pb-3.5">
                  <button
                    type="button"
                    onClick={() => setACancelar(t)}
                    className="min-h-[44px] w-full rounded-full border border-red-200 bg-red-50 text-sm font-semibold text-red-700 active:bg-red-100"
                  >
                    Cancelar tarjeta
                  </button>
                </div>
              )}
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.tablaWrapper}>
            {/* Datos relacionados comparten columna para que la tabla quepa sin scroll horizontal */}
            <table style={styles.table}>
              <colgroup>
                <col style={{ width: "27%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "21%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "16%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={styles.th}>Tarjeta</th>
                  <th style={styles.th}>Clase</th>
                  <th style={styles.th}>Comprador</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Precio</th>
                </tr>
              </thead>
              <tbody>
                {tarjetasFiltradas.map((t) => (
                  <tr
                    key={`${t.claseId}-${t.fecha}-${t.orderId}-${t.id}`}
                    onClick={() => irADetalle(t.orderId)}
                    className="cursor-pointer transition-colors hover:bg-mostaza-suave"
                  >
                    <td style={styles.td}>
                      <span style={styles.codigo}>{t.codigo || "—"}</span>
                      <span style={styles.secundario}>
                        Comprada el <span className="whitespace-nowrap">{fechaDMA(t.fecha)}</span>
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.principal}>{t.clase}</span>
                      {t.subtipo && <span style={styles.secundario}>{t.subtipo}</span>}
                      {t.plazas > 1 && <span style={styles.secundario}>{t.plazas} plazas</span>}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.principal}>
                        {t.nombreUsuario || t.emailUsuario || t.uid}
                        <EtiquetaInvitado invitado={t.invitado} />
                      </span>
                      {(t.nombreDestinatario || t.emailDestinatario) && (
                        <span style={styles.secundario}>
                          Para: {t.nombreDestinatario || t.emailDestinatario}
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div className="flex flex-col items-start gap-1">
                        <EtiquetaEstadoTarjeta tarjeta={t} />
                        {diaDeCanje(t) && (
                          <span className="whitespace-nowrap text-xs text-tinta-suave">
                            el {diaDeCanje(t)}
                          </span>
                        )}
                        {validezDe(t) && (
                          <span className="text-xs text-tinta-suave">Válida hasta {validezDe(t)}</span>
                        )}
                        <AvisoPagoTarjeta tarjeta={t} />
                        {t.notasInternas > 0 && (
                          <span className="whitespace-nowrap text-xs text-tinta-suave">
                            {t.notasInternas} {t.notasInternas === 1 ? "nota" : "notas"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.principal}>{t.precioTotal}€</span>
                      {botonCancelar(t)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {aCancelar && (
        <CancelarTarjetaRegalo
          tarjeta={aCancelar}
          onCerrar={() => setACancelar(null)}
          onCancelada={marcarCancelada}
        />
      )}
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
    borderRadius: 18,
  },
  table: {
    width: "100%",
    tableLayout: "fixed",
    borderCollapse: "collapse",
    backgroundColor: "#fdfaf5",
    overflow: "hidden",
  },
  th: {
    textAlign: "left",
    padding: "10px 8px",
    backgroundColor: "#fff6d6",
    color: "#3f3128",
    borderBottom: "1px solid #eadfd2",
    fontSize: "0.95rem",
  },
  td: {
    padding: "10px 8px",
    verticalAlign: "top",
    overflowWrap: "anywhere",
    borderBottom: "1px solid #f6efe6",
    color: "#333",
    fontSize: "0.95rem",
  },
  codigo: {
    display: "block",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.78rem",
    whiteSpace: "nowrap",
  },
  principal: {
    display: "block",
  },
  secundario: {
    display: "block",
    marginTop: 4,
    color: "#7a6858",
    fontSize: "0.85rem",
  },
  cardsList: {
    display: "grid",
    gap: 12,
  },
  cardConAccion: {
    border: "1px solid #eadfd2",
    backgroundColor: "#fdfaf5",
    borderRadius: 18,
    overflow: "hidden",
  },
  cardMobile: {
    width: "100%",
    border: "none",
    background: "none",
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
};

export default AdminTarjetasRegalo;