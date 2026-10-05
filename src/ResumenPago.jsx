import React, { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { ref, set, get, update, push } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import { simularPagoAdmin } from "./utils/pagoAdmin";

/* ----------------- Utilidades ----------------- */
function normalize(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEuro(n) {
  const v = Number(String(n ?? "").replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

function getUnitPrice(clase = "", metodo = "") {
  const c = normalize(clase);
  const m = normalize(metodo);
  const isTorno = m === "torno";

  const BASICO = new Set(["basico esencial", "básico esencial"]);
  const CREATIVO_PLUS = new Set(["creativo plus"]);
  const EDICION_PREMIUM = new Set(["edicion premium", "edición premium"]);
  const FUNDAMENTAL_MINI = new Set(["fundamental mini"]);
  const EXPRESS_CONTINUO = new Set([
    "expres continuo",
    "exprés continuo",
    "express continuo",
  ]);
  const ESPECIAL_PINTA = new Set([
  "especial pinta tu pieza de ceramica",
  "especial pinta tu pieza de cerámica",
]);

const PINTA = new Set([
  "pinta tu pieza de ceramica",
  "pinta tu pieza de cerámica",
  "pinta tu pieza",
]);
  const CREA_PIEZA = new Set([
    "crea tu pieza favorita",
    "crea tu pieza favorita desde cero",
  ]);
  const TEARIUM = new Set(["tearum", "tea rium", "tearium"]);
  const THE_CLUB = new Set(["the club"]);
  const BONO2 = new Set([
    "bono 2 clases",
    "2 clases 4h/mes",
    "2 clases de 4h al mes",
    "dos clases 4h/mes",
  ]);
  const BONO4 = new Set([
    "bono 4 clases",
    "4 clases 3h/mes",
    "4 clases de 3h al mes",
    "cuatro clases 3h/mes",
  ]);
  const TORNO_INTENSIVO = new Set([
    "torno intensivo individual (1 dia)",
    "torno intensivo individual 1 dia",
    "torno intensivo individual 1 dio",
    "torno intensivo individual (1 dia/dio)",
  ]);

  if (BASICO.has(c)) return 45;
  if (CREATIVO_PLUS.has(c)) return 55;
  if (EDICION_PREMIUM.has(c)) return 65;
  if (FUNDAMENTAL_MINI.has(c)) return 35;

  if (EXPRESS_CONTINUO.has(c)) {
    return isTorno ? 32 : 27;
  }

  if (ESPECIAL_PINTA.has(c)) return 35;
if (PINTA.has(c)) return 25;
  if (CREA_PIEZA.has(c)) return 45;
  if (TEARIUM.has(c)) return 25;
  if (THE_CLUB.has(c)) return 25;
  if (BONO2.has(c)) return 70;

  if (BONO4.has(c)) {
    return isTorno ? 84 : 79;
  }

  if (TORNO_INTENSIVO.has(c)) return 85;

  return 0;
}

/* ----------------- Componente ----------------- */
export default function ResumenPago() {
  const { state = {} } = useLocation();
  const navigate = useNavigate();

  const {
    desdeTarjeta,
    desdeTarjetaRegalo,
    desdeCompraTarjeta,
    tipo,
    clase,
    claseId,
    subtipo,
    datosBono,
    tipoPieza,
    tipoTaller,
    rutaReserva,
    requiereMetodo,
    requiereTipoPieza,
    precio,
    fecha,
    fechaInicio,
    fechaFinMes,
    fechaCaducidadBono,
    turno,
    metodo,
    modalidad,
    plazas,
    numeroClases,
    duracionClase,
    incluyeDecoracion,
    orderId: orderIdFromState,
    payMethod: payMethodFromState,
    codigoTarjeta,
    tarjetaRegaloId,
  } = state;

  const plazasNum = Number(plazas) > 0 ? Number(plazas) : 1;

  const unitFromTable = useMemo(() => getUnitPrice(clase, metodo), [clase, metodo]);

  const totalEuros = useMemo(() => {
    const desdeState = parseEuro(precio);
    if (desdeState > 0) return desdeState;
    return unitFromTable * plazasNum;
  }, [precio, unitFromTable, plazasNum]);

  const showUnit = unitFromTable > 0 && plazasNum > 1;

  const ORIGIN =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://app.lapurisimaconchi.com";

  const URL_OK = new URL("/pago/exito", ORIGIN).toString();
  const URL_KO = new URL("/pago/error", ORIGIN).toString();
  const URL_NOTIFY = new URL("/api/notificacionTPV", ORIGIN).toString();

  const [aceptaPoliticas, setAceptaPoliticas] = useState(false);
  const [cargando, setCargando] = useState(false);

  function makeOrderId(base) {
    let oid = String(base ?? Date.now());
    oid = oid.replace(/\D/g, "");
    if (oid.length < 4) oid = (Date.now() % 1e12).toString();
    oid = oid.padStart(12, "0").slice(-12);
    if (!/^\d/.test(oid)) oid = "9" + oid.slice(1);
    return oid;
  }

  function irAPasarela({ precio, orderId, payMethod = "card" }) {
    const amountCents = Math.max(1, Math.round(Number(precio) * 100));
    const oid = makeOrderId(orderId);

    const qs = new URLSearchParams({
      orderId: oid,
      amountCents: String(amountCents),
      okUrl: URL_OK,
      koUrl: URL_KO,
      notifyUrl: URL_NOTIFY,
      payMethod,
    });

    window.location.href = `/api/crear-sesion?${qs.toString()}`;
  }

  async function crearPedidoPendiente({ orderId, uid }) {
    const pedido = {
  orderId,
  uid,
  desdeTarjeta: !!desdeTarjeta,
  desdeTarjetaRegalo: !!desdeTarjetaRegalo,
  desdeCompraTarjeta: !!desdeCompraTarjeta,
  tipo: tipo || "reserva",
  esBono: tipo === "bono",
  datosBono: datosBono || null,
  clase: clase || "",
  claseId: claseId || "",
  tipoTaller: tipoTaller || "",
  subtipo: subtipo || "",
  tipoPieza: tipoPieza || "",
  rutaReserva: rutaReserva || "",
  requiereMetodo: !!requiereMetodo,
  requiereTipoPieza: !!requiereTipoPieza,
  precioTotal: totalEuros,
  precioOriginal: precio || "",
  fecha: fecha || "",
  fechaInicio: fechaInicio || "",
  fechaFinMes: fechaFinMes || "",
  fechaCaducidadBono: fechaCaducidadBono || "",
  turno: turno || "",
  metodo: metodo || "",
  modalidad: modalidad || "",
  plazas: plazasNum,
  numeroClases: numeroClases || 0,
  duracionClase: duracionClase || "",
  incluyeDecoracion: !!incluyeDecoracion,
  payMethod: payMethodFromState || "card",
  estadoPago: "pendiente",
  procesado: false,
  creadoEn: new Date().toISOString(),
};

    await set(ref(dbRealtime, `pedidosPendientes/${orderId}`), pedido);
  }

  async function guardarReservaEnPerfilUsuario(uid, reserva) {
    const listaRef = ref(dbRealtime, `usuarios/${uid}/listaReservas`);
    const listaSnap = await get(listaRef);

    let yaExiste = false;

    if (listaSnap.exists()) {
      listaSnap.forEach((itemSnap) => {
        const item = itemSnap.val();
        if (item?.orderId === reserva.orderId) {
          yaExiste = true;
        }
      });
    }

    if (!yaExiste) {
      await push(listaRef, reserva);
    }

    const userRef = ref(dbRealtime, `usuarios/${uid}`);
    const userSnap = await get(userRef);

    if (userSnap.exists()) {
      const datos = userSnap.val() || {};
      const totalActual = Number(datos.reservas) || 0;
      await update(userRef, {
        reservas: totalActual + 1,
      });
    }
  }

  async function confirmarReservaConTarjeta(uid) {
    const orderId = orderIdFromState;

    if (!orderId) {
      throw new Error("Falta el identificador de la reserva.");
    }

    const reservasRef = ref(dbRealtime, "reservas");
    const snapshot = await get(reservasRef);

    if (!snapshot.exists()) {
      throw new Error("No se ha encontrado la reserva a confirmar.");
    }

    let encontrada = null;
    const updates = {};

    snapshot.forEach((nivel1Snap) => {
      nivel1Snap.forEach((nivel2Snap) => {
        nivel2Snap.forEach((nivel3Snap) => {
          nivel3Snap.forEach((nivel4Snap) => {
            const valorNivel4 = nivel4Snap.val();

            // Caso anidado con push key final
            if (valorNivel4 && typeof valorNivel4 === "object") {
              Object.entries(valorNivel4).forEach(([childKey, childValue]) => {
                if (childValue?.orderId === orderId) {
                  const rutaBase = `reservas/${nivel1Snap.key}/${nivel2Snap.key}/${nivel3Snap.key}/${nivel4Snap.key}/${childKey}`;

                  updates[`${rutaBase}/estadoPago`] = "pagado";
                  updates[`${rutaBase}/estado`] = "Confirmada";
                  updates[`${rutaBase}/procesado`] = true;
                  updates[`${rutaBase}/desdeTarjeta`] = true;
                  updates[`${rutaBase}/codigoTarjeta`] = codigoTarjeta || "";
                  updates[`${rutaBase}/actualizadoEn`] = new Date().toISOString();

                  encontrada = {
                    ...childValue,
                    uid,
                    estadoPago: "pagado",
                    estado: "Confirmada",
                    procesado: true,
                    desdeTarjeta: true,
                    codigoTarjeta: codigoTarjeta || "",
                    actualizadoEn: new Date().toISOString(),
                  };
                }
              });
            }

            // Caso directo sin push extra
            if (valorNivel4?.orderId === orderId) {
              const rutaBase = `reservas/${nivel1Snap.key}/${nivel2Snap.key}/${nivel3Snap.key}/${nivel4Snap.key}`;

              updates[`${rutaBase}/estadoPago`] = "pagado";
              updates[`${rutaBase}/estado`] = "Confirmada";
              updates[`${rutaBase}/procesado`] = true;
              updates[`${rutaBase}/desdeTarjeta`] = true;
              updates[`${rutaBase}/codigoTarjeta`] = codigoTarjeta || "";
              updates[`${rutaBase}/actualizadoEn`] = new Date().toISOString();

              encontrada = {
                ...valorNivel4,
                uid,
                estadoPago: "pagado",
                estado: "Confirmada",
                procesado: true,
                desdeTarjeta: true,
                codigoTarjeta: codigoTarjeta || "",
                actualizadoEn: new Date().toISOString(),
              };
            }
          });
        });
      });
    });

    if (!encontrada) {
      throw new Error("No se ha encontrado la reserva creada para esta tarjeta regalo.");
    }

    await update(ref(dbRealtime), updates);

        if (tarjetaRegaloId) {
      const ahora = new Date().toISOString();

      const datosActualizacionTarjeta = {
        usado: true,
        fechaUso: ahora,
        usadoPorUID: uid,
        canjeado: true,
        canjeadoPorUID: uid,
        estadoCanje: "usada",
        actualizadoEn: ahora,
      };

      await update(ref(dbRealtime, `tarjetasRegalo/${tarjetaRegaloId}`), datosActualizacionTarjeta);
      await update(ref(dbRealtime, `usuarios/${uid}/tarjetasRegalo/${tarjetaRegaloId}`), datosActualizacionTarjeta);
    }

    await guardarReservaEnPerfilUsuario(uid, {
      clase: encontrada.clase || clase || "",
      claseId: encontrada.claseId || claseId || "",
      fecha: encontrada.fecha || fecha || "",
      turno: encontrada.turno || turno || "",
      metodo: encontrada.metodo || metodo || "",
      plazas: Number(encontrada.plazas || plazasNum || 1),
      precio: 0,
      precioUnitario: 0,
      precioTotal: 0,
      estado: "Confirmada",
      estadoPago: "pagado",
      orderId,
      timestamp: encontrada.timestamp || new Date().toISOString(),
      actualizadoEn: new Date().toISOString(),
      desdeTarjeta: true,
      codigoTarjeta: codigoTarjeta || "",
      nombreTipoClase: encontrada.nombreTipoClase || subtipo || "",
      tipoClase: encontrada.tipoClase || tipoPieza || "",
    });
  }

  async function handleConfirmarPago() {
    if (!aceptaPoliticas) return;

    const auth = getAuth();

    if (!auth.currentUser) {
      alert("Debes iniciar sesión.");
      return;
    }

    if (desdeTarjeta || desdeTarjetaRegalo) {
      try {
        setCargando(true);
        await confirmarReservaConTarjeta(auth.currentUser.uid);
        navigate("/pago/exito");
      } catch (error) {
        console.error("Error al confirmar la reserva con tarjeta regalo:", error);
        alert(error?.message || "No se pudo confirmar la reserva con la tarjeta regalo.");
      } finally {
        setCargando(false);
      }
      return;
    }

    if (!(totalEuros > 0)) {
      alert("No se ha podido calcular el precio.");
      return;
    }

    try {
      setCargando(true);

      const orderId = orderIdFromState || makeOrderId(Date.now());

      await crearPedidoPendiente({
        orderId,
        uid: auth.currentUser.uid,
      });

      if (await simularPagoAdmin(orderId)) {
        navigate("/pago/exito", {
          state: { pagoSimuladoPorAdministrador: true, orderId },
        });
        return;
      }

      irAPasarela({
        precio: totalEuros,
        orderId,
        payMethod: payMethodFromState || "card",
      });
    } catch (error) {
      console.error("Error al crear pedido pendiente:", error);
      alert(error?.message || "No se pudo preparar el pago.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="bg-[#fffef4] min-h-screen flex items-center justify-center px-4 py-6">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6 text-[#333] text-center">
        <BotonVolver />

        <h1 className="text-[1.6rem] text-[#3b3025] font-semibold mb-4">
          Resumen del pago
        </h1>

        <p className="mb-2">
          <strong>Clase:</strong> {clase || (desdeCompraTarjeta ? "Tarjeta regalo" : "-")}
        </p>

        {subtipo && (
          <p className="mb-2">
            <strong>Opción:</strong> {subtipo}
          </p>
        )}

        <p className="mb-2">
          <strong>Fecha:</strong> {fecha || fechaInicio || "-"}
        </p>

        <p className="mb-2">
          <strong>Turno:</strong> {turno || "-"}
        </p>

       <p className="mb-2">
  <strong>Modalidad:</strong> {tipo === "grupo" ? "Reserva para grupo" : (metodo || modalidad || "-")}
</p>

        <p className="mb-2">
          <strong>Plazas:</strong> {plazasNum}
        </p>

        {showUnit && (
          <p className="mb-1">
            <strong>Precio unitario:</strong> {unitFromTable.toFixed(2)} €
          </p>
        )}

        <p className="mb-4">
          <strong>Precio total:</strong>{" "}
          {desdeTarjeta || desdeTarjetaRegalo ? "0.00 €" : totalEuros > 0 ? (
            `${totalEuros.toFixed(2)} €`
          ) : (
            <span className="text-red-600">— falta precio —</span>
          )}
        </p>

        <div className="text-sm text-gray-700 text-left mb-4">
          <label className="flex items-start">
            <input
              type="checkbox"
              className="mr-2 mt-1"
              checked={aceptaPoliticas}
              onChange={(e) => setAceptaPoliticas(e.target.checked)}
            />
            <span>
              He leído y acepto las{" "}
              <span
                className="text-red-500 underline cursor-pointer"
                onClick={() => navigate("/condiciones-pago")}
              >
                Condiciones de Uso
              </span>
              ,{" "}
              <span
                className="text-red-500 underline cursor-pointer"
                onClick={() => navigate("/politicacancelacion")}
              >
                Política de Cancelación
              </span>{" "}
              y{" "}
              <span
                className="text-red-500 underline cursor-pointer"
                onClick={() => navigate("/politica-piezas")}
              >
                Política sobre roturas de piezas
              </span>
              .
            </span>
          </label>
        </div>

        <button
          onClick={handleConfirmarPago}
          disabled={
            !aceptaPoliticas ||
            (!(desdeTarjeta || desdeTarjetaRegalo) && !(totalEuros > 0)) ||
            cargando
          }
          className={`w-full py-2 px-4 rounded-xl font-bold mb-4 ${
            aceptaPoliticas &&
            ((desdeTarjeta || desdeTarjetaRegalo) || totalEuros > 0) &&
            !cargando
              ? "bg-yellow-600 hover:bg-yellow-500 text-white"
              : "bg-gray-400 text-white cursor-not-allowed"
          }`}
        >
          {cargando
            ? "Procesando..."
            : desdeTarjeta || desdeTarjetaRegalo
            ? "Confirmar reserva"
            : desdeCompraTarjeta
            ? "Ir al pago"
            : "Confirmar pago"}
        </button>
      </div>
    </div>
  );
}