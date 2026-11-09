import React, { useEffect, useMemo, useState } from "react";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import PanelFechasEspeciales, { fechasDelRango } from "./components/PanelFechasEspeciales";
import { useNavigate } from "react-router-dom";



const AdminCalendarioReservasNuevo = () => {
  const navigate = useNavigate();

  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

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
  const [rangoInicio, setRangoInicio] = useState("");
  const [rangoFin, setRangoFin] = useState("");

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
  }, []);

  // Con "varios días", el primer clic marca el inicio y el segundo el final
  const elegirDia = (fechaISO) => {
    setFechaSeleccionada(fechaISO);

    if (!modoRango) return;

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
  id:
    reserva.orderId ||
    reserva.id ||
    `${claseKey}-${fechaFinal}-${turnoKey}-${metodoKey}-${Math.random()}`,
  claseId: reserva.claseId || claseKey || "",
  clase: reserva.clase || claseKey || "Clase",
  fecha: fechaFinal,
  turno: reserva.turno || turnoKey || "—",
  metodo: reserva.metodo || reserva.tipoClase || metodoKey || "—",
  plazas: Number(reserva.plazas || 1),
  estadoPago: reserva.estadoPago || "—",
  precioTotal: Number(reserva.precioTotal || reserva.precio || 0),
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
                    procesarReserva(nivelVal, {
                      claseKey,
                      fechaKey,
                      turnoKey,
                      metodoKey: nivelSnap.key,
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

  const formatearFecha = (fecha) => {
    const d = new Date(`${fecha}T00:00:00`);
    return d.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
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

    if (bloqueos[celda.fechaISO]?.bloqueado) {
      estilo = { ...estilo, background: "#fdecea", borderColor: "#e8a29b" };
    } else if (habilitadas[celda.fechaISO]?.habilitada) {
      estilo = { ...estilo, background: "#e8f5e9", borderColor: "#8fc796" };
    }

    if (diasEnRango.has(celda.fechaISO)) {
      estilo = { ...estilo, boxShadow: "inset 0 0 0 2px #5c3c00" };
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
          >
            ← Anterior
          </button>

          <div style={{ ...styles.mesCentro, ...(isMobile ? styles.mesCentroMobile : {}) }}>
            <h2 style={{ ...styles.mesTitulo, ...(isMobile ? styles.mesTituloMobile : {}) }}>
              {nombreMes}
            </h2>
            <button
              style={{ ...styles.botonHoy, ...(isMobile ? styles.botonHoyMobile : {}) }}
              onClick={irAMesActual}
            >
              Ir a hoy
            </button>
          </div>

          <button
            style={{ ...styles.botonMes, ...(isMobile ? styles.botonMesMobile : {}) }}
            onClick={() => cambiarMes(1)}
          >
            Siguiente →
          </button>
        </div>

        <div style={{ margin: "0 0 12px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={alternarModoRango}
            style={{
              ...styles.botonHoy,
              ...(modoRango ? { backgroundColor: "#5c3c00", color: "#fff" } : {}),
            }}
          >
            {modoRango ? "Varios días: activado" : "Seleccionar varios días"}
          </button>
          {modoRango && (
            <span style={{ fontSize: 13, color: "#5c3c00" }}>
              {!rangoInicio
                ? "Pulsa el primer día."
                : !rangoFin
                ? "Pulsa el último día (o el mismo para uno solo)."
                : "Pulsa otro día para empezar una nueva selección."}
            </span>
          )}
          <span style={{ fontSize: 12, color: "#777" }}>🚫 bloqueado · ✅ habilitado</span>
        </div>

        {cargando ? (
          <p style={styles.mensaje}>Cargando calendario...</p>
        ) : (
          <>
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

                  return (
                    <button
                      key={celda.fechaISO}
                      type="button"
                      style={obtenerEstiloDia(celda)}
                      onClick={() => elegirDia(celda.fechaISO)}
                    >
                      <div
                        style={{
                          ...styles.diaNumero,
                          ...(isMobile ? styles.diaNumeroMobile : {}),
                        }}
                      >
                        {celda.dia}
                        {bloqueos[celda.fechaISO]?.bloqueado && " 🚫"}
                        {!bloqueos[celda.fechaISO]?.bloqueado &&
                          habilitadas[celda.fechaISO]?.habilitada &&
                          " ✅"}
                      </div>

                      {resumen ? (
                        <div
                          style={{
                            ...styles.infoDia,
                            ...(isMobile ? styles.infoDiaMobile : {}),
                          }}
                        >
                          {isMobile ? (
                            <>
                              <span
                                style={{
                                  ...styles.infoDiaTexto,
                                  ...styles.infoDiaTextoMobile,
                                }}
                              >
                                {resumen.totalReservas} res.
                              </span>
                              <span
                                style={{
                                  ...styles.infoDiaTexto,
                                  ...styles.infoDiaTextoMobile,
                                }}
                              >
                                {resumen.totalPlazas} pl.
                              </span>
                            </>
                          ) : (
                            <>
                              <span style={styles.infoDiaTexto}>
                                {resumen.totalReservas} reserva
                                {resumen.totalReservas !== 1 ? "s" : ""}
                              </span>
                              <span style={styles.infoDiaTexto}>
                                {resumen.totalPlazas} plaza
                                {resumen.totalPlazas !== 1 ? "s" : ""}
                              </span>
                            </>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            ...styles.infoDiaVacio,
                            ...(isMobile ? styles.infoDiaVacioMobile : {}),
                          }}
                        >
                          {isMobile ? "—" : "Sin reservas"}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {fechaSeleccionada && (
              <PanelFechasEspeciales
                inicio={panelInicio}
                fin={panelFin}
                bloqueos={bloqueos}
                habilitadas={habilitadas}
                onCambio={cargarFechasEspeciales}
              />
            )}

            <div
              style={{
                ...styles.detalleBox,
                ...(isMobile ? styles.detalleBoxMobile : {}),
              }}
            >
              <div
                style={{
                  ...styles.detalleCabecera,
                  ...(isMobile ? styles.detalleCabeceraMobile : {}),
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      ...styles.detalleTitulo,
                      ...(isMobile ? styles.detalleTituloMobile : {}),
                    }}
                  >
                    {fechaSeleccionada
                      ? `Detalle del ${formatearFecha(fechaSeleccionada)}`
                      : "Selecciona un día"}
                  </h3>

                  {detalleDiaSeleccionado ? (
                    <p
                      style={{
                        ...styles.detalleSubtitulo,
                        ...(isMobile ? styles.detalleSubtituloMobile : {}),
                      }}
                    >
                      {detalleDiaSeleccionado.totalReservas} reserva
                      {detalleDiaSeleccionado.totalReservas !== 1 ? "s" : ""} ·{" "}
                      {detalleDiaSeleccionado.totalPlazas} plaza
                      {detalleDiaSeleccionado.totalPlazas !== 1 ? "s" : ""} ·{" "}
                      {detalleDiaSeleccionado.totalIngresos}€
                    </p>
                  ) : (
                    <p
                      style={{
                        ...styles.detalleSubtitulo,
                        ...(isMobile ? styles.detalleSubtituloMobile : {}),
                      }}
                    >
                      No hay reservas confirmadas para este día.
                    </p>
                  )}
                </div>

                {detalleDiaSeleccionado?.reservas?.length > 0 && (
                  <button
                    style={{
                      ...styles.botonIrReservas,
                      ...(isMobile ? styles.botonIrReservasMobile : {}),
                    }}
                    onClick={irAReservasDelDia}
                  >
                    Ir a reservas del día
                  </button>
                )}
              </div>

              {detalleDiaSeleccionado?.reservas?.length ? (
                <>
                 

                  <div style={styles.listaReservas}>
                    {reservasDelDia.map((r, index) => (
                      <div
                        key={`${r.id}-${index}`}
                       style={{
  ...styles.reservaFila,
  ...(r.estadoCalendario === "grupo_individual_en_proceso"
    ? styles.reservaFilaGrupoEnProceso
    : {}),
  ...(isMobile ? styles.reservaFilaMobile : {}),
}}
                      >
                        <div
                          style={{
                            ...styles.reservaIzq,
                            ...(isMobile ? styles.reservaIzqMobile : {}),
                          }}
                        >
                          <p style={styles.reservaClase}>{r.clase}</p>
                          {r.esGrupo && r.nombreGrupo && (
  <p style={styles.reservaGrupo}>
    Grupo: {r.nombreGrupo}
  </p>
)}
{r.estadoCalendario === "grupo_individual_en_proceso" && (
  <p style={styles.reservaGrupoProceso}>
    🟡 Pago individual en proceso · {r.plazasPagadas || 0} pagada
    {(r.plazasPagadas || 0) !== 1 ? "s" : ""} / {r.plazasPendientes || 0} pendiente
    {(r.plazasPendientes || 0) !== 1 ? "s" : ""}
  </p>
)}
                          <p style={styles.reservaMeta}>
                            {r.turno} · {r.metodo} · {r.plazas} plaza
                            {r.plazas !== 1 ? "s" : ""}
                          </p>
                          {(r.nombre || r.telefono) && (
  <p style={styles.reservaContacto}>
    {r.nombre || "Sin nombre"}
    {r.telefono ? ` · ${r.telefono}` : ""}
  </p>
)}
                        </div>

                        <div
                          style={{
                            ...styles.reservaDer,
                            ...(isMobile ? styles.reservaDerMobile : {}),
                          }}
                        >
                          <span style={styles.pagoEstado}>{r.estadoPago}</span>
                          <span style={styles.pagoPrecio}>{r.precioTotal}€</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={styles.mensajeDetalle}>No hay detalle para mostrar.</p>
              )}
            </div>
          </>
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
  headerMobile: {
    marginBottom: 18,
  },
  titulo: {
    margin: 0,
    color: "#2f2f2f",
    fontSize: "2rem",
  },
  tituloMobile: {
    fontSize: "1.45rem",
    lineHeight: 1.2,
  },
  subtitulo: {
    marginTop: 8,
    color: "#7a7a7a",
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
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  barraMesMobile: {
    flexDirection: "column",
    alignItems: "stretch",
    padding: 12,
    gap: 10,
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
    minWidth: "auto",
  },
  mesTitulo: {
    margin: 0,
    color: "#4b3a2a",
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
    border: "1px solid #e5d8b8",
    backgroundColor: "#fffaf0",
    cursor: "pointer",
    fontWeight: 600,
    color: "#5b4a2d",
  },
  botonMesMobile: {
    width: "100%",
    fontSize: "0.95rem",
  },
  botonHoy: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #e5d8b8",
    backgroundColor: "#fff8da",
    cursor: "pointer",
    fontWeight: 600,
    color: "#5b4a2d",
  },
  botonHoyMobile: {
    width: "100%",
  },
  mensaje: {
    textAlign: "center",
    color: "#7a7a7a",
    padding: 20,
  },
  calendarioBox: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
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
    gridTemplateColumns: "repeat(7, 1fr)",
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
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 10,
  },
  gridDiasMobile: {
    gap: 4,
  },
  dia: {
    minHeight: 110,
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
    minHeight: 68,
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
  infoDia: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  infoDiaMobile: {
    gap: 2,
  },
  infoDiaTexto: {
    fontSize: "0.8rem",
    color: "#6d5a3c",
    fontWeight: 600,
    lineHeight: 1.2,
  },
  infoDiaTextoMobile: {
    fontSize: "0.66rem",
    lineHeight: 1.1,
  },
  infoDiaVacio: {
    fontSize: "0.78rem",
    color: "#b0a38d",
  },
  infoDiaVacioMobile: {
    fontSize: "0.72rem",
    textAlign: "center",
  },
  detalleBox: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 22,
    padding: 20,
  },
  detalleBoxMobile: {
    borderRadius: 16,
    padding: 14,
  },
  detalleCabecera: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  detalleCabeceraMobile: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12,
  },
  detalleTitulo: {
    margin: 0,
    color: "#4b3a2a",
    textTransform: "capitalize",
    fontSize: "1.2rem",
  },
  detalleTituloMobile: {
    fontSize: "1.02rem",
    lineHeight: 1.35,
  },
  detalleSubtitulo: {
    marginTop: 8,
    color: "#7a7a7a",
  },
  detalleSubtituloMobile: {
    fontSize: "0.92rem",
    lineHeight: 1.45,
  },
  botonIrReservas: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #d8c89f",
    backgroundColor: "#fff8da",
    cursor: "pointer",
    fontWeight: 700,
    color: "#5b4a2d",
    whiteSpace: "nowrap",
  },
  botonIrReservasMobile: {
    width: "100%",
  },
  mensajeResumen: {
    margin: "0 0 14px 0",
    color: "#7a7a7a",
    fontSize: "0.92rem",
  },
  listaReservas: {
    display: "grid",
    gap: 10,
  },
  reservaFila: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid #f3ead7",
    flexWrap: "wrap",
  },
  reservaFilaMobile: {
    padding: "12px",
    border: "1px solid #f1e6cf",
    borderRadius: 14,
    backgroundColor: "#fffaf2",
  },
  reservaIzq: {
    minWidth: 220,
    flex: 1,
  },
  reservaIzqMobile: {
    minWidth: "auto",
    width: "100%",
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
    color: "#7a7a7a",
    fontSize: "0.9rem",
  },
  reservaContacto: {
  margin: "6px 0 0 0",
  color: "#5b4a2d",
  fontSize: "0.9rem",
  fontWeight: 600,
},
  reservaDer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
    minWidth: 90,
  },
  reservaDerMobile: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minWidth: "auto",
    marginTop: 6,
  },
  pagoEstado: {
    color: "#5b4a2d",
    fontSize: "0.88rem",
    textTransform: "capitalize",
  },
  pagoPrecio: {
    color: "#333",
    fontWeight: 700,
    fontSize: "0.96rem",
  },
  mensajeDetalle: {
    color: "#7a7a7a",
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

export default AdminCalendarioReservasNuevo;