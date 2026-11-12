// src/ReservaMonografico.jsx
// Reserva de un taller monográfico (clases/{id} con monografico: true): el cliente
// elige una edición y se reservan todas sus sesiones de una vez, con un solo pago.
// Las plazas son las del espacio (aforo y torno comunes a todos los talleres) y
// el servidor las comprueba al reservar (api/codigo-reserva.js, tipo "reservar").
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get, push, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import BloqueoReserva from "./BloqueoReserva";
import PantallaReserva from "./components/PantallaReserva";
import BotonConfirmarReserva from "./components/BotonConfirmarReserva";
import DatosContactoInvitado from "./components/DatosContactoInvitado";
import { useContextoReserva } from "./utils/turnosTaller";
import { cargarFranjas } from "./utils/disponibilidad";
import { plazasLibresFranja, sumarSolapadas } from "./utils/aforo";
import { bloqueoAfectaTurno } from "./utils/rangosHora";
import { edicionesReservables } from "./utils/monografico";
import { fechaDMA, hoyMadrid } from "./utils/formatoFecha";
import { reservarEnServidor } from "./utils/reservaServidor";
import { plazasDeTarjetaRegalo } from "./utils/tarjetasRegalo";
import { pedirCorreoReserva } from "./utils/correoReserva";
import { useConfigEspacio } from "./configuracionEspacio";

export default function ReservaMonografico({ claseId, clase }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { config: configEspacio } = useConfigEspacio();
  const { fechasBloqueadas, error: errorContexto, cargado: contextoCargado } = useContextoReserva();

  const [franjas, setFranjas] = useState(null);
  const [errorPlazas, setErrorPlazas] = useState(false);
  const [edicionId, setEdicionId] = useState("");
  const [plazas, setPlazas] = useState(1);
  const [user, setUser] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [pidiendoDatos, setPidiendoDatos] = useState(false);
  const resolverDatos = useRef(null);

  const desdeTarjeta =
    location.state?.desdeTarjeta || location.state?.desdeTarjetaRegalo || false;
  const codigoTarjeta = location.state?.codigoTarjeta || "";
  const tarjetaRegaloId = location.state?.tarjetaRegaloId || "";
  const plazasTarjeta = desdeTarjeta ? plazasDeTarjetaRegalo(location.state) : 0;

  const nombreClase = clase.nombre || "Taller monográfico";
  const precioUnitario = Number(clase.precio || 0);
  const ediciones = useMemo(() => edicionesReservables(clase, hoyMadrid()), [clase]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), setUser);
    return () => unsubscribe();
  }, []);

  const cargarPlazas = () =>
    cargarFranjas()
      .then((datos) => {
        setFranjas(datos);
        setErrorPlazas(false);
      })
      .catch((error) => {
        console.error("Error al contar plazas:", error);
        setErrorPlazas(true);
      });

  useEffect(() => {
    cargarPlazas();
  }, []);

  // Plazas libres de cada edición: las de la sesión más justa, sin sesiones bloqueadas
  const infoEdiciones = useMemo(() => {
    const limites = {
      aforoTotal: franjas?.aforoTotal ?? configEspacio.aforoTotal,
      maxTorno: franjas?.maxTorno ?? configEspacio.maxTorno,
    };

    return Object.fromEntries(
      ediciones.map((edicion) => {
        const bloqueada = edicion.fechas.some((f) =>
          bloqueoAfectaTurno(fechasBloqueadas?.[f.fecha], f.turno)
        );
        const libres = Math.min(
          ...edicion.fechas.map(
            (f) =>
              plazasLibresFranja(sumarSolapadas(franjas?.franjas?.[f.fecha], f.turno), limites, {
                conTorno: f.torno === true,
              }).reservables
          )
        );
        return [edicion.id, { bloqueada, libres }];
      })
    );
  }, [ediciones, franjas, fechasBloqueadas, configEspacio]);

  const edicion = ediciones.find((e) => e.id === edicionId) || null;
  const info = edicion ? infoEdiciones[edicion.id] : null;
  const plazasDisponibles = edicion && info && !info.bloqueada ? info.libres : 0;
  const plazasNum = plazasTarjeta || (Number(plazas) > 0 ? Number(plazas) : 1);
  const precioTotal = precioUnitario * plazasNum;
  const puedeElegirPlazas = !!edicion && !!franjas && plazasDisponibles > 0;

  const elegirEdicion = (id) => {
    setEdicionId(id);
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

    if (errorContexto || errorPlazas || !franjas) {
      alert("No se ha podido comprobar la disponibilidad. Recarga la página e inténtalo de nuevo.");
      return;
    }
    if (!edicion) {
      alert("Elige una edición.");
      return;
    }
    if (info?.bloqueada) {
      alert("Esa edición no está disponible porque alguna de sus sesiones está cerrada.");
      return;
    }
    if (plazasDisponibles <= 0 || plazasNum > plazasDisponibles) {
      alert(
        plazasTarjeta > 1
          ? `Tu tarjeta regalo es para ${plazasTarjeta} personas y en esta edición no quedan plazas suficientes.`
          : "No hay suficientes plazas disponibles en esta edición."
      );
      return;
    }
    if (!(precioUnitario > 0) && !desdeTarjeta) {
      alert("No se ha podido calcular el precio del taller.");
      return;
    }
    if (desdeTarjeta && !tarjetaRegaloId) {
      alert("No se ha encontrado la tarjeta regalo asociada.");
      return;
    }

    let usuario = user || getAuth().currentUser;
    if (!usuario) {
      usuario = await pedirDatosInvitado();
      if (!usuario) return;
    }

    setGuardando(true);

    try {
      const orderId = Date.now().toString().slice(-12);
      const timestamp = new Date().toISOString();
      const primera = edicion.fechas[0];

      const reserva = {
        clase: nombreClase,
        claseId,
        tipoTaller: "monografico",
        fecha: primera.fecha,
        turno: primera.turno,
        metodo: "",
        plazas: plazasNum,
        desdeTarjeta,
        precio: precioTotal,
        precioUnitario,
        precioTotal,
        estado: "Pendiente",
        estadoPago: "pendiente",
        orderId,
        timestamp,
      };

      // El servidor comprueba el aforo de todas las sesiones y guarda las plazas mientras
      // se paga. En desarrollo, sin la función desplegada, se escribe directamente.
      let creadas;
      try {
        ({ reservas: creadas } = await reservarEnServidor(
          claseId,
          [{ fecha: primera.fecha, turno: primera.turno, metodo: "", plazas: plazasNum, reserva }],
          { edicionId: edicion.id }
        ));
      } catch (errorServidor) {
        if (!errorServidor.sinServidor) throw errorServidor;
        console.warn("Sin función de reserva en el servidor: se escribe directamente (solo desarrollo).");
        creadas = [];
        for (const [indice, dia] of edicion.fechas.entries()) {
          const nueva = push(ref(dbRealtime, `reservas/${clase.reservasPath || claseId}/${dia.fecha}/${dia.turno}`));
          await update(nueva, {
            uid: usuario.uid,
            ...reserva,
            fecha: dia.fecha,
            turno: dia.turno,
            edicionId: edicion.id,
            incluyeTorno: dia.torno === true,
            sesionEdicion: indice + 1,
            sesionesEdicion: edicion.fechas.length,
            fechasEdicion: edicion.fechas,
          });
          creadas.push({ ruta: nueva.toString().replace(/^.*?\/\/[^/]+\//, ""), id: nueva.key });
        }
      }

      const resumen = {
        clase: nombreClase,
        claseId,
        fecha: primera.fecha,
        turno: primera.turno,
        metodo: "",
        plazas: plazasNum,
        orderId,
      };

      if (desdeTarjeta) {
        await Promise.all(
          creadas.map((c) =>
            update(ref(dbRealtime, c.ruta), { estado: "Confirmada", estadoPago: "pagado" })
          )
        );

        await push(ref(dbRealtime, `usuarios/${usuario.uid}/listaReservas`), {
          ...reserva,
          estado: "Confirmada",
          estadoPago: "pagado",
          uid: usuario.uid,
          edicionId: edicion.id,
          fechasEdicion: edicion.fechas,
          tarjetaRegaloId,
          codigoTarjeta,
          creadaDesde: "tarjeta_regalo",
        });

        const tarjetaGlobalRef = ref(dbRealtime, `tarjetasRegalo/${tarjetaRegaloId}`);
        const tarjetaGlobalSnap = await get(tarjetaGlobalRef);
        const uidComprador = tarjetaGlobalSnap.exists() ? tarjetaGlobalSnap.val()?.uidComprador || "" : "";

        const datosTarjeta = {
          canjeado: true,
          usado: true,
          estadoCanje: "canjeado",
          canjeadoPorUID: usuario.uid,
          usadoPorUID: usuario.uid,
          fechaCanje: timestamp,
          fechaUso: timestamp,
          actualizadoEn: timestamp,
          reservaId: creadas[0]?.id || "",
          fechaReserva: primera.fecha,
          turnoReserva: primera.turno,
          metodoReserva: "",
          nombreTipoClaseReserva: "",
        };

        await update(tarjetaGlobalRef, datosTarjeta);
        if (uidComprador) {
          await update(ref(dbRealtime, `usuarios/${uidComprador}/tarjetasRegalo/${tarjetaRegaloId}`), datosTarjeta);
        }

        pedirCorreoReserva(orderId);

        navigate("/pago/exito", {
          state: {
            desdeTarjeta: true,
            ...resumen,
            precio: 0,
            precioUnitario: 0,
            precioTotal: 0,
            codigoTarjeta,
          },
        });
        return;
      }

      navigate("/resumen-pago", {
        state: {
          desdeTarjeta,
          tipo: "clase",
          ...resumen,
          precio: precioTotal,
          precioUnitario,
          precioTotal,
          modalidad: "",
        },
      });
    } catch (err) {
      console.error("Error al guardar la reserva:", err);

      if (err?.codigo) {
        alert(
          err.codigo === "franja_llena" || err.codigo === "torno_lleno"
            ? "Alguna de las sesiones de esta edición se acaba de llenar. Elige otra edición."
            : err.message
        );
        cargarPlazas();
        return;
      }

      const detalle = err?.code || String(err?.message || "").split(":")[0].trim();
      alert(`No se pudo guardar la reserva${detalle ? ` (${detalle})` : ""}.`);
    } finally {
      setGuardando(false);
    }
  };

  const mensajePlazas = !edicion
    ? "Primero elige una edición."
    : info?.bloqueada
    ? "Esta edición no está disponible."
    : !franjas
    ? "Comprobando plazas…"
    : plazasDisponibles <= 0
    ? "No quedan plazas en esta edición."
    : `Máximo ${plazasDisponibles} plazas disponibles.`;

  return (
    <PantallaReserva ancho="max-w-2xl">
      <h1 className="text-center text-2xl text-[#5c3c00] font-serif mb-4">Reserva – {nombreClase}</h1>

      {desdeTarjeta && (
        <p className="text-sm text-green-700 text-center font-medium mb-4">
          Estás usando una tarjeta regalo 🎁
          {plazasTarjeta > 1 ? ` para ${plazasTarjeta} personas` : ""}
        </p>
      )}

      <BloqueoReserva permitirVisitante>
        {(errorContexto || errorPlazas) && (
          <p className="text-sm text-red-600 text-center mb-4">
            No se ha podido comprobar la disponibilidad. Recarga la página e inténtalo de nuevo.
          </p>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6">
          <fieldset>
            <legend className="block font-bold text-sm mb-2">Elige la edición</legend>
            <p className="text-xs text-gray-500 mb-3">
              Se reservan todas las sesiones de la edición. Solo se puede reservar antes de que
              empiece.
            </p>

            {!contextoCargado || !ediciones.length ? (
              <p className="text-sm text-gray-600">
                {contextoCargado ? "No hay ediciones abiertas ahora mismo." : "Cargando…"}
              </p>
            ) : (
              <div className="grid gap-3">
                {ediciones.map((ed, indice) => {
                  const datos = infoEdiciones[ed.id];
                  const sinPlazas = !!franjas && (datos.bloqueada || datos.libres <= 0);

                  return (
                    <label
                      key={ed.id}
                      className={`block rounded-xl border p-3 cursor-pointer text-sm ${
                        edicionId === ed.id
                          ? "border-[#E5B92F] bg-[#fff6d6]"
                          : "border-gray-300 bg-white hover:bg-[#fffaf0]"
                      } ${sinPlazas ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <input
                        type="radio"
                        name="edicion"
                        className="mr-2"
                        value={ed.id}
                        checked={edicionId === ed.id}
                        disabled={sinPlazas}
                        onChange={() => elegirEdicion(ed.id)}
                      />
                      <strong>Edición {indice + 1}</strong>
                      {sinPlazas && <span className="ml-2 text-red-600 font-medium">Completa</span>}
                      <ul className="mt-1 ml-6 list-disc text-gray-700">
                        {ed.fechas.map((f) => (
                          <li key={`${f.fecha}-${f.turno}`}>
                            {fechaDMA(f.fecha)} · {f.turno.replace("-", " – ")}{f.torno ? " · torno" : ""}
                          </li>
                        ))}
                      </ul>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <div>
            <label className="block font-bold text-sm mb-2">
              {plazasTarjeta ? "Plazas de tu tarjeta regalo" : "¿Cuántas plazas deseas reservar?"}
            </label>

            <div className="flex items-center justify-between border border-gray-300 rounded-xl px-3 py-2">
              <button
                type="button"
                onClick={() => setPlazas(Math.max(1, plazasNum - 1))}
                disabled={!puedeElegirPlazas || !!plazasTarjeta}
                className="text-xl font-bold px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                −
              </button>
              <span className="text-lg font-semibold">{puedeElegirPlazas || plazasTarjeta ? plazasNum : "—"}</span>
              <button
                type="button"
                onClick={() => setPlazas(Math.min(plazasDisponibles || 1, plazasNum + 1))}
                disabled={!puedeElegirPlazas || !!plazasTarjeta}
                className="text-xl font-bold px-3 py-1 rounded-lg bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-1">{mensajePlazas}</p>
          </div>

          <div className="bg-[#fffaf0] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00]">
            <p>
              <strong>Precio por persona (curso completo):</strong>{" "}
              {desdeTarjeta ? "Tarjeta regalo" : `${precioUnitario}€`}
            </p>
            <p>
              <strong>Precio total:</strong> {desdeTarjeta ? "0€" : `${precioTotal}€`}
            </p>
          </div>

          <BotonConfirmarReserva
            guardando={guardando}
            desdeTarjeta={desdeTarjeta}
            deshabilitado={
              errorContexto ||
              errorPlazas ||
              !franjas ||
              !edicion ||
              !!info?.bloqueada ||
              plazasNum > plazasDisponibles ||
              plazasDisponibles <= 0 ||
              (!desdeTarjeta && !(precioUnitario > 0))
            }
          />
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
