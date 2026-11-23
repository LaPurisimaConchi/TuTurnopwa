import React, { useCallback, useEffect, useRef, useState } from "react";
import { EVENTO_AVISO, EVENTO_CONFIRMAR } from "../utils/avisos";

// Avisos que se quitan solos y ventana de confirmación (ver utils/avisos.js)
export default function Avisos() {
  const [avisos, setAvisos] = useState([]);
  const [pregunta, setPregunta] = useState(null);
  const contador = useRef(0);
  const botonAceptar = useRef(null);

  const quitar = useCallback((id) => setAvisos((lista) => lista.filter((a) => a.id !== id)), []);

  useEffect(() => {
    const alAvisar = (e) => {
      const id = (contador.current += 1);
      setAvisos((lista) => [...lista.slice(-3), { id, ...e.detail }]);
      setTimeout(() => quitar(id), e.detail.tipo === "error" ? 8000 : 5000);
    };
    const alPreguntar = (e) => setPregunta(e.detail);
    window.addEventListener(EVENTO_AVISO, alAvisar);
    window.addEventListener(EVENTO_CONFIRMAR, alPreguntar);
    return () => {
      window.removeEventListener(EVENTO_AVISO, alAvisar);
      window.removeEventListener(EVENTO_CONFIRMAR, alPreguntar);
    };
  }, [quitar]);

  const responder = useCallback(
    (valor) => {
      pregunta?.resolve(valor);
      setPregunta(null);
    },
    [pregunta]
  );

  useEffect(() => {
    if (!pregunta) return undefined;
    botonAceptar.current?.focus();
    const alTeclear = (e) => {
      if (e.key === "Escape") responder(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [pregunta, responder]);

  return (
    <>
      <div
        className="fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {avisos.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => quitar(a.id)}
            className={`pointer-events-auto max-w-md w-full rounded-xl border px-4 py-3 text-left text-sm shadow-lg ${
              a.tipo === "error"
                ? "bg-red-50 border-red-300 text-red-800"
                : "bg-white border-linea text-tinta"
            }`}
          >
            {a.texto}
          </button>
        ))}
      </div>

      {pregunta && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4"
          onClick={() => responder(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirmar"
            className="w-full max-w-sm rounded-2xl bg-white p-5 text-tinta shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="whitespace-pre-line text-sm leading-relaxed">{pregunta.texto}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => responder(false)}
                className="rounded-full border border-linea px-4 py-2 text-sm font-semibold hover:bg-arena"
              >
                Cancelar
              </button>
              <button
                ref={botonAceptar}
                type="button"
                onClick={() => responder(true)}
                className="rounded-full bg-terracota px-4 py-2 text-sm font-semibold text-white hover:bg-terracota-oscuro"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
