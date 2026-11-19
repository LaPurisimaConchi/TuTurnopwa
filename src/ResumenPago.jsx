import React, { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import BotonVolver from "./BotonVolver";
import { simularPagoAdmin } from "./utils/pagoAdmin";
import { irAlTPV, prepararPago } from "./utils/pagoServidor";

import { fechaDMA } from "./utils/formatoFecha";
import { canjearTarjetaRegalo, mensajeErrorCanje } from "./utils/canjeServidor";
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
    precio,
    precioUnitario: precioUnitarioState,
    fecha,
    fechaInicio,
    turno,
    metodo,
    modalidad,
    plazas,
    orderId: orderIdFromState,
    codigoTarjeta,
    sesiones: sesionesElegidas,
    opcionId,
    grupoId,
    incluyeCambioTorno,
  } = state;

  const plazasNum = Number(plazas) > 0 ? Number(plazas) : 1;

  const unitFromTable = useMemo(() => {
    const desdeState = parseEuro(precioUnitarioState);
    return desdeState > 0 ? desdeState : getUnitPrice(clase, metodo);
  }, [precioUnitarioState, clase, metodo]);

  const totalEuros = useMemo(() => {
    const desdeState = parseEuro(precio);
    if (desdeState > 0) return desdeState;
    return unitFromTable * plazasNum;
  }, [precio, unitFromTable, plazasNum]);

  // El importe lo calcula el servidor al preparar el pago; si no coincide con el de la
  // pantalla, se enseña el suyo y se pide confirmar otra vez
  const [precioServidor, setPrecioServidor] = useState(null);
  const totalMostrado = precioServidor ?? totalEuros;
  const unitMostrado = precioServidor != null ? precioServidor / plazasNum : unitFromTable;

  const showUnit = unitMostrado > 0 && plazasNum > 1;

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

  // Número de pedido de una compra sin reserva previa (tarjeta regalo): el mismo
  // aunque se pulse otra vez el botón
  const [orderIdNuevo] = useState(() => makeOrderId(Date.now()));

  async function handleConfirmarPago() {
    if (!aceptaPoliticas) return;

    const auth = getAuth();

    if (!auth.currentUser) {
      alert("Debes iniciar sesión.");
      return;
    }

    // Con tarjeta regalo el servidor confirma la reserva pendiente de este pedido,
    // marca la tarjeta usada y envía el correo
    if (desdeTarjeta || desdeTarjetaRegalo) {
      if (!orderIdFromState || !codigoTarjeta) {
        alert("Falta el identificador de la reserva o el código de la tarjeta regalo.");
        return;
      }

      try {
        setCargando(true);
        await canjearTarjetaRegalo({ codigo: codigoTarjeta, orderId: orderIdFromState });
        // Sin pago: la confirmación lo dice y enseña el código de esta reserva
        navigate("/pago/exito", { state: { desdeTarjeta: true, orderId: orderIdFromState } });
      } catch (error) {
        console.error("Error al confirmar la reserva con tarjeta regalo:", error);
        alert(mensajeErrorCanje(error));
      } finally {
        setCargando(false);
      }
      return;
    }

    if (!(totalMostrado > 0)) {
      alert("No se ha podido calcular el precio.");
      return;
    }

    try {
      setCargando(true);

      const orderId = orderIdFromState || orderIdNuevo;

      // El servidor crea el pedido con su importe (el único que se firma para el TPV)
      const tipoPedido = desdeCompraTarjeta
        ? "tarjeta_regalo"
        : tipo === "bono"
        ? "bono"
        : tipo === "grupo"
        ? "grupo"
        : "reserva";
      const preparado = await prepararPago({
        pedido: tipoPedido,
        orderId,
        claseId: claseId || "",
        opcionId: opcionId || "",
        grupoId: grupoId || "",
        plazas: plazasNum,
        fechaInicio: fechaInicio || "",
        turno: turno || "",
        cambioTorno: (incluyeCambioTorno ?? datosBono?.incluyeCambioTorno) === true,
      });

      const totalServidor = Number(preparado.precioTotal);
      if (Math.abs(totalServidor - totalMostrado) > 0.004) {
        setPrecioServidor(totalServidor);
        alert(
          `El precio de este pedido es ${totalServidor.toFixed(2)} €. Revísalo y vuelve a pulsar «Confirmar pago».`
        );
        return;
      }

      if (await simularPagoAdmin(orderId)) {
        navigate("/pago/exito", {
          state: { pagoSimuladoPorAdministrador: true, orderId },
        });
        return;
      }

      irAlTPV(orderId, tipoPedido);
    } catch (error) {
      console.error("Error al preparar el pago:", error);
      alert(error?.message || "No se pudo preparar el pago.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="bg-crema min-h-screen flex items-center justify-center px-4 py-6">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6 text-[#333] text-center">
        <BotonVolver />

        <h1 className="text-[1.6rem] text-tinta font-semibold mb-4">
          Resumen del pago
        </h1>

        {desdeCompraTarjeta && (
          <p className="mb-3 inline-block rounded-full bg-mostaza-suave border border-mostaza px-3 py-1 text-sm font-semibold text-tinta">
            Tarjeta regalo
          </p>
        )}

        <p className="mb-2">
          <strong>{desdeCompraTarjeta ? "Taller que regalas:" : "Clase:"}</strong>{" "}
          {clase || (desdeCompraTarjeta ? "Tarjeta regalo" : "-")}
        </p>

        {subtipo && (
          <p className="mb-2">
            <strong>Opción:</strong> {subtipo}
          </p>
        )}

        {desdeCompraTarjeta ? (
          // Una tarjeta regalo no tiene fecha: la elige quien la recibe al canjearla
          <p className="mb-2 text-sm text-tinta-suave">
            Recibirás un código para regalar. Quien lo reciba elegirá la fecha y el turno
            al canjearlo en la web.
          </p>
        ) : Array.isArray(sesionesElegidas) && sesionesElegidas.length > 1 ? (
          <div className="mb-2">
            <strong>Sesiones:</strong>
            <ul className="mt-1 space-y-0.5">
              {sesionesElegidas.map((sesion, i) => (
                <li key={`${sesion.fecha}-${sesion.turno}`}>
                  {i + 1}. {fechaDMA(sesion.fecha)} · {sesion.turno}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <p className="mb-2">
              <strong>Fecha:</strong> {fechaDMA(fecha || fechaInicio) || "-"}
            </p>

            <p className="mb-2">
              <strong>Turno:</strong> {turno || "-"}
            </p>
          </>
        )}

        {!desdeCompraTarjeta && (
          <p className="mb-2">
            <strong>Modalidad:</strong> {tipo === "grupo" ? "Reserva para grupo" : (metodo || modalidad || "-")}
          </p>
        )}

        <p className="mb-2">
          <strong>Plazas:</strong> {plazasNum}
          {desdeCompraTarjeta && plazasNum > 1 ? " (tarjeta regalo para varias personas)" : ""}
        </p>

        {showUnit && (
          <p className="mb-1">
            <strong>Precio unitario:</strong> {unitMostrado.toFixed(2)} €
          </p>
        )}

        <p className="mb-4">
          <strong>Precio total:</strong>{" "}
          {desdeTarjeta || desdeTarjetaRegalo ? "0.00 €" : totalMostrado > 0 ? (
            `${totalMostrado.toFixed(2)} €`
          ) : (
            <span className="text-red-600">— falta precio —</span>
          )}
        </p>

        <div className="text-sm text-tinta text-left mb-4">
          <label className="flex items-start">
            <input
              type="checkbox"
              className="mr-2 mt-1"
              checked={aceptaPoliticas}
              onChange={(e) => setAceptaPoliticas(e.target.checked)}
            />
            {/* Se abren en otra pestaña: salir de aquí cerraría la compra del invitado */}
            <span>
              He leído y acepto las{" "}
              <a href="/condicionesuso" target="_blank" rel="noopener noreferrer" className="text-red-500 underline">
                Condiciones de Uso
              </a>
              ,{" "}
              <a href="/condiciones-pago" target="_blank" rel="noopener noreferrer" className="text-red-500 underline">
                Condiciones de Pago
              </a>
              ,{" "}
              <a href="/politicacancelacion" target="_blank" rel="noopener noreferrer" className="text-red-500 underline">
                Política de Cancelación
              </a>{" "}
              y{" "}
              <a href="/politica-piezas" target="_blank" rel="noopener noreferrer" className="text-red-500 underline">
                Política sobre roturas de piezas
              </a>
              .
            </span>
          </label>
        </div>

        <button
          onClick={handleConfirmarPago}
          disabled={
            !aceptaPoliticas ||
            (!(desdeTarjeta || desdeTarjetaRegalo) && !(totalMostrado > 0)) ||
            cargando
          }
          className={`w-full py-2 px-4 rounded-xl font-bold mb-4 ${
            aceptaPoliticas &&
            ((desdeTarjeta || desdeTarjetaRegalo) || totalMostrado > 0) &&
            !cargando
              ? "bg-yellow-600 hover:bg-mostaza text-white"
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