import React, { useEffect, useMemo, useState } from "react";
import { ref, get, push, remove, update } from "firebase/database";
import { useNavigate, useSearchParams } from "react-router-dom";
import { dbRealtime } from "./firebase";
import { contarPlazasPorMetodo } from "./utils/contarPlazasDia";
import BotonVolver from "./BotonVolver";

import { fechaDMA } from "./utils/formatoFecha";
const AdminDetalleReservaNuevo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("id");

  const [reserva, setReserva] = useState(null);
  const [notasInternas, setNotasInternas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [eliminandoNotaId, setEliminandoNotaId] = useState(null);

  const [claseConfig, setClaseConfig] = useState(null);
  const [fechasBloqueadas, setFechasBloqueadas] = useState({});
  const [fechasHabilitadas, setFechasHabilitadas] = useState({});
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoTurno, setNuevoTurno] = useState("");
  const [ocupadasTornoNuevaFecha, setOcupadasTornoNuevaFecha] = useState(0);
  const [ocupadasModeladoNuevaFecha, setOcupadasModeladoNuevaFecha] =
    useState(0);
  const [guardandoReprogramacion, setGuardandoReprogramacion] = useState(false);

  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [guardandoCancelacion, setGuardandoCancelacion] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

useEffect(() => {
  const onResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", onResize);

  return () => window.removeEventListener("resize", onResize);
}, []);

  const normalizarTurnoParaRuta = (turno = "") =>
    String(turno || "")
      .trim()
      .replaceAll(" a ", "-")
      .replaceAll(" -", "-")
      .replaceAll("- ", "-");

  useEffect(() => {
    const buscarReserva = async () => {
      try {
        const [reservasSnap, notasSnap, usuariosSnap] = await Promise.all([
          get(ref(dbRealtime, "reservas")),
          get(ref(dbRealtime, `reservasNotas/${orderId}/notasInternas`)),
          get(ref(dbRealtime, "usuarios")),
        ]);

        let encontrada = null;
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

        if (reservasSnap.exists()) {
          reservasSnap.forEach((claseSnap) => {
            const claseKey = claseSnap.key;
            if (encontrada) return;

            claseSnap.forEach((fechaSnap) => {
              const fechaKey = fechaSnap.key;
              if (encontrada) return;

              fechaSnap.forEach((turnoSnap) => {
                const turnoKey = turnoSnap.key;
                if (encontrada) return;

                turnoSnap.forEach((nivelSnap) => {
                  const nivelKey = nivelSnap.key;
                  const nivelVal = nivelSnap.val();

                  if (!nivelVal || typeof nivelVal !== "object" || encontrada) {
                    return;
                  }

                  const construirReserva = (r, reservaKey) => {
                    if (!r || typeof r !== "object") return null;

                    const datosUsuario = usuariosMap[r.uid] || {};

                    return {
                      ...r,
                      claseId: r.claseId || claseKey,
                      clase: r.clase || claseKey,
                      fecha: r.fecha || fechaKey,
                      turno: normalizarTurnoParaRuta(r.turno || turnoKey),
                      metodo:
                        r.metodo ||
                        r.tipoClase ||
                        r.nombreTipoClase ||
                        (nivelKey && !String(nivelKey).startsWith("-")
                          ? nivelKey
                          : "") ||
                        "—",
                      plazas: Number(r.plazas || 1),
                      estado: r.estado || "—",
                      estadoPago: r.estadoPago || "—",
                      precioUnitario: Number(r.precioUnitario || r.precio || 0),
                      precioTotal: Number(
                        r.precioTotal || r.precioUnitario || r.precio || 0
                      ),
                      uid: r.uid || "",
                      nombre:
                        r.nombre || r.nombreUsuario || datosUsuario.nombre || "",
                      telefono:
                        r.telefono ||
                        r.telefonoUsuario ||
                        datosUsuario.telefono ||
                        "",
                      email: r.email || datosUsuario.email || "",
                      orderId: r.orderId || "",
                      desdeTarjeta: r.desdeTarjeta ?? false,
                      timestamp: r.pagadoEn || r.timestamp || r.creadoEn || "—",
                      procesado: r.procesado ?? false,
                      rutaClase: claseKey,
                      rutaFecha: fechaKey,
                      rutaTurno: normalizarTurnoParaRuta(turnoKey),
                      rutaMetodo: nivelKey,
                      reservaKey: reservaKey || "",
                    };
                  };

                  const pareceReservaDirecta =
                    "orderId" in nivelVal ||
                    "fecha" in nivelVal ||
                    "estado" in nivelVal ||
                    "estadoPago" in nivelVal;

                  if (pareceReservaDirecta) {
                    if (nivelVal.orderId === orderId) {
                      encontrada = construirReserva(nivelVal, nivelSnap.key);
                    }
                    return;
                  }

                  nivelSnap.forEach((reservaSnap) => {
                    const reservaVal = reservaSnap.val();

                    if (
                      reservaVal &&
                      typeof reservaVal === "object" &&
                      reservaVal.orderId === orderId
                    ) {
                      encontrada = construirReserva(reservaVal, reservaSnap.key);
                    }
                  });
                });
              });
            });
          });
        }

        setReserva(encontrada);

        if (encontrada?.claseId) {
          const [claseConfigSnap, bloqueosSnap, habilitadasSnap] =
            await Promise.all([
              get(ref(dbRealtime, `clases/${encontrada.claseId}`)),
              get(ref(dbRealtime, "bloqueosFechas")),
              get(ref(dbRealtime, "fechasHabilitadas")),
            ]);

          setClaseConfig(claseConfigSnap.exists() ? claseConfigSnap.val() : null);
          setFechasBloqueadas(
            bloqueosSnap.exists() ? bloqueosSnap.val() || {} : {}
          );
          setFechasHabilitadas(
            habilitadasSnap.exists() ? habilitadasSnap.val() || {} : {}
          );

          setNuevaFecha(encontrada.fecha || "");
          setNuevoTurno(normalizarTurnoParaRuta(encontrada.turno || ""));
        } else {
          setClaseConfig(null);
          setFechasBloqueadas({});
          setFechasHabilitadas({});
          setNuevaFecha("");
          setNuevoTurno("");
        }

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

        setNotasInternas(listaNotas);
      } catch (error) {
        console.error("Error al buscar reserva:", error);
        setReserva(null);
        setNotasInternas([]);
        setClaseConfig(null);
        setFechasBloqueadas({});
        setFechasHabilitadas({});
      } finally {
        setCargando(false);
      }
    };

    buscarReserva();
  }, [orderId]);

  useEffect(() => {
    if (!nuevaFecha) {
      setOcupadasTornoNuevaFecha(0);
      setOcupadasModeladoNuevaFecha(0);
      return;
    }

    contarPlazasPorMetodo(nuevaFecha)
      .then(({ torno, modelado }) => {
        setOcupadasTornoNuevaFecha(torno);
        setOcupadasModeladoNuevaFecha(modelado);
      })
      .catch((error) => {
        console.error("Error al contar plazas para reprogramación:", error);
        setOcupadasTornoNuevaFecha(0);
        setOcupadasModeladoNuevaFecha(0);
      });
  }, [nuevaFecha]);

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
        fecha: new Date().toLocaleString("es-ES"),
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
      console.error("Error al guardar la nota interna:", error);
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

  const normalizarTurnos = (turnosRaw) => {
    if (!turnosRaw) return [];

    if (Array.isArray(turnosRaw)) {
      return turnosRaw
        .map((t) => normalizarTurnoParaRuta(t))
        .filter(Boolean);
    }

    if (typeof turnosRaw === "object") {
      return Object.values(turnosRaw)
        .map((t) => normalizarTurnoParaRuta(t))
        .filter(Boolean);
    }

    if (typeof turnosRaw === "string") {
      return [normalizarTurnoParaRuta(turnosRaw)].filter(Boolean);
    }

    return [];
  };

  const obtenerTurnosFechaHabilitada = (fechaISO) => {
    const config = fechasHabilitadas?.[fechaISO];

    if (!config) return [];
    if (config.habilitada === false) return [];

    return normalizarTurnos(
      config.turnos ||
        config.turnosHabilitados ||
        config.horarios ||
        config.horario ||
        config.turno
    );
  };

  const getNombreDiaSemana = (fechaISO) => {
    if (!fechaISO) return "";

    const [year, month, day] = fechaISO.split("-").map(Number);
    const fechaLocal = new Date(year, month - 1, day);

    const dias = [
      "domingo",
      "lunes",
      "martes",
      "miercoles",
      "jueves",
      "viernes",
      "sabado",
    ];

    return dias[fechaLocal.getDay()] || "";
  };

  const horariosClase = claseConfig?.horarios || claseConfig?.horario || {};
  const metodoOriginal = (reserva?.metodo || "").toLowerCase();

  const turnosDisponiblesReprogramacion = useMemo(() => {
    if (!nuevaFecha) return [];

    const turnosFechaHabilitada = obtenerTurnosFechaHabilitada(nuevaFecha);

    if (turnosFechaHabilitada.length > 0) {
      return turnosFechaHabilitada;
    }

    const nombreDia = getNombreDiaSemana(nuevaFecha);
    return normalizarTurnos(horariosClase[nombreDia]);
  }, [horariosClase, nuevaFecha, fechasHabilitadas]);

  const fechaBloqueadaReprogramacion = useMemo(() => {
    if (!nuevaFecha) return null;
    const bloqueo = fechasBloqueadas?.[nuevaFecha];
    return bloqueo?.bloqueado ? bloqueo : null;
  }, [nuevaFecha, fechasBloqueadas]);

  const diaNoDisponibleReprogramacion = useMemo(() => {
    if (!nuevaFecha) return false;
    return turnosDisponiblesReprogramacion.length === 0;
  }, [nuevaFecha, turnosDisponiblesReprogramacion]);

  const maxTornoReprogramacion = Number(claseConfig?.plazas?.maxTorno || 12);
  const maxTotalesReprogramacion = Number(
    claseConfig?.plazas?.maxTotales || claseConfig?.plazas?.plazasTotales || 45
  );

  const plazasTotalesOcupadasNuevaFecha =
    ocupadasTornoNuevaFecha + ocupadasModeladoNuevaFecha;

  const plazasPropiasSiMismaFecha =
    nuevaFecha === reserva?.fecha ? Number(reserva?.plazas || 1) : 0;

  const ocupadasTornoAjustadas =
    metodoOriginal === "torno"
      ? Math.max(ocupadasTornoNuevaFecha - plazasPropiasSiMismaFecha, 0)
      : ocupadasTornoNuevaFecha;

  const ocupadasTotalesAjustadas = Math.max(
    plazasTotalesOcupadasNuevaFecha - plazasPropiasSiMismaFecha,
    0
  );

  const plazasDisponiblesReprogramacion = useMemo(() => {
    if (!metodoOriginal) return 0;

    if (metodoOriginal === "torno") {
      return Math.max(
        Math.min(
          maxTornoReprogramacion - ocupadasTornoAjustadas,
          maxTotalesReprogramacion - ocupadasTotalesAjustadas
        ),
        0
      );
    }

    return Math.max(maxTotalesReprogramacion - ocupadasTotalesAjustadas, 0);
  }, [
    metodoOriginal,
    maxTornoReprogramacion,
    maxTotalesReprogramacion,
    ocupadasTornoAjustadas,
    ocupadasTotalesAjustadas,
  ]);

  const hayCambiosReales =
    nuevaFecha !== reserva?.fecha ||
    normalizarTurnoParaRuta(nuevoTurno) !== normalizarTurnoParaRuta(reserva?.turno);

  const reservaYaCancelada =
    reserva?.cancelada === true || reserva?.estado === "Cancelada";

  const reprogramacionValida =
    !!nuevaFecha &&
    !!nuevoTurno &&
    !fechaBloqueadaReprogramacion &&
    !diaNoDisponibleReprogramacion &&
    plazasDisponiblesReprogramacion >= Number(reserva?.plazas || 1) &&
    hayCambiosReales &&
    !reservaYaCancelada;

  const buscarReservaUsuarioPorOrderId = async (uid, orderIdBuscado) => {
    if (!uid || !orderIdBuscado) return null;

    const listaSnap = await get(ref(dbRealtime, `usuarios/${uid}/listaReservas`));
    if (!listaSnap.exists()) return null;

    let encontrada = null;

    listaSnap.forEach((itemSnap) => {
      const item = itemSnap.val();
      if (
        item &&
        typeof item === "object" &&
        item.orderId === orderIdBuscado &&
        !encontrada
      ) {
        encontrada = {
          key: itemSnap.key,
          data: item,
        };
      }
    });

    return encontrada;
  };

  const obtenerRutaReservaActual = () => {
    if (!reserva) return null;

    const rutaClase = reserva.rutaClase;
    const rutaFecha = reserva.rutaFecha || reserva.fecha;
    const rutaTurno = normalizarTurnoParaRuta(reserva.rutaTurno || reserva.turno);

    const rutaBase = `reservas/${rutaClase}/${rutaFecha}/${rutaTurno}`;

    const metodoEsDirecto =
      reserva.rutaMetodo === reserva.reservaKey ||
      String(reserva.rutaMetodo || "").startsWith("-");

    if (metodoEsDirecto) {
      return `${rutaBase}/${reserva.rutaMetodo}`;
    }

    return `${rutaBase}/${reserva.rutaMetodo}/${reserva.reservaKey}`;
  };

  const guardarReprogramacion = async () => {
    if (!reprogramacionValida || !reserva) return;

    const turnoNormalizado = normalizarTurnoParaRuta(nuevoTurno);
    const turnoAnteriorNormalizado = normalizarTurnoParaRuta(reserva.turno);

    const confirmar = window.confirm(
      `¿Seguro que quieres reprogramar esta reserva del ${fechaDMA(reserva.fecha)} (${turnoAnteriorNormalizado}) al ${fechaDMA(nuevaFecha)} (${turnoNormalizado})?`
    );

    if (!confirmar) return;

    setGuardandoReprogramacion(true);

    try {
      const ahora = new Date();
      const fechaReprogramacionTexto = ahora.toLocaleString("es-ES");

      const metodoNormalizado = (reserva.metodo || "general").trim();
      const rutaActual = obtenerRutaReservaActual();

      if (!rutaActual) {
        throw new Error("No se pudo calcular la ruta actual de la reserva.");
      }

      const nuevaReservaPayload = {
        ...reserva,
        fecha: nuevaFecha,
        turno: turnoNormalizado,
        metodo: metodoNormalizado,

        reprogramada: true,
        fechaOriginal: reserva.fechaOriginal || reserva.fecha,
        turnoOriginal: normalizarTurnoParaRuta(
          reserva.turnoOriginal || reserva.turno
        ),

        ultimaFechaAnterior: reserva.fecha,
        ultimoTurnoAnterior: turnoAnteriorNormalizado,

        fechaReprogramada: nuevaFecha,
        turnoReprogramado: turnoNormalizado,

        rutaFecha: nuevaFecha,
        rutaTurno: turnoNormalizado,
        rutaMetodo: metodoNormalizado,
        rutaClase: reserva.rutaClase,

        reprogramadaEn: fechaReprogramacionTexto,
        reprogramadaPor: "Berto",

        avisoPerfil:
          "Tu reserva ha sido reprogramada. Revisa la nueva fecha y turno.",
      };

      const nuevaReservaRef = await push(
        ref(
          dbRealtime,
          `reservas/${reserva.rutaClase}/${nuevaFecha}/${turnoNormalizado}/${metodoNormalizado}`
        ),
        nuevaReservaPayload
      );

      await remove(ref(dbRealtime, rutaActual));

      if (reserva.uid) {
        const reservaUsuario = await buscarReservaUsuarioPorOrderId(
          reserva.uid,
          reserva.orderId
        );

        const datosActualizadosUsuario = {
          ...reserva,
          fecha: nuevaFecha,
          turno: turnoNormalizado,
          metodo: metodoNormalizado,

          reprogramada: true,

          fechaOriginal:
            reservaUsuario?.data?.fechaOriginal ||
            reserva.fechaOriginal ||
            reserva.fecha,

          turnoOriginal: normalizarTurnoParaRuta(
            reservaUsuario?.data?.turnoOriginal ||
              reserva.turnoOriginal ||
              reserva.turno
          ),

          ultimaFechaAnterior: reserva.fecha,
          ultimoTurnoAnterior: turnoAnteriorNormalizado,

          fechaReprogramada: nuevaFecha,
          turnoReprogramado: turnoNormalizado,

          rutaFecha: nuevaFecha,
          rutaTurno: turnoNormalizado,
          rutaMetodo: metodoNormalizado,
          rutaClase: reserva.rutaClase,

          reprogramadaEn: fechaReprogramacionTexto,
          reprogramadaPor: "Berto",

          avisoPerfil:
            "Tu reserva ha sido reprogramada. Revisa la nueva fecha y turno.",
        };

        if (reservaUsuario?.key) {
          await update(
            ref(
              dbRealtime,
              `usuarios/${reserva.uid}/listaReservas/${reservaUsuario.key}`
            ),
            datosActualizadosUsuario
          );
        } else {
          await push(
            ref(dbRealtime, `usuarios/${reserva.uid}/listaReservas`),
            datosActualizadosUsuario
          );
        }
      }

      await push(ref(dbRealtime, `reservasNotas/${orderId}/reprogramaciones`), {
        fechaAnterior: reserva.fecha,
        turnoAnterior: turnoAnteriorNormalizado,
        fechaNueva: nuevaFecha,
        turnoNuevo: turnoNormalizado,
        fechaCambio: fechaReprogramacionTexto,
        realizadoPor: "Berto",
      });

      const notaAutomatica = {
        texto: `Reserva reprogramada por Berto. Antes: ${fechaDMA(reserva.fecha)} - ${turnoAnteriorNormalizado}. Ahora: ${fechaDMA(nuevaFecha)} - ${turnoNormalizado}.`,
        fecha: fechaReprogramacionTexto,
      };

      await push(
        ref(dbRealtime, `reservasNotas/${orderId}/notasInternas`),
        notaAutomatica
      );

      setNotasInternas((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          ...notaAutomatica,
        },
      ]);

      setReserva((prev) => ({
        ...prev,
        ...nuevaReservaPayload,
        rutaFecha: nuevaFecha,
        rutaTurno: turnoNormalizado,
        rutaMetodo: metodoNormalizado,
        reservaKey: nuevaReservaRef.key,
      }));

      alert("Reserva reprogramada correctamente.");
    } catch (error) {
      console.error("Error al reprogramar la reserva:", error);
      alert("No se pudo guardar la reprogramación.");
    } finally {
      setGuardandoReprogramacion(false);
    }
  };

  const cancelarReserva = async () => {
    if (!reserva || reservaYaCancelada) return;

    const confirmar = window.confirm(
      "¿Seguro que quieres cancelar esta reserva? La reserva quedará guardada en la base de datos como cancelada."
    );

    if (!confirmar) return;

    setGuardandoCancelacion(true);

    try {
      const ahora = new Date();
      const fechaCancelacionTexto = ahora.toLocaleString("es-ES");
      const rutaActual = obtenerRutaReservaActual();

      if (!rutaActual) {
        throw new Error("No se pudo calcular la ruta actual de la reserva.");
      }

      const datosCancelacion = {
        estado: "Cancelada",
        cancelada: true,
        canceladaPor: "Berto",
        canceladaEn: fechaCancelacionTexto,
        motivoCancelacion: motivoCancelacion.trim() || "",
        avisoPerfil:
          "Tu reserva ha sido cancelada. Si lo necesitas, contacta con el taller.",
      };

      await update(ref(dbRealtime, rutaActual), datosCancelacion);

      if (reserva.uid) {
        const reservaUsuario = await buscarReservaUsuarioPorOrderId(
          reserva.uid,
          reserva.orderId
        );

        if (reservaUsuario?.key) {
          await update(
            ref(
              dbRealtime,
              `usuarios/${reserva.uid}/listaReservas/${reservaUsuario.key}`
            ),
            datosCancelacion
          );
        } else {
          await push(ref(dbRealtime, `usuarios/${reserva.uid}/listaReservas`), {
            ...reserva,
            ...datosCancelacion,
          });
        }
      }

      const textoMotivo = motivoCancelacion.trim()
        ? ` Motivo: ${motivoCancelacion.trim()}.`
        : "";

      const notaAutomatica = {
        texto: `Reserva cancelada por Berto.${textoMotivo}`,
        fecha: fechaCancelacionTexto,
      };

      await push(
        ref(dbRealtime, `reservasNotas/${orderId}/notasInternas`),
        notaAutomatica
      );

      setNotasInternas((prev) => [
        ...prev,
        {
          id: `cancelacion-${Date.now()}`,
          ...notaAutomatica,
        },
      ]);

      setReserva((prev) => ({
        ...prev,
        ...datosCancelacion,
      }));

      setMotivoCancelacion("");

      alert("Reserva cancelada correctamente.");
    } catch (error) {
      console.error("Error al cancelar la reserva:", error);
      alert("No se pudo cancelar la reserva.");
    } finally {
      setGuardandoCancelacion(false);
    }
  };

  if (cargando) {
    return <p style={styles.mensaje}>Cargando reserva...</p>;
  }

  if (!reserva) {
    return <p style={styles.mensaje}>Reserva no encontrada.</p>;
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

        <h1 style={styles.titulo}>Detalle de reserva</h1>

        <div style={styles.card}>
          <p>
            <strong>Clase:</strong>{" "}
            <span
              style={styles.linkClase}
              onClick={() =>
                navigate(
                  `/admin-detalle-clase?clase=${encodeURIComponent(
                    reserva.claseId || ""
                  )}&nombre=${encodeURIComponent(reserva.clase || "")}`
                )
              }
            >
              {reserva.clase}
            </span>
          </p>

          <p>
            <strong>Fecha de la reserva:</strong>{" "}
            <span style={styles.fechaReserva}>{reserva.fecha}</span>
          </p>

          <p>
            <strong>Fecha de pago:</strong>{" "}
            <span style={styles.fechaPago}>{reserva.timestamp}</span>
          </p>

          <p>
            <strong>Turno:</strong> {reserva.turno}
          </p>

          {!["pintatupieza", "especialpintatupieza"].includes(reserva.claseId) &&
            reserva.tipoTaller !== "pinta_y_decora" && (
              <p>
                <strong>Método:</strong> {reserva.metodo}
              </p>
            )}

          <p>
            <strong>Plazas:</strong> {reserva.plazas}
          </p>

          <hr style={styles.hr} />

          <p>
            <strong>Nombre:</strong> {reserva.nombre || "—"}
          </p>
          <p>
            <strong>Teléfono:</strong> {reserva.telefono || "—"}
          </p>
          <p>
            <strong>Email:</strong> {reserva.email || "—"}
          </p>

          {reserva.sobreaforo && (
            <p style={{ ...styles.reprogramadaInfo, color: "#b3261e" }}>
              <strong>⚠ Sobreaforo:</strong> el pago llegó cuando la plaza guardada ya había
              caducado y otra persona ocupó el sitio. La reserva está confirmada, pero la
              franja supera el aforo.
            </p>
          )}

          {reserva.reprogramada && (
            <>
              <hr style={styles.hr} />
              <p style={styles.reprogramadaInfo}>
                <strong>Reserva reprogramada:</strong> Sí
              </p>
              <p>
                <strong>Fecha original:</strong> {fechaDMA(reserva.fechaOriginal) || "—"}
              </p>
              <p>
                <strong>Turno original:</strong> {reserva.turnoOriginal || "—"}
              </p>
              <p>
                <strong>Último cambio:</strong> {reserva.reprogramadaEn || "—"}
              </p>
            </>
          )}

          {reservaYaCancelada && (
            <>
              <hr style={styles.hr} />
              <p style={styles.canceladaInfo}>
                <strong>Reserva cancelada:</strong> Sí
              </p>
              <p>
                <strong>Cancelada por:</strong> {reserva.canceladaPor || "—"}
              </p>
              <p>
                <strong>Fecha cancelación:</strong> {reserva.canceladaEn || "—"}
              </p>
              <p>
                <strong>Motivo:</strong> {reserva.motivoCancelacion || "—"}
              </p>
            </>
          )}

          <hr style={styles.hr} />

          <p>
            <strong>Estado:</strong> {reserva.estado}
          </p>
          <p>
            <strong>Estado pago:</strong> {reserva.estadoPago}
          </p>

          <hr style={styles.hr} />

          <p>
            <strong>Precio unitario:</strong> {reserva.precioUnitario}€
          </p>
          <p>
            <strong>Precio total:</strong> {reserva.precioTotal}€
          </p>

          <hr style={styles.hr} />

          <p>
            <strong>UID:</strong>{" "}
            <span
              style={styles.uidLink}
              onClick={() =>
                navigate(`/admin-detalle-usuario?uid=${reserva.uid}`)
              }
            >
              {reserva.uid}
            </span>
          </p>

          <p>
            <strong>Order ID:</strong> {reserva.orderId}
          </p>
          <p>
            <strong>Desde tarjeta:</strong> {reserva.desdeTarjeta ? "Sí" : "No"}
          </p>

          <hr style={styles.hr} />

          <p>
            <strong>Procesado:</strong> {reserva.procesado ? "Sí" : "No"}
          </p>
        </div>

        <div style={styles.notasBox}>
          <h2 style={styles.subtituloBloque}>Reprogramar reserva</h2>

          <div style={styles.campoReprogramacion}>
            <label style={styles.label}>Nueva fecha</label>
            <input
              type="date"
              value={nuevaFecha}
              onChange={(e) => {
                setNuevaFecha(e.target.value);
                setNuevoTurno("");
              }}
              style={styles.input}
              disabled={reservaYaCancelada}
            />
          </div>

          <div style={styles.campoReprogramacion}>
            <label style={styles.label}>Nuevo turno</label>
            <select
              value={nuevoTurno}
              onChange={(e) =>
                setNuevoTurno(normalizarTurnoParaRuta(e.target.value))
              }
              style={styles.input}
              disabled={
                !nuevaFecha || diaNoDisponibleReprogramacion || reservaYaCancelada
              }
            >
              <option value="">-- Elige turno --</option>
              {turnosDisponiblesReprogramacion.map((turno) => (
                <option key={turno} value={turno}>
                  {turno}
                </option>
              ))}
            </select>
          </div>

          {fechaBloqueadaReprogramacion && (
            <p style={styles.textoError}>
              La fecha elegida está bloqueada.
              {fechaBloqueadaReprogramacion.motivo
                ? ` Motivo: ${fechaBloqueadaReprogramacion.motivo}.`
                : ""}
            </p>
          )}

          {nuevaFecha &&
            !fechaBloqueadaReprogramacion &&
            diaNoDisponibleReprogramacion && (
              <p style={styles.textoError}>
                Esta clase no se imparte ese día. Días disponibles:{" "}
                {Object.keys(horariosClase).join(", ")}.
              </p>
            )}

          {!fechaBloqueadaReprogramacion &&
            !diaNoDisponibleReprogramacion &&
            nuevaFecha && (
              <p style={styles.textoVacio}>
                Plazas disponibles para esa fecha y turno:{" "}
                {plazasDisponiblesReprogramacion}
              </p>
            )}

          {reservaYaCancelada && (
            <p style={styles.textoError}>
              Esta reserva está cancelada y ya no se puede reprogramar.
            </p>
          )}

          <p style={styles.textoVacio}>
            Al confirmar, se moverá la reserva en Firebase y también se
            actualizará en el perfil del usuario.
          </p>

          <button
            onClick={guardarReprogramacion}
            style={{
              ...styles.botonGuardar,
              opacity: reprogramacionValida ? 1 : 0.6,
              cursor: reprogramacionValida ? "pointer" : "not-allowed",
            }}
            disabled={!reprogramacionValida || guardandoReprogramacion}
          >
            {guardandoReprogramacion
              ? "Guardando cambio..."
              : "Confirmar reprogramación"}
          </button>
        </div>

        <div style={styles.cancelacionBox}>
          <h2 style={styles.subtituloBloque}>Cancelar reserva</h2>

          <div style={styles.campoReprogramacion}>
            <label style={styles.label}>Motivo de cancelación (opcional)</label>
            <textarea
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              placeholder="Escribe aquí el motivo si quieres dejarlo registrado..."
              style={styles.textarea}
              rows={3}
              disabled={reservaYaCancelada}
            />
          </div>

          {reservaYaCancelada ? (
            <p style={styles.textoError}>Esta reserva ya está cancelada.</p>
          ) : (
            <p style={styles.textoVacio}>
              La reserva no se borrará. Quedará guardada como cancelada en admin
              y en el perfil del usuario.
            </p>
          )}

          <button
            onClick={cancelarReserva}
            style={{
              ...styles.botonCancelar,
              opacity: reservaYaCancelada ? 0.6 : 1,
              cursor: reservaYaCancelada ? "not-allowed" : "pointer",
            }}
            disabled={reservaYaCancelada || guardandoCancelacion}
          >
            {guardandoCancelacion ? "Cancelando reserva..." : "Cancelar reserva"}
          </button>
        </div>

        <div style={styles.notasBox}>
          <h2 style={styles.subtituloBloque}>Notas</h2>

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
                    <p style={styles.notaFecha}>{nota.fecha}</p>
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
  titulo: {
    textAlign: "center",
    marginBottom: 20,
  },
  notaItemMobile: {
  paddingBottom: 10,
},
notaHeaderMobile: {
  flexDirection: "column",
  alignItems: "stretch",
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
  mensaje: {
    textAlign: "center",
    padding: 40,
  },
  linkClase: {
    color: "#7c5c2e",
    cursor: "pointer",
    textDecoration: "underline",
    fontWeight: 500,
  },
  notasBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#fffaf0",
    border: "1px solid #f0e5cf",
    borderRadius: 16,
  },
  cancelacionBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#fff5f5",
    border: "1px solid #f0cccc",
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
  botonCancelar: {
    marginTop: 10,
    padding: "10px 14px",
    border: "1px solid #e7c9c9",
    backgroundColor: "#fff1f1",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
    color: "#8a3b3b",
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
  campoReprogramacion: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 14,
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
  textoError: {
    color: "#b33a3a",
    fontWeight: 500,
    marginTop: 6,
  },
  reprogramadaInfo: {
    color: "#8a6a2f",
    fontWeight: 600,
  },
  canceladaInfo: {
    color: "#8a3b3b",
    fontWeight: 600,
  },
  fechaReserva: {
    color: "#8a6a2f",
    fontWeight: 700,
  },
  fechaPago: {
    color: "#5f7fa3",
    fontWeight: 600,
  },
};

export default AdminDetalleReservaNuevo;