// src/AdminPaginasEspeciales.jsx
// Talleres recomendados que salen en las páginas «Regalar un taller» y
// «Reservas para grupos». Se marcan y se ordenan aquí.
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import BotonVolver from "./BotonVolver";
import { cargarTalleres } from "./catalogoTalleres";
import {
  PAGINAS_ESPECIALES,
  cargarIdsRecomendados,
  guardarIdsRecomendados,
} from "./paginasEspeciales";

const seccion = "bg-white rounded-2xl border border-linea p-5 shadow-sm space-y-4";
const botonMini =
  "px-3 py-1.5 rounded-lg border border-linea bg-crema text-sm font-medium text-tinta hover:bg-[#f7eccc] disabled:opacity-40 disabled:cursor-not-allowed";

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

  // Drag and drop: el elemento arrastrado se recoloca en vivo y deja un hueco
  // punteado; el resto se desliza a su nuevo sitio (técnica FLIP).
  const [arrastrando, setArrastrando] = useState(null);
  const nodos = useRef(new Map());
  const posiciones = useRef(new Map());

  const medir = () => {
    posiciones.current = new Map(
      [...nodos.current].map(([id, el]) => [id, el.getBoundingClientRect().top])
    );
  };

  useLayoutEffect(() => {
    nodos.current.forEach((el, id) => {
      const antes = posiciones.current.get(id);
      if (antes === undefined) return;
      const delta = antes - el.getBoundingClientRect().top;
      if (!delta) return;
      el.style.transition = "none";
      el.style.transform = `translateY(${delta}px)`;
      el.getBoundingClientRect();
      el.style.transition = "transform 200ms ease";
      el.style.transform = "";
    });
    // Las posiciones solo valen para el render que las provocó; si no se
    // limpian, cualquier otro render (p. ej. al guardar) repite la animación.
    posiciones.current = new Map();
  });

  const sobre = (e, destino) => {
    e.preventDefault();
    if (!arrastrando || arrastrando === destino) return;
    const desde = elegidos.indexOf(arrastrando);
    const hasta = elegidos.indexOf(destino);
    const r = e.currentTarget.getBoundingClientRect();
    const mitad = r.top + r.height / 2;
    // Solo intercambia al pasar la mitad del elemento, para evitar parpadeos.
    if ((desde < hasta && e.clientY < mitad) || (desde > hasta && e.clientY > mitad)) return;
    medir();
    const copia = elegidos.filter((x) => x !== arrastrando);
    copia.splice(hasta, 0, arrastrando);
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
        <h2 className="text-lg font-semibold text-tinta">{pagina.titulo}</h2>
        <Link to={pagina.ruta} className="text-sm text-blue-700 underline">
          Ver página
        </Link>
      </div>

      {!cargado ? (
        <p className="text-sm text-tinta-suave">Cargando...</p>
      ) : (
        <>
          {elegidos.length === 0 ? (
            <p className="text-sm text-tinta-suave">
              Todavía no hay recomendados: la página no muestra esa sección.
            </p>
          ) : (
            <ol className="space-y-2">
              {elegidos.map((id) => (
                <li
                  key={id}
                  ref={(el) => {
                    if (el) nodos.current.set(id, el);
                    else nodos.current.delete(id);
                  }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", id);
                    setArrastrando(id);
                  }}
                  onDragOver={(e) => sobre(e, id)}
                  onDrop={(e) => e.preventDefault()}
                  onDragEnd={() => setArrastrando(null)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-grab active:cursor-grabbing select-none ${
                    arrastrando === id
                      ? "border-dashed border-terracota bg-[#f7eccc] [&>*]:opacity-0"
                      : "border-linea bg-crema"
                  }`}
                >
                  <span className="text-tinta-suave" aria-hidden="true">⋮⋮</span>
                  <span className="flex-1 font-medium text-tinta">{porId.get(id).nombre}</span>
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
              className="px-6 py-2.5 rounded-full bg-terracota text-white font-semibold hover:bg-terracota-oscuro transition disabled:opacity-50"
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
        <h1 className="text-2xl font-bold text-tinta">Páginas de regalo y grupos</h1>
        <p className="text-sm text-tinta-suave mt-1">
          Elige qué talleres recomiendas en cada página y arrástralos para cambiar el orden. Solo se muestran los
          talleres activos.
        </p>
      </div>
      <Recomendados pagina={PAGINAS_ESPECIALES.regalo} talleres={talleres} />
      <Recomendados pagina={PAGINAS_ESPECIALES.grupos} talleres={talleres} />
    </div>
  );
}
