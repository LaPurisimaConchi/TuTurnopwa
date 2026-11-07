// src/AdminOrdenarClases.jsx
// Orden de los talleres. El campo `orden` de cada ficha en clases/{id} decide cómo
// salen en la portada (de menor a mayor); aquí se ordenan arrastrando y se
// guarda de una vez, numerándolos del 1 en adelante.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ref, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import { GRUPOS_TALLER, cargarTalleres } from "./catalogoTalleres";
import { cargarCategorias } from "./categoriasTalleres";
import useMiniaturasTalleres from "./components/useMiniaturasTalleres";

export default function AdminOrdenarClases() {
  const [lista, setLista] = useState([]);
  const [original, setOriginal] = useState([]); // ids en el orden guardado
  const [categorias, setCategorias] = useState(GRUPOS_TALLER);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [filtro, setFiltro] = useState("todas");
  // Arrastre: { id, indice (de origen), hueco (dónde caería), dy (desplazamiento), soltando }
  const [drag, setDrag] = useState(null);
  const inicioDrag = useRef(null); // { y, scroll, paso, max }

  // Ordenados por id para que reordenar la lista no vuelva a pedir las fotos
  const talleresPorId = useMemo(
    () => [...original].sort().map((id) => ({ id })),
    [original]
  );
  const miniaturas = useMiniaturasTalleres(talleresPorId);

  useEffect(() => {
    Promise.all([
      cargarTalleres({ incluirOcultos: true }),
      cargarCategorias({ incluirOcultas: true }).catch(() => GRUPOS_TALLER),
    ])
      .then(([talleres, cats]) => {
        setLista(talleres);
        setOriginal(talleres.map((t) => t.id));
        setCategorias(cats);
      })
      .catch((err) => {
        console.error("Error al cargar los talleres:", err);
        setError("No se han podido cargar los talleres.");
      })
      .finally(() => setCargando(false));
  }, []);

  const tituloCategoria = (id) => categorias.find((c) => c.id === id)?.titulo || id;

  const hayCambios = useMemo(
    () => lista.some((t, i) => t.id !== original[i] || Number(t.orden) !== i + 1),
    [lista, original]
  );

  // Lo que se ve: todos, o solo los de la categoría elegida
  const visibles = useMemo(
    () => (filtro === "todas" ? lista : lista.filter((t) => t.grupo === filtro)),
    [lista, filtro]
  );

  // Pone `nuevosVisibles` (los mismos talleres que `visibles`, reordenados) en los
  // huecos que ocupaban en la lista completa: los de otras categorías no se mueven
  const aplicarOrdenVisible = (nuevosVisibles) => {
    const ids = new Set(visibles.map((t) => t.id));
    let siguiente = 0;
    setLista(lista.map((t) => (ids.has(t.id) ? nuevosVisibles[siguiente++] : t)));
    setMensaje("");
  };

  const PASO_EXTRA = 8; // separación entre filas (space-y-2)

  const empezarArrastre = (e, indice) => {
    if (guardando || drag || (e.pointerType === "mouse" && e.button !== 0)) return;
    const fila = e.currentTarget.closest("li");
    e.currentTarget.setPointerCapture(e.pointerId);
    inicioDrag.current = {
      y: e.clientY,
      scroll: window.scrollY,
      paso: fila.offsetHeight + PASO_EXTRA,
      max: visibles.length - 1,
    };
    setDrag({ id: visibles[indice].id, indice, hueco: indice, dy: 0, soltando: false });
  };

  const moverArrastre = (e) => {
    const ini = inicioDrag.current;
    if (!drag || drag.soltando || !ini) return;

    // Desplazamiento de la página mientras se arrastra (cerca de los bordes avanza sola)
    if (e.clientY < 70) window.scrollBy(0, -14);
    else if (e.clientY > window.innerHeight - 70) window.scrollBy(0, 14);

    const dy = e.clientY - ini.y + (window.scrollY - ini.scroll);
    const minDy = -drag.indice * ini.paso;
    const maxDy = (ini.max - drag.indice) * ini.paso;
    const dyAcotado = Math.min(maxDy, Math.max(minDy, dy));
    const hueco = drag.indice + Math.round(dyAcotado / ini.paso);
    setDrag({ ...drag, dy: dyAcotado, hueco });
  };

  const terminarArrastre = () => {
    const ini = inicioDrag.current;
    if (!drag || drag.soltando || !ini) return;

    // La fila se asienta en su hueco con animación y luego se aplica el orden
    const destino = (drag.hueco - drag.indice) * ini.paso;
    setDrag({ ...drag, dy: destino, soltando: true });

    setTimeout(() => {
      if (drag.hueco !== drag.indice) {
        const copia = [...visibles];
        const [movido] = copia.splice(drag.indice, 1);
        copia.splice(drag.hueco, 0, movido);
        aplicarOrdenVisible(copia);
      }
      setDrag(null);
      inicioDrag.current = null;
    }, 180);
  };

  // Cuánto se desplaza cada fila para dejar sitio al hueco
  const desplazamiento = (i) => {
    if (!drag) return 0;
    const paso = inicioDrag.current?.paso || 0;
    if (i === drag.indice) return drag.dy;
    if (drag.hueco > drag.indice && i > drag.indice && i <= drag.hueco) return -paso;
    if (drag.hueco < drag.indice && i >= drag.hueco && i < drag.indice) return paso;
    return 0;
  };

  const guardar = async () => {
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const cambios = {};
      lista.forEach((t, i) => {
        if (Number(t.orden) !== i + 1) cambios[`clases/${t.id}/orden`] = i + 1;
      });
      if (Object.keys(cambios).length) await update(ref(dbRealtime), cambios);

      setLista(lista.map((t, i) => ({ ...t, orden: i + 1 })));
      setOriginal(lista.map((t) => t.id));
      setMensaje("Orden guardado.");
    } catch (err) {
      console.error("Error al guardar el orden:", err);
      setError("No se ha podido guardar el orden. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8ee] p-3 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-lg p-4 md:p-7">
        <BotonVolver />

        <h1 className="text-2xl font-bold text-[#2f2f2f] text-center mt-2">Ordenar clases</h1>
        <p className="text-center text-[#7a7a7a] mt-1 mb-5">
          Es el orden en que salen en la portada. Arrastra cada taller desde el icono ⠿ y pulsa «Guardar orden». Puedes filtrar por categoría.
        </p>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            {error}
          </p>
        )}
        {mensaje && (
          <p className="mb-4 rounded-xl bg-green-50 border border-green-200 text-green-700 px-4 py-2 text-sm">
            {mensaje}
          </p>
        )}

        {!cargando && lista.length > 0 && (
          <div className="mb-4">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:justify-center [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[{ id: "todas", titulo: "Todos" }, ...categorias.filter((c) => lista.some((t) => t.grupo === c.id))].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFiltro(c.id)}
                  disabled={!!drag}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    filtro === c.id
                      ? "border-[#b36a4a] bg-[#b36a4a] text-white"
                      : "border-[#eadfd2] bg-white text-[#6b4f3f] hover:bg-[#f9ece6]"
                  }`}
                >
                  {c.titulo}
                </button>
              ))}
            </div>
            {filtro !== "todas" && (
              <p className="text-xs text-[#7a7a7a] mt-1">
                Solo ordenas los de esta categoría entre sí; el resto mantiene su sitio en la portada.
              </p>
            )}
          </div>
        )}

        {cargando ? (
          <p className="text-center text-[#7a7a7a]">Cargando...</p>
        ) : lista.length === 0 ? (
          <p className="text-center text-[#7a7a7a]">No hay talleres.</p>
        ) : (
          <>
            <ol className="space-y-2">
              {visibles.map((t, i) => (
                <li
                  key={t.id}
                  style={{
                    transform: `translateY(${desplazamiento(i)}px)`,
                    transition:
                      drag && (i !== drag.indice || drag.soltando)
                        ? "transform 180ms ease"
                        : "none",
                    position: "relative",
                    zIndex: drag?.id === t.id ? 10 : 0,
                  }}
                  className={`flex items-center gap-3 rounded-2xl border bg-[#fffdf7] px-3 py-2 ${
                    drag?.id === t.id
                      ? "border-[#3d3126] shadow-lg"
                      : "border-[#eadfbe]"
                  }`}
                >
                  <img
                    src={miniaturas[t.id] || t.imagen}
                    alt=""
                    draggable={false}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 bg-[#f3ebe1]"
                  />
                  <span className="w-7 text-center font-bold text-[#7a6331]">{lista.indexOf(t) + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#3d3126] truncate">{t.nombre}</p>
                    <p className="text-xs text-[#7a7a7a] truncate">
                      {tituloCategoria(t.grupo)}
                      {t.estado !== "activa" && " · Oculto"}
                      {t.estado === "activa" && !t.enPortada && " · No sale en portada"}
                    </p>
                  </div>
                  <span
                    role="button"
                    aria-label={`Arrastrar ${t.nombre}`}
                    onPointerDown={(e) => empezarArrastre(e, i)}
                    onPointerMove={moverArrastre}
                    onPointerUp={terminarArrastre}
                    onPointerCancel={terminarArrastre}
                    style={{ touchAction: "none" }}
                    className={`px-3 py-2 -my-1 text-2xl leading-none text-[#b9a77d] hover:text-[#7a6331] select-none ${
                      drag?.id === t.id ? "cursor-grabbing" : "cursor-grab"
                    }`}
                  >
                    ⠿
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={guardar}
                disabled={!hayCambios || guardando}
                className="px-5 py-2.5 rounded-xl bg-[#3d3126] text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {guardando ? "Guardando..." : "Guardar orden"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
