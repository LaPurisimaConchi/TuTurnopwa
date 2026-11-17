// src/AdminCategorias.jsx
// Categorías de talleres. Las que crea el admin, y las de siempre una vez migradas
// al panel, se pueden renombrar, ordenar, ocultar y borrar (si están vacías).
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  mensajeErrorCategoria,
  migrarCategoriasDeSiempre,
  ordenarCategorias,
  unirCategorias,
} from "./categoriasTalleres";

const input = "w-full border border-gray-300 rounded-xl px-3 py-2 text-base bg-white";
const label = "block font-bold text-sm mb-1 text-tinta";
const seccion = "bg-white rounded-2xl border border-linea p-5 shadow-sm space-y-4";
const botonMini =
  "px-3 py-1.5 rounded-lg border border-linea bg-crema text-sm font-medium text-tinta hover:bg-[#f7eccc] disabled:opacity-40 disabled:cursor-not-allowed";

export default function AdminCategorias() {
  const [registros, setRegistros] = useState([]);
  const [talleres, setTalleres] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const [nueva, setNueva] = useState({ titulo: "", descripcion: "" });
  const [editando, setEditando] = useState(null); // { id, titulo, descripcion }
  // Arrastrar y soltar: la categoría que se arrastra y el orden provisional (se
  // reordena en vivo mientras se arrastra, dejando el hueco donde caerá)
  const [arrastrando, setArrastrando] = useState(null);
  const [ordenProvisional, setOrdenProvisional] = useState(null);
  const soltado = useRef(false);
  const elementos = useRef({}); // id -> <li>, para animar el movimiento
  const posiciones = useRef({}); // id -> posición vertical antes del último cambio

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
  const propiasGuardadas = unirCategorias(registros).filter((c) => c.propia);
  const propias = ordenProvisional
    ? ordenProvisional.map((id) => propiasGuardadas.find((c) => c.id === id)).filter(Boolean)
    : propiasGuardadas;
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

  // Al pasar por encima de otra categoría, la arrastrada ocupa su sitio (si el
  // puntero ya ha pasado la mitad de la tarjeta, para que no salte de un lado a otro)
  const arrastrarSobre = (e, destinoId) => {
    if (!arrastrando || arrastrando === destinoId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const ids = propias.map((c) => c.id);
    const desde = ids.indexOf(arrastrando);
    const hasta = ids.indexOf(destinoId);
    const caja = e.currentTarget.getBoundingClientRect();
    const mitad = caja.top + caja.height / 2;
    if ((desde < hasta && e.clientY < mitad) || (desde > hasta && e.clientY > mitad)) return;

    ids.splice(desde, 1);
    ids.splice(hasta, 0, arrastrando);
    setOrdenProvisional(ids);
  };

  const soltar = async () => {
    soltado.current = true;
    setArrastrando(null);

    const ids = propias.map((c) => c.id);
    const guardado = propiasGuardadas.map((c) => c.id);
    if (ids.join() === guardado.join()) {
      setOrdenProvisional(null);
      return;
    }

    await ejecutar(() => ordenarCategorias(ids.map((id) => propiasGuardadas.find((c) => c.id === id))));
    setOrdenProvisional(null);
  };

  // Animación: cada tarjeta se desliza desde donde estaba hasta su nuevo sitio
  const claveOrden = propias.map((c) => c.id).join();
  useLayoutEffect(() => {
    const nuevas = {};
    Object.entries(elementos.current).forEach(([id, el]) => {
      if (!el) return;
      nuevas[id] = el.getBoundingClientRect().top;
      const antes = posiciones.current[id];
      if (antes === undefined || antes === nuevas[id]) return;

      el.style.transition = "none";
      el.style.transform = `translateY(${antes - nuevas[id]}px)`;
      requestAnimationFrame(() => {
        el.style.transition = "transform 200ms ease";
        el.style.transform = "";
      });
    });
    posiciones.current = nuevas;
  }, [claveOrden]);

  return (
    <div className="bg-crema min-h-screen px-4 py-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <BotonVolver volverA="/admin-dashboard" />

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-tinta font-serif">
            Categorías de talleres
          </h1>
          <p className="text-sm text-tinta-suave mt-1">
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
            <h2 className="text-lg font-semibold text-tinta">Nueva categoría</h2>

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
                Descripción <span className="font-normal text-tinta-suave">(opcional)</span>
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
              className="px-6 py-2.5 rounded-full bg-terracota text-white font-semibold hover:bg-terracota-oscuro transition disabled:opacity-50"
            >
              Crear categoría
            </button>
          </form>

          <section className={seccion}>
            <h2 className="text-lg font-semibold text-tinta">Tus categorías</h2>

            {cargando ? (
              <p className="text-sm text-tinta-suave">Cargando...</p>
            ) : propias.length === 0 ? (
              <p className="text-sm text-tinta-suave">
                Todavía no hay ninguna. Crea una arriba o migra las de siempre más abajo.
              </p>
            ) : (
              <ul
                className="space-y-3"
                onDragOver={(e) => arrastrando && e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  soltar();
                }}
              >
                {propias.map((c) => {
                  const total = numTalleres(c.id);
                  const enEdicion = editando?.id === c.id;

                  return (
                    <li
                      key={c.id}
                      ref={(el) => {
                        elementos.current[c.id] = el;
                      }}
                      draggable={!enEdicion && !ocupado}
                      onDragStart={(e) => {
                        soltado.current = false;
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", c.id);
                        // El navegador hace la "foto" que se arrastra antes de que
                        // la tarjeta se convierta en hueco
                        setTimeout(() => setArrastrando(c.id), 0);
                      }}
                      onDragOver={(e) => arrastrarSobre(e, c.id)}
                      onDragEnd={() => {
                        setArrastrando(null);
                        if (!soltado.current) setOrdenProvisional(null);
                      }}
                      className={`rounded-xl border p-4 ${
                        arrastrando === c.id
                          ? "border-dashed border-terracota bg-terracota-suave/50 [&>*]:invisible"
                          : "border-linea bg-crema"
                      }`}
                    >
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
                              className="px-4 py-2 rounded-full bg-terracota text-white font-semibold text-sm hover:bg-terracota-oscuro disabled:opacity-50"
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
                              <p className="font-semibold text-tinta">
                                {c.titulo}
                                {c.estado === "oculta" && (
                                  <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-tinta">
                                    Oculta
                                  </span>
                                )}
                              </p>
                              {c.descripcion && (
                                <p className="text-sm text-tinta-suave mt-0.5">{c.descripcion}</p>
                              )}
                              <p className="text-xs text-tinta-suave mt-1">
                                {total} {total === 1 ? "taller" : "talleres"} ·{" "}
                                <Link to={c.ruta} className="text-blue-700 underline">
                                  Ver página
                                </Link>
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <span
                                className="flex h-8 w-8 cursor-grab items-center justify-center rounded-lg text-xl leading-none text-tinta-suave select-none active:cursor-grabbing"
                                title="Arrastra para cambiar el orden"
                                aria-hidden="true"
                              >
                                ⠿
                              </span>
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

            {propias.length > 1 && (
              <p className="text-xs text-tinta-suave">
                Arrastra una categoría por el asa ⠿ para cambiar su orden (en el móvil, mantén pulsado y arrastra).
              </p>
            )}

            <p className="text-xs text-tinta-suave">
              Ocultar una categoría quita su página y su botón de la lista de talleres; sus
              talleres siguen saliendo en «Todos» de la portada.
            </p>
          </section>

          {sinMigrar.length > 0 && (
            <section className={seccion}>
              <h2 className="text-lg font-semibold text-tinta">Categorías de siempre</h2>
              <p className="text-sm text-tinta-suave">
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
                className="px-5 py-2.5 rounded-full bg-terracota text-white font-semibold text-sm hover:bg-terracota-oscuro transition disabled:opacity-50"
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
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-linea bg-crema px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-tinta">{g.titulo}</p>
                        <p className="text-xs text-tinta-suave">
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
