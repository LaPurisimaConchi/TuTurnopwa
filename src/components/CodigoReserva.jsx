// src/components/CodigoReserva.jsx
// Enseña el código de la reserva y cómo usarlo para cambiar la fecha sin iniciar
// sesión. Si la reserva no es de esta sesión o aún no está pagada no enseña nada
// (el aviso del TPV puede tardar unos segundos: se reintenta un momento).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { pedirCodigoReserva } from "../utils/codigoReserva";

const REINTENTOS = 5;
const ESPERA_MS = 3000;

export default function CodigoReserva({ tipo, grupoId, orderId, className = "" }) {
  const [codigo, setCodigo] = useState("");
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!(tipo === "grupo" ? grupoId : orderId)) return undefined;

    let cancelado = false;
    let temporizador = null;

    const cargar = async (intento) => {
      try {
        const valor = await pedirCodigoReserva(tipo === "grupo" ? { tipo, grupoId } : { tipo, orderId });
        if (!cancelado) setCodigo(valor);
      } catch (error) {
        // 404: aún sin pagar o no es suya; se reintenta por si el TPV está tardando
        if (!cancelado && error.status === 404 && intento < REINTENTOS) {
          temporizador = setTimeout(() => cargar(intento + 1), ESPERA_MS);
        }
      }
    };

    cargar(0);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [tipo, grupoId, orderId]);

  if (!codigo) return null;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin portapapeles el código sigue a la vista para copiarlo a mano
    }
  };

  return (
    <div className={`bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-sm text-gray-800 ${className}`}>
      <p className="font-semibold text-base text-[#7a4630] mb-1">Tu código de reserva</p>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-mono text-2xl tracking-widest font-bold text-gray-900 select-all">{codigo}</span>
        <button
          type="button"
          onClick={copiar}
          className="px-3 py-1 rounded-lg border border-[#b36a4a] text-[#b36a4a] hover:bg-[#b36a4a] hover:text-white"
        >
          {copiado ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
      <p className="mt-2">
        Guárdalo: con este código y tu email podrás{" "}
        <Link to="/gestionar-reserva" className="underline text-[#b36a4a]">
          cambiar la fecha de tu reserva
        </Link>{" "}
        sin iniciar sesión.
      </p>
    </div>
  );
}
