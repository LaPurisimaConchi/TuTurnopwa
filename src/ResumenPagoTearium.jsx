import React, { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { ref, set } from "firebase/database";
import { dbRealtime } from "./firebase";
import { esAdministrador } from "./utils/administradores";
import { simularPagoAdmin } from "./utils/pagoAdmin";

export default function ResumenPagoTearium() {
  const location = useLocation();
  const navigate = useNavigate();

  const datos = location.state;

  if (!datos) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>No hay datos de pago disponibles.</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 bg-pink-400 text-white px-4 py-2 rounded"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const {
    fecha,
    turno,
    plazas,
    precioTotal,
    payMethod: payMethodFromState,
  } = datos;

  const [aceptaPoliticas, setAceptaPoliticas] = useState(false);
  const [cargando, setCargando] = useState(false);

  const PRECIO_UNITARIO = 25;
  const plazasNum = Number(plazas) > 0 ? Number(plazas) : 1;

  const totalEuros = useMemo(() => {
    const total = Number(
      String(precioTotal ?? "")
        .replace(/[^\d.,]/g, "")
        .replace(",", ".")
    );
    return Number.isFinite(total) && total > 0
      ? total
      : plazasNum * PRECIO_UNITARIO;
  }, [plazasNum, precioTotal]);

  const ORIGIN =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://app.lapurisimaconchi.com";

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

  async function irAPasarela({ precio, orderId, payMethod = "card" }) {
    const amountCents = Math.max(1, Math.round(Number(precio) * 100));
    const oid = makeOrderId(orderId);

    const qs = new URLSearchParams({
      orderId: oid,
      amountCents: String(amountCents),
      okUrl: URL_OK,
      koUrl: URL_KO,
      notifyUrl: URL_NOTIFY,
      payMethod,
      mode: "json",
    });

    const res = await fetch(`/api/crear-sesion?${qs.toString()}`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) throw new Error(`crear-sesion fallo: ${res.status}`);

    const data = await res.json();

    const form = document.createElement("form");
    form.method = "POST";
    form.action = data.action;
    form.target = "_self";

    const addHidden = (name, value) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    addHidden("Ds_SignatureVersion", data.Ds_SignatureVersion);
    addHidden("Ds_MerchantParameters", data.Ds_MerchantParameters);
    addHidden("Ds_Signature", data.Ds_Signature);

    document.body.appendChild(form);
    form.submit();
  }

  const handleConfirmarPago = async () => {
    if (!aceptaPoliticas || cargando) return;
    try {
      setCargando(true);
      if (esAdministrador(getAuth().currentUser)) {
        const orderId = String(datos.orderId || Date.now());
        await set(ref(dbRealtime, `pedidosPendientes/${orderId}`), {
          orderId,
          uid: datos.uid,
          tipo: "reserva",
          clase: datos.clase || "Pinta tu pieza - Tearium",
          claseId: datos.claseId || "pintatupieza_tearium",
          fecha: datos.fecha || "",
          turno: datos.turno || "",
          metodo: datos.metodo || "general",
          plazas: plazasNum,
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

      await irAPasarela({
        precio: totalEuros,
        orderId: Date.now().toString(),
        payMethod: payMethodFromState || "card",
      });
    } catch (e) {
      console.error(e);
      setCargando(false);
      alert("No se pudo abrir el TPV. Intenta de nuevo en unos segundos.");
    }
  };

  return (
    <div className="p-6 bg-[#fffef4] min-h-screen font-sans text-gray-800">
      <div className="max-w-xl mx-auto bg-white shadow-md rounded-xl p-6 border border-yellow-200">
        <h2 className="text-2xl font-bold text-yellow-800 mb-4 text-center font-serif">
          Resumen de tu reserva
        </h2>

        <p><strong>Lugar:</strong> Tearium</p>
        <p><strong>Fecha:</strong> {fecha || "-"}</p>
        <p><strong>Turno:</strong> {turno || "-"}</p>
        <p><strong>Número de plazas:</strong> {plazasNum}</p>

        {plazasNum > 1 && (
          <p>
            <strong>Precio unitario:</strong> {PRECIO_UNITARIO.toFixed(2)} €
          </p>
        )}

        <p className="mb-4">
          <strong>Precio total:</strong>{" "}
          {Number.isFinite(totalEuros) ? (
            `${totalEuros.toFixed(2)} €`
          ) : (
            <span className="text-red-600">— falta precio —</span>
          )}
        </p>

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
          onClick={handleConfirmarPago}
          disabled={!aceptaPoliticas || cargando}
          className={`w-full py-2 px-4 rounded-lg font-semibold transition ${
            aceptaPoliticas && !cargando
              ? "bg-yellow-500 hover:bg-yellow-600 text-white"
              : "bg-gray-400 text-white cursor-not-allowed"
          }`}
        >
          {cargando ? "Conectando con el banco..." : "Confirmar y pagar"}
        </button>
      </div>
    </div>
  );
}