import React, { useEffect, useMemo, useState } from "react";
import { ref, get, push, remove, set, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import { useLocation } from "react-router-dom";

const AdminReservasGrupos = () => {
  const location = useLocation();

 const [reservas, setReservas] = useState([]);
const [cargando, setCargando] = useState(true);
const [guardandoNota, setGuardandoNota] = useState({});
const [eliminandoNota, setEliminandoNota] = useState({});
const [nuevasNotas, setNuevasNotas] = useState({});

const [nombreManual, setNombreManual] = useState({});
const [telefonoManual, setTelefonoManual] = useState({});
const [metodoManual, setMetodoManual] = useState({});
const [guardandoManual, setGuardandoManual] = useState({});
const [editandoFechaGrupo, setEditandoFechaGrupo] = useState({});
const [fechaGrupoEditada, setFechaGrupoEditada] = useState({});
const [guardandoFechaGrupo, setGuardandoFechaGrupo] = useState({});

const [filtroFecha, setFiltroFecha] = useState("");
const [filtroEstadoPago, setFiltroEstadoPago] = useState("");
const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

useEffect(() => {
  const onResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", onResize);

  return () => window.removeEventListener("resize", onResize);
}, []);
  const fechaDesdeURL = useMemo(() => {
    
    const params = new URLSearchParams(location.search);
    return params.get("fecha") || "";
  }, [location.search]);
  const calcularTiempoRestante = (fechaLimitePago) => {
  if (!fechaLimitePago) return "—";

  const ahora = new Date();
  const limite = new Date(fechaLimitePago);

  if (Number.isNaN(limite.getTime())) {
    return "—";
  }

  const diferencia = limite - ahora;

  if (diferencia <= 0) {
    return "Plazo finalizado";
  }

  const horas = Math.floor(diferencia / (1000 * 60 * 60));

  const minutos = Math.floor(
    (diferencia % (1000 * 60 * 60)) / (1000 * 60)
  );

  return `${horas}h ${minutos}m`;
};

  useEffect(() => {
    if (fechaDesdeURL) {
      setFiltroFecha(fechaDesdeURL);
    }
  }, [fechaDesdeURL]);

  useEffect(() => {
    const cargarReservas = async () => {
      try {
        const [reservasSnap, notasSnap] = await Promise.all([
          get(ref(dbRealtime, "reservasGrupos")),
          get(ref(dbRealtime, "reservasNotas")),
        ]);

        const mapaNotas = {};

        if (notasSnap.exists()) {
          notasSnap.forEach((notaReservaSnap) => {
            const orderId = notaReservaSnap.key;
            const notasInternas = notaReservaSnap.child("notasInternas");

            if (notasInternas.exists()) {
              const listaNotas = [];

              notasInternas.forEach((notaSnap) => {
                const nota = notaSnap.val();
                if (nota) {
                  listaNotas.push({
                    id: notaSnap.key,
                    texto: nota.texto || "",
                    fecha: nota.fecha || "Sin fecha",
                  });
                }
              });

              listaNotas.sort((a, b) => {
                const fechaA = new Date(a.fecha || 0);
                const fechaB = new Date(b.fecha || 0);
                return fechaB - fechaA;
              });

              mapaNotas[orderId] = listaNotas;
            }
          });
        }

        const datos = [];

        if (reservasSnap.exists()) {
          reservasSnap.forEach((reservaSnap) => {
            const r = reservaSnap.val();

            if (reservaSnap.key === "placeholder") return;
            if (!r || typeof r !== "object") return;

            datos.push({
              id: reservaSnap.key,
              ...r,
              notasInternas: mapaNotas[r.orderId] || [],
            });
          });
        }

        datos.sort((a, b) => {
          const fechaA = new Date(a.fecha || 0);
          const fechaB = new Date(b.fecha || 0);
          return fechaB - fechaA;
        });

        setReservas(datos);
      } catch (error) {
        console.error("Error al cargar reservas de grupo:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarReservas();
  }, []);

  const handleChangeNota = (orderId, valor) => {
    setNuevasNotas((prev) => ({
      ...prev,
      [orderId]: valor,
    }));
  };

  const guardarNotaInterna = async (orderId) => {
    const texto = (nuevasNotas[orderId] || "").trim();

    if (!texto) {
      alert("Escribe una nota antes de guardar.");
      return;
    }

    try {
      setGuardandoNota((prev) => ({
        ...prev,
        [orderId]: true,
      }));

      const nuevaNota = {
        texto,
        fecha: new Date().toLocaleString("es-ES"),
      };

      const nuevaNotaRef = await push(
        ref(dbRealtime, `reservasNotas/${orderId}/notasInternas`),
        nuevaNota
      );

      setReservas((prev) =>
        prev.map((r) =>
          r.orderId === orderId
            ? {
                ...r,
                notasInternas: [
                  ...(r.notasInternas || []),
                  {
                    id: nuevaNotaRef.key,
                    ...nuevaNota,
                  },
                ],
              }
            : r
        )
      );

      setNuevasNotas((prev) => ({
        ...prev,
        [orderId]: "",
      }));
    } catch (error) {
      console.error("Error al guardar nota interna:", error);
      alert("No se pudo guardar la nota interna.");
    } finally {
      setGuardandoNota((prev) => ({
        ...prev,
        [orderId]: false,
      }));
    }
  };

  const eliminarNotaInterna = async (orderId, notaId) => {
    const confirmar = window.confirm(
      "¿Seguro que quieres borrar esta nota interna?"
    );

    if (!confirmar) return;

    try {
      setEliminandoNota((prev) => ({
        ...prev,
        [notaId]: true,
      }));

      await remove(
        ref(dbRealtime, `reservasNotas/${orderId}/notasInternas/${notaId}`)
      );

      setReservas((prev) =>
        prev.map((r) =>
          r.orderId === orderId
            ? {
                ...r,
                notasInternas: (r.notasInternas || []).filter(
                  (nota) => nota.id !== notaId
                ),
              }
            : r
        )
      );
    } catch (error) {
      console.error("Error al borrar nota interna:", error);
      alert("No se pudo borrar la nota interna.");
    } finally {
      setEliminandoNota((prev) => ({
        ...prev,
        [notaId]: false,
      }));
    }
  };
const registrarPagoManual = async (r) => {
  const nombre = (nombreManual[r.id] || "").trim();
  const telefono = (telefonoManual[r.id] || "").trim();
  const metodo = (metodoManual[r.id] || "").trim();

  if (!nombre || !telefono || !metodo) {
    alert("Completa nombre, teléfono y método de pago.");
    return;
  }

  try {
    setGuardandoManual((prev) => ({
      ...prev,
      [r.id]: true,
    }));

    const pagoId = push(
      ref(dbRealtime, `reservasGrupos/${r.id}/pagosIndividuales`)
    ).key;

    const importe = Number(r.precioUnitario || 0);

    const nuevoPago = {
      nombreAsistente: nombre,
      telefonoAsistente: telefono,
      importe,
      estadoPago: "pagado_manual",
      metodoPagoManual: metodo,
      creadoManualPorAdmin: true,
      pagadoEn: new Date().toISOString(),
    };

    await set(
      ref(
        dbRealtime,
        `reservasGrupos/${r.id}/pagosIndividuales/${pagoId}`
      ),
      nuevoPago
    );

    const nuevasPagadas = Number(r.plazasPagadas || 0) + 1;
    const nuevasPendientes = Math.max(
      0,
      Number(r.plazas || 0) - nuevasPagadas
    );

    const nuevoTotalPagado =
      Number(r.totalPagado || 0) + importe;

    const nuevoTotalPendiente = Math.max(
      0,
      Number(r.precioTotal || 0) - nuevoTotalPagado
    );

    const grupoActualizado = {
      plazasPagadas: nuevasPagadas,
      plazasPendientes: nuevasPendientes,
      totalPagado: nuevoTotalPagado,
      totalPendiente: nuevoTotalPendiente,
      estado:
        nuevasPendientes <= 0
          ? "Confirmada"
          : "pendiente_pago_individual",
      estadoPago:
        nuevasPendientes <= 0 ? "pagado" : "parcial",
    };

    await set(
      ref(dbRealtime, `reservasGrupos/${r.id}/plazasPagadas`),
      grupoActualizado.plazasPagadas
    );

    await set(
      ref(dbRealtime, `reservasGrupos/${r.id}/plazasPendientes`),
      grupoActualizado.plazasPendientes
    );

    await set(
      ref(dbRealtime, `reservasGrupos/${r.id}/totalPagado`),
      grupoActualizado.totalPagado
    );

    await set(
      ref(dbRealtime, `reservasGrupos/${r.id}/totalPendiente`),
      grupoActualizado.totalPendiente
    );

    await set(
      ref(dbRealtime, `reservasGrupos/${r.id}/estado`),
      grupoActualizado.estado
    );

    await set(
      ref(dbRealtime, `reservasGrupos/${r.id}/estadoPago`),
      grupoActualizado.estadoPago
    );

    setReservas((prev) =>
      prev.map((grupo) => {
        if (grupo.id !== r.id) return grupo;

        return {
          ...grupo,
          ...grupoActualizado,
          pagosIndividuales: {
            ...(grupo.pagosIndividuales || {}),
            [pagoId]: nuevoPago,
          },
        };
      })
    );

    setNombreManual((prev) => ({
      ...prev,
      [r.id]: "",
    }));

    setTelefonoManual((prev) => ({
      ...prev,
      [r.id]: "",
    }));

    setMetodoManual((prev) => ({
      ...prev,
      [r.id]: "",
    }));

    alert("Pago manual añadido correctamente.");
  } catch (error) {
    console.error("Error al registrar pago manual:", error);
    alert("No se pudo registrar el pago manual.");
  } finally {
    setGuardandoManual((prev) => ({
      ...prev,
      [r.id]: false,
    }));
  }
};
const cancelarGrupoManual = async (r) => {
  const confirmar = window.confirm(
    "¿Seguro que quieres cancelar esta reserva de grupo? El enlace de pago dejará de funcionar."
  );

  if (!confirmar) return;

  try {
    const ahoraISO = new Date().toISOString();

    await set(ref(dbRealtime, `reservasGrupos/${r.id}/estado`), "Cancelada");
    await set(ref(dbRealtime, `reservasGrupos/${r.id}/estadoPago`), "cancelado");
    await set(ref(dbRealtime, `reservasGrupos/${r.id}/cancelada`), true);
    await set(ref(dbRealtime, `reservasGrupos/${r.id}/canceladaEn`), ahoraISO);
    await set(
      ref(dbRealtime, `reservasGrupos/${r.id}/motivoCancelacion`),
      "Cancelada manualmente desde admin"
    );

    setReservas((prev) =>
      prev.map((grupo) =>
        grupo.id === r.id
          ? {
              ...grupo,
              estado: "Cancelada",
              estadoPago: "cancelado",
              cancelada: true,
              canceladaEn: ahoraISO,
              motivoCancelacion: "Cancelada manualmente desde admin",
            }
          : grupo
      )
    );

    alert("Reserva de grupo cancelada correctamente.");
  } catch (error) {
    console.error("Error al cancelar grupo:", error);
    alert("No se pudo cancelar la reserva de grupo.");
  }
};

const guardarFechaGrupo = async (r) => {
  const nuevaFecha = fechaGrupoEditada[r.id];

  if (
    !nuevaFecha ||
    nuevaFecha === r.fecha ||
    r.cancelada ||
    r.estado === "Cancelada"
  ) {
    return;
  }

  const confirmar = window.confirm(
    `¿Seguro que quieres cambiar la fecha de este grupo del ${r.fecha || "—"} al ${nuevaFecha}?`
  );

  if (!confirmar) return;

  try {
    setGuardandoFechaGrupo((prev) => ({ ...prev, [r.id]: true }));

    const ahora = new Date();
    const fechaCambio = ahora.toLocaleString("es-ES");
    const actualizacion = {
      [`reservasGrupos/${r.id}/fecha`]: nuevaFecha,
      [`reservasGrupos/${r.id}/fechaAnterior`]: r.fecha || "",
      [`reservasGrupos/${r.id}/fechaOriginal`]: r.fechaOriginal || r.fecha || "",
      [`reservasGrupos/${r.id}/ultimaFechaAnterior`]: r.fecha || "",
      [`reservasGrupos/${r.id}/fechaReprogramada`]: nuevaFecha,
      [`reservasGrupos/${r.id}/reprogramada`]: true,
      [`reservasGrupos/${r.id}/reprogramadaEn`]: fechaCambio,
      [`reservasGrupos/${r.id}/reprogramadaPor`]: "Berto",
      [`reservasGrupos/${r.id}/actualizadoEn`]: ahora.toISOString(),
    };
    let notaInterna;
    let notaInternaId;

    if (r.orderId) {
      notaInterna = {
        texto: `Fecha de reserva de grupo cambiada por Berto. Antes: ${r.fecha || "—"}. Ahora: ${nuevaFecha}.`,
        fecha: fechaCambio,
      };
      const nuevaNotaRef = push(
        ref(dbRealtime, `reservasNotas/${r.orderId}/notasInternas`)
      );
      notaInternaId = nuevaNotaRef.key;
      actualizacion[
        `reservasNotas/${r.orderId}/notasInternas/${notaInternaId}`
      ] = notaInterna;
    }

    await update(ref(dbRealtime), actualizacion);

    setReservas((prev) =>
      prev.map((grupo) =>
        grupo.id === r.id
          ? {
              ...grupo,
              fecha: nuevaFecha,
              fechaAnterior: r.fecha || "",
              fechaOriginal: r.fechaOriginal || r.fecha || "",
              ultimaFechaAnterior: r.fecha || "",
              fechaReprogramada: nuevaFecha,
              reprogramada: true,
              reprogramadaEn: fechaCambio,
              reprogramadaPor: "Berto",
              actualizadoEn: ahora.toISOString(),
              ...(notaInterna
                ? {
                    notasInternas: [
                      ...(grupo.notasInternas || []),
                      { id: notaInternaId, ...notaInterna },
                    ],
                  }
                : {}),
            }
          : grupo
      )
    );
    setEditandoFechaGrupo((prev) => ({ ...prev, [r.id]: false }));
    setFechaGrupoEditada((prev) => ({ ...prev, [r.id]: "" }));
    alert("Fecha de la reserva de grupo actualizada correctamente.");
  } catch (error) {
    console.error("Error al cambiar la fecha de la reserva de grupo:", error);
    alert("No se pudo cambiar la fecha de la reserva de grupo.");
  } finally {
    setGuardandoFechaGrupo((prev) => ({ ...prev, [r.id]: false }));
  }
};

  const limpiarFiltros = () => {
    setFiltroFecha("");
    setFiltroEstadoPago("");
  };

  const reservasFiltradas = useMemo(() => {
    return reservas.filter((r) => {
      const cumpleFecha = !filtroFecha || r.fecha === filtroFecha;
      const cumpleEstadoPago =
        !filtroEstadoPago ||
        (r.estadoPago || "").toLowerCase() === filtroEstadoPago.toLowerCase();

      return cumpleFecha && cumpleEstadoPago;
    });
  }, [reservas, filtroFecha, filtroEstadoPago]);

  const resumen = useMemo(() => {
    const totalReservas = reservasFiltradas.length;

    const pendientes = reservasFiltradas.filter(
      (r) =>
        (r.estado || "").toLowerCase() === "pendiente" ||
        (r.estadoPago || "").toLowerCase() === "pendiente"
    ).length;

    const pagadas = reservasFiltradas.filter(
      (r) => (r.estadoPago || "").toLowerCase() === "pagado"
    ).length;

    const ingresosEstimados = reservasFiltradas.reduce((acc, r) => {
      if ((r.estadoPago || "").toLowerCase() === "pagado") {
        return acc + Number(r.precioTotal || r.precio || 0);
      }
      return acc;
    }, 0);

    return {
      totalReservas,
      pendientes,
      pagadas,
      ingresosEstimados,
    };
  }, [reservasFiltradas]);

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
          <h1 style={styles.titulo}>Reservas de grupo</h1>
          <p style={styles.subtitulo}>
            Aquí puedes ver todas las reservas realizadas para grupos y anotar
            observaciones internas.
          </p>
        </div>

        {cargando ? (
          <p style={styles.mensaje}>Cargando...</p>
        ) : (
          <>
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
                  <label style={styles.label}>Estado de pago</label>
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

            <div style={styles.gridResumen}>
              <div style={styles.cardResumen}>
                <p style={styles.cardLabel}>Total reservas grupo</p>
                <p style={styles.cardValue}>{resumen.totalReservas}</p>
              </div>

              <div style={styles.cardResumen}>
                <p style={styles.cardLabel}>Pendientes</p>
                <p style={styles.cardValue}>{resumen.pendientes}</p>
              </div>

              <div style={styles.cardResumen}>
                <p style={styles.cardLabel}>Pagadas</p>
                <p style={styles.cardValue}>{resumen.pagadas}</p>
              </div>

              <div style={styles.cardResumen}>
                <p style={styles.cardLabel}>Ingresos estimados grupo</p>
                <p style={styles.cardValue}>{resumen.ingresosEstimados}€</p>
              </div>
            </div>

            {reservasFiltradas.length === 0 ? (
              <p style={styles.mensaje}>No hay reservas de grupo.</p>
            ) : (
              <div style={styles.lista}>
                {reservasFiltradas.map((r) => (
                  <div
  key={r.id}
 style={{
  ...styles.card,
  ...(isMobile ? styles.cardMobile : {}),
  ...(r.estado === "Cancelada" || r.cancelada
    ? styles.cardCancelada
    : {}),
}}
>
                    <div style={styles.cardTop}>
                      <div>
                        <h2 style={styles.cardTitulo}>
                          {r.clase || "Reserva de grupo"}
                        </h2>
                        <div style={styles.fechaGrupo}>
                          <p style={styles.cardSubtitulo}>
                            {r.fecha || "—"} · {r.turno || "—"}
                          </p>
                          {!editandoFechaGrupo[r.id] &&
                            !r.cancelada &&
                            r.estado !== "Cancelada" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFechaGrupoEditada((prev) => ({
                                    ...prev,
                                    [r.id]: r.fecha || "",
                                  }));
                                  setEditandoFechaGrupo((prev) => ({
                                    ...prev,
                                    [r.id]: true,
                                  }));
                                }}
                                style={styles.botonCambiarFecha}
                              >
                                Cambiar fecha
                              </button>
                            )}
                        </div>
                        {editandoFechaGrupo[r.id] && (
                          <div style={styles.editarFechaGrupo}>
                            <label style={styles.label} htmlFor={`fecha-grupo-${r.id}`}>
                              Nueva fecha
                            </label>
                            <input
                              id={`fecha-grupo-${r.id}`}
                              type="date"
                              value={fechaGrupoEditada[r.id] || ""}
                              onChange={(event) =>
                                setFechaGrupoEditada((prev) => ({
                                  ...prev,
                                  [r.id]: event.target.value,
                                }))
                              }
                              style={styles.input}
                              disabled={guardandoFechaGrupo[r.id]}
                            />
                            <div style={styles.accionesFechaGrupo}>
                              <button
                                type="button"
                                onClick={() => guardarFechaGrupo(r)}
                                style={styles.botonGuardar}
                                disabled={
                                  guardandoFechaGrupo[r.id] ||
                                  !fechaGrupoEditada[r.id] ||
                                  fechaGrupoEditada[r.id] === r.fecha
                                }
                              >
                                {guardandoFechaGrupo[r.id]
                                  ? "Guardando..."
                                  : "Guardar fecha"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditandoFechaGrupo((prev) => ({
                                    ...prev,
                                    [r.id]: false,
                                  }));
                                  setFechaGrupoEditada((prev) => ({
                                    ...prev,
                                    [r.id]: "",
                                  }));
                                }}
                                style={styles.botonSecundario}
                                disabled={guardandoFechaGrupo[r.id]}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={styles.badges}>
                        <span style={styles.badgeEstado}>{r.estado || "—"}</span>
                        <span style={styles.badgePago}>{r.estadoPago || "—"}</span>
                      </div>
                    </div>

                    <div style={styles.infoGrid}>
                      <div style={styles.infoBox}>
                       <p><strong>Personas:</strong> {r.plazas}</p>

<p>
  <strong>Modo de pago:</strong>{" "}
  {r.modoPago === "individual" ? "Individual" : "Completo"}
</p>

{r.modoPago === "individual" && (
  <>
    <p>
      <strong>Pagadas:</strong> {r.plazasPagadas ?? 0}/{r.plazas || 0}
    </p>
    <div style={styles.progresoWrapper}>
  <div
    style={{
      ...styles.progresoBarra,
      width: `${Math.min(
        100,
        Math.round(((r.plazasPagadas || 0) / (r.plazas || 1)) * 100)
      )}%`,
    }}
  />
</div>

<p style={styles.textoProgreso}>
  {Math.round(((r.plazasPagadas || 0) / (r.plazas || 1)) * 100)}% completado
</p>

    <p>
      <strong>Pendientes:</strong> {r.plazasPendientes ?? 0}
    </p>

    <p>
      <strong>Total pagado:</strong> {r.totalPagado ?? 0}€
    </p>

    <p>
      <strong>Total pendiente:</strong> {r.totalPendiente ?? 0}€
    </p>

    <p>
      <strong>Fecha límite pago:</strong>{" "}
      {r.fechaLimitePago
        ? new Date(r.fechaLimitePago).toLocaleString("es-ES")
        : "—"}
    </p>
    <p>
  <strong>Tiempo restante:</strong>{" "}
  {calcularTiempoRestante(r.fechaLimitePago)}
</p>
  </>
)}

<p><strong>Total:</strong> {r.precioTotal}€</p>
<p><strong>OrderId:</strong> {r.orderId || "—"}</p>
{r.modoPago === "individual" && r.enlacePagoGrupo && (
  <div style={{ marginTop: 12 }}>
    <p
      style={{
        fontSize: "0.9rem",
        wordBreak: "break-word",
        marginBottom: 10,
      }}
    >
      <strong>Enlace de pago:</strong>
      <br />
      {r.enlacePagoGrupo}
    </p>

    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(r.enlacePagoGrupo);
        alert("Enlace copiado");
      }}
      style={styles.btnCopiar}
    >
      Copiar enlace
    </button>

    {r.estadoPago !== "pagado" && r.estado !== "Cancelada" && (
      <button
        type="button"
        onClick={() => cancelarGrupoManual(r)}
        style={{
  ...styles.btnCancelarGrupo,
  ...(isMobile ? styles.btnCancelarGrupoMobile : {}),
}}
      >
        Cancelar grupo
      </button>
    )}
  </div>
)}
                      </div>

                      <div style={styles.infoBox}>
  {r.nombreGrupo && (
    <p>
      <strong>Grupo:</strong> {r.nombreGrupo}
    </p>
  )}

  <p><strong>Nombre:</strong> {r.nombreReserva}</p>
  <p><strong>Teléfono:</strong> {r.telefono}</p>
  <p><strong>Email:</strong> {r.email || "—"}</p>
  {r.telefono && (
  <a
    href={`https://wa.me/34${String(r.telefono).replace(/\D/g, "")}`}
    target="_blank"
    rel="noopener noreferrer"
    style={styles.btnWhatsApp}
  >
    WhatsApp organizador
  </a>
)}
</div>
                    </div>
                    {r.modoPago === "individual" && r.estadoPago !== "pagado" && (
  <div style={styles.notasBox}>
    <strong>Registrar pago manual</strong>

    <input
      type="text"
      placeholder="Nombre del asistente"
      value={nombreManual[r.id] || ""}
      onChange={(e) =>
        setNombreManual((prev) => ({
          ...prev,
          [r.id]: e.target.value,
        }))
      }
      style={styles.inputManual}
    />

    <input
      type="tel"
      placeholder="Teléfono del asistente"
      value={telefonoManual[r.id] || ""}
      onChange={(e) =>
        setTelefonoManual((prev) => ({
          ...prev,
          [r.id]: e.target.value,
        }))
      }
      style={styles.inputManual}
    />

    <select
      value={metodoManual[r.id] || ""}
      onChange={(e) =>
        setMetodoManual((prev) => ({
          ...prev,
          [r.id]: e.target.value,
        }))
      }
      style={styles.inputManual}
    >
      <option value="">Método de pago</option>
      <option value="efectivo">Efectivo</option>
      <option value="bizum">Bizum</option>
      <option value="transferencia">Transferencia</option>
    </select>

    <button
      type="button"
      onClick={() => registrarPagoManual(r)}
      style={styles.botonGuardar}
      disabled={guardandoManual[r.id]}
    >
      {guardandoManual[r.id]
        ? "Guardando..."
        : "Registrar plaza pagada"}
    </button>
  </div>
)}
                    {r.modoPago === "individual" && (
                      
  <div style={styles.notasBox}>
    <strong>Pagos individuales del grupo</strong>

    {r.pagosIndividuales && Object.keys(r.pagosIndividuales).length > 0 ? (
      <div style={{ marginTop: 10 }}>
        {Object.entries(r.pagosIndividuales).map(([pagoId, pago]) => (
          <div
  key={pagoId}
  style={{
    ...styles.asistenteItem,
    ...(pago.estadoPago === "pagado" ||
    pago.estadoPago === "pagado_manual"
      ? styles.pagoCompletado
      : pago.estadoPago === "pendiente_redsys"
      ? styles.pagoPendiente
      : styles.pagoFallido),
  }}
>
            <p style={styles.notaTexto}>
              <strong>{pago.nombreAsistente || "Sin nombre"}</strong>
              {" — "}
              {pago.telefonoAsistente || "Sin teléfono"}
            </p>

            <p style={styles.notaFecha}>
              Estado: {pago.estadoPago || "—"} · Importe: {pago.importe || 0}€
              {pago.pagadoEn
                ? ` · Pagado: ${new Date(pago.pagadoEn).toLocaleString("es-ES")}`
                : ""}
            </p>
          </div>
        ))}
      </div>
    ) : (
      <p style={styles.vacio}>Aún no hay asistentes pagados.</p>
    )}
  </div>
)}

                    {r.notas && (
                      <div style={styles.notasBox}>
                        <strong>Notas del cliente</strong>
                        <p style={styles.textoBloque}>{r.notas}</p>
                      </div>
                    )}

                    <div style={styles.notasBox}>
                      <strong>Notas del Administrador</strong>

                      {r.notasInternas && r.notasInternas.length > 0 ? (
                        r.notasInternas.map((nota) => (
                          <div
  key={nota.id}
  style={{
    ...styles.notaInternaItem,
    ...(isMobile ? styles.notaInternaItemMobile : {}),
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
                                <p style={styles.notaFecha}>{nota.fecha}</p>
                              </div>

                              <button
                                onClick={() =>
                                  eliminarNotaInterna(r.orderId, nota.id)
                                }
                                style={styles.botonEliminar}
                                disabled={!!eliminandoNota[nota.id]}
                              >
                                {eliminandoNota[nota.id]
                                  ? "Borrando..."
                                  : "Eliminar"}
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p style={styles.vacio}>Aún no hay notas.</p>
                      )}
                    </div>

                    <div style={styles.notasBox}>
                      <strong>Añadir nota interna</strong>
                      <textarea
                        value={nuevasNotas[r.orderId] || ""}
                        onChange={(e) =>
                          handleChangeNota(r.orderId, e.target.value)
                        }
                        placeholder="Escribe aquí una nota..."
                        style={styles.textarea}
                        rows={3}
                      />
                      <button
                        onClick={() => guardarNotaInterna(r.orderId)}
                        style={styles.botonGuardar}
                        disabled={guardandoNota[r.orderId]}
                      >
                        {guardandoNota[r.orderId]
                          ? "Guardando..."
                          : "Guardar nota"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
    maxWidth: 1100,
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
cardMobile: {
  padding: 12,
},
btnCancelarGrupoMobile: {
  marginLeft: 0,
  display: "block",
  width: "100%",
},
  header: {
    textAlign: "center",
    marginBottom: 24,
  },
  titulo: {
    textAlign: "center",
    fontSize: "2rem",
    margin: 0,
    color: "#2f2f2f",
  },
  subtitulo: {
    textAlign: "center",
    color: "#7a7a7a",
    marginTop: 8,
    marginBottom: 0,
  },
  notaHeaderMobile: {
  flexDirection: "column",
  alignItems: "stretch",
},
  mensaje: {
    textAlign: "center",
    color: "#777",
    padding: 20,
  },
  filtrosBox: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  notaInternaItemMobile: {
  paddingTop: 8,
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
    color: "#5b4a2d",
  },
  input: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #e5d8b8",
    fontSize: "0.95rem",
    backgroundColor: "#fffaf0",
  },
  botonSecundario: {
    padding: "10px 14px",
    border: "1px solid #e5d8b8",
    backgroundColor: "#fff8da",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    color: "#5b4a2d",
  },
  pagoCompletado: {
  backgroundColor: "#eefaf0",
  border: "1px solid #b7e4c0",
},

pagoPendiente: {
  backgroundColor: "#fff8e8",
  border: "1px solid #f1d48a",
},

pagoFallido: {
  backgroundColor: "#fff1f1",
  border: "1px solid #efcaca",
},
 btnCancelarGrupo: {
  display: "inline-block",
  marginTop: 12,
  marginLeft: 18,
  backgroundColor: "#fff1f1",
  color: "#8a3b3b",
  border: "1px solid #e7c9c9",
  borderRadius: 20,
  padding: "8px 14px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "0.85rem",
},
  btnWhatsApp: {
  display: "inline-block",
  marginTop: 10,
  backgroundColor: "#25D366",
  color: "white",
  padding: "8px 14px",
  borderRadius: 20,
  textDecoration: "none",
  fontWeight: "bold",
  fontSize: "0.85rem",
},
  btnCopiar: {
  backgroundColor: "#f4c542",
  color: "#5c3c00",
  border: "none",
  borderRadius: 20,
  padding: "8px 14px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "0.85rem",
},
progresoWrapper: {
  width: "100%",
  height: 10,
  backgroundColor: "#f0e5cf",
  borderRadius: 999,
  overflow: "hidden",
  marginTop: 8,
  marginBottom: 6,
},

progresoBarra: {
  height: "100%",
  backgroundColor: "#f4c542",
  borderRadius: 999,
},

textoProgreso: {
  margin: "0 0 8px 0",
  fontSize: "0.85rem",
  color: "#7a6331",
  fontWeight: 600,
},
  gridResumen: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 28,
  },
  cardResumen: {
    backgroundColor: "#fff8da",
    border: "1px solid #f1e7c6",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  },
  asistenteItem: {
  marginTop: 10,
  padding: 10,
  borderTop: "1px solid #eee",
  backgroundColor: "#fffaf0",
  borderRadius: 10,
},
  cardLabel: {
    margin: 0,
    color: "#7a6331",
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  cardValue: {
    margin: "12px 0 0 0",
    color: "#333",
    fontSize: "2rem",
    fontWeight: "bold",
  },
  lista: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f1e7c6",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
  },
  cardCancelada: {
  backgroundColor: "#fff3f3",
  border: "1px solid #efcaca",
  opacity: 0.92,
},
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  cardTitulo: {
    margin: 0,
    color: "#3d3126",
    fontSize: "1.2rem",
  },
  cardSubtitulo: {
    margin: "6px 0 0 0",
    color: "#7a7a7a",
    fontSize: "0.95rem",
  },
  fechaGrupo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  botonCambiarFecha: {
    marginTop: 6,
    padding: "6px 10px",
    border: "1px solid #e5d8b8",
    backgroundColor: "#fff8da",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    color: "#5b4a2d",
    fontSize: "0.85rem",
  },
  editarFechaGrupo: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginTop: 10,
    maxWidth: 320,
  },
  accionesFechaGrupo: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  badges: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  badgeEstado: {
    backgroundColor: "#fff8da",
    border: "1px solid #eadfbe",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: "0.85rem",
    color: "#5b4a2d",
    fontWeight: 600,
  },
  badgePago: {
    backgroundColor: "#f4f7ff",
    border: "1px solid #d8e1ff",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: "0.85rem",
    color: "#415a9c",
    fontWeight: 600,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 14,
    marginBottom: 14,
  },
  infoBox: {
    backgroundColor: "#fffaf0",
    border: "1px solid #f0e5cf",
    borderRadius: 14,
    padding: 14,
    color: "#333",
    lineHeight: 1.8,
  },
  notasBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    border: "1px solid #eee",
  },
  textoBloque: {
    marginTop: 8,
    marginBottom: 0,
    color: "#333",
    lineHeight: 1.6,
  },
  notaInternaItem: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid #eee",
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
  vacio: {
    marginTop: 8,
    marginBottom: 0,
    color: "#777",
    fontStyle: "italic",
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
};

export default AdminReservasGrupos;