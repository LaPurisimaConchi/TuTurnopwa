import React, { useState } from "react";
import { avisar } from "../utils/avisos";
import { cancelarTarjetaRegalo } from "../utils/canjeServidor";

const AVISO_CORREO = {
  sin_clave: "El correo no está configurado en este entorno: no se ha enviado.",
  sin_email: "El comprador no tiene email: no se ha enviado el correo.",
  rechazado: "No se ha podido enviar el correo.",
  error: "No se ha podido enviar el correo.",
};

// Ventana para cancelar una tarjeta regalo desde el panel. Si ya está cancelada,
// solo sirve para enviar (o reenviar) el correo de aviso.
const CancelarTarjetaRegalo = ({ tarjeta, onCerrar, onCancelada }) => {
  const [enviarCorreo, setEnviarCorreo] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const yaCancelada = tarjeta.cancelada;

  const confirmar = async () => {
    setEnviando(true);
    setError("");
    try {
      const { correo, email } = await cancelarTarjetaRegalo({
        tarjetaId: tarjeta.id,
        enviarCorreo: yaCancelada || enviarCorreo,
      });
      const base = yaCancelada ? "" : "Tarjeta cancelada. ";
      if (correo === "enviado") avisar(`${base}Correo enviado a ${email}.`, "ok");
      else if (AVISO_CORREO[correo]) avisar(`${base}${AVISO_CORREO[correo]}`, "error");
      else avisar("Tarjeta cancelada.", "ok");
      onCancelada(tarjeta.id);
      onCerrar();
    } catch (e) {
      console.error("Error al cancelar la tarjeta regalo:", e);
      setError(e.message || "No se pudo cancelar la tarjeta regalo.");
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !enviando && onCerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-cancelar-tarjeta"
        className="w-full max-w-md rounded-2xl bg-white p-5 text-left text-tinta shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="titulo-cancelar-tarjeta" className="mb-2 text-lg font-bold">
          {yaCancelada ? "Enviar aviso de cancelación" : "Cancelar tarjeta regalo"}
        </h2>
        <p className="mb-1 text-sm">
          <strong>{tarjeta.codigo || "Sin código"}</strong> · {tarjeta.clase}
        </p>
        <p className="mb-4 text-sm text-tinta-suave">
          {yaCancelada
            ? "Se enviará un correo a quien compró la tarjeta."
            : "El código dejará de poder canjearse. No se puede deshacer desde el panel y no devuelve el dinero."}
        </p>

        {!yaCancelada && (
          <label className="mb-4 flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={enviarCorreo}
              disabled={enviando}
              onChange={(e) => setEnviarCorreo(e.target.checked)}
            />
            <span>Avisar por correo al comprador de que la tarjeta se ha cancelado</span>
          </label>
        )}

        {error && (
          <p role="alert" className="mb-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviando}
            className="rounded-full border border-linea px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={enviando}
            className="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
          >
            {enviando ? "Un momento…" : yaCancelada ? "Enviar correo" : "Cancelar tarjeta"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelarTarjetaRegalo;
