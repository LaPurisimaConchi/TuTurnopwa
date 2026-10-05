import React, { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { ref, set } from "firebase/database";
import { dbRealtime } from "./firebase";
import { esAdministrador } from "./utils/administradores";
import { simularPagoAdmin } from "./utils/pagoAdmin";

export default function ResumenPagoTheClub() {
  const location = useLocation();
  const navigate = useNavigate();
  const datos = location.state || {};
  const { payMethod: payMethodFromState } = datos;

  const [aceptaPoliticas, setAceptaPoliticas] = useState(false);
  const [cargando, setCargando] = useState(false);

  const PRECIO_UNITARIO = 25;
  const plazas = Number(datos.plazas) > 0 ? Number(datos.plazas) : 1;

  const totalEuros = useMemo(() => {
    const base = plazas * PRECIO_UNITARIO;
    return Number.isFinite(base) && base > 0 ? base : PRECIO_UNITARIO;
  }, [plazas]);

  const ORIGIN =
    typeof window !== "undefined" ? window.location.origin : "https://app.lapurisimaconchi.com";
  const URL_OK = new URL("/pago/exito", ORIGIN).toString();
  const URL_KO = new URL("/pago/error", ORIGIN).toString();
  const URL_NOTIFY = new URL("/api/notificacionTPV", ORIGIN).toString();

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

  const handlePagar = async () => {
    if (!aceptaPoliticas) return;
    try {
      setCargando(true);
      if (esAdministrador(getAuth().currentUser)) {
        const orderId = String(datos.orderId || Date.now());
        await set(ref(dbRealtime, `pedidosPendientes/${orderId}`), {
          orderId,
          uid: datos.uid,
          tipo: "reserva",
          clase: datos.clase || "",
          claseId: datos.claseId || "",
          fecha: datos.fecha || "",
          turno: datos.turno || "",
          metodo: datos.metodo || "",
          plazas,
          precioTotal: totalEuros,
          estadoPago: "pendiente",
          procesado: false,
          creadoEn: new Date().toISOString(),
        });
        await simularPagoAdmin(orderId);
        navigate("/pago/exito", {
          state: { pagoSimuladoPorAdministrador: true, orderId },
        });
        return;
      }

      irAPasarela({
        precio: totalEuros,
        orderId: Date.now().toString(),
        payMethod: payMethodFromState || "card",
      });
    } catch (error) {
      console.error("Error al procesar el pago de The Club:", error);
      alert(error?.message || "No se pudo preparar el pago.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffef4] p-6">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-serif text-[#5c3c00] mb-4 text-center">
          Resumen de tu reserva en The Club
        </h2>

        <div className="text-gray-800 text-base space-y-2 mb-6">
          <p><strong>Clase:</strong> {datos.clase || "-"}</p>
          <p><strong>Fecha:</strong> {datos.fecha || "-"}</p>
          <p><strong>Turno:</strong> {datos.turno || "-"}</p>
          <p><strong>Plazas:</strong> {plazas}</p>

          {plazas > 1 && (
            <p><strong>Precio unitario:</strong> {PRECIO_UNITARIO.toFixed(2)} €</p>
          )}
          <p>
            <strong>Precio total:</strong>{" "}
            {Number.isFinite(totalEuros) ? `${totalEuros.toFixed(2)} €` : <span className="text-red-600">— falta precio —</span>}
          </p>
        </div>

        <label className="flex items-start mb-4 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mr-2 mt-1"
            checked={aceptaPoliticas}
            onChange={(e) => setAceptaPoliticas(e.target.checked)}
          />
          <span>He leído y acepto las condiciones de pago y políticas del taller.</span>
        </label>

        <button
          onClick={handlePagar}
          disabled={!aceptaPoliticas || cargando}
          className={`w-full py-3 rounded-full font-bold ${
            aceptaPoliticas && !cargando
              ? "bg-[#f4a6b4] hover:bg-[#e78fa0] text-white"
              : "bg-gray-400 text-white cursor-not-allowed"
          }`}
        >
          {cargando ? "Conectando con el banco..." : "Ir al pago seguro"}
        </button>
      </div>
    </div>
  );
}
