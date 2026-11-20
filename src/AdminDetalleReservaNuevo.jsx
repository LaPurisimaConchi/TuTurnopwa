import React, { useEffect, useMemo, useState } from "react";
import Icono from "./components/Icono";
import { ref, get, push, remove, update } from "firebase/database";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { dbRealtime } from "./firebase";
import { nombreAdminActual } from "./utils/nombreAdmin";
import { contarFranja, plazasLibresFranja, reservaVigente, turnosCompartenPlazas, usaTorno } from "./utils/aforo";
import { useConfigEspacio } from "./configuracionEspacio";
import BotonVolver from "./BotonVolver";
import CalendarioReserva from "./components/CalendarioReserva";

import { fechaDMA, fechaHoraLegible } from "./utils/formatoFecha";
import EtiquetaInvitado from "./components/EtiquetaInvitado";
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
  const [numeroSesionBono, setNumeroSesionBono] = useState(null);
  // Precio pagado por el producto completo (bono, o taller con varias sesiones)
  const [precioProducto, setPrecioProducto] = useState(null);
  // Importe de la tarjeta regalo con la que se reservó (la reserva guarda 0 €)
  const [precioTarjeta, setPrecioTarjeta] = useState(null);
  const [fechasBloqueadas, setFechasBloqueadas] = useState({});
  const [fechasHabilitadas, setFechasHabilitadas] = useState({});
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevoTurno, setNuevoTurno] = useState("");
  // Snapshots de /reservas y /reservasGrupos para contar el aforo real
  const [ocupacion, setOcupacion] = useState(null);
  const { config: configEspacio } = useConfigEspacio();
  const [guardandoReprogramacion, setGuardandoReprogramacion] = useState(false);

  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [guardandoCancelacion, setGuardandoCancelacion] = useState(false);
  const [avisarPorCorreo, setAvisarPorCorreo] = useState(true);
  const [permitirReprogramar, setPermitirReprogramar] = useState(true);
  const [quitandoReprogramacion, setQuitandoReprogramacion] = useState(false);
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);
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
              invitado: user.invitado === true,
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
                      invitado: datosUsuario.invitado === true,
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

        // Taller con varias sesiones: el pago va en la reserva de la sesión que lo cobra
        if (
          encontrada?.orderId &&
          (encontrada.sesionesCurso > 1 || encontrada.sesionesEdicion > 1) &&
          !(Number(encontrada.precioTotal) > 0)
        ) {
          let importe = 0;
          const buscar = (nodo) => {
            if (!nodo || typeof nodo !== "object") return;
            if (nodo.orderId === encontrada.orderId && Number(nodo.precioTotal) > importe) {
              importe = Number(nodo.precioTotal);
              return;
            }
            Object.values(nodo).forEach(buscar);
          };
          buscar(reservasSnap.val());
          if (importe > 0) setPrecioProducto({ tipo: "taller", importe });
        }

        // Reserva con tarjeta regalo: lee el importe de la tarjeta
        if (encontrada?.desdeTarjeta) {
          try {
            let tarjetaId = encontrada.tarjetaRegaloId || "";
            if (!tarjetaId && encontrada.codigoTarjeta) {
              const idx = await get(
                ref(dbRealtime, `codigosTarjetaRegalo/${String(encontrada.codigoTarjeta).toUpperCase()}`)
              );
              if (idx.exists()) tarjetaId = String(idx.val());
            }
            if (tarjetaId) {
              const tarjetaSnap = await get(ref(dbRealtime, `tarjetasRegalo/${tarjetaId}`));
              if (tarjetaSnap.exists()) {
                const t = tarjetaSnap.val() || {};
                const plazasTarjeta = Number(t.plazas) || 1;
                const total = Number(t.precioTotal ?? t.precio ?? 0);
                const unitario =
                  Number(t.precioUnitario ?? t.precioBase ?? 0) || total / plazasTarjeta;
                if (total > 0) setPrecioTarjeta({ total, unitario, plazas: plazasTarjeta });
              }
            }
          } catch (e) {
            console.error("No se pudo leer la tarjeta regalo", e);
          }
        }

        // Si la reserva es de un bono, calcula qué sesión del bono es
        const bonoIdReserva =
          encontrada?.bonoId ||
          (encontrada?.tipoTaller === "bono_mensual" ? encontrada.orderId : "");
        if (encontrada?.uid && bonoIdReserva) {
          try {
            const bonoSnap = await get(
              ref(dbRealtime, `usuarios/${encontrada.uid}/bonos/${bonoIdReserva}`)
            );
            if (bonoSnap.exists()) {
              const bono = bonoSnap.val() || {};
              const sesiones = Object.values(bono.sesionesConsumidas || {}).sort((a, b) =>
                String(a.timestamp || "").localeCompare(String(b.timestamp || ""))
              );
              const indice = sesiones.findIndex(
                (x) => x.reservaId && x.reservaId === encontrada.reservaKey
              );
              const precioBono = Number(bono.precioTotal ?? bono.precio ?? 0);
              if (precioBono > 0) {
                setPrecioProducto({ tipo: "bono", importe: precioBono });
              }
              setNumeroSesionBono({
                numero: indice >= 0 ? indice + 1 : null,
                total: Number(bono.numeroClases || 0) || null,
              });
            }
          } catch (e) {
            console.error("No se pudo leer el bono de la reserva", e);
          }
        }

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

  // Ocupación de todo el espacio (reservas y grupos) para las plazas libres al reprogramar.
  // Se vuelve a leer al cambiar de reserva o tras guardar un cambio.
  const [versionOcupacion, setVersionOcupacion] = useState(0);
  useEffect(() => {
    let activo = true;
    Promise.all([get(ref(dbRealtime, "reservas")), get(ref(dbRealtime, "reservasGrupos"))])
      .then(([reservas, grupos]) => {
        if (activo) setOcupacion({ reservas, grupos });
      })
      .catch((error) => {
        console.error("Error al leer la ocupación para reprogramar:", error);
        if (activo) setOcupacion(null);
      });
    return () => {
      activo = false;
    };
  }, [orderId, versionOcupacion]);

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

  // Turnos de cualquier fecha: los de la fecha habilitada a mano o, si no hay, los
  // del horario semanal del taller
  const turnosDeFecha = (fechaISO) => {
    const habilitados = obtenerTurnosFechaHabilitada(fechaISO);
    if (habilitados.length > 0) return habilitados;
    return normalizarTurnos(horariosClase[getNombreDiaSemana(fechaISO)]);
  };

  // Estado de cada día para el calendario de reprogramar
  const estadoDiaReprogramar = (fechaISO) => {
    const bloqueo = fechasBloqueadas?.[fechaISO];
    if (bloqueo?.bloqueado) return { estado: "bloqueado", motivo: bloqueo.motivo || "" };
    if (turnosDeFecha(fechaISO).length === 0) return { estado: "sin-taller" };
    return { estado: "disponible" };
  };

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

  // Plazas libres del turno elegido con el aforo real del espacio (src/utils/aforo.js):
  // todos los talleres y los grupos, las plazas guardadas mientras alguien paga y los
  // turnos que se solapan. Si esta reserva ya ocupa esa franja, sus plazas no cuentan.
  // null mientras no hay turno elegido o no se ha leído la ocupación.
  const plazasDisponiblesReprogramacion = useMemo(() => {
    if (!ocupacion || !nuevaFecha || !nuevoTurno || !reserva) return null;

    const turno = normalizarTurnoParaRuta(nuevoTurno);
    const ocupadas = contarFranja(ocupacion.reservas, ocupacion.grupos, nuevaFecha, turno);
    const conTorno = usaTorno(reserva);
    const plazasPropias = Number(reserva.plazas || 1);
    const yaCuenta =
      reservaVigente(reserva) &&
      nuevaFecha === reserva.fecha &&
      turnosCompartenPlazas(turno, normalizarTurnoParaRuta(reserva.turno || ""));
    const ajustadas = yaCuenta
      ? {
          total: Math.max(ocupadas.total - plazasPropias, 0),
          torno: Math.max(ocupadas.torno - (conTorno ? plazasPropias : 0), 0),
        }
      : ocupadas;

    return plazasLibresFranja(ajustadas, configEspacio, { conTorno }).reservables;
  }, [ocupacion, nuevaFecha, nuevoTurno, reserva, configEspacio]);

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
    plazasDisponiblesReprogramacion !== null &&
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
        reprogramadaPor: nombreAdminActual(),

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
          reprogramadaPor: nombreAdminActual(),

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
        realizadoPor: nombreAdminActual(),
      });

      const notaAutomatica = {
        texto: `Reserva reprogramada por ${nombreAdminActual()}. Antes: ${fechaDMA(reserva.fecha)} - ${turnoAnteriorNormalizado}. Ahora: ${fechaDMA(nuevaFecha)} - ${turnoNormalizado}.`,
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
      setVersionOcupacion((v) => v + 1);

      alert("Reserva reprogramada correctamente.");
    } catch (error) {
      console.error("Error al reprogramar la reserva:", error);
      alert("No se pudo guardar la reprogramación.");
    } finally {
      setGuardandoReprogramacion(false);
    }
  };

  // El servidor deja la reserva recuperable con su código y, si se pide, avisa por correo
  const prepararAvisoCancelacion = async (enviarCorreo, permitir = true) => {
    const ruta = obtenerRutaReservaActual();
    const token = await getAuth().currentUser?.getIdToken();
    if (!ruta || !token) throw new Error("No se pudo identificar la reserva o tu sesión.");

    const respuesta = await fetch("/api/codigo-reserva", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: "cancelacion", ruta, enviarCorreo, permitirReprogramar: permitir }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || !datos.ok) throw new Error(datos.error || "Error del servidor");
    return datos;
  };

  const textoResultadoCorreo = (datos) => {
    switch (datos.correo) {
      case "enviado":
        return `Correo enviado a ${datos.email}.`;
      case "sin_email":
        return "El cliente no tiene email: no se ha enviado el correo.";
      case "sin_clave":
        return "El envío de correos no está configurado en el servidor (falta RESEND_API_KEY).";
      case "rechazado":
      case "error":
        return "No se pudo enviar el correo. Puedes reintentarlo desde esta misma pantalla.";
      default:
        return "";
    }
  };

  const aplicarAvisoCancelacion = (datos) =>
    setReserva((prev) => ({
      ...prev,
      ...(datos.codigo ? { codigoReserva: datos.codigo.replace("-", "") } : {}),
      cancelacionEstudio: datos.reprogramable !== false,
      recuperada: false,
      recuperableHasta: datos.recuperableHasta || "",
      ...(datos.correo === "enviado" ? { correoCancelacionEnviadoEn: new Date().toISOString() } : {}),
    }));

  // Reserva cancelada sin opción de volver a reservar (o cuyo aviso falló): se abre ahora
  const permitirVolverAReservar = async () => {
    setQuitandoReprogramacion(true);
    try {
      const datos = await prepararAvisoCancelacion(false, true);
      aplicarAvisoCancelacion(datos);
      alert(`Listo: el cliente puede volver a reservar con el código ${datos.codigo}.`);
    } catch (error) {
      console.error("Error al permitir volver a reservar:", error);
      alert("No se pudo cambiar: " + error.message);
    } finally {
      setQuitandoReprogramacion(false);
    }
  };

  const quitarReprogramacion = async () => {
    if (!window.confirm("¿Quitar la opción de volver a reservar? El código dejará de recuperar esta reserva.")) {
      return;
    }
    setQuitandoReprogramacion(true);
    try {
      const datos = await prepararAvisoCancelacion(false, false);
      aplicarAvisoCancelacion(datos);
      alert("Listo: esta reserva ya no se puede volver a reservar.");
    } catch (error) {
      console.error("Error al quitar la reprogramación:", error);
      alert("No se pudo cambiar: " + error.message);
    } finally {
      setQuitandoReprogramacion(false);
    }
  };

  const enviarCorreoDeCancelacion = async () => {
    setEnviandoCorreo(true);
    try {
      const datos = await prepararAvisoCancelacion(true, reserva.cancelacionEstudio === true);
      aplicarAvisoCancelacion(datos);
      alert(textoResultadoCorreo(datos) || "Hecho.");
    } catch (error) {
      console.error("Error al enviar el correo de cancelación:", error);
      alert("No se pudo enviar el correo: " + error.message);
    } finally {
      setEnviandoCorreo(false);
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
        canceladaPor: nombreAdminActual(),
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
        texto: `Reserva cancelada por ${nombreAdminActual()}.${textoMotivo}`,
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

      // Código para volver a reservar y, si se ha marcado, correo al cliente
      let mensaje = "Reserva cancelada correctamente.";
      if (permitirReprogramar || avisarPorCorreo) {
        try {
          const datos = await prepararAvisoCancelacion(avisarPorCorreo, permitirReprogramar);
          aplicarAvisoCancelacion(datos);
          if (datos.codigo) {
            mensaje += ` El cliente puede volver a reservar con el código ${datos.codigo}.`;
          } else {
            mensaje += " El cliente no podrá volver a reservar.";
          }
          const correo = textoResultadoCorreo(datos);
          if (correo) mensaje += ` ${correo}`;
        } catch (errorAviso) {
          console.error("Error al preparar el aviso de cancelación:", errorAviso);
          mensaje += ` Pero no se pudo preparar el aviso (${errorAviso.message}).`;
        }
      } else {
        mensaje += " El cliente no podrá volver a reservar.";
      }

      alert(mensaje);
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

  const fechaLarga = (iso) => {
    if (!iso) return "—";
    const texto = new Date(`${iso}T12:00:00`).toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  };

  const urlWhatsApp = (telefono) => {
    const digitos = String(telefono || "").replace(/\D/g, "");
    return digitos ? `https://wa.me/34${digitos}` : "";
  };

  const esPagado = String(reserva.estadoPago).toLowerCase() === "pagado";
  const mostrarMetodo =
    !["pintatupieza", "especialpintatupieza"].includes(reserva.claseId) &&
    reserva.tipoTaller !== "pinta_y_decora" &&
    reserva.metodo &&
    reserva.metodo !== "—";

  const chip = (texto, tono) => (
    <span style={{ ...styles.chip, ...styles[`chip_${tono}`] }}>{texto}</span>
  );

  // De qué producto viene la reserva (bono, tarjeta regalo, taller...)
  const origen = (() => {
    const r = reserva;
    const deTotal = (n, t) => (n && t ? `Sesión ${n} de ${t}` : n ? `Sesión ${n}` : "");
    const sesionBono = numeroSesionBono
      ? deTotal(numeroSesionBono.numero, numeroSesionBono.total)
      : "";
    const sesionTaller =
      deTotal(Number(r.sesionCurso), Number(r.sesionesCurso)) ||
      deTotal(Number(r.sesionEdicion), Number(r.sesionesEdicion)) ||
      (r.tipoTaller === "dos_sesiones" && r.fechaPrimeraSesion ? "Sesión 1 de 2" : "");
    if (r.desdeBono) {
      return {
        etiqueta: "Sesión de un bono",
        detalle: [sesionBono, r.bonoId ? `Bono ${r.bonoId}` : ""].filter(Boolean).join(" · "),
        tono: "azul",
      };
    }
    if (r.desdeTarjeta) {
      return {
        etiqueta: "Tarjeta regalo",
        detalle: [sesionTaller || sesionBono, r.codigoTarjeta ? `Código ${r.codigoTarjeta}` : ""]
          .filter(Boolean)
          .join(" · "),
        tono: "ambar",
      };
    }
    if (r.tipoTaller === "bono_mensual" || r.tipo === "bono") {
      return {
        etiqueta: "Compra de bono (primera sesión)",
        detalle: sesionBono,
        tono: "azul",
      };
    }
    if (r.tipo === "grupo" || r.claseId === "reserva-grupo") {
      return { etiqueta: "Reserva de grupo", detalle: "", tono: "azul" };
    }
    if (r.tipoTaller === "dos_sesiones") {
      return { etiqueta: "Taller de dos sesiones", detalle: sesionTaller, tono: "verde" };
    }
    if (r.tipoTaller === "monografico") {
      return { etiqueta: "Taller monográfico", detalle: sesionTaller, tono: "verde" };
    }
    return { etiqueta: "Sesión de taller", detalle: sesionTaller, tono: "verde" };
  })();

  // Sesiones sin cobro propio porque van incluidas en un bono o en un taller ya pagado
  const sinCobro =
    !precioTarjeta &&
    !(Number(reserva.precioTotal) > 0) &&
    (reserva.desdeBono || precioProducto?.tipo === "taller");
  const textoIncluido = reserva.desdeBono ? "Incluido en el bono" : "Incluido en el taller";

  const tonoEstado = reservaYaCancelada
    ? "rojo"
    : String(reserva.estado).toLowerCase() === "confirmada"
    ? "verde"
    : "ambar";

  // Fila "etiqueta · valor" de las tarjetas de datos
  const dato = (etiqueta, valor, extra = null) => (
    <div style={styles.dato}>
      <span style={styles.datoEtiqueta}>{etiqueta}</span>
      <span style={styles.datoValor}>{valor || "—"}</span>
      {extra}
    </div>
  );

  const plazasReserva = Number(reserva.plazas || 1);
  const faltaSitio =
    !!nuevaFecha &&
    !fechaBloqueadaReprogramacion &&
    !diaNoDisponibleReprogramacion &&
    plazasDisponiblesReprogramacion !== null &&
    plazasDisponiblesReprogramacion < plazasReserva;

  return (
    <div style={{ ...styles.body, ...(isMobile ? styles.bodyMobile : {}) }}>
      <div style={{ ...styles.container, ...(isMobile ? styles.containerMobile : {}) }}>
        <BotonVolver />

        {/* Cabecera: qué reserva es y cómo está */}
        <div style={styles.cabecera}>
          <p style={styles.cabeceraEtiqueta}>Detalle de reserva</p>
          <h1 style={{ ...styles.titulo, ...(isMobile ? styles.tituloMobile : {}) }}>
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
          </h1>

          <div style={styles.chips}>
            {chip(reservaYaCancelada ? "Cancelada" : reserva.estado, tonoEstado)}
            {chip(esPagado ? "Pagado" : `Pago: ${reserva.estadoPago}`, esPagado ? "verde" : "ambar")}
            {chip(
              origen.detalle && origen.detalle.startsWith("Sesión ")
                ? `${origen.etiqueta} · ${origen.detalle.split(" · ")[0]}`
                : origen.etiqueta,
              origen.tono
            )}
            {reserva.reprogramada && chip("Reprogramada", "azul")}
            {reserva.sobreaforo && chip("Sobreaforo", "rojo")}
          </div>
        </div>

        {/* Lo más importante, de un vistazo */}
        <div style={{ ...styles.resumen, ...(isMobile ? styles.resumenMobile : {}) }}>
          <div style={styles.resumenBloque}>
            <span style={styles.resumenEtiqueta}>Fecha</span>
            <span style={styles.resumenValor}>{fechaLarga(reserva.fecha)}</span>
          </div>
          <div style={styles.resumenBloque}>
            <span style={styles.resumenEtiqueta}>Turno</span>
            <span style={styles.resumenValor}>{reserva.turno || "—"}</span>
          </div>
          <div style={styles.resumenBloque}>
            <span style={styles.resumenEtiqueta}>Plazas</span>
            <span style={styles.resumenValor}>
              {plazasReserva}
              {mostrarMetodo ? ` · ${reserva.metodo}` : ""}
            </span>
          </div>
          <div style={styles.resumenBloque}>
            <span style={styles.resumenEtiqueta}>Total</span>
            <span style={styles.resumenValor}>{reserva.precioTotal} €</span>
          </div>
        </div>

        {reserva.sobreaforo && (
          <div style={{ ...styles.aviso, ...styles.avisoRojo }}>
            <strong>Sobreaforo:</strong> el pago llegó cuando la plaza guardada ya había caducado
            y otra persona ocupó el sitio. La reserva está confirmada, pero la franja supera el
            aforo.
          </div>
        )}

        {reservaYaCancelada && (
          <div style={{ ...styles.aviso, ...styles.avisoRojo }}>
            <strong>Reserva cancelada</strong> por {reserva.canceladaPor || "—"} el{" "}
            {reserva.canceladaEn || "—"}.
            {reserva.motivoCancelacion ? ` Motivo: ${reserva.motivoCancelacion}.` : ""}
            {reserva.recuperada && " El cliente ya ha elegido una nueva fecha."}
          </div>
        )}

        {reserva.reprogramada && (
          <div style={{ ...styles.aviso, ...styles.avisoAzul }}>
            <strong>Reprogramada</strong> el {reserva.reprogramadaEn || "—"}. Antes:{" "}
            {fechaDMA(reserva.fechaOriginal) || "—"}
            {reserva.turnoOriginal ? ` · ${reserva.turnoOriginal}` : ""}.
          </div>
        )}

        {/* Datos agrupados */}
        <div style={{ ...styles.rejilla, ...(isMobile ? styles.rejillaMobile : {}) }}>
          <section style={styles.tarjeta}>
            <h2 style={styles.tarjetaTitulo}>Cliente</h2>
            {dato("Nombre", reserva.nombre, <EtiquetaInvitado invitado={reserva.invitado} />)}
            {dato(
              "Teléfono",
              reserva.telefono ? (
                <a href={`tel:${reserva.telefono}`} style={styles.enlace}>
                  {reserva.telefono}
                </a>
              ) : (
                ""
              ),
              reserva.telefono ? (
                <a
                  href={urlWhatsApp(reserva.telefono)}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.botonWhatsApp}
                >
                  WhatsApp
                </a>
              ) : null
            )}
            {dato(
              "Email",
              reserva.email ? (
                <a href={`mailto:${reserva.email}`} style={styles.enlace}>
                  {reserva.email}
                </a>
              ) : (
                ""
              )
            )}
          </section>

          <section style={styles.tarjeta}>
            <h2 style={styles.tarjetaTitulo}>Pago</h2>
            {precioProducto &&
              !precioTarjeta &&
              dato(
                precioProducto.tipo === "bono" ? "Pagado por el bono" : "Pagado por el taller",
                `${precioProducto.importe} €`
              )}
            {dato(
              "Precio por plaza",
              precioTarjeta
                ? `${precioTarjeta.unitario} € · con tarjeta regalo`
                : sinCobro
                ? textoIncluido
                : `${reserva.precioUnitario} €`
            )}
            {dato(
              "Precio total",
              precioTarjeta
                ? `${precioTarjeta.total} € · con tarjeta regalo`
                : sinCobro
                ? textoIncluido
                : `${reserva.precioTotal} €`
            )}
            {dato("Fecha de pago", fechaHoraLegible(reserva.timestamp))}
            {dato(
              "Origen",
              origen.detalle ? `${origen.etiqueta} · ${origen.detalle}` : origen.etiqueta
            )}
            {dato("Desde tarjeta regalo", reserva.desdeTarjeta ? "Sí" : "No")}
          </section>

          <section style={{ ...styles.tarjeta, ...(isMobile ? {} : styles.tarjetaAncha) }}>
            <h2 style={styles.tarjetaTitulo}>Datos técnicos</h2>
            <div style={{ ...styles.rejillaDatos, ...(isMobile ? styles.rejillaDatosMobile : {}) }}>
              {dato("Order ID", reserva.orderId)}
              {dato("Procesado", reserva.procesado ? "Sí" : "No")}
              {dato(
                "Usuario (UID)",
                reserva.uid ? (
                  <span
                    style={styles.uidLink}
                    onClick={() => navigate(`/admin-detalle-usuario?uid=${reserva.uid}`)}
                  >
                    {reserva.uid}
                  </span>
                ) : (
                  ""
                )
              )}
            </div>
          </section>
        </div>

        {/* Reprogramar */}
        <section style={styles.bloque}>
          <h2 style={styles.bloqueTitulo}>Reprogramar reserva</h2>
          <p style={styles.bloqueAyuda}>
            Elige un día en el calendario y, después, el turno. Los días en rojo están cerrados y los
            grises no se imparten.
          </p>

          {reservaYaCancelada ? (
            <p style={styles.textoError}>
              Esta reserva está cancelada y ya no se puede reprogramar.
            </p>
          ) : (
            <div style={{ ...styles.reprogramarCols, ...(isMobile ? styles.reprogramarColsMobile : {}) }}>
              <div style={styles.calendarioCaja}>
                <CalendarioReserva
                  value={nuevaFecha}
                  onChange={(iso) => {
                    setNuevaFecha(iso);
                    setNuevoTurno("");
                  }}
                  estadoDia={estadoDiaReprogramar}
                />
              </div>

              <div style={styles.reprogramarLado}>
                <p style={styles.ladoTitulo}>
                  {nuevaFecha ? fechaLarga(nuevaFecha) : "Elige un día"}
                </p>

                {nuevaFecha && fechaBloqueadaReprogramacion && (
                  <p style={styles.textoError}>
                    Ese día está bloqueado.
                    {fechaBloqueadaReprogramacion.motivo
                      ? ` Motivo: ${fechaBloqueadaReprogramacion.motivo}.`
                      : ""}
                  </p>
                )}

                {nuevaFecha && !fechaBloqueadaReprogramacion && diaNoDisponibleReprogramacion && (
                  <p style={styles.textoError}>
                    Esta clase no se imparte ese día. Días de clase:{" "}
                    {Object.keys(horariosClase).join(", ") || "—"}.
                  </p>
                )}

                {nuevaFecha && !fechaBloqueadaReprogramacion && !diaNoDisponibleReprogramacion && (
                  <>
                    <p style={styles.ladoEtiqueta}>Turno</p>
                    <div style={styles.turnos}>
                      {turnosDisponiblesReprogramacion.map((turno) => {
                        const activo = normalizarTurnoParaRuta(nuevoTurno) === turno;
                        return (
                          <button
                            key={turno}
                            type="button"
                            onClick={() => setNuevoTurno(turno)}
                            aria-pressed={activo}
                            style={{ ...styles.turnoBoton, ...(activo ? styles.turnoBotonActivo : {}) }}
                          >
                            {turno}
                          </button>
                        );
                      })}
                    </div>

                    <p style={faltaSitio ? styles.textoError : styles.textoVacio}>
                      {!nuevoTurno ? (
                        "Elige un turno para ver las plazas libres."
                      ) : plazasDisponiblesReprogramacion === null ? (
                        "Comprobando plazas libres..."
                      ) : (
                        <>
                          Plazas libres en ese turno: <strong>{plazasDisponiblesReprogramacion}</strong>
                          {usaTorno(reserva) ? " (contando los tornos)" : ""}
                          {faltaSitio ? ` (esta reserva necesita ${plazasReserva})` : ""}
                        </>
                      )}
                    </p>
                  </>
                )}

                {hayCambiosReales && nuevaFecha && nuevoTurno && (
                  <div style={styles.cambio}>
                    <span style={styles.cambioAntes}>
                      {fechaDMA(reserva.fecha)} · {reserva.turno}
                    </span>
                    <span style={styles.cambioFlecha}><Icono nombre="derecha" /></span>
                    <span style={styles.cambioDespues}>
                      {fechaDMA(nuevaFecha)} · {normalizarTurnoParaRuta(nuevoTurno)}
                    </span>
                  </div>
                )}

                <p style={styles.textoVacio}>
                  Al confirmar, la reserva se mueve y también se actualiza en el perfil del usuario.
                </p>

                <button
                  onClick={guardarReprogramacion}
                  style={{
                    ...styles.botonPrincipal,
                    opacity: reprogramacionValida ? 1 : 0.5,
                    cursor: reprogramacionValida ? "pointer" : "not-allowed",
                  }}
                  disabled={!reprogramacionValida || guardandoReprogramacion}
                >
                  {guardandoReprogramacion ? "Guardando cambio..." : "Confirmar reprogramación"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Notas */}
        <section style={styles.bloque}>
          <h2 style={styles.bloqueTitulo}>Notas internas</h2>

          {notasInternas.length > 0 ? (
            notasInternas.map((nota) => (
              <div key={nota.id} style={styles.notaItem}>
                <div style={{ ...styles.notaHeader, ...(isMobile ? styles.notaHeaderMobile : {}) }}>
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
            rows={3}
          />

          <button onClick={guardarNotaInterna} style={styles.botonSecundario} disabled={guardandoNota}>
            {guardandoNota ? "Guardando..." : "Guardar nota"}
          </button>
        </section>

        {/* Cancelar, al final y aparte */}
        <section style={styles.zonaPeligro}>
          <h2 style={{ ...styles.bloqueTitulo, color: "#8a3b3b" }}>Cancelar reserva</h2>

          {reservaYaCancelada ? (
            <>
              <p style={styles.textoError}>
                Esta reserva ya está cancelada
                {reserva.cancelacionEstudio ? "." : " y no se puede volver a reservar."}
              </p>
              {reserva.cancelacionEstudio && (
                <>
                  <p style={styles.bloqueAyuda}>
                    Código para volver a reservar: <strong>{formatearCodigoReserva(reserva.codigoReserva)}</strong>
                    {reserva.recuperableHasta ? ` · hasta el ${fechaDMA(reserva.recuperableHasta)}` : ""}
                    {reserva.recuperada ? " · ya usado." : "."}
                    {reserva.correoCancelacionEnviadoEn
                      ? " Correo de cancelación enviado."
                      : " Todavía no se ha enviado el correo de cancelación."}
                  </p>
                  {!reserva.recuperada && (
                    <button
                      onClick={enviarCorreoDeCancelacion}
                      style={styles.botonSecundario}
                      disabled={enviandoCorreo}
                    >
                      {enviandoCorreo
                        ? "Enviando..."
                        : reserva.correoCancelacionEnviadoEn
                        ? "Reenviar correo al cliente"
                        : "Enviar correo al cliente"}
                    </button>
                  )}
                  {!reserva.recuperada && (
                    <button
                      onClick={quitarReprogramacion}
                      style={{ ...styles.botonSecundario, marginLeft: 8 }}
                      disabled={quitandoReprogramacion}
                    >
                      {quitandoReprogramacion ? "Guardando..." : "Quitar la opción de volver a reservar"}
                    </button>
                  )}
                </>
              )}
              {!reserva.cancelacionEstudio && (
                <button
                  onClick={permitirVolverAReservar}
                  style={{ ...styles.botonSecundario, marginRight: 8 }}
                  disabled={quitandoReprogramacion}
                >
                  {quitandoReprogramacion ? "Guardando..." : "Permitir volver a reservar"}
                </button>
              )}
              {!reserva.cancelacionEstudio && (
                <button
                  onClick={enviarCorreoDeCancelacion}
                  style={styles.botonSecundario}
                  disabled={enviandoCorreo}
                >
                  {enviandoCorreo
                    ? "Enviando..."
                    : reserva.correoCancelacionEnviadoEn
                    ? "Reenviar correo de cancelación"
                    : "Enviar correo de cancelación"}
                </button>
              )}
            </>
          ) : (
            <>
              <p style={styles.bloqueAyuda}>
                La reserva no se borra: queda guardada como cancelada en admin y en el perfil del
                usuario.
              </p>
              <label style={styles.label} htmlFor="motivo-cancelacion">
                Motivo (opcional)
              </label>
              <textarea
                id="motivo-cancelacion"
                value={motivoCancelacion}
                onChange={(e) => setMotivoCancelacion(e.target.value)}
                placeholder="Escribe aquí el motivo si quieres dejarlo registrado..."
                style={styles.textarea}
                rows={2}
              />
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "8px 0 4px", fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={permitirReprogramar}
                  onChange={(e) => setPermitirReprogramar(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  Permitir que el cliente vuelva a reservar con su código, sin coste, durante 6 meses.
                  Si lo desmarcas, la reserva queda cancelada del todo.
                </span>
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "8px 0 12px", fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={avisarPorCorreo}
                  onChange={(e) => setAvisarPorCorreo(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>
                  Avisar al cliente por correo, con el motivo
                  {permitirReprogramar ? " y su código para volver a reservar." : "."}
                </span>
              </label>
              <button
                onClick={cancelarReserva}
                style={styles.botonCancelar}
                disabled={guardandoCancelacion}
              >
                {guardandoCancelacion ? "Cancelando reserva..." : "Cancelar reserva"}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

const formatearCodigoReserva = (codigo = "") => {
  const limpio = String(codigo || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return limpio.length === 8 ? `${limpio.slice(0, 4)}-${limpio.slice(4)}` : limpio || "—";
};

const styles = {
  // Sin fondo propio ni alto mínimo: la página ya va dentro de PageContainer y se ve el fondo de la app
  body: { padding: 0 },
  bodyMobile: { padding: 0 },
  container: {
    maxWidth: 920,
    margin: "0 auto",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
    boxSizing: "border-box",
  },
  containerMobile: { width: "100%", maxWidth: "100%", borderRadius: 16, padding: 14 },

  // Cabecera
  cabecera: { margin: "6px 0 16px" },
  cabeceraEtiqueta: {
    margin: 0,
    fontSize: "0.8rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#9a8a6a",
  },
  titulo: { margin: "4px 0 10px", fontSize: "1.7rem", color: "#3f3128", lineHeight: 1.2 },
  tituloMobile: { fontSize: "1.35rem" },
  chips: { display: "flex", gap: 8, flexWrap: "wrap" },
  chip: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 999,
    fontSize: "0.8rem",
    fontWeight: 700,
    textTransform: "capitalize",
  },
  chip_verde: { color: "#2f6b2f", backgroundColor: "#e0f0dc" },
  chip_ambar: { color: "#8a5a00", backgroundColor: "#fdebc8" },
  chip_rojo: { color: "#a02828", backgroundColor: "#fbdcdc" },
  chip_azul: { color: "#27557f", backgroundColor: "#dcebf8" },

  // Resumen
  resumen: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1.2fr 0.8fr",
    gap: 12,
    padding: 16,
    backgroundColor: "#fdfaf5",
    border: "1px solid #eadfd2",
    borderRadius: 16,
  },
  resumenMobile: { gridTemplateColumns: "1fr 1fr", padding: 12 },
  resumenBloque: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  resumenEtiqueta: { fontSize: "0.75rem", fontWeight: 700, color: "#9a8a6a", textTransform: "uppercase" },
  resumenValor: { fontSize: "1.02rem", fontWeight: 700, color: "#3f3128" },

  // Avisos
  aviso: { marginTop: 12, padding: "10px 14px", borderRadius: 12, fontSize: "0.92rem", lineHeight: 1.4 },
  avisoRojo: { backgroundColor: "#fff1f1", border: "1px solid #f0cccc", color: "#8a3b3b" },
  avisoAzul: { backgroundColor: "#eef6fd", border: "1px solid #cfe2f3", color: "#27557f" },

  // Tarjetas de datos
  rejilla: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 },
  rejillaMobile: { gridTemplateColumns: "1fr" },
  tarjeta: {
    padding: 16,
    border: "1px solid #eee",
    borderRadius: 16,
    backgroundColor: "#fff",
    minWidth: 0,
  },
  tarjetaAncha: { gridColumn: "1 / -1" },
  tarjetaTitulo: { margin: "0 0 10px", fontSize: "0.95rem", color: "#7c5c2e", textTransform: "uppercase", letterSpacing: "0.04em" },
  dato: { display: "flex", flexDirection: "column", gap: 2, padding: "7px 0", borderTop: "1px solid #f4f0e6", minWidth: 0 },
  datoEtiqueta: { fontSize: "0.78rem", color: "#9a8a6a", fontWeight: 600 },
  datoValor: { fontSize: "0.97rem", color: "#333", wordBreak: "break-word" },
  rejillaDatos: { display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12 },
  rejillaDatosMobile: { gridTemplateColumns: "1fr" },
  enlace: { color: "#7c5c2e", textDecoration: "underline" },
  botonWhatsApp: {
    alignSelf: "flex-start",
    marginTop: 4,
    padding: "4px 12px",
    borderRadius: 999,
    backgroundColor: "#e4f7e9",
    border: "1px solid #b9e3c4",
    color: "#1f6b3a",
    fontSize: "0.82rem",
    fontWeight: 700,
    textDecoration: "none",
  },
  uidLink: { color: "#7c5c2e", cursor: "pointer", textDecoration: "underline", fontSize: "0.9rem" },
  linkClase: { color: "#3f3128", cursor: "pointer", textDecoration: "underline", textDecorationColor: "#d8c89f" },

  // Bloques de acción
  bloque: {
    marginTop: 22,
    padding: 18,
    backgroundColor: "#fdfaf5",
    border: "1px solid #eadfd2",
    borderRadius: 16,
  },
  bloqueTitulo: { margin: "0 0 4px", color: "#3f3128", fontSize: "1.15rem" },
  bloqueAyuda: { margin: "0 0 14px", color: "#7a6a4f", fontSize: "0.9rem", lineHeight: 1.4 },

  reprogramarCols: { display: "grid", gridTemplateColumns: "minmax(0, 360px) minmax(0, 1fr)", gap: 24, alignItems: "start" },
  reprogramarColsMobile: { gridTemplateColumns: "1fr", gap: 16 },
  calendarioCaja: { padding: 12, backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 14 },
  reprogramarLado: { display: "flex", flexDirection: "column", gap: 10, minWidth: 0 },
  ladoTitulo: { margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#3f3128" },
  ladoEtiqueta: { margin: "4px 0 0", fontSize: "0.78rem", fontWeight: 700, color: "#9a8a6a", textTransform: "uppercase" },
  turnos: { display: "flex", flexWrap: "wrap", gap: 8 },
  turnoBoton: {
    padding: "9px 14px",
    borderRadius: 12,
    border: "1px solid #d8c89f",
    backgroundColor: "#fff",
    color: "#3f3128",
    fontWeight: 700,
    fontSize: "0.92rem",
    cursor: "pointer",
  },
  turnoBotonActivo: { backgroundColor: "#b36a4a", borderColor: "#b36a4a", boxShadow: "0 0 0 2px #b36a4a55",
    color: "#ffffff",
  },
  cambio: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 12,
    backgroundColor: "#fff",
    border: "1px dashed #d8c89f",
    fontSize: "0.92rem",
  },
  cambioAntes: { color: "#8a8a8a", textDecoration: "line-through" },
  cambioFlecha: { color: "#9a8a6a" },
  cambioDespues: { color: "#3f3128", fontWeight: 700 },

  botonPrincipal: {
    marginTop: 4,
    padding: "12px 16px",
    border: "1px solid #b36a4a",
    backgroundColor: "#b36a4a",
    borderRadius: 12,
    fontWeight: 700,
    color: "#ffffff",
    fontSize: "0.95rem",
  },
  botonSecundario: {
    marginTop: 10,
    padding: "10px 14px",
    border: "1px solid #eadfd2",
    backgroundColor: "#fff6d6",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    color: "#3f3128",
  },

  // Notas
  notaItem: { marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #eee" },
  notaHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  notaHeaderMobile: { flexDirection: "column", alignItems: "stretch" },
  notaTexto: { margin: 0, color: "#333", whiteSpace: "pre-wrap" },
  notaFecha: { margin: "4px 0 0 0", fontSize: "0.82rem", color: "#777" },
  textoVacio: { color: "#777", fontStyle: "italic", fontSize: "0.88rem", margin: 0 },
  textoError: { color: "#b33a3a", fontWeight: 500, margin: 0, fontSize: "0.92rem" },
  textarea: {
    width: "100%",
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    border: "1px solid #ddd",
    fontSize: "0.95rem",
    resize: "vertical",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  label: { fontSize: "0.9rem", fontWeight: 600, color: "#3f3128" },
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

  // Cancelar
  zonaPeligro: {
    marginTop: 22,
    padding: 18,
    backgroundColor: "#fff5f5",
    border: "1px solid #f0cccc",
    borderRadius: 16,
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

  mensaje: { textAlign: "center", padding: 40 },
};

export default AdminDetalleReservaNuevo;
