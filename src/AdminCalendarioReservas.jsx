import React, { useEffect, useMemo, useRef, useState } from "react";
import Icono from "./components/Icono";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import PanelFechasEspeciales, { fechasDelRango } from "./components/PanelFechasEspeciales";
import { bloqueoEsParcial } from "./utils/rangosHora";
import { ocupacionPorFranja, sumarSolapadas } from "./utils/aforo";
import { cargarConfigEspacio } from "./configuracionEspacio";
import { fechaDMA } from "./utils/formatoFecha";
import { useNavigate } from "react-router-dom";
import EtiquetaInvitado from "./components/EtiquetaInvitado";



const AdminCalendarioReservas = () => {
  const navigate = useNavigate();

  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  // Las dos columnas (calendario + día) solo caben con una pantalla ancha
  const [esAncho, setEsAncho] = useState(() => window.innerWidth >= 1200);

  const [mesActual, setMesActual] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });

  const obtenerFechaLocalISO = (fecha = new Date()) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, "0");
    const day = String(fecha.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    return obtenerFechaLocalISO(new Date());
  });

  // Días bloqueados y habilitados a mano, y selección de varios días seguidos
  const [bloqueos, setBloqueos] = useState({});
  const [habilitadas, setHabilitadas] = useState({});
  const [modoRango, setModoRango] = useState(false);
  // El diálogo se mantiene montado mientras dura el fundido de salida
  const [rangoInicio, setRangoInicio] = useState("");
  const [rangoFin, setRangoFin] = useState("");
  // Plazas por franja (todos los talleres y grupos) y aforo, para la barra de cada día
  const [ocupacionFranjas, setOcupacionFranjas] = useState({});
  const [aforoTotal, setAforoTotal] = useState(45);
  // En móvil, el panel de bloquear y habilitar sube como una hoja desde abajo
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const detalleRef = useRef(null);

  const cargarFechasEspeciales = async () => {
    try {
      const [bloqueosSnap, habilitadasSnap] = await Promise.all([
        get(ref(dbRealtime, "bloqueosFechas")),
        get(ref(dbRealtime, "fechasHabilitadas")),
      ]);
      setBloqueos(bloqueosSnap.exists() ? bloqueosSnap.val() || {} : {});
      setHabilitadas(habilitadasSnap.exists() ? habilitadasSnap.val() || {} : {});
    } catch (error) {
      console.error("Error al cargar bloqueos y fechas habilitadas:", error);
    }
  };

  useEffect(() => {
    cargarFechasEspeciales();
    cargarConfigEspacio().then((config) => setAforoTotal(config.aforoTotal));
  }, []);

  // Con "varios días", el primer clic marca el inicio y el segundo el final
  const elegirDia = (fechaISO) => {
    setFechaSeleccionada(fechaISO);

    if (!modoRango) {
      // En móvil los detalles quedan debajo del calendario: se baja hasta ellos
      if (isMobile) {
        requestAnimationFrame(() =>
          detalleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        );
      }
      return;
    }

    if (!rangoInicio || rangoFin) {
      setRangoInicio(fechaISO);
      setRangoFin("");
    } else if (fechaISO < rangoInicio) {
      setRangoFin(rangoInicio);
      setRangoInicio(fechaISO);
    } else {
      setRangoFin(fechaISO);
    }
  };

  const alternarModoRango = () => {
    setModoRango((v) => !v);
    setRangoInicio("");
    setRangoFin("");
  };

  // Días sobre los que actúa el panel: el rango elegido o el día seleccionado
  const hayRango = modoRango && !!rangoInicio;
  const panelInicio = hayRango ? rangoInicio : fechaSeleccionada;
  const panelFin = hayRango ? rangoFin || rangoInicio : fechaSeleccionada;
  const diasEnRango = useMemo(
    () => new Set(hayRango ? fechasDelRango(panelInicio, panelFin) : []),
    [hayRango, panelInicio, panelFin]
  );

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
      setEsAncho(window.innerWidth >= 1200);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const cargarReservas = async () => {
      try {
        
          const [reservasSnap, reservasGruposSnap, usuariosSnap] = await Promise.all([
  get(ref(dbRealtime, "reservas")),
  get(ref(dbRealtime, "reservasGrupos")),
  get(ref(dbRealtime, "usuarios")),
]);

        const datos = [];
        const usuariosMap = {};

if (usuariosSnap.exists()) {
  usuariosSnap.forEach((userSnap) => {
    const uid = userSnap.key;
    const user = userSnap.val() || {};

    usuariosMap[uid] = {
      nombre: user.nombre || user.name || user.displayName || "",
      telefono: user.telefono || user.phone || user.telefonoUsuario || "",
      email: user.email || "",
      invitado: user.invitado === true,
    };
  });
}

        const procesarReserva = (
          reserva,
          {
            claseKey = "",
            fechaKey = "",
            turnoKey = "",
            metodoKey = "—",
          } = {}
        ) => {
          if (!reserva || typeof reserva !== "object") return;

         const estadoNormalizado = String(reserva.estado || "")
  .trim()
  .toLowerCase();

const estadoPagoNormalizado = String(reserva.estadoPago || "")
  .trim()
  .toLowerCase();

if (estadoNormalizado !== "confirmada") return;
if (["pendiente", "rechazado", "fallido"].includes(estadoPagoNormalizado)) return;

         const fechaFinal = reserva.fecha || fechaKey;
if (!fechaFinal) return;

const datosUsuario = usuariosMap[reserva.uid] || {};

datos.push({
  orderId: reserva.orderId || "",
  id:
    reserva.orderId ||
    reserva.id ||
    `${claseKey}-${fechaFinal}-${turnoKey}-${metodoKey}-${Math.random()}`,
  claseId: reserva.claseId || claseKey || "",
  clase: reserva.clase || claseKey || "Clase",
  fecha: fechaFinal,
  turno: reserva.turno || turnoKey || "—",
  metodo: reserva.metodo || reserva.modalidad || reserva.tipoClase || metodoKey || "—",
  plazas: Number(reserva.plazas || 1),
  estadoPago: reserva.estadoPago || "—",
  precioTotal: Number(reserva.precioTotal || reserva.precio || 0),
  uid: reserva.uid || "",
  invitado: datosUsuario.invitado === true,
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
  esGrupo: false,
});
        };

        const pareceReservaDirecta = (obj) => {
          if (!obj || typeof obj !== "object") return false;

          return (
            "fecha" in obj ||
            "estado" in obj ||
            "estadoPago" in obj ||
            "uid" in obj ||
            "orderId" in obj ||
            "clase" in obj ||
            "claseId" in obj
          );
        };

        if (reservasSnap.exists()) {
          reservasSnap.forEach((claseSnap) => {
            const claseKey = claseSnap.key;

            claseSnap.forEach((fechaSnap) => {
              const fechaKey = fechaSnap.key;

              if (pareceReservaDirecta(fechaSnap.val())) {
                procesarReserva(fechaSnap.val(), {
                  claseKey,
                  fechaKey,
                });
                return;
              }

              fechaSnap.forEach((turnoSnap) => {
                const turnoKey = turnoSnap.key;
                const turnoVal = turnoSnap.val();

                if (pareceReservaDirecta(turnoVal)) {
                  procesarReserva(turnoVal, {
                    claseKey,
                    fechaKey,
                    turnoKey,
                  });
                  return;
                }

                turnoSnap.forEach((nivelSnap) => {
                  const nivelVal = nivelSnap.val();

                  if (pareceReservaDirecta(nivelVal)) {
                    // Reserva directamente bajo el turno: su clave es el id de la
                    // reserva, no un método (antes salía "-P6kf…" como método)
                    procesarReserva(nivelVal, {
                      claseKey,
                      fechaKey,
                      turnoKey,
                    });
                    return;
                  }

                  if (nivelVal && typeof nivelVal === "object") {
                    nivelSnap.forEach((reservaSnap) => {
                      procesarReserva(reservaSnap.val(), {
                        claseKey,
                        fechaKey,
                        turnoKey,
                        metodoKey: nivelSnap.key,
                      });
                    });
                  }
                });
              });
            });
          });
        }

        if (reservasGruposSnap.exists()) {
          reservasGruposSnap.forEach((grupoSnap) => {
            const grupo = grupoSnap.val();

            if (!grupo || typeof grupo !== "object") return;

           const estadoNormalizado = String(grupo.estado || "")
  .trim()
  .toLowerCase();

const estadoPagoNormalizado = String(grupo.estadoPago || "")
  .trim()
  .toLowerCase();

const esGrupoIndividualEnProceso =
  grupo.modoPago === "individual" &&
  (
    estadoNormalizado === "pendiente_pago_individual" ||
    estadoPagoNormalizado === "parcial"
  );

const esGrupoConfirmado =
  estadoNormalizado === "confirmada" &&
  !["pendiente", "rechazado", "fallido", "cancelado"].includes(estadoPagoNormalizado);

if (!esGrupoConfirmado && !esGrupoIndividualEnProceso) return;

            const fechaFinal = grupo.fecha || "";
            if (!fechaFinal) return;
            const datosUsuario = usuariosMap[grupo.uid] || {};

            datos.push({
  id: grupo.orderId || grupoSnap.key || `grupo-${Math.random()}`,
  claseId: grupo.claseId || "reserva-grupo",
  clase: grupo.clase || "Reserva de grupo",
  nombreGrupo: grupo.nombreGrupo || "",
  fecha: fechaFinal,
  turno: grupo.turno || "—",
  metodo: "grupo",
  plazas: Number(grupo.plazas || 1),
  estadoPago: grupo.estadoPago || "—",
  precioTotal: Number(grupo.precioTotal || grupo.precio || 0),
  uid: grupo.uid || "",
  invitado: datosUsuario.invitado === true,
  nombre:
    grupo.nombre ||
    grupo.nombreUsuario ||
    datosUsuario.nombre ||
    "",
  telefono:
    grupo.telefono ||
    grupo.telefonoUsuario ||
    datosUsuario.telefono ||
    "",
  email:
    grupo.email ||
    datosUsuario.email ||
    "",
  esGrupo: true,
  estadoCalendario: esGrupoIndividualEnProceso
  ? "grupo_individual_en_proceso"
  : "confirmada",

plazasPagadas: Number(grupo.plazasPagadas || 0),
plazasPendientes: Number(grupo.plazasPendientes || 0),
});
          });
        }

        datos.sort((a, b) => {
          const fechaA = new Date(`${a.fecha}T00:00:00`);
          const fechaB = new Date(`${b.fecha}T00:00:00`);

          if (fechaA.getTime() !== fechaB.getTime()) {
            return fechaA - fechaB;
          }

          return (a.turno || "").localeCompare(b.turno || "", "es");
        });

        setOcupacionFranjas(ocupacionPorFranja(reservasSnap, reservasGruposSnap, ""));
        setReservas(datos);
      } catch (error) {
        console.error("Error al cargar calendario de reservas:", error);
        setReservas([]);
      } finally {
        setCargando(false);
      }
    };

    cargarReservas();
  }, []);

  const resumenPorFecha = useMemo(() => {
    const mapa = {};

    reservas.forEach((reserva) => {
      if (!mapa[reserva.fecha]) {
        mapa[reserva.fecha] = {
          fecha: reserva.fecha,
          totalReservas: 0,
          totalPlazas: 0,
          totalIngresos: 0,
          reservas: [],
        };
      }

      mapa[reserva.fecha].totalReservas += 1;
      mapa[reserva.fecha].totalPlazas += Number(reserva.plazas || 1);
      mapa[reserva.fecha].totalIngresos += Number(reserva.precioTotal || 0);
      mapa[reserva.fecha].reservas.push(reserva);
    });

    return mapa;
  }, [reservas]);

  // Por día: plazas del turno más lleno (sumando turnos que se solapan) sobre el aforo
  const ocupacionPorDia = useMemo(() => {
    const mapa = {};

    Object.entries(ocupacionFranjas).forEach(([fecha, turnos]) => {
      const maximo = Math.max(...Object.keys(turnos).map((t) => sumarSolapadas(turnos, t).total));
      if (maximo > 0) mapa[fecha] = { maximo, pct: Math.min(100, Math.round((maximo / aforoTotal) * 100)) };
    });

    return mapa;
  }, [ocupacionFranjas, aforoTotal]);

  const detalleDiaSeleccionado = useMemo(() => {
    return resumenPorFecha[fechaSeleccionada] || null;
  }, [resumenPorFecha, fechaSeleccionada]);

  const reservasDelDia = useMemo(() => {
  if (!detalleDiaSeleccionado?.reservas?.length) return [];
  return detalleDiaSeleccionado.reservas;
}, [detalleDiaSeleccionado]);

  

  const nombreMes = useMemo(() => {
    return mesActual.toLocaleDateString("es-ES", {
      month: "long",
      year: "numeric",
    });
  }, [mesActual]);

  const diasCalendario = useMemo(() => {
    const year = mesActual.getFullYear();
    const month = mesActual.getMonth();

    const primerDiaMes = new Date(year, month, 1);
    const ultimoDiaMes = new Date(year, month + 1, 0);

    let diaSemanaInicio = primerDiaMes.getDay();
    if (diaSemanaInicio === 0) diaSemanaInicio = 7;

    const totalDiasMes = ultimoDiaMes.getDate();
    const celdas = [];

    for (let i = 1; i < diaSemanaInicio; i++) {
      celdas.push(null);
    }

    for (let dia = 1; dia <= totalDiasMes; dia++) {
      const mesTexto = String(month + 1).padStart(2, "0");
      const diaTexto = String(dia).padStart(2, "0");
      const fechaISO = `${year}-${mesTexto}-${diaTexto}`;

      celdas.push({
        dia,
        fechaISO,
      });
    }

    while (celdas.length % 7 !== 0) {
      celdas.push(null);
    }

    return celdas;
  }, [mesActual]);

  const cambiarMes = (direccion) => {
    setMesActual((prev) => {
      const nuevo = new Date(prev);
      nuevo.setMonth(prev.getMonth() + direccion);
      return new Date(nuevo.getFullYear(), nuevo.getMonth(), 1);
    });
  };

  const irAMesActual = () => {
    const hoy = new Date();
    setMesActual(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    setFechaSeleccionada(obtenerFechaLocalISO(hoy));
  };

  const esHoy = (fechaISO) => {
    const hoy = obtenerFechaLocalISO(new Date());
    return fechaISO === hoy;
  };

  const esDiaPasado = (fechaISO) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fecha = new Date(`${fechaISO}T00:00:00`);
    return fecha < hoy;
  };

  // "Miércoles, 18 de noviembre" (con el año solo si no es el actual)
  const tituloDia = (fecha) => {
    const d = new Date(`${fecha}T00:00:00`);
    const texto = d.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      ...(d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" } : {}),
    });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  };



  const obtenerEstiloDia = (celda) => {
    if (!celda) {
      return {
        ...styles.diaVacio,
        ...(isMobile ? styles.diaVacioMobile : {}),
      };
    }

    const resumen = resumenPorFecha[celda.fechaISO];
    const seleccionado = fechaSeleccionada === celda.fechaISO;
    const hoy = esHoy(celda.fechaISO);
    const pasado = esDiaPasado(celda.fechaISO);

    let estilo = {
      ...styles.dia,
      ...(isMobile ? styles.diaMobile : {}),
    };

    if (pasado) {
      estilo = {
        ...estilo,
        ...styles.diaPasado,
      };
    }

    if (resumen?.totalReservas > 0) {
      estilo = {
        ...estilo,
        ...styles.diaConReservas,
      };
    }

    if (resumen?.totalReservas >= 4) {
      estilo = {
        ...estilo,
        ...styles.diaActividadMedia,
      };
    }

    if (resumen?.totalReservas >= 7) {
      estilo = {
        ...estilo,
        ...styles.diaActividadAlta,
      };
    }

    if (bloqueoEsParcial(bloqueos[celda.fechaISO])) {
      estilo = { ...estilo, background: "#fff3e0", borderColor: "#e0b36a" };
    } else if (bloqueos[celda.fechaISO]?.bloqueado) {
      estilo = { ...estilo, background: "#fdecea", borderColor: "#e8a29b" };
    } else if (habilitadas[celda.fechaISO]?.habilitada) {
      estilo = { ...estilo, background: "#e8f5e9", borderColor: "#8fc796" };
    }

    if (diasEnRango.has(celda.fechaISO)) {
      estilo = { ...estilo, boxShadow: "inset 0 0 0 2px #3f3128" };
    }

    if (hoy) {
      estilo = {
        ...estilo,
        ...styles.diaHoy,
      };
    }

    if (seleccionado) {
      estilo = {
        ...estilo,
        ...styles.diaSeleccionado,
      };
    }

    return estilo;
  };

  // Enlaces de cada reserva: su ficha (o la lista de grupos del día) y WhatsApp
  const rutaDetalleReserva = (r) => {
    if (r.esGrupo) return `/admin-reservas-grupos?fecha=${r.fecha}`;
    return r.orderId ? `/admin-detalle-reserva?id=${r.orderId}` : `/admin-reservas-nuevo?fecha=${r.fecha}`;
  };

  const urlWhatsApp = (telefono) => {
    const digitos = String(telefono || "").replace(/\D/g, "");
    return digitos ? `https://wa.me/34${digitos}` : "";
  };

  const irAReservasDelDia = () => {
  if (!fechaSeleccionada || !detalleDiaSeleccionado?.reservas?.length) return;

  const hayNormales = detalleDiaSeleccionado.reservas.some((r) => !r.esGrupo);
  const hayGrupos = detalleDiaSeleccionado.reservas.some((r) => r.esGrupo);

  if (!hayNormales && hayGrupos) {
    navigate(`/admin-reservas-grupos?fecha=${fechaSeleccionada}`);
    return;
  }

  navigate(`/admin-reservas-nuevo?fecha=${fechaSeleccionada}`);
};

  // Lista de reservas del día seleccionado (diálogo en móvil, columna en escritorio)
  const listaReservasJsx = (
    <div style={styles.listaReservas}>
      {reservasDelDia.map((r, index) => {
        const enProceso = r.estadoCalendario === "grupo_individual_en_proceso";
        const pagado = String(r.estadoPago || "").toLowerCase() === "pagado";

        return (
          <div
            key={`${r.id}-${index}`}
            style={{ ...styles.reservaFila, ...(enProceso ? styles.reservaFilaGrupoEnProceso : {}) }}
          >
            <div style={styles.reservaCabecera}>
              <p style={styles.reservaClase}>{r.clase}</p>
              <span style={styles.pagoPrecio}>{r.precioTotal} €</span>
            </div>

            {r.esGrupo && r.nombreGrupo && <p style={styles.reservaGrupo}>Grupo: {r.nombreGrupo}</p>}
            {enProceso && (
              <p style={styles.reservaGrupoProceso}>
                <Icono nombre="punto" tamano="0.7em" className="text-tinta mr-1" /> Pago individual en proceso · {r.plazasPagadas || 0} pagada
                {(r.plazasPagadas || 0) !== 1 ? "s" : ""} / {r.plazasPendientes || 0} pendiente
                {(r.plazasPendientes || 0) !== 1 ? "s" : ""}
              </p>
            )}

            <p style={styles.reservaMeta}>
              {r.turno}
              {r.metodo && r.metodo !== "—" ? ` · ${r.metodo}` : ""} · {r.plazas} plaza{r.plazas !== 1 ? "s" : ""}
            </p>
            {(r.nombre || r.telefono) && (
              <p style={styles.reservaContacto}>
                {r.nombre || "Sin nombre"}
                <EtiquetaInvitado invitado={r.invitado} />
                {r.telefono ? ` · ${r.telefono}` : ""}
              </p>
            )}

            <div style={styles.reservaEnlaces}>
              <span style={{ ...styles.pagoChip, ...(pagado ? styles.pagoChipOk : styles.pagoChipPendiente) }}>
                {r.estadoPago}
              </span>
              <button type="button" style={styles.enlaceDetalle} onClick={() => navigate(rutaDetalleReserva(r))}>
                Ver detalles <Icono nombre="derecha" />
              </button>
              {urlWhatsApp(r.telefono) && (
                <a href={urlWhatsApp(r.telefono)} target="_blank" rel="noopener noreferrer" style={styles.enlaceWhatsApp}>
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const alCambiarFechas = async () => {
    await cargarFechasEspeciales();
    if (isMobile) setHojaAbierta(false);
  };

  const textoSeleccion =
    panelInicio === panelFin
      ? fechaDMA(panelInicio)
      : `${fechaDMA(panelInicio)} – ${fechaDMA(panelFin)} (${diasEnRango.size} días)`;

  const panelFechasJsx = fechaSeleccionada ? (
    <PanelFechasEspeciales
      inicio={panelInicio}
      fin={panelFin}
      bloqueos={bloqueos}
      habilitadas={habilitadas}
      onCambio={alCambiarFechas}
    />
  ) : null;

  return (
    <div style={{ ...styles.body, ...(isMobile ? styles.bodyMobile : {}) }}>
      <div
        style={{
          ...styles.container,
          ...(isMobile ? styles.containerMobile : {}),
        }}
      >
        <BotonVolver />

        <div style={{ ...styles.header, ...(isMobile ? styles.headerMobile : {}) }}>
          <h1 style={{ ...styles.titulo, ...(isMobile ? styles.tituloMobile : {}) }}>
            Calendario de reservas
          </h1>
          <p
            style={{
              ...styles.subtitulo,
              ...(isMobile ? styles.subtituloMobile : {}),
            }}
          >
            Vista mensual general para ver rápidamente los días con actividad.
          </p>
        </div>

        <div style={{ ...styles.barraMes, ...(isMobile ? styles.barraMesMobile : {}) }}>
          <button
            style={{ ...styles.botonMes, ...(isMobile ? styles.botonMesMobile : {}) }}
            onClick={() => cambiarMes(-1)}
            aria-label="Mes anterior"
          >
            {isMobile ? <Icono nombre="anterior" /> : <><Icono nombre="izquierda" className="mr-1" />Anterior</>}
          </button>

          <div style={{ ...styles.mesCentro, ...(isMobile ? styles.mesCentroMobile : {}) }}>
            <h2 style={{ ...styles.mesTitulo, ...(isMobile ? styles.mesTituloMobile : {}) }}>
              {nombreMes}
            </h2>
            <button
              style={{ ...styles.botonHoy, ...(isMobile ? styles.botonHoyMobile : {}) }}
              onClick={irAMesActual}
            >
              {isMobile ? "Hoy" : "Ir a hoy"}
            </button>
          </div>

          <button
            style={{ ...styles.botonMes, ...(isMobile ? styles.botonMesMobile : {}) }}
            onClick={() => cambiarMes(1)}
            aria-label="Mes siguiente"
          >
            {isMobile ? <Icono nombre="siguiente" /> : <>Siguiente<Icono nombre="derecha" className="ml-1" /></>}
          </button>
        </div>

        <div style={{ margin: "0 0 12px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={alternarModoRango}
            style={{
              ...styles.botonHoy,
              ...(modoRango ? { backgroundColor: "#3f3128", color: "#fff" } : {}),
            }}
          >
            {modoRango ? "Varios días: activado" : "Seleccionar varios días"}
          </button>
          {modoRango && (
            <span style={{ fontSize: 13, color: "#3f3128" }}>
              {!rangoInicio
                ? "Pulsa el primer día."
                : !rangoFin
                ? "Pulsa el último día (o el mismo para uno solo)."
                : "Pulsa otro día para empezar una nueva selección."}
            </span>
          )}
          <span style={{ fontSize: 12, color: "#777" }}>Personas por día: verde = hay sitio · naranja = casi lleno · rojo = completo{isMobile ? " · punto: rojo cerrado, naranja por horas, verde abierto" : ""}</span>
        </div>

        {cargando ? (
          <p style={styles.mensaje}>Cargando calendario...</p>
        ) : (
          <div style={esAncho ? styles.dosColumnas : undefined}>
            <div style={{ minWidth: 0 }}>
            <div
              style={{
                ...styles.calendarioBox,
                ...(isMobile ? styles.calendarioBoxMobile : {}),
              }}
            >
              <div
                style={{
                  ...styles.semanaHeader,
                  ...(isMobile ? styles.semanaHeaderMobile : {}),
                }}
              >
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((dia) => (
                  <div
                    key={dia}
                    style={{
                      ...styles.semanaDia,
                      ...(isMobile ? styles.semanaDiaMobile : {}),
                    }}
                  >
                    {dia}
                  </div>
                ))}
              </div>

              <div
                style={{
                  ...styles.gridDias,
                  ...(isMobile ? styles.gridDiasMobile : {}),
                }}
              >
                {diasCalendario.map((celda, index) => {
                  if (!celda) {
                    return (
                      <div
                        key={`vacio-${index}`}
                        style={{
                          ...styles.diaVacio,
                          ...(isMobile ? styles.diaVacioMobile : {}),
                        }}
                      />
                    );
                  }

                  const resumen = resumenPorFecha[celda.fechaISO];
                  const ocupacion = ocupacionPorDia[celda.fechaISO];
                  const llena = ocupacion?.pct >= 100;
                  const bloqueo = bloqueos[celda.fechaISO];

                  // Verde: hay sitio · naranja: casi lleno · rojo: completo · gris: pago en curso
                  const nivel = !resumen
                    ? { color: "#6b6558", fondo: "#ece8dc" }
                    : llena
                    ? { color: "#a3281c", fondo: "#f8d7d3" }
                    : ocupacion?.pct >= 80
                    ? { color: "#8a5a00", fondo: "#fdebc8" }
                    : { color: "#2f6b2f", fondo: "#e0f0dc" };

                  // Estado del día cuando no es normal
                  const estadoDia = bloqueoEsParcial(bloqueo)
                    ? { texto: "Por horas", color: "#8a5a00", fondo: "#fdebc8" }
                    : bloqueo?.bloqueado
                    ? { texto: "Cerrado", color: "#a3281c", fondo: "#f8d7d3" }
                    : habilitadas[celda.fechaISO]?.habilitada
                    ? { texto: "Abierto", color: "#2f6b2f", fondo: "#d9eed4" }
                    : null;

                  // Detalle completo al pasar el ratón
                  const titulo = [
                    fechaDMA(celda.fechaISO),
                    resumen
                      ? `${resumen.totalReservas} reserva${resumen.totalReservas !== 1 ? "s" : ""} · ${resumen.totalPlazas} plaza${resumen.totalPlazas !== 1 ? "s" : ""}`
                      : ocupacion
                      ? "Plazas guardadas mientras se paga"
                      : "Sin reservas",
                    ocupacion ? `Turno más lleno: ${ocupacion.maximo}/${aforoTotal}${llena ? " (completo)" : ""}` : "",
                    bloqueoEsParcial(bloqueo)
                      ? "Cerrado por horas"
                      : bloqueo?.bloqueado
                      ? "Cerrado"
                      : habilitadas[celda.fechaISO]?.habilitada
                      ? "Abierto a mano"
                      : "",
                  ]
                    .filter(Boolean)
                    .join("\n");

                  return (
                    <button
                      key={celda.fechaISO}
                      type="button"
                      title={titulo}
                      style={obtenerEstiloDia(celda)}
                      onClick={() => elegirDia(celda.fechaISO)}
                    >
                      <div style={styles.diaCabecera}>
                        <span
                          style={{
                            ...styles.diaNumero,
                            ...(isMobile ? styles.diaNumeroMobile : {}),
                          }}
                        >
                          {celda.dia}
                        </span>
                        {estadoDia &&
                          (isMobile ? (
                            <span style={{ ...styles.diaPunto, backgroundColor: estadoDia.color }} />
                          ) : (
                            <span style={{ ...styles.diaEstado, color: estadoDia.color, backgroundColor: estadoDia.fondo }}>
                              {estadoDia.texto}
                            </span>
                          ))}
                      </div>

                      {/* Un solo dato por día: personas, con el color de lo lleno que está el turno más ocupado */}
                      {(resumen || ocupacion) && (
                        <div style={styles.diaPie}>
                          <span
                            style={{
                              ...styles.diaPersonas,
                              ...(isMobile ? styles.diaPersonasMobile : {}),
                              color: nivel.color,
                              backgroundColor: nivel.fondo,
                            }}
                          >
                            {resumen
                              ? isMobile
                                ? resumen.totalPlazas
                                : `${resumen.totalPlazas} pers.`
                              : isMobile
                              ? "pago"
                              : "En pago"}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            </div>

            <div style={esAncho ? styles.columnaDerecha : { marginTop: 16 }}>
            <div
              ref={detalleRef}
              style={{
                ...styles.detalleBox,
                ...(isMobile ? styles.detalleBoxMobile : {}),
              }}
            >
              <div style={styles.detalleCabecera}>
                <div>
                  <h3
                    style={{
                      ...styles.detalleTitulo,
                      ...(isMobile ? styles.detalleTituloMobile : {}),
                    }}
                  >
                    {fechaSeleccionada ? tituloDia(fechaSeleccionada) : "Selecciona un día"}
                  </h3>

                  <p
                    style={{
                      ...styles.detalleSubtitulo,
                      ...(isMobile ? styles.detalleSubtituloMobile : {}),
                    }}
                  >
                    {detalleDiaSeleccionado
                      ? `${detalleDiaSeleccionado.totalReservas} reserva${
                          detalleDiaSeleccionado.totalReservas !== 1 ? "s" : ""
                        } · ${detalleDiaSeleccionado.totalPlazas} plaza${
                          detalleDiaSeleccionado.totalPlazas !== 1 ? "s" : ""
                        } · ${detalleDiaSeleccionado.totalIngresos} €`
                      : "No hay reservas confirmadas para este día."}
                  </p>
                </div>

                {detalleDiaSeleccionado?.reservas?.length > 0 && (
                  <div style={styles.detalleAcciones}>
                    <button style={{ ...styles.botonIrReservas, ...styles.botonAccion }} onClick={irAReservasDelDia}>
                      Ir a reservas del día
                    </button>
                  </div>
                )}
              </div>

              {detalleDiaSeleccionado?.reservas?.length > 0 && listaReservasJsx}
            </div>

            {!isMobile && panelFechasJsx && <div style={{ marginTop: 16 }}>{panelFechasJsx}</div>}
            </div>
          </div>
        )}
      </div>

      {isMobile && !cargando && (
        <>
          <div style={styles.barraInferior}>
            <span style={styles.barraInferiorTexto}>{textoSeleccion}</span>
            <button type="button" style={styles.barraInferiorBoton} onClick={() => setHojaAbierta(true)}>
              Bloquear / habilitar
            </button>
          </div>

          <div
            style={{
              ...styles.hojaFondo,
              opacity: hojaAbierta ? 1 : 0,
              visibility: hojaAbierta ? "visible" : "hidden",
              transition: hojaAbierta
                ? "opacity 0.2s ease"
                : "opacity 0.2s ease, visibility 0s linear 0.25s",
            }}
            onClick={() => setHojaAbierta(false)}
            role="presentation"
          >
            <div
              style={{
                ...styles.hoja,
                transform: hojaAbierta ? "translateY(0)" : "translateY(100%)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.hojaCabecera}>
                <span style={styles.hojaTitulo}>Bloquear o habilitar días</span>
                <button
                  type="button"
                  aria-label="Cerrar"
                  style={styles.dialogoCerrar}
                  onClick={() => setHojaAbierta(false)}
                ><Icono nombre="cerrar" /></button>
              </div>
              {panelFechasJsx}
            </div>
          </div>
        </>
      )}

    </div>
  );
};

const styles = {
  body: {
    backgroundColor: "#fdf8ee",
    minHeight: "100vh",
    padding: "20px 24px",
    fontFamily: "'Segoe UI', sans-serif",
  },
  bodyMobile: {
    padding: "4px 4px 0",
  },
  container: {
    maxWidth: 1180, // en pantallas grandes el calendario no se estira sin fin
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
  headerMobile: {
    marginBottom: 18,
  },
  titulo: {
    margin: 0,
    color: "#3f3128",
    fontSize: "2rem",
  },
  tituloMobile: {
    fontSize: "1.45rem",
    lineHeight: 1.2,
  },
  subtitulo: {
    marginTop: 8,
    color: "#7a6858",
  },
  subtituloMobile: {
    fontSize: "0.95rem",
    lineHeight: 1.4,
  },
  barraMes: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    backgroundColor: "#fdfaf5",
    border: "1px solid #eadfd2",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  barraMesMobile: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    padding: 8,
    gap: 8,
    marginBottom: 12,
  },
  mesCentro: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 220,
  },
  mesCentroMobile: {
    minWidth: 0,
    gap: 2,
  },
  mesTitulo: {
    margin: 0,
    color: "#3f3128",
    textTransform: "capitalize",
    fontSize: "1.35rem",
  },
  mesTituloMobile: {
    fontSize: "1.15rem",
    textAlign: "center",
  },
  botonMes: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #eadfd2",
    backgroundColor: "#fdfaf5",
    cursor: "pointer",
    fontWeight: 600,
    color: "#3f3128",
  },
  botonMesMobile: {
    width: 48,
    minHeight: 48,
    padding: 0,
    fontSize: "1.6rem",
    lineHeight: 1,
  },
  botonHoy: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #eadfd2",
    backgroundColor: "#fff6d6",
    cursor: "pointer",
    fontWeight: 600,
    color: "#3f3128",
  },
  botonHoyMobile: {
    width: "auto",
    padding: "4px 14px",
    fontSize: "0.85rem",
  },
  mensaje: {
    textAlign: "center",
    color: "#7a6858",
    padding: 20,
  },
  calendarioBox: {
    backgroundColor: "#fdfaf5",
    border: "1px solid #eadfd2",
    borderRadius: 22,
    padding: 18,
    marginBottom: 22,
  },
  calendarioBoxMobile: {
    padding: 6,
    borderRadius: 16,
  },
  semanaHeader: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 10,
    marginBottom: 10,
  },
  semanaHeaderMobile: {
    gap: 4,
    marginBottom: 6,
  },
  semanaDia: {
    textAlign: "center",
    fontWeight: 700,
    color: "#6d5a3c",
    fontSize: "0.95rem",
    padding: "8px 4px",
  },
  semanaDiaMobile: {
    fontSize: "0.72rem",
    padding: "4px 2px",
  },
  gridDias: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    gap: 10,
  },
  gridDiasMobile: {
    gap: 4,
  },
  dia: {
    minWidth: 0,
    overflow: "hidden",
    minHeight: 88,
    borderRadius: 16,
    border: "1px solid #efe4ca",
    backgroundColor: "#fffaf2",
    padding: 10,
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "all 0.2s ease",
  },
  diaMobile: {
    minHeight: 62,
    padding: 6,
    borderRadius: 10,
  },
  diaVacio: {
    minHeight: 110,
    borderRadius: 16,
    backgroundColor: "#fbf7ef",
    border: "1px dashed #f2ead9",
  },
  diaVacioMobile: {
    minHeight: 68,
    borderRadius: 10,
  },
  diaPasado: {
    opacity: 0.78,
  },
  diaConReservas: {
    backgroundColor: "#fff6db",
    border: "1px solid #ecdca8",
  },
  diaActividadMedia: {
    backgroundColor: "#ffefc4",
    border: "1px solid #e6d18c",
  },
  diaActividadAlta: {
    backgroundColor: "#ffe7a8",
    border: "1px solid #d9bc67",
  },
  diaHoy: {
    boxShadow: "inset 0 0 0 2px #c9a64a",
  },
  diaSeleccionado: {
    outline: "3px solid #8b6a2f",
    outlineOffset: 0,
  },
  diaNumero: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#3e3022",
  },
  diaNumeroMobile: {
    fontSize: "0.92rem",
  },
  dosColumnas: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 360px",
    gap: 16,
    alignItems: "start",
  },
  columnaDerecha: {
    position: "sticky",
    top: 72, // bajo la cabecera fija de la web (56 px)
    maxHeight: "calc(100vh - 88px)",
    overflowY: "auto",
    paddingRight: 2,
  },
  barraInferior: {
    // Pegada al borde inferior mientras se navega, pero dentro de la página: al llegar
    // al final se queda sobre el pie y no lo tapa
    position: "sticky",
    bottom: 0,
    margin: "12px -4px 0",
    zIndex: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 14px calc(10px + env(safe-area-inset-bottom))",
    backgroundColor: "#fdfaf5",
    borderTop: "1px solid #eadfd2",
    boxShadow: "0 -4px 14px rgba(0,0,0,0.08)",
  },
  barraInferiorTexto: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#3f3128",
    minWidth: 0,
  },
  barraInferiorBoton: {
    flexShrink: 0,
    minHeight: 44,
    padding: "0 16px",
    borderRadius: 12,
    border: "none",
    backgroundColor: "#3f3128",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  hojaFondo: {
    position: "fixed",
    inset: 0,
    zIndex: 900,
    backgroundColor: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "flex-end",
  },
  hoja: {
    width: "100%",
    maxHeight: "88vh",
    overflowY: "auto",
    backgroundColor: "#fdfaf5",
    borderRadius: "20px 20px 0 0",
    padding: "14px 14px calc(18px + env(safe-area-inset-bottom))",
    transition: "transform 0.25s ease",
  },
  hojaCabecera: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  hojaTitulo: {
    fontWeight: 700,
    color: "#3f3128",
    fontSize: "1.05rem",
  },
  diaCabecera: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 4,
  },
  diaPunto: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    marginTop: 2,
    flexShrink: 0,
  },
  diaEstado: {
    fontSize: "0.66rem",
    fontWeight: 700,
    lineHeight: 1,
    padding: "3px 6px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  },
  diaPie: {
    marginTop: "auto",
    display: "flex",
  },
  diaPersonas: {
    fontSize: "0.82rem",
    fontWeight: 700,
    lineHeight: 1,
    padding: "5px 10px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  },
  diaPersonasMobile: {
    fontSize: "0.72rem",
    padding: "3px 7px",
  },
  dialogoCerrar: {
    border: "none",
    background: "transparent",
    fontSize: 20,
    cursor: "pointer",
    color: "#3f3128",
  },
  detalleBox: {
    backgroundColor: "#fdfaf5",
    border: "1px solid #eadfd2",
    borderRadius: 22,
    padding: 20,
  },
  detalleBoxMobile: {
    scrollMarginTop: 64, // deja ver el título bajo la cabecera fija
    borderRadius: 16,
    padding: 14,
  },
  detalleCabecera: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 14,
  },
  detalleAcciones: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  botonAccion: {
    width: "100%",
  },
  detalleTitulo: {
    margin: 0,
    color: "#3f3128",
    fontSize: "1.25rem",
    lineHeight: 1.25,
  },
  detalleTituloMobile: {
    fontSize: "1.02rem",
    lineHeight: 1.35,
  },
  detalleSubtitulo: {
    margin: "6px 0 0",
    color: "#7a6858",
    fontSize: "0.92rem",
  },
  detalleSubtituloMobile: {
    fontSize: "0.92rem",
    lineHeight: 1.45,
  },
  botonIrReservas: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #d8c89f",
    backgroundColor: "#fff6d6",
    cursor: "pointer",
    fontWeight: 700,
    color: "#3f3128",
    whiteSpace: "nowrap",
  },
  botonIrReservasMobile: {
    width: "100%",
  },
  mensajeResumen: {
    margin: "0 0 14px 0",
    color: "#7a6858",
    fontSize: "0.92rem",
  },
  listaReservas: {
    display: "grid",
    gap: 10,
  },
  reservaFila: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "12px 14px",
    border: "1px solid #f1e6cf",
    borderRadius: 14,
    backgroundColor: "#fffaf2",
  },
  reservaCabecera: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 10,
  },
  pagoChip: {
    fontSize: "0.75rem",
    fontWeight: 700,
    padding: "5px 10px",
    borderRadius: 999,
    lineHeight: 1.2,
    textTransform: "capitalize",
  },
  pagoChipOk: {
    color: "#2f6b2f",
    backgroundColor: "#e0f0dc",
  },
  pagoChipPendiente: {
    color: "#8a5a00",
    backgroundColor: "#fdebc8",
  },
  reservaClase: {
    margin: 0,
    color: "#333",
    fontSize: "0.98rem",
    fontWeight: 600,
  },
  reservaGrupo: {
  margin: "5px 0 0 0",
  color: "#8a5a00",
  fontSize: "0.9rem",
  fontWeight: 700,
},
  reservaMeta: {
    margin: "6px 0 0 0",
    color: "#7a6858",
    fontSize: "0.9rem",
  },
  reservaContacto: {
  margin: "6px 0 0 0",
  color: "#3f3128",
  fontSize: "0.9rem",
  fontWeight: 600,
},
  pagoPrecio: {
    whiteSpace: "nowrap",
    flexShrink: 0,
    color: "#333",
    fontWeight: 700,
    fontSize: "0.96rem",
  },
  reservaEnlaces: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 },
  enlaceDetalle: {
    padding: "6px 12px",
    borderRadius: 10,
    border: "1px solid #d8c89f",
    backgroundColor: "#fff6d6",
    color: "#3f3128",
    fontWeight: 700,
    fontSize: "0.85rem",
    cursor: "pointer",
  },
  enlaceWhatsApp: {
    padding: "6px 12px",
    borderRadius: 10,
    backgroundColor: "#25D366",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.85rem",
    textDecoration: "none",
  },
  mensajeDetalle: {
    color: "#7a6858",
    margin: 0,
  },
  reservaFilaGrupoEnProceso: {
  backgroundColor: "#fff3c4",
  border: "2px solid #d99a00",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 0 0 2px rgba(217, 154, 0, 0.12)",
},

reservaGrupoProceso: {
  margin: "6px 0 0 0",
  color: "#8a4f00",
  fontSize: "0.88rem",
  fontWeight: 800,
},
};

export default AdminCalendarioReservas;