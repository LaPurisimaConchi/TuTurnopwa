// src/AdminPaginasEspeciales.jsx
// Talleres recomendados que salen en las páginas «Regalar un taller» y
// «Reservas para grupos». Se marcan y se ordenan aquí.
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BotonVolver from "./BotonVolver";
import { cargarTalleres } from "./catalogoTalleres";
import {
  PAGINAS_ESPECIALES,
  cargarIdsRecomendados,
  guardarIdsRecomendados,
} from "./paginasEspeciales";

const seccion = "bg-white rounded-2xl border border-[#eadfbe] p-5 shadow-sm space-y-4";
const botonMini =
  "px-3 py-1.5 rounded-lg border border-[#eadfbe] bg-[#fffaf0] text-sm font-medium text-[#3d3126] hover:bg-[#f7eccc] disabled:opacity-40 disabled:cursor-not-allowed";

function Recomendados({ pagina, talleres }) {
  const [ids, setIds] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargarIdsRecomendados(pagina.id).then((lista) => {
      setIds(lista);
      setCargado(true);
    });
  }, [pagina.id]);

  const porId = new Map(talleres.map((t) => [t.id, t]));
  const elegidos = ids.filter((id) => porId.has(id));
  const disponibles = talleres.filter((t) => !ids.includes(t.id));

  const mover = (i, delta) => {
    const copia = [...elegidos];
    const j = i + delta;
    if (j < 0 || j >= copia.length) return;
    [copia[i], copia[j]] = [copia[j], copia[i]];
    setIds(copia);
    setMensaje("");
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje("");
    setError("");
    try {
      await guardarIdsRecomendados(pagina.id, elegidos);
      setIds(elegidos);
      setMensaje("Guardado.");
    } catch (err) {
      console.error("Error al guardar recomendados:", err);
      setError("No se ha podido guardar. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className={seccion}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold text-[#3d3126]">{pagina.titulo}</h2>
        <Link to={pagina.ruta} className="text-sm text-blue-700 underline">
          Ver página
        </Link>
      </div>

      {!cargado ? (
        <p className="text-sm text-gray-600">Cargando...</p>
      ) : (
        <>
          {elegidos.length === 0 ? (
            <p className="text-sm text-gray-600">
              Todavía no hay recomendados: la página no muestra esa sección.
            </p>
          ) : (
            <ol className="space-y-2">
              {elegidos.map((id, i) => (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-xl border border-[#eadfbe] bg-[#fffaf0] px-3 py-2"
                >
                  <span className="flex-1 font-medium text-[#3d3126]">{porId.get(id).nombre}</span>
                  <button type="button" className={botonMini} disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Subir">↑</button>
                  <button type="button" className={botonMini} disabled={i === elegidos.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar">↓</button>
                  <button
                    type="button"
                    className={botonMini}
                    onClick={() => {
                      setIds(elegidos.filter((x) => x !== id));
                      setMensaje("");
                    }}
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ol>
          )}

          {disponibles.length > 0 && (
            <select
              className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-white"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                setIds([...elegidos, e.target.value]);
                setMensaje("");
              }}
              aria-label="Añadir taller recomendado"
            >
              <option value="">+ Añadir un taller…</option>
              {disponibles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="px-6 py-2.5 rounded-full bg-[#f4c542] text-[#5c3c00] font-semibold hover:bg-[#e8b932] transition disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            {mensaje && <span className="text-sm text-green-700">{mensaje}</span>}
            {error && <span className="text-sm text-red-700">{error}</span>}
          </div>
        </>
      )}
    </section>
  );
}

export default function AdminPaginasEspeciales() {
  const [talleres, setTalleres] = useState([]);

  useEffect(() => {
    cargarTalleres()
      .then(setTalleres)
      .catch((err) => console.error("Error al cargar talleres:", err));
  }, []);

  return (
    <div className="space-y-5">
      <BotonVolver />
      <div>
        <h1 className="text-2xl font-bold text-[#2f2f2f]">Páginas de regalo y grupos</h1>
        <p className="text-sm text-gray-600 mt-1">
          Elige qué talleres recomiendas en cada página y en qué orden salen. Solo se muestran los
          talleres activos.
        </p>
      </div>
      <Recomendados pagina={PAGINAS_ESPECIALES.regalo} talleres={talleres} />
      <Recomendados pagina={PAGINAS_ESPECIALES.grupos} talleres={talleres} />
    </div>
  );
}
