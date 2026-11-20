// src/ReservaTallerDinamico.jsx
// Reserva de un taller gestionado desde el panel admin (clases/{id} con
// dinamica: true), sean talleres nuevos o de los de siempre ya migrados.
// Sigue el mismo flujo que las reservas de siempre: reservas/{ruta}/...
// con estado Pendiente → /resumen-pago → Redsys, o confirmada con tarjeta regalo.
// Los bonos tienen su propia pantalla (ReservaBonoDinamico).
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Icono from "./components/Icono";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get, push, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import { cargarFranja } from "./utils/disponibilidad";
import { plazasLibresFranja } from "./utils/aforo";
import { reservarEnServidor } from "./utils/reservaServidor";
import { plazasDeTarjetaRegalo } from "./utils/tarjetasRegalo";
import {
  esTurnoConsulta,
  estadoDiaTaller,
  useContextoReserva,
  useDiaDeReserva,
} from "./utils/turnosTaller";
import {
  estadoPublico,
  metodosDelTaller,
  minPersonasHabilitar,
  variantesDelTaller,
} from "./catalogoTalleres";
import BloqueoReserva from "./BloqueoReserva";
import PantallaReserva from "./components/PantallaReserva";
import SelectorDiaReserva from "./components/SelectorDiaReserva";
import SelectorTurnoReserva from "./components/SelectorTurnoReserva";
import SesionExtraReserva from "./components/SesionExtraReserva";
import { diasEntreSesionesDe, fechaMinimaSiguiente, sesionesDeTaller, sumarDias, textoDias } from "./utils/sesionesTaller";
import BotonConfirmarReserva from "./components/BotonConfirmarReserva";
import DatosContactoInvitado from "./components/DatosContactoInvitado";
import ReservaBonoDinamico from "./ReservaBonoDinamico";
import ReservaMonografico from "./ReservaMonografico";
import { esMonografico } from "./utils/monografico";

import { fechaDMA } from "./utils/formatoFecha";
import { useConfigEspacio } from "./configuracionEspacio";
import { canjearTarjetaRegalo, mensajeErrorCanje } from "./utils/canjeServidor";

export default function ReservaTallerDinamico() {
  const { claseId } = useParams();
  const [estado, setEstado] = useState({ cargando: true, clase: null });

  useEffect(() => {
    let cancelado = false;

    get(ref(dbRealtime, `clases/${claseId}`))
      .then((snap) => {
        const datos = snap.exists() ? snap.val() : null;
        if (!cancelado) {
          setEstado({ cargando: false, clase: datos?.dinamica ? datos : null });
        }
      })
      .catch((error) => {
        console.error("Error al cargar configuración de la clase:", error);
        if (!cancelado) setEstado({ cargando: false, clase: null });
      });

    return () => {
      cancelado = true;
    };
  }, [claseId]);

  const { cargando, clase } = estado;

  if (cargando) {
    return (
      <PantallaReserva>
        <p className="text-center text-tinta-suave py-8">
          Cargando configuración del taller...
        </p>
      </PantallaReserva>
    );
  }

  if (!clase || estadoPublico(clase) !== "activa") {
    return (
      <PantallaReserva>
        <p className="text-center text-red-600 py-8">
          Este taller no está disponible para reservar ahora mismo.
        </p>
      </PantallaReserva>
    );
  }

  if (esMonografico(clase)) return <ReservaMonografico claseId={claseId} clase={clase} />;

  return clase.tipoProducto === "bono" ? (
    <ReservaBonoDinamico claseId={claseId} clase={clase} />
  ) : (
    <FormularioReserva claseId={claseId} clase={clase} />
  );
}

export function FormularioReserva({ claseId, clase }) {
  const navigate = useNavigate();
  const { config: configEspacio } = useConfigEspacio();
  const location = useLocation();
  const {
    fechasBloqueadas,
    fechasHabilitadas,
    reservasGrupos,
    diasAbiertos,
    error: errorContexto,
    cargado: contextoCargado,
  } = useContextoReserva();

  const [fecha, setFecha] = useState("");
  const [turno, setTurno] = useState("");
  const [metodo, setMetodo] = useState("");
  const [varianteId, setVarianteId] = useState("");
  const [plazas, setPlazas] = useState(1);

  // Plazas de la franja (fecha + turno) en todos los talleres y los grupos
  const [franja, setFranja] = useState({ total: 0, torno: 0 });
  const [user, setUser] = useState(null);
  const [guardando, setGuardando] = useState(false);
  // Sin plazas contadas no se sabe si queda sitio: no se deja reservar
  const [errorPlazas, setErrorPlazas] = useState(false);
  // Las plazas se cuentan por turno: hasta tener las del turno elegido no se muestran
  const [plazasListas, setPlazasListas] = useState(false);

  // Datos de contacto de quien reserva sin cuenta: se piden al guardar
  const [pidiendoDatos, setPidiendoDatos] = useState(false);
  const resolverDatos = useRef(null);

  const desdeTarjeta =
    location.state?.desdeTarjeta || location.state?.desdeTarjetaRegalo || false;
  const codigoTarjeta = location.state?.codigoTarjeta || "";
  // Con tarjeta regalo se reservan juntas todas las plazas de la tarjeta
  const plazasTarjeta = desdeTarjeta ? plazasDeTarjetaRegalo(location.state) : 0;

  const metodos = useMemo(() => metodosDelTaller(clase), [clase]);
  const variantes = useMemo(() => variantesDelTaller(clase), [clase]);
  const conMetodo = metodos.length > 0;
  const conVariante = variantes.length > 0;
  const rutaReservas = clase.reservasPath || claseId;
  const sesiones = Number(clase.sesiones || 1);
  // Talleres de varias sesiones: solo se reserva la primera; el resto se reserva más adelante
  const sesionesTotales = sesionesDeTaller(clase);
  const diasEntreSesiones = diasEntreSesionesDe(clase); // uno por hueco entre sesiones
  const modoSesiones = "mas_adelante"; // las sesiones siguientes se reservan después
  const [extras, setExtras] = useState([]); // sesiones 2, 3…: [{ fecha, turno }]
  const [extrasListos, setExtrasListos] = useState({});
  const nombreClase = clase.nombre || "Taller";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), setUser);
    return () => unsubscribe();
  }, []);

  // Tarjeta regalo de una variante concreta (tipo de pieza, tamaño…) o de un
  // método concreto (torno y modelado con distinto precio)
  const varianteTarjeta = useMemo(() => {
    if (!desdeTarjeta || !conVariante) return "";
    const subtipo = String(location.state?.subtipo || "").trim().toLowerCase();
    return (
      variantes.find((v) => v.id === location.state?.tipoPieza)?.id ||
      variantes.find((v) => v.nombre.toLowerCase() === subtipo)?.id ||
      ""
    );
  }, [desdeTarjeta, conVariante, variantes, location.state]);

  const metodoTarjeta = useMemo(() => {
    if (!desdeTarjeta) return "";
    // Tarjeta con método ya elegido (y pagado su extra) junto a la variante
    if (conVariante) {
      return metodos.find((m) => m.id === location.state?.metodo)?.id || "";
    }
    const subtipo = String(location.state?.subtipo || "").trim().toLowerCase();
    return metodos.find((m) => m.nombre.toLowerCase() === subtipo)?.id || "";
  }, [desdeTarjeta, conVariante, location.state, metodos]);

  useEffect(() => {
    if (varianteTarjeta) setVarianteId(varianteTarjeta);
  }, [varianteTarjeta]);

  // Método u opción elegidos en la página del taller (?metodo= / ?variante=)
  const variantePrevia = useMemo(() => {
    const id = new URLSearchParams(location.search).get("variante");
    return variantes.find((v) => v.id === id)?.id || "";
  }, [location.search, variantes]);

  const metodoPrevio = useMemo(() => {
    const id = new URLSearchParams(location.search).get("metodo");
    return metodos.find((m) => m.id === id)?.id || "";
  }, [location.search, metodos]);

  useEffect(() => {
    if (variantePrevia) setVarianteId(variantePrevia);
  }, [variantePrevia]);

  useEffect(() => {
    if (metodoPrevio) setMetodo(metodoPrevio);
  }, [metodoPrevio]);

  useEffect(() => {
    if (metodoTarjeta) setMetodo(metodoTarjeta);
  }, [metodoTarjeta]);

  // Si solo hay un método no hace falta elegirlo
  useEffect(() => {
    if (metodos.length === 1) setMetodo(metodos[0].id);
  }, [metodos]);

  useEffect(() => {
    if (!fecha || !turno) {
      setFranja({ total: 0, torno: 0 });
      setErrorPlazas(false);
      setPlazasListas(false);
      return;
    }

    let cancelado = false;
    setPlazasListas(false);

    cargarFranja(fecha, turno)
      .then((datos) => {
        if (cancelado) return;
        setFranja(datos);
        setErrorPlazas(false);
        setPlazasListas(true);
      })
      .catch((error) => {
        console.error("Error al contar plazas:", error);
        if (!cancelado) setErrorPlazas(true);
      });

    return () => {
      cancelado = true;
    };
  }, [fecha, turno]);

  const {
    turnosDisponibles,
    fechaHabilitadaManual,
    fechaBloqueada,
    diaNoDisponible,
    diaSoloGrupo,
  } =
    useDiaDeReserva({
      clase,
      fecha,
      fechasBloqueadas,
      fechasHabilitadas,
      conGrupo: true,
      diasAbiertos,
    });

  const turnoConsulta = esTurnoConsulta(turnosDisponibles);

  // «Horario a consultar»: único turno, se elige solo
  useEffect(() => {
    if (turnoConsulta) {
      setTurno(turnosDisponibles[0]);
    } else if (turno && !turnosDisponibles.includes(turno)) {
      setTurno("");
    }
  }, [turnoConsulta, turnosDisponibles, turno]);

  // Plazas que quedan en la franja: el aforo total es común a todos los talleres
  // y las plazas de torno tienen su propio tope
  const limitesEspacio = {
    aforoTotal: franja.aforoTotal ?? configEspacio.aforoTotal,
    maxTorno: franja.maxTorno ?? configEspacio.maxTorno,
  };
  const disponiblesDe = (conTorno) =>
    plazasLibresFranja(franja, limitesEspacio, { conTorno }).reservables;

  const plazasDisponibles = conMetodo
    ? metodo
      ? disponiblesDe(metodo === "torno")
      : 0
    : disponiblesDe(false);

  const variante = variantes.find((v) => v.id === varianteId) || null;
  const metodoElegido = metodos.find((m) => m.id === metodo) || null;

  // Con variantes, el método elegido puede sumar un extra (torno, modelado a mano)
  const extraMetodo = conVariante ? metodoElegido?.extra || 0 : 0;

  const precioUnitario = conVariante
    ? (variante?.precio || 0) + extraMetodo
    : conMetodo
    ? metodoElegido?.precio || 0
    : Number(clase.precio || 0);

  const plazasNum = plazasTarjeta || (Number(plazas) > 0 ? Number(plazas) : 1);
  const precioTotal = precioUnitario * plazasNum;
  const nombreMetodo = metodoElegido?.nombre || "";

  const marcarExtraListo = useCallback((numero, lista) => {
    setExtrasListos((previos) => (previos[numero] === lista ? previos : { ...previos, [numero]: lista }));
  }, []);

  const todasLasSesiones = sesionesTotales > 1 && modoSesiones === "todas";
  const extraDe = (i) => extras[i] || { fecha: "", turno: "" };
  const cambiarExtra = (i, valor) =>
    // Al cambiar una sesión se borran las siguientes: dependen de su fecha
    setExtras((previas) => [...previas.slice(0, i), valor]);

  const handleVarianteChange = (valor) => {
    setVarianteId(valor);
    setTurno("");
    setPlazas(1);
  };

  const estadoDia = (iso) =>
    estadoDiaTaller({ clase, fecha: iso, fechasBloqueadas, fechasHabilitadas, conGrupo: true, diasAbiertos });

  const handleFechaChange = (iso) => {
    setFecha(iso);
    setExtras([]);
    if (!metodoTarjeta && !metodoPrevio && metodos.length !== 1) setMetodo("");
    setTurno("");
    setPlazas(1);
  };

  // El turno se conserva: los turnos no dependen del método, y así quien ve que su
  // método está completo puede cambiarlo sin volver a elegir el turno
  const handleMetodoChange = (valor) => {
    setMetodo(valor);
    setPlazas(1);
  };

  const pedirDatosInvitado = () =>
    new Promise((resolve) => {
      resolverDatos.current = resolve;
      setPidiendoDatos(true);
    });

  const cerrarDatosInvitado = (usuario) => {
    setPidiendoDatos(false);
    resolverDatos.current?.(usuario || null);
    resolverDatos.current = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (errorContexto || errorPlazas) {
      alert("No se ha podido comprobar la disponibilidad. Recarga la página e inténtalo de nuevo.");
      return;
    }

    if (!fecha || !turno || (conMetodo && !metodo) || (conVariante && !varianteId)) {
      alert("Selecciona todas las opciones, la fecha y el turno.");
      return;
    }

    if (fechaBloqueada) {
      alert(
        `No se puede reservar el día ${fechaDMA(fecha)}. Motivo: ${
          fechaBloqueada.motivo || "día bloqueado"
        }.`
      );
      return;
    }

    if (diaNoDisponible) {
      alert("Este taller no se imparte el día seleccionado.");
      return;
    }

    if (plazasDisponibles <= 0 || plazasNum > plazasDisponibles) {
      alert(
        plazasTarjeta > 1
          ? `Tu tarjeta regalo es para ${plazasTarjeta} personas y en este turno no quedan plazas suficientes. Prueba otro día o turno.`
          : "No hay suficientes plazas disponibles."
      );
      return;
    }

    if (!(precioUnitario > 0) && !desdeTarjeta) {
      alert("No se ha podido calcular el precio del taller.");
      return;
    }

    if (desdeTarjeta && !codigoTarjeta) {
      alert("No se ha encontrado la tarjeta regalo asociada.");
      return;
    }

    // Taller de varias sesiones reservadas de una vez: todas tienen que estar elegidas y con plazas
    if (todasLasSesiones) {
      const completas = Array.from({ length: sesionesTotales - 1 }, (_, i) => extraDe(i)).every(
        (x) => x.fecha && x.turno
      );
      if (!completas) {
        alert(`Elige el día y el turno de las ${sesionesTotales} sesiones.`);
        return;
      }
      if (!Array.from({ length: sesionesTotales - 1 }, (_, i) => extrasListos[i + 2]).every(Boolean)) {
        alert("Alguna de las sesiones no tiene plazas suficientes. Revisa los días elegidos.");
        return;
      }
    }

    // Sin sesión se piden los datos de contacto ahora; la cuenta de invitado se
    // abre al enviarlos, no al entrar en la pantalla
    let usuario = user || getAuth().currentUser;
    if (!usuario) {
      usuario = await pedirDatosInvitado();
      if (!usuario) return;
    }

    setGuardando(true);

    try {
      const orderId = Date.now().toString().slice(-12);
      const timestamp = new Date().toISOString();
      const campoVariante = clase.variante?.campo || "tipoPieza";
      const campoNombreVariante = clase.variante?.campoNombre || "nombreTipoPieza";

      const reserva = {
        clase: nombreClase,
        claseId,
        tipoTaller: sesiones > 1 ? "dos_sesiones" : clase.grupo || "",
        fecha,
        turno,
        metodo: conMetodo ? metodo : "",
        ...(conMetodo && !conVariante ? { nombreTipoClase: nombreMetodo } : {}),
        ...(conVariante
          ? { [campoVariante]: varianteId, [campoNombreVariante]: variante.nombre }
          : {}),
        plazas: plazasNum,
        desdeTarjeta,
        precio: precioTotal,
        precioUnitario,
        precioTotal,
        estado: "Pendiente",
        estadoPago: "pendiente",
        orderId,
        timestamp,
        ...(sesiones > 1 && !todasLasSesiones
          ? {
              fechaPrimeraSesion: fecha,
              segundaSesion: {
                habilitada: false,
                fechaDisponible: sumarDias(fecha, diasEntreSesiones[0]),
                reservada: false,
                fechaReserva: null,
              },
            }
          : {}),
      };

      // Las sesiones que se reservan ahora (una sola, salvo «todas las sesiones»)
      const sesionesElegidas = todasLasSesiones
        ? [{ fecha, turno }, ...Array.from({ length: sesionesTotales - 1 }, (_, i) => extraDe(i))]
        : [{ fecha, turno }];

      // Con varias, cada sesión es una reserva con el mismo pedido; el precio va en la primera
      const reservaDeSesion = (sesion, indice) =>
        todasLasSesiones
          ? {
              ...reserva,
              fecha: sesion.fecha,
              turno: sesion.turno,
              sesionCurso: indice + 1,
              sesionesCurso: sesionesTotales,
              fechasSesiones: sesionesElegidas,
              ...(indice > 0 ? { precio: 0, precioUnitario: 0, precioTotal: 0, precioEnSesion1: true } : {}),
            }
          : reserva;

      const carpetaDe = (sesion) =>
        conMetodo
          ? `reservas/${rutaReservas}/${sesion.fecha}/${sesion.turno}/${metodo}`
          : `reservas/${rutaReservas}/${sesion.fecha}/${sesion.turno}`;

      // El servidor comprueba el aforo y reserva la plaza mientras se paga. En
      // desarrollo, si la función aún no está desplegada, se escribe directamente.
      let creadas;
      try {
        ({ reservas: creadas } = await reservarEnServidor(
          claseId,
          sesionesElegidas.map((sesion, indice) => ({
            fecha: sesion.fecha,
            turno: sesion.turno,
            metodo: reserva.metodo,
            plazas: plazasNum,
            reserva: reservaDeSesion(sesion, indice),
          }))
        ));
      } catch (errorServidor) {
        if (!errorServidor.sinServidor) throw errorServidor;
        console.warn("Sin función de reserva en el servidor: se escribe directamente (solo desarrollo).");
        creadas = [];
        for (const [indice, sesion] of sesionesElegidas.entries()) {
          const nueva = push(ref(dbRealtime, carpetaDe(sesion)));
          await update(nueva, { uid: usuario.uid, ...reservaDeSesion(sesion, indice) });
          creadas.push({ ruta: nueva.toString().replace(/^.*?\/\/[^/]+\//, ""), id: nueva.key });
        }
      }
      // Con tarjeta regalo el servidor confirma la reserva (todas sus sesiones), marca
      // la tarjeta usada y envía el correo
      if (desdeTarjeta) {
        try {
          await canjearTarjetaRegalo({ codigo: codigoTarjeta, orderId });
        } catch (errorCanje) {
          alert(mensajeErrorCanje(errorCanje));
          return;
        }

        navigate("/pago/exito", {
          state: {
            desdeTarjeta: true,
            clase: nombreClase,
            claseId,
            ...(conVariante ? { subtipo: variante.nombre, tipoPieza: varianteId } : {}),
            fecha,
            turno,
            metodo: reserva.metodo,
            plazas: plazasNum,
            precio: 0,
            precioUnitario: 0,
            precioTotal: 0,
            codigoTarjeta,
            orderId,
          },
        });
        return;
      }

      navigate("/resumen-pago", {
        state: {
          desdeTarjeta,
          tipo: "clase",
          clase: nombreClase,
          claseId,
          ...(conVariante ? { subtipo: variante.nombre, tipoPieza: varianteId } : {}),
          precio: precioTotal,
          precioUnitario,
          precioTotal,
          fecha,
          turno,
          metodo: reserva.metodo,
          modalidad: nombreMetodo,
          plazas: plazasNum,
          orderId,
          ...(todasLasSesiones ? { sesiones: sesionesElegidas } : {}),
        },
      });
    } catch (err) {
      console.error("Error al guardar la reserva:", err);

      // El servidor rechaza la reserva con un motivo claro (franja llena, día cerrado…)
      if (err?.codigo) {
        alert(
          err.codigo === "franja_llena" || err.codigo === "torno_lleno"
            ? "Esa franja se acaba de llenar. Elige otro turno u otro día."
            : err.message
        );
        cargarFranja(fecha, turno).then(setFranja).catch(() => {});
        return;
      }

      const detalle = err?.code || String(err?.message || "").split(":")[0].trim();
      alert(`No se pudo guardar la reserva${detalle ? ` (${detalle})` : ""}.`);
    } finally {
      setGuardando(false);
    }
  };

  // Un día de solo grupo pide el mínimo de personas del taller (habilitar un día);
  // con el mínimo global de grupo se sugiere reservar como grupo
  const minHabilitar = minPersonasHabilitar(clase);
  const minGrupo = configEspacio.minPersonasGrupo;
  const faltanPersonasGrupo = diaSoloGrupo && plazasNum < minHabilitar;
  const avisarMinimo = faltanPersonasGrupo && !!turno;
  const mostrarSugerencia = !desdeTarjeta && plazasNum >= minGrupo;
  const parametrosGrupo = new URLSearchParams({ taller: claseId, personas: String(plazasNum) });
  if (conVariante && varianteId) parametrosGrupo.set("variante", varianteId);
  if (conMetodo && !conVariante && metodo) parametrosGrupo.set("metodo", metodo);
  const destinoGrupo = `/reserva-grupos?${parametrosGrupo.toString()}`;

  // Lo elegido en la página del taller (o en la tarjeta regalo) no se puede cambiar aquí
  const varianteFija = !!(variantePrevia || varianteTarjeta);
  const metodoFijo = !!(metodoPrevio || metodoTarjeta || metodos.length === 1);

  const eleccionesPrevias = (!conVariante || !!varianteId) && (!conMetodo || !!metodo);
  const puedeElegirMetodo =
    !!fecha && !fechaBloqueada && !diaNoDisponible && !metodoTarjeta && (!conVariante || !!varianteId);
  const puedeElegirTurno =
    !!fecha && eleccionesPrevias && !fechaBloqueada && !diaNoDisponible;
  const puedeElegirPlazas = puedeElegirTurno && !!turno && plazasListas && plazasDisponibles > 0;

  // Sin plazas en el método elegido: si otro método tiene sitio en este turno se
  // dice, pero no se cambia solo (el precio puede ser distinto)
  const alternativas =
    conMetodo && metodo
      ? metodos
          .filter((m) => m.id !== metodo)
          .map((m) => ({ nombre: m.nombre, quedan: disponiblesDe(m.id === "torno") }))
          .filter((m) => m.quedan > 0)
      : [];

  const avisoSinPlazas = alternativas.length
    ? `No quedan plazas de ${(metodoElegido?.nombre || "este método").toLowerCase()} en este turno. ` +
      `Quedan ${alternativas
        .map((m) => `${m.quedan} de ${m.nombre.toLowerCase()}`)
        .join(" y ")}: cámbialo en «Método» o elige otro turno.`
    : "No quedan plazas en este turno. Prueba con otro turno o con otro día.";

  const mensajePrevio = !fecha
    ? "Primero selecciona el día."
    : conVariante && !varianteId
    ? "Primero elige una opción."
    : conMetodo && !metodo
    ? "Primero selecciona el método."
    : !turno
    ? "Primero selecciona el turno."
    : diaNoDisponible
    ? "No hay plazas porque este taller no se imparte ese día."
    : !plazasListas
    ? "Comprobando plazas…"
    : plazasDisponibles <= 0
    ? "No quedan plazas disponibles."
    : ""; // las plazas que quedan se avisan arriba, y solo cuando son pocas

  return (
    <PantallaReserva ancho="max-w-4xl">
      <h1 className="text-center font-serif text-tinta mb-4">
        <span className="block text-sm font-sans font-semibold uppercase tracking-wider text-terracota">
          Reserva
        </span>
        <span className="block text-3xl md:text-4xl font-bold leading-tight mt-1">
          {nombreClase}
        </span>
      </h1>

      {desdeTarjeta && (
        <p className="text-sm text-green-700 text-center font-medium mb-4">
          Estás usando una tarjeta regalo <Icono nombre="regalo" />
          {plazasTarjeta > 1 ? ` para ${plazasTarjeta} personas` : ""}
        </p>
      )}

      <BloqueoReserva permitirVisitante>
        {(errorContexto || errorPlazas) && (
          <p className="text-sm text-red-600 text-center mb-4">
            No se ha podido comprobar la disponibilidad. Recarga la página e
            inténtalo de nuevo.
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2 md:gap-x-10">
          {sesiones > 1 && (
            <div className="md:col-span-2 bg-crema border border-linea rounded-xl p-3 text-sm text-tinta">
              <p>
                <strong>Incluye {sesiones} sesiones.</strong>
              </p>
              <p>
                La primera sesión se reserva ahora. Las siguientes se habilitan a partir de{" "}
                {textoDias(diasEntreSesiones[0])} después de la primera, y antes deberás contactar con el
                taller para confirmar que todo está listo para la siguiente sesión.
              </p>
            </div>
          )}

          {/* Izquierda: qué y cuándo (opción y día) */}
          <div className="space-y-4">
          {((conVariante && varianteFija && variante) || (conMetodo && metodoFijo && metodoElegido)) && (
            <div className="rounded-lg border border-linea bg-crema px-3 py-2 text-sm text-tinta space-y-1">
              {conVariante && varianteFija && variante && (
                <p>
                  <strong>{clase.variante?.etiqueta || "Opción"}:</strong> {variante.nombre} — {variante.precio}€
                </p>
              )}
              {conMetodo && metodoFijo && metodoElegido && (
                <p>
                  <strong>Método:</strong> {metodoElegido.nombre}
                  {!conVariante && metodoElegido.precio > 0 ? ` — ${metodoElegido.precio}€` : ""}
                  {conVariante && metodoElegido.extra > 0 ? ` (+${metodoElegido.extra}€)` : ""}
                </p>
              )}
            </div>
          )}
          {conVariante && !varianteFija && (
            <div>
              <label htmlFor="variante" className="block font-bold text-sm mb-1">
                {clase.variante?.etiqueta || "Opción"}:
              </label>
              <select
                id="variante"
                value={varianteId}
                onChange={(e) => handleVarianteChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base"
                required
              >
                <option value="">-- Elige una opción --</option>
                {variantes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre} — {v.precio}€
                  </option>
                ))}
              </select>
            </div>
          )}

          <SelectorDiaReserva
            etiqueta={sesiones > 1 ? "Selecciona el día de la primera sesión:" : "Selecciona el día:"}
            value={fecha}
            onChange={handleFechaChange}
            estadoDia={estadoDia}
            cargando={!contextoCargado}
            fechaBloqueada={fechaBloqueada}
            fechaHabilitadaManual={fechaHabilitadaManual}
            diaNoDisponible={diaNoDisponible}
            clase={clase}
            producto="Este taller"
          />

          {todasLasSesiones && !!fecha && !!turno && (
            <div className="space-y-3">
              {Array.from({ length: sesionesTotales - 1 }, (_, i) => i).map((i) => {
                const anterior = i === 0 ? fecha : extraDe(i - 1).fecha;
                if (!anterior || (i > 0 && !extraDe(i - 1).turno)) return null;

                return (
                  <SesionExtraReserva
                    key={`${i}-${anterior}`}
                    numero={i + 2}
                    clase={clase}
                    desde={fechaMinimaSiguiente(anterior, diasEntreSesiones[i])}
                    fecha={extraDe(i).fecha}
                    turno={extraDe(i).turno}
                    onCambiar={(valor) => cambiarExtra(i, valor)}
                    contexto={{ fechasBloqueadas, fechasHabilitadas, reservasGrupos, diasAbiertos }}
                    conTorno={metodo === "torno"}
                    plazas={plazasNum}
                    cargando={!contextoCargado}
                    onListo={marcarExtraListo}
                  />
                );
              })}
            </div>
          )}

          </div>

          {/* Derecha: método, turno, plazas, resumen y pago */}
          <div className="space-y-4">
          {conMetodo && !metodoFijo && (
            <div>
              <label htmlFor="metodo" className="block font-bold text-sm mb-1">
                Método:
              </label>
              <select
                id="metodo"
                value={metodo}
                onChange={(e) => handleMetodoChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base disabled:bg-arena disabled:text-tinta-suave"
                required
                disabled={!puedeElegirMetodo}
              >
                <option value="">
                  {!fecha
                    ? "-- Primero selecciona el día --"
                    : conVariante && !varianteId
                    ? "-- Primero elige una opción --"
                    : diaNoDisponible
                    ? "-- Este taller no está disponible ese día --"
                    : "-- Selecciona método --"}
                </option>
                {metodos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                    {!conVariante && m.precio > 0 ? ` — ${m.precio}€` : ""}
                    {conVariante && m.extra > 0 ? ` (+${m.extra}€)` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <SelectorTurnoReserva
            value={turno}
            onChange={(valor) => {
              setTurno(valor);
              setPlazas(1);
              setExtras([]);
            }}
            turnos={turnosDisponibles}
            deshabilitado={!puedeElegirTurno}
            placeholder={
              !fecha
                ? "-- Primero selecciona el día --"
                : conVariante && !varianteId
                ? "-- Primero elige una opción --"
                : conMetodo && !metodo
                ? "-- Primero selecciona el método --"
                : diaNoDisponible
                ? "-- No hay turnos para este día --"
                : "-- Elige turno --"
            }
          />

          {puedeElegirTurno && !!turno && plazasListas && plazasDisponibles > 0 && plazasDisponibles <= 10 && (
            <p className="text-sm text-tinta font-medium">
              {plazasDisponibles <= 5
                ? `Quedan ${plazasDisponibles} ${plazasDisponibles === 1 ? "plaza disponible" : "plazas disponibles"}`
                : "Quedan pocas plazas"}
              {conMetodo ? " para este método" : " en este turno"}.
            </p>
          )}

          {puedeElegirTurno && !!turno && plazasListas && plazasDisponibles <= 0 && (
            <p className="text-sm text-red-600 font-medium" role="alert">
              {avisoSinPlazas}
            </p>
          )}

          {/* El aviso de grupo solo aparece al elegir plazas suficientes, con animación */}
          <div>
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              mostrarSugerencia ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
            aria-hidden={!mostrarSugerencia}
            role="status"
          >
            <div className="overflow-hidden">
            <div
              className="text-sm text-tinta bg-mostaza-suave border border-mostaza rounded-xl p-3"
            >
              <strong>
                ¿Venís {plazasNum} personas? Os conviene reservar como grupo
              </strong>
              <p className="mt-1">
                Con {minGrupo} o más personas podéis hacer una reserva de grupo: elegís
                día y turno juntos, hablamos con vosotros para concretar los detalles
                y se paga todo en una sola reserva, en lugar de reservar plazas sueltas.
              </p>
              <button
                type="button"
                onClick={() => navigate(destinoGrupo)}
                tabIndex={mostrarSugerencia ? 0 : -1}
                className="mt-2 w-full px-4 py-2 rounded-full border border-terracota text-terracota font-semibold hover:bg-terracota-suave transition"
              >
                <Icono nombre="usuarios" className="mr-1" />Reservar para grupo
              </button>
            </div>
            </div>
          </div>
          </div>

          <div>
            <label className="block font-bold text-sm mb-2">
              {plazasTarjeta ? "Plazas de tu tarjeta regalo" : "¿Cuántas plazas deseas reservar?"}
            </label>

            <div className="flex items-center justify-between border border-gray-300 rounded-xl px-3 py-2">
              <button
                type="button"
                onClick={() => setPlazas(Math.max(1, plazasNum - 1))}
                disabled={!puedeElegirPlazas || !!plazasTarjeta}
                className="text-xl font-bold px-3 py-1 rounded-lg bg-arena disabled:opacity-50 disabled:cursor-not-allowed"
              >
                −
              </button>

              <span className="text-lg font-semibold">
                {puedeElegirPlazas || plazasTarjeta ? plazasNum : "—"}
              </span>

              <button
                type="button"
                onClick={() => setPlazas(Math.min(plazasDisponibles || 1, plazasNum + 1))}
                disabled={!puedeElegirPlazas || !!plazasTarjeta}
                className="text-xl font-bold px-3 py-1 rounded-lg bg-arena disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>

            <p className="text-xs text-tinta-suave mt-1">{mensajePrevio}</p>
          </div>

          <div className="bg-crema border border-linea rounded-xl p-3 text-sm text-tinta">
            {conVariante && (
              <p>
                <strong>{clase.variante?.etiqueta || "Opción"}:</strong>{" "}
                {variante?.nombre || "—"}
              </p>
            )}
            {conMetodo && (
              <p>
                <strong>Método elegido:</strong> {nombreMetodo || "—"}
              </p>
            )}
            <p>
              <strong>Precio unitario:</strong>{" "}
              {desdeTarjeta ? "Tarjeta regalo" : `${precioUnitario}€`}
            </p>
            <p>
              <strong>Precio total:</strong> {desdeTarjeta ? "0€" : `${precioTotal}€`}
            </p>
          </div>

          {avisarMinimo && (
            <p className="text-sm text-red-600 font-medium">
              Este día está cerrado: para abrirlo hacen falta al menos {minHabilitar} personas (ahora tienes{" "}
              {plazasNum}). Sube las plazas o elige otro día.
            </p>
          )}

          <BotonConfirmarReserva
            guardando={guardando}
            desdeTarjeta={desdeTarjeta}
            deshabilitado={
              errorContexto ||
              errorPlazas ||
              faltanPersonasGrupo ||
              (!!turno && !plazasListas) ||
              !!fechaBloqueada ||
              diaNoDisponible ||
              (conVariante && !varianteId) ||
              (conMetodo && !metodo) ||
              !turno ||
              plazasNum > plazasDisponibles ||
              plazasDisponibles <= 0 ||
              (!desdeTarjeta && !(precioUnitario > 0))
            }
          />
          </div>
        </form>
      </BloqueoReserva>

      {pidiendoDatos && (
        <DatosContactoInvitado
          onListo={cerrarDatosInvitado}
          onCancelar={() => cerrarDatosInvitado(null)}
        />
      )}
    </PantallaReserva>
  );
}
