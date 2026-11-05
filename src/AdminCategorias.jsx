// src/AdminCategorias.jsx
// Categorías de talleres. Las que crea el admin, y las de siempre una vez migradas
// al panel, se pueden renombrar, ordenar, ocultar y borrar (si están vacías).
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BotonVolver from "./BotonVolver";
import { GRUPOS_TALLER, cargarTalleres } from "./catalogoTalleres";
import {
  CATEGORIAS_DEL_SISTEMA,
  actualizarCategoria,
  borrarCategoria,
  cargarRegistrosCategorias,
  crearCategoria,
  estadoDeSiempre,
  intercambiarOrden,
  mensajeErrorCategoria,
  migrarCategoriasDeSiempre,
  unirCategorias,
} from "./categoriasTalleres";

const input = "w-full border border-gray-300 rounded-xl px-3 py-2 text-base bg-white";
const label = "block font-bold text-sm mb-1 text-[#3d3126]";
const seccion = "bg-white rounded-2xl border border-[#eadfbe] p-5 shadow-sm space-y-4";
const botonMini =
  "px-3 py-1.5 rounded-lg border border-[#eadfbe] bg-[#fffaf0] text-sm font-medium text-[#3d3126] hover:bg-[#f7eccc] disabled:opacity-40 disabled:cursor-not-allowed";

export default function AdminCategorias() {
  const [registros, setRegistros] = useState([]);
  const [talleres, setTalleres] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const [nueva, setNueva] = useState({ titulo: "", descripcion: "" });
  const [editando, setEditando] = useState(null); // { id, titulo, descripcion }

  const cargar = useCallback(async () => {
    try {
      const [lista, talleresCargados] = await Promise.all([
        cargarRegistrosCategorias(),
        cargarTalleres({ incluirOcultos: true }),
      ]);
      setRegistros(lista);
      setTalleres(talleresCargados);
    } catch (err) {
      console.error("Error al cargar las categorías:", err);
      setError("No se han podido cargar las categorías.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const numTalleres = (id) => talleres.filter((t) => t.grupo === id).length;

  // Las que se gestionan desde el panel: las nuevas y las de siempre ya migradas
  const propias = unirCategorias(registros).filter((c) => c.propia);
  const sinMigrar = GRUPOS_TALLER.filter((g) => estadoDeSiempre(g.id, registros) === "sinMigrar");

  // Ejecuta una acción, muestra el resultado y recarga la lista
  const ejecutar = async (accion, textoOk) => {
    setError("");
    setMensaje("");
    setOcupado(true);

    try {
      await accion();
      await cargar();
      if (textoOk) setMensaje(textoOk);
      return true;
    } catch (err) {
      console.error("Error en las categorías:", err);
      setError(mensajeErrorCategoria(err));
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    const ok = await ejecutar(() => crearCategoria(nueva), "Categoría creada.");
    if (ok) setNueva({ titulo: "", descripcion: "" });
  };

  const handleGuardarEdicion = async (e) => {
    e.preventDefault();
    const ok = await ejecutar(
      () =>
        actualizarCategoria(editando.id, {
          titulo: editando.titulo,
          descripcion: editando.descripcion,
        }),
      "Cambios guardados."
    );
    if (ok) setEditando(null);
  };

  const handleMigrar = (ids, textoOk) =>
    ejecutar(() => migrarCategoriasDeSiempre(ids), textoOk);

  const handleBorrar = (categoria) => {
    if (!window.confirm(`¿Borrar la categoría «${categoria.titulo}»? No se puede deshacer.`)) {
      return;
    }
    ejecutar(() => borrarCategoria(categoria.id), "Categoría borrada.");
  };

  const mover = (indice, desplazamiento) => {
    const otra = propias[indice + desplazamiento];
    if (!otra) return;
    ejecutar(() => intercambiarOrden(propias[indice], otra));
  };

  return (
    <div className="bg-[#fffef4] min-h-screen px-4 py-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <BotonVolver volverA="/admin-dashboard" />

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-[#3d3126] font-serif">
            Categorías de talleres
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Agrupan los talleres en la portada y en la lista de talleres. Cada categoría
            nueva tiene su propia página, que aparece en cuanto tiene algún taller activo.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {mensaje && (
          <p className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800" role="status">
            {mensaje}
          </p>
        )}

        <div className="space-y-5">
          <form onSubmit={handleCrear} className={seccion}>
            <h2 className="text-lg font-semibold text-[#3d3126]">Nueva categoría</h2>

            <div>
              <label htmlFor="cat-nombre" className={label}>Nombre</label>
              <input
                id="cat-nombre"
                className={input}
                value={nueva.titulo}
                onChange={(e) => setNueva((prev) => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ej.: Talleres de temporada"
                required
              />
            </div>

            <div>
              <label htmlFor="cat-descripcion" className={label}>
                Descripción <span className="font-normal text-gray-500">(opcional)</span>
              </label>
              <textarea
                id="cat-descripcion"
                className={input}
                rows={2}
                value={nueva.descripcion}
                onChange={(e) => setNueva((prev) => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Se ve bajo el nombre, en la lista de talleres y en su página"
              />
            </div>

            <button
              type="submit"
              disabled={ocupado}
              className="px-6 py-2.5 rounded-full bg-[#f4c542] text-[#5c3c00] font-semibold hover:bg-[#e8b932] transition disabled:opacity-50"
            >
              Crear categoría
            </button>
          </form>

          <section className={seccion}>
            <h2 className="text-lg font-semibold text-[#3d3126]">Tus categorías</h2>

            {cargando ? (
              <p className="text-sm text-gray-600">Cargando...</p>
            ) : propias.length === 0 ? (
              <p className="text-sm text-gray-600">
                Todavía no hay ninguna. Crea una arriba o migra las de siempre más abajo.
              </p>
            ) : (
              <ul className="space-y-3">
                {propias.map((c, indice) => {
                  const total = numTalleres(c.id);
                  const enEdicion = editando?.id === c.id;

                  return (
                    <li key={c.id} className="rounded-xl border border-[#eadfbe] bg-[#fffaf0] p-4">
                      {enEdicion ? (
                        <form onSubmit={handleGuardarEdicion} className="space-y-3">
                          <div>
                            <label htmlFor={`edit-nombre-${c.id}`} className={label}>Nombre</label>
                            <input
                              id={`edit-nombre-${c.id}`}
                              className={input}
                              value={editando.titulo}
                              onChange={(e) => setEditando({ ...editando, titulo: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <label htmlFor={`edit-desc-${c.id}`} className={label}>Descripción</label>
                            <textarea
                              id={`edit-desc-${c.id}`}
                              className={input}
                              rows={2}
                              value={editando.descripcion}
                              onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="submit"
                              disabled={ocupado}
                              className="px-4 py-2 rounded-full bg-[#f4c542] text-[#5c3c00] font-semibold text-sm hover:bg-[#e8b932] disabled:opacity-50"
                            >
                              Guardar
                            </button>
                            <button type="button" className={botonMini} onClick={() => setEditando(null)}>
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#3d3126]">
                                {c.titulo}
                                {c.estado === "oculta" && (
                                  <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                                    Oculta
                                  </span>
                                )}
                              </p>
                              {c.descripcion && (
                                <p className="text-sm text-gray-600 mt-0.5">{c.descripcion}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                {total} {total === 1 ? "taller" : "talleres"} ·{" "}
                                <Link to={c.ruta} className="text-blue-700 underline">
                                  Ver página
                                </Link>
                              </p>
                            </div>

                            <div className="flex gap-1">
                              <button
                                type="button"
                                className={botonMini}
                                onClick={() => mover(indice, -1)}
                                disabled={ocupado || indice === 0}
                                aria-label={`Subir ${c.titulo}`}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                className={botonMini}
                                onClick={() => mover(indice, 1)}
                                disabled={ocupado || indice === propias.length - 1}
                                aria-label={`Bajar ${c.titulo}`}
                              >
                                ↓
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className={botonMini}
                              onClick={() =>
                                setEditando({ id: c.id, titulo: c.titulo, descripcion: c.descripcion })
                              }
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className={botonMini}
                              disabled={ocupado}
                              onClick={() =>
                                ejecutar(
                                  () =>
                                    actualizarCategoria(c.id, {
                                      estado: c.estado === "oculta" ? "activa" : "oculta",
                                    }),
                                  c.estado === "oculta" ? "Categoría visible." : "Categoría oculta."
                                )
                              }
                            >
                              {c.estado === "oculta" ? "Mostrar" : "Ocultar"}
                            </button>
                            <button
                              type="button"
                              className={`${botonMini} text-red-700`}
                              disabled={ocupado || total > 0 || CATEGORIAS_DEL_SISTEMA.includes(c.id)}
                              title={
                                CATEGORIAS_DEL_SISTEMA.includes(c.id)
                                  ? "Es la categoría de los bonos: puedes ocultarla, pero no borrarla"
                                  : total > 0
                                  ? "Cambia sus talleres de categoría para poder borrarla"
                                  : undefined
                              }
                              onClick={() => handleBorrar(c)}
                            >
                              Borrar
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="text-xs text-gray-500">
              Ocultar una categoría quita su página y su botón de la lista de talleres; sus
              talleres siguen saliendo en «Todos» de la portada.
            </p>
          </section>

          {sinMigrar.length > 0 && (
            <section className={seccion}>
              <h2 className="text-lg font-semibold text-[#3d3126]">Categorías de siempre</h2>
              <p className="text-sm text-gray-600">
                Vienen con la web. Al migrarlas al panel pasan a «Tus categorías» y se
                gestionan como las nuevas: cambiar nombre y texto, ordenar, ocultar y borrar
                (si están vacías). Los talleres y las reservas no cambian. La migración no
                se puede deshacer.
              </p>

              <button
                type="button"
                disabled={ocupado}
                onClick={() =>
                  handleMigrar(
                    sinMigrar.map((g) => g.id),
                    `${sinMigrar.length === 1 ? "Categoría migrada" : "Categorías migradas"} al panel.`
                  )
                }
                className="px-5 py-2.5 rounded-full bg-[#f4c542] text-[#5c3c00] font-semibold text-sm hover:bg-[#e8b932] transition disabled:opacity-50"
              >
                {sinMigrar.length === GRUPOS_TALLER.length
                  ? "Migrar las de siempre al panel"
                  : `Migrar las ${sinMigrar.length} que faltan`}
              </button>

              <ul className="space-y-2">
                {sinMigrar.map((g) => {
                  const total = numTalleres(g.id);

                  return (
                    <li
                      key={g.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#eadfbe] bg-[#fffaf0] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#3d3126]">{g.titulo}</p>
                        <p className="text-xs text-gray-500">
                          {total} {total === 1 ? "taller" : "talleres"}
                        </p>
                      </div>

                      <button
                        type="button"
                        className={botonMini}
                        disabled={ocupado}
                        onClick={() => handleMigrar([g.id], "Categoría migrada al panel.")}
                      >
                        Migrar al panel
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
