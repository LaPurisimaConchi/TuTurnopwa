import React, { useEffect, useMemo, useState } from "react";
import { ref, get } from "firebase/database";
import { useNavigate, useSearchParams } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";

import { fechaDMA } from "./utils/formatoFecha";
const AdminReservasNuevo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const claseInicial = searchParams.get("clase") || "";
  const fechaInicial = searchParams.get("fecha") || "";

  const [reservas, setReservas] = useState([]);
  const [tarjetasRegalo, setTarjetasRegalo] = useState([]);
  const [clasesValidas, setClasesValidas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [esMovil, setEsMovil] = useState(() => window.innerWidth <= 768);

  const [filtroFecha, setFiltroFecha] = useState(fechaInicial);
  const [filtroClase, setFiltroClase] = useState(claseInicial);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTelefono, setFiltroTelefono] = useState("");
  

  useEffect(() => {
    const handleResize = () => {
      setEsMovil(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (claseInicial) {
      setFiltroClase(claseInicial);
    }
  }, [claseInicial]);

  useEffect(() => {
  if (fechaInicial) {
    setFiltroFecha(fechaInicial);
  }
}, [fechaInicial]);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);

      try {
        const [clasesSnap, notasSnap, usuariosSnap] = await Promise.all([
  get(ref(dbRealtime, "clases")),
  get(ref(dbRealtime, "reservasNotas")),
  get(ref(dbRealtime, "usuarios")),
]);

        const mapaClases = {};
        const listaClases = [];
        const mapaNotasTemp = {};
        const usuariosMap = {};


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

            mapaNotasTemp[orderId] = totalNotas;
          });
        }
        if (usuariosSnap.exists()) {
  usuariosSnap.forEach((userSnap) => {
    const uid = userSnap.key;
    const user = userSnap.val() || {};

    usuariosMap[uid] = {
      nombre: user.nombre || user.name || user.displayName || "",
      telefono: user.telefono || user.phone || user.telefonoUsuario || "",
      email: user.email || "",
    };
  });
}

        if (clasesSnap.exists()) {
          clasesSnap.forEach((claseSnap) => {
            const claseId = claseSnap.key;
            const claseData = claseSnap.val() || {};
            const nombre = claseData.nombre || claseId;
            const orden = Number(claseData.orden || 9999);

            mapaClases[claseId] = { nombre, orden };

            listaClases.push({
              id: claseId,
              nombre,
              orden,
            });
          });
        }

        listaClases.push({
          id: "tarjeta_regalo",
          nombre: "Tarjeta regalo",
          orden: 9998,
        });

        setClasesValidas(
          listaClases.sort((a, b) => {
            if (a.orden !== b.orden) return a.orden - b.orden;
            return a.nombre.localeCompare(b.nombre, "es");
          })
        );

        try {
          const [reservasSnap, reservasGruposSnap] = await Promise.all([
  get(ref(dbRealtime, "reservas")),
  get(ref(dbRealtime, "reservasGrupos")),
]);
          const datosReservas = [];

          if (reservasSnap.exists()) {
            reservasSnap.forEach((claseSnap) => {
              const claseKey = claseSnap.key;

              claseSnap.forEach((fechaSnap) => {
                const fechaKey = fechaSnap.key;

                fechaSnap.forEach((turnoSnap) => {
                  const turnoKey = turnoSnap.key;

                  turnoSnap.forEach((nivelSnap) => {
                    const nivelKey = nivelSnap.key;
                    const nivelVal = nivelSnap.val();

                    if (!nivelVal || typeof nivelVal !== "object") return;

                    const pareceReservaDirecta =
                      "fecha" in nivelVal ||
                      "estado" in nivelVal ||
                      "estadoPago" in nivelVal ||
                      "uid" in nivelVal ||
                      "orderId" in nivelVal;

                    const construirReserva = (
                      reserva,
                      idReserva,
                      metodoFallback = "—"
                    ) => {
                      const claseIdReal = reserva.claseId || claseKey;
                      const claseInfo = mapaClases[claseIdReal];
                      const datosUsuario = usuariosMap[reserva.uid] || {};


                      return {
                        id: idReserva,
                        tipoRegistro: "reserva",
                        claseId: claseIdReal,
                        clase:
                          reserva.clase ||
                          claseInfo?.nombre ||
                          claseIdReal ||
                          "Clase sin nombre",
                        fecha: reserva.fecha || fechaKey,
                        turno: reserva.turno || turnoKey,
                        metodo:
                          reserva.metodo ||
                          reserva.tipoClase ||
                          metodoFallback,
                        plazas: Number(reserva.plazas || 1),
                        estado: reserva.estado || "—",
                        estadoPago: reserva.estadoPago || "—",
                        precioTotal: Number(
                          reserva.precioTotal ||
                            reserva.precioUnitario ||
                            reserva.precio ||
                            0
                        ),
                        uid: reserva.uid || "",
                        nombre:
  reserva.nombre ||
  reserva.nombreUsuario ||
  datosUsuario.nombre ||
  "",
telefono:
  reserva.telefono ||
  reserva.telefonoUsuario ||
  datosUsuario.telefono ||
  "",
email:
  reserva.email ||
  datosUsuario.email ||
  "",
                        orderId: reserva.orderId || "",
                        procesado: reserva.procesado ?? false,
                        notasInternas: mapaNotasTemp[reserva.orderId || ""] || 0,
                        reprogramada:
                          reserva.reprogramada === true ||
                          reserva.reprogramada === "true" ||
                          !!reserva.fechaOriginal ||
                          !!reserva.turnoOriginal ||
                          !!reserva.reprogramadaEn,
                        cancelada:
                          reserva.cancelada === true ||
                          reserva.cancelada === "true" ||
                          reserva.estado === "Cancelada",
                      };
                    };

                    if (pareceReservaDirecta) {
                      const reservaConstruida = construirReserva(
                        nivelVal,
                        nivelKey,
                        nivelKey
                      );
                      datosReservas.push(reservaConstruida);
                      return;
                    }

                    nivelSnap.forEach((reservaSnap) => {
                      const reserva = reservaSnap.val();
                      if (!reserva || typeof reserva !== "object") return;

                      const reservaConstruida = construirReserva(
                        reserva,
                        reservaSnap.key,
                        nivelKey
                      );

                      datosReservas.push(reservaConstruida);
                    });
                  });
                });
              });
            });
          }
          if (reservasGruposSnap.exists()) {
  reservasGruposSnap.forEach((grupoSnap) => {
    const grupo = grupoSnap.val();
    if (!grupo || typeof grupo !== "object") return;

    datosReservas.push({
      id: grupoSnap.key,
      tipoRegistro: "reserva_grupo",
      claseId: grupo.claseId || "reserva-grupo",
      clase: grupo.clase || "Reserva de grupo",
      fecha: grupo.fecha || "—",
      turno: grupo.turno || "—",
      metodo: "grupo",
      plazas: Number(grupo.plazas || 1),
      estado: grupo.estado || "—",
      estadoPago: grupo.estadoPago || "—",
      precioTotal: Number(grupo.precioTotal || grupo.precio || 0),
      uid: grupo.uid || "",
      orderId: grupo.orderId || grupoSnap.key,
      procesado: grupo.procesado ?? false,
      notasInternas: mapaNotasTemp[(grupo.orderId || grupoSnap.key) || ""] || 0,
      reprogramada: false,
      cancelada: grupo.cancelada === true || grupo.cancelada === "true",
    });
  });
}
          datosReservas.sort((a, b) => {
            const fechaA = new Date(`${a.fecha}T00:00:00`);
            const fechaB = new Date(`${b.fecha}T00:00:00`);
            if (fechaA - fechaB !== 0) return fechaA - fechaB;
            return (a.turno || "").localeCompare(b.turno || "", "es");
          });

          setReservas(datosReservas);
        } catch (error) {
          console.error("Error al cargar reservas normales:", error);
          setReservas([]);
        }

        try {
          const tarjetasSnap = await get(ref(dbRealtime, "tarjetasRegalo"));
          const datosTarjetas = [];

          if (tarjetasSnap.exists()) {
            tarjetasSnap.forEach((tarjetaSnap) => {
              const tarjeta = tarjetaSnap.val() || {};

              datosTarjetas.push({
                id: tarjetaSnap.key,
                tipoRegistro: "tarjeta_regalo",
                claseId: "tarjeta_regalo",
                clase: tarjeta.clase || "Tarjeta regalo",
                fecha:
                  typeof tarjeta.fechaCompra === "string" &&
                  tarjeta.fechaCompra.length >= 10
                    ? tarjeta.fechaCompra.slice(0, 10)
                    : "—",
                turno: "—",
                metodo: tarjeta.codigo || "—",
                plazas: Number(tarjeta.plazas || 1),
                estado: tarjeta.estadoCanje || "pendiente",
                estadoPago: tarjeta.estadoPago || "—",
                precioTotal: Number(tarjeta.precioTotal || 0),
                uid: tarjeta.uidComprador || "",
                orderId: tarjeta.orderId || tarjetaSnap.key,
                procesado: tarjeta.procesado ?? false,
                codigo: tarjeta.codigo || "",
                nombreDestinatario: tarjeta.nombreDestinatario || "",
                emailDestinatario: tarjeta.emailDestinatario || "",
                notasInternas:
                  mapaNotasTemp[(tarjeta.orderId || tarjetaSnap.key) || ""] || 0,
                reprogramada: false,
                cancelada: false,
              });
            });
          }

          datosTarjetas.sort((a, b) => {
            const fechaA = new Date(
              a.fecha === "—" ? 0 : `${a.fecha}T00:00:00`
            );
            const fechaB = new Date(
              b.fecha === "—" ? 0 : `${b.fecha}T00:00:00`
            );
            return fechaB - fechaA;
          });

          setTarjetasRegalo(datosTarjetas);
        } catch (error) {
          console.error("Error al cargar tarjetas regalo:", error);
          setTarjetasRegalo([]);
        }
      } catch (error) {
        console.error("Error al cargar datos del admin:", error);
        setReservas([]);
        setTarjetasRegalo([]);
        setClasesValidas([]);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  const datosActivos = useMemo(() => {
    if (filtroClase === "tarjeta_regalo") {
      return tarjetasRegalo;
    }
    return reservas;
  }, [filtroClase, reservas, tarjetasRegalo]);

  const getEstadoVisible = (r) => {
    if (r.tipoRegistro === "tarjeta_regalo") {
      return r.estado || "pendiente";
    }

    if (r.cancelada) return "Cancelada";
    if (r.reprogramada) return "Reprogramada";
    if (r.estado && r.estado !== "—") return r.estado;

    return "Confirmada";
  };

  const reservasFiltradas = useMemo(() => {
  return datosActivos.filter((r) => {
    const estadoVisible = getEstadoVisible(r);

    const esReservaConfirmada =
      r.tipoRegistro === "tarjeta_regalo" ||
      (r.estado === "Confirmada" && r.estadoPago === "pagado");

    if (!esReservaConfirmada) return false;

    const cumpleFecha = !filtroFecha || r.fecha === filtroFecha;
    const cumpleClase = !filtroClase || r.claseId === filtroClase;
    const cumpleEstado = !filtroEstado || estadoVisible === filtroEstado;
   const telefonoReserva = String(r.telefono || "").replace(/\s/g, "");
const telefonoBuscado = String(filtroTelefono || "").replace(/\s/g, "");

const cumpleTelefono =
  !telefonoBuscado || telefonoReserva.includes(telefonoBuscado);
   

    return (
  cumpleFecha &&
  cumpleClase &&
  cumpleEstado &&
  cumpleTelefono
);
  });
}, [
  datosActivos,
  filtroFecha,
  filtroClase,
  filtroEstado,
  filtroTelefono,
]);
const limpiarFiltros = () => {
  setFiltroFecha("");
  setFiltroClase("");
  setFiltroEstado("");
  setFiltroTelefono("");
 
};

  const mostrandoTarjetas = filtroClase === "tarjeta_regalo";

  const getRowStyle = (r) => {
    if (mostrandoTarjetas) return styles.trClickable;

    if (r.cancelada) {
      return {
        ...styles.trClickable,
        ...styles.trCancelada,
      };
    }

    if (r.reprogramada) {
      return {
        ...styles.trClickable,
        ...styles.trReprogramada,
      };
    }

    return styles.trClickable;
  };

  const getCardStyle = (r) => {
    if (mostrandoTarjetas) return styles.cardMovil;

    if (r.cancelada) {
      return {
        ...styles.cardMovil,
        ...styles.cardCancelada,
      };
    }

    if (r.reprogramada) {
      return {
        ...styles.cardMovil,
        ...styles.cardReprogramada,
      };
    }

    return styles.cardMovil;
  };

  const renderEstado = (r) => {
    const estadoVisible = getEstadoVisible(r);

    if (mostrandoTarjetas) {
      return <span>{estadoVisible}</span>;
    }

    if (estadoVisible === "Cancelada") {
      return <span style={styles.badgeCancelada}>Cancelada</span>;
    }

    if (estadoVisible === "Reprogramada") {
      return <span style={styles.badgeReprogramada}>Reprogramada</span>;
    }

    return <span>{estadoVisible}</span>;
  };

  const renderNotas = (r) => {
    if (r.notasInternas > 0) {
      return (
        <span style={styles.badgeNotas}>
          {r.notasInternas} {r.notasInternas === 1 ? "nota" : "notas"}
        </span>
      );
    }

    return <span style={styles.textoSuave}>—</span>;
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

        <h1 style={styles.titulo}>Reservas</h1>
        <p style={styles.subtitulo}>
          Vista general de todas las reservas.
        </p>

        <div style={styles.filtrosBox}>
          <div style={styles.filtrosGrid}>
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
              <label style={styles.label}>Clase</label>
              <select
                value={filtroClase}
                onChange={(e) => setFiltroClase(e.target.value)}
                style={styles.input}
              >
                <option value="">Todas</option>
                {clasesValidas.map((clase) => (
                  <option key={clase.id} value={clase.id}>
                    {clase.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.campo}>
  <label style={styles.label}>
    {mostrandoTarjetas ? "Estado canje" : "Estado reserva"}
  </label>

  <select
    value={filtroEstado}
    onChange={(e) => setFiltroEstado(e.target.value)}
    style={styles.input}
  >
    <option value="">Todos</option>

    {mostrandoTarjetas ? (
      <>
        <option value="pendiente">Pendiente</option>
        <option value="canjeada">Canjeada</option>
        <option value="caducada">Caducada</option>
      </>
    ) : (
      <>
        <option value="Confirmada">Confirmada</option>
        <option value="Reprogramada">Reprogramada</option>
        <option value="Cancelada">Cancelada</option>
      </>
    )}
  </select>
</div>

<div style={styles.campo}>
  <label style={styles.label}>Teléfono</label>

  <input
    type="text"
    placeholder="Buscar teléfono"
    value={filtroTelefono}
    onChange={(e) => setFiltroTelefono(e.target.value)}
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
          <p style={styles.mensaje}>Cargando reservas...</p>
        ) : reservasFiltradas.length === 0 ? (
          <p style={styles.mensaje}>No hay reservas para mostrar.</p>
        ) : esMovil ? (
          <div style={styles.cardsWrapper}>
            {reservasFiltradas.map((r) => (
              <div
                key={`${r.claseId}-${r.fecha}-${r.orderId}-${r.id}`}
                onClick={() =>
                  navigate(
  r.tipoRegistro === "tarjeta_regalo"
    ? `/admin-detalle-tarjeta-regalo?id=${r.orderId}`
    : r.tipoRegistro === "reserva_grupo"
    ? `/admin-reservas-grupos?fecha=${r.fecha}`
    : `/admin-detalle-reserva?id=${r.orderId}`
)
                }
                style={getCardStyle(r)}
              >
                <div style={styles.cardTop}>
                  <div>
                    <p style={styles.cardFecha}>{r.fecha}</p>
                    <p style={styles.cardTurno}>
                      {mostrandoTarjetas ? r.codigo || "—" : r.turno}
                    </p>
                  </div>
                  <div>{renderEstado(r)}</div>
                </div>

                <div style={styles.cardBloque}>
                  <p style={styles.cardTitulo}>{r.clase}</p>

                  
  {!mostrandoTarjetas && (
  <>
    <p style={styles.cardTexto}>
      <strong>Cliente:</strong> {r.nombre || "Sin nombre"}
      {r.telefono ? ` · ${r.telefono}` : ""}
    </p>

    {r.telefono && (
      <a
        href={`https://wa.me/34${String(r.telefono).replace(/\D/g, "")}`}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.btnWhatsApp}
        onClick={(e) => e.stopPropagation()}
      >
        WhatsApp cliente
      </a>
    )}
  </>
)}
                  <p style={styles.cardTexto}>
                    <strong>
                      {mostrandoTarjetas ? "Destinatario / Info:" : "Método:"}
                    </strong>{" "}
                    {mostrandoTarjetas
                      ? r.nombreDestinatario || r.emailDestinatario || "—"
                      : r.metodo}
                  </p>

                  <div style={styles.cardGrid}>
                    <p style={styles.cardTexto}>
                      <strong>Plazas:</strong> {r.plazas}
                    </p>
                    <p style={styles.cardTexto}>
                      <strong>Pago:</strong> {r.estadoPago}
                    </p>
                    <p style={styles.cardTexto}>
                      <strong>Precio:</strong> {r.precioTotal}€
                    </p>
                    <p style={styles.cardTexto}>
                      <strong>Notas:</strong> {renderNotas(r)}
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
                 <th style={styles.th}>Fecha / turno</th>
                  <th style={styles.th}>Reserva</th>
                  <th style={styles.th}>Cliente</th>
                  
                  <th style={styles.th}>Plazas</th>
                  <th style={styles.th}>
                    {mostrandoTarjetas ? "Estado canje" : "Estado"}
                  </th>
                  
                  
                  <th style={styles.th}>Precio</th>
                </tr>
              </thead>
              <tbody>
                {reservasFiltradas.map((r) => (
                  <tr
                    key={`${r.claseId}-${r.fecha}-${r.orderId}-${r.id}`}
                    onClick={() =>
                     navigate(
  r.tipoRegistro === "tarjeta_regalo"
    ? `/admin-detalle-tarjeta-regalo?id=${r.orderId}`
    : r.tipoRegistro === "reserva_grupo"
    ? `/admin-reservas-grupos?fecha=${r.fecha}`
    : `/admin-detalle-reserva?id=${r.orderId}`
)
                    }
                    style={getRowStyle(r)}
                  >
                    <td style={styles.tdFechaTurno}>
  <strong>{fechaDMA(r.fecha)}</strong>
  <br />
  <span style={styles.textoSuave}>
    {mostrandoTarjetas ? r.codigo || "—" : r.turno}
  </span>
</td>
                    <td style={styles.tdClase}>
  <strong>{r.clase}</strong>

  <br />

  <span style={styles.textoSuave}>
    {mostrandoTarjetas
      ? r.nombreDestinatario || r.emailDestinatario || "—"
      : r.metodo}
  </span>

  {r.notasInternas > 0 && (
    <>
      <br />
      {renderNotas(r)}
    </>
  )}
</td>
<td style={styles.tdCliente}>
  <strong>{r.nombre || "Sin nombre"}</strong>
  <br />
  <span>{r.telefono || "Sin teléfono"}</span>

  {r.telefono && (
    <>
      <br />
      <a
        href={`https://wa.me/34${String(r.telefono).replace(/\D/g, "")}`}
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

                    <td style={styles.td}>{r.plazas}</td>
                    <td style={styles.td}>{renderEstado(r)}</td>
                    
                    
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
    overflowX: "auto",
    borderRadius: 18,
    border: "1px solid #f0e5cf",
    backgroundColor: "#fffdf7",
  },
  table: {
    width: "100%",
    minWidth: "800px",
    borderCollapse: "collapse",
    backgroundColor: "#fffdf7",
    overflow: "hidden",
  },
  th: {
    textAlign: "left",
    padding: "14px 16px",
    backgroundColor: "#fff8da",
    color: "#5b4a2d",
    borderBottom: "1px solid #f0e5cf",
    fontSize: "0.95rem",
    whiteSpace: "nowrap",
  },
 td: {
  padding: "12px 12px",
  borderBottom: "1px solid #f3ead7",
  color: "#333",
  fontSize: "0.9rem",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
},
tdFechaTurno: {
  padding: "12px 12px",
  borderBottom: "1px solid #f3ead7",
  color: "#333",
  fontSize: "0.9rem",
  verticalAlign: "middle",
  minWidth: "120px",
  lineHeight: 1.35,
},
  
    tdClase: {
  padding: "12px 14px",
  borderBottom: "1px solid #f3ead7",
  color: "#333",
  fontSize: "0.92rem",
  verticalAlign: "middle",
  minWidth: "220px",
  maxWidth: "260px",
  lineHeight: 1.35,
},
  
  tdCliente: {
  padding: "12px 14px",
  borderBottom: "1px solid #f3ead7",
  color: "#333",
  fontSize: "0.92rem",
  verticalAlign: "middle",
  minWidth: "170px",
  lineHeight: 1.35,
},
  
    tdMetodo: {
  padding: "12px 14px",
  borderBottom: "1px solid #f3ead7",
  color: "#333",
  fontSize: "0.9rem",
  verticalAlign: "middle",
  minWidth: "160px",
  maxWidth: "190px",
  lineHeight: 1.35,
},
  trClickable: {
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  trCancelada: {
    backgroundColor: "#fff1f1",
  },
  trReprogramada: {
    backgroundColor: "#fff4d6",
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
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(0,0,0,0.05)",
},
  cardCancelada: {
    backgroundColor: "#fff3f3",
    border: "1px solid #efcaca",
  },
  cardReprogramada: {
    backgroundColor: "#fff6df",
    border: "1px solid #ead9a2",
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
  badgeNotas: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    backgroundColor: "#fff8da",
    border: "1px solid #eadfbe",
    color: "#5b4a2d",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  badgeCancelada: {
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
  badgeReprogramada: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    backgroundColor: "#f6df9c",
    border: "1px solid #ddb85c",
    color: "#7a5a1f",
    fontSize: "0.85rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  textoSuave: {
    color: "#8a8a8a",
  },
};

export default AdminReservasNuevo;