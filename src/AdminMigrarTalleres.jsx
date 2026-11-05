// src/AdminMigrarTalleres.jsx
// Pasa los talleres de siempre al panel: tras migrarlos se editan, ocultan y
// borran como los creados desde el panel, y sus fotos viven en la base de datos.
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BotonVolver from "./BotonVolver";
import useCategorias from "./components/useCategorias";
import {
  deshacerMigracion,
  estadoMigracion,
  migrarTaller,
} from "./migracion/migrarTalleres";

export default function AdminMigrarTalleres() {
  const categorias = useCategorias({ incluirOcultas: true });
  const tituloGrupo = (id) => categorias.find((g) => g.id === id)?.titulo || id;
  const [talleres, setTalleres] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [progreso, setProgreso] = useState("");
  const [resultados, setResultados] = useState({});

  const cargar = useCallback(async () => {
    try {
      setTalleres(await estadoMigracion());
      setError("");
    } catch (err) {
      console.error("Error al leer el estado de la migración:", err);
      setError("No se ha podido leer el estado de los talleres.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const pendientes = talleres.filter((t) => t.existe && !t.migrado);

  const migrarUno = async (taller) => {
    setOcupado(taller.id);
    setProgreso("");

    try {
      await migrarTaller(taller.id, {
        alProgreso: (texto) => setProgreso(`${taller.nombre}: ${texto}`),
      });
      setResultados((prev) => ({ ...prev, [taller.id]: { ok: true } }));
      return true;
    } catch (err) {
      console.error(`Error al migrar ${taller.id}:`, err);
      const permiso = /permission/i.test(err?.message || "");
      setResultados((prev) => ({
        ...prev,
        [taller.id]: {
          ok: false,
          texto: permiso
            ? "No tienes permiso con esta cuenta."
            : err?.message || "No se ha podido migrar.",
        },
      }));
      return false;
    } finally {
      setProgreso("");
    }
  };

  const handleMigrar = async (taller) => {
    await migrarUno(taller);
    setOcupado("");
    await cargar();
  };

  const handleMigrarTodos = async () => {
    const confirmado = window.confirm(
      `Se van a migrar ${pendientes.length} talleres y a copiar sus fotos a la base de datos. Puede tardar un par de minutos. ¿Continuar?`
    );
    if (!confirmado) return;

    for (const taller of pendientes) {
      const ok = await migrarUno(taller);
      if (!ok) break; // si falla uno, se para para revisarlo
    }

    setOcupado("");
    await cargar();
  };

  const handleDeshacer = async (taller) => {
    const confirmado = window.confirm(
      `¿Volver «${taller.nombre}» a su página de siempre? Se conservan la ficha y las fotos, pero deja de poder editarse, ocultarse y borrarse desde el panel.`
    );
    if (!confirmado) return;

    setOcupado(taller.id);
    try {
      await deshacerMigracion(taller.id);
      setResultados((prev) => ({ ...prev, [taller.id]: undefined }));
    } catch (err) {
      console.error("Error al deshacer la migración:", err);
      setResultados((prev) => ({
        ...prev,
        [taller.id]: { ok: false, texto: "No se ha podido deshacer." },
      }));
    } finally {
      setOcupado("");
      await cargar();
    }
  };

  const grupos = [...new Set(talleres.map((t) => t.grupo))];
  const boton =
    "px-3 py-1.5 rounded-lg border border-[#eadfbe] bg-[#fffaf0] text-sm font-semibold hover:bg-[#fff1cf] disabled:opacity-50";

  return (
    <div className="bg-[#fffef4] min-h-screen px-4 py-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <BotonVolver volverA="/admin-clases-nuevo" />

        <h1 className="text-2xl md:text-3xl font-bold text-[#3d3126] font-serif">
          Migrar talleres al panel
        </h1>
        <p className="text-sm text-gray-700 mt-2 leading-relaxed">
          Los talleres de siempre tienen su página hecha a mano. Al migrarlos pasan a
          gestionarse como los que creas desde el panel: se pueden{" "}
          <strong>editar, ocultar y borrar</strong>, y sus <strong>fotos se guardan en la
          base de datos</strong>. Se conservan sus precios, plazas, horarios, reservas,
          bonos y tarjetas regalo actuales.
        </p>

        <div className="mt-3 bg-[#fff8df] border border-[#f1e7c6] rounded-xl p-3 text-sm text-[#5c3c00] space-y-1">
          <p>
            • Las direcciones de siempre siguen funcionando: pasan a mostrar la página
            nueva del taller.
          </p>
          <p>
            • Es reversible: «Deshacer» devuelve el taller a su página de siempre.
          </p>
          <p>
            • Se recomienda migrar primero uno, comprobar su página y una reserva de
            prueba, y después el resto.
          </p>
        </div>

        {error && (
          <p className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {cargando ? (
          <p className="text-center text-gray-500 py-12">Cargando talleres...</p>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="px-5 py-2.5 rounded-full text-white font-semibold bg-[#b36a4a] hover:bg-[#9e5c3f] shadow-md disabled:opacity-50"
                onClick={handleMigrarTodos}
                disabled={!!ocupado || pendientes.length === 0}
              >
                {pendientes.length
                  ? `Migrar los ${pendientes.length} pendientes`
                  : "Todos los talleres están migrados"}
              </button>
              {progreso && <span className="text-sm text-gray-600">{progreso}…</span>}
            </div>

            {grupos.map((grupo) => (
              <section key={grupo} className="mt-6">
                <h2 className="text-lg font-semibold text-[#3d3126] mb-2">
                  {tituloGrupo(grupo)}
                </h2>
                <ul className="space-y-2">
                  {talleres
                    .filter((t) => t.grupo === grupo)
                    .map((taller) => {
                      const resultado = resultados[taller.id];
                      const trabajando = ocupado === taller.id;

                      return (
                        <li
                          key={taller.id}
                          className="bg-white rounded-xl border border-[#eadfbe] p-3 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#3d3126]">
                                {taller.nombre}
                                {taller.esBono && (
                                  <span className="ml-2 text-xs font-normal text-gray-500">
                                    bono
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {!taller.existe
                                  ? "No existe en la base de datos"
                                  : taller.migrado
                                  ? "Migrado"
                                  : "Pendiente"}
                                {taller.existe && taller.estado === "oculta" && " · oculto"}
                                {taller.fotos ? " · fotos en la base de datos" : ""}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {taller.existe && !taller.migrado && (
                                <button
                                  type="button"
                                  className={boton}
                                  onClick={() => handleMigrar(taller)}
                                  disabled={!!ocupado}
                                >
                                  {trabajando ? "Migrando…" : "Migrar"}
                                </button>
                              )}
                              {taller.migrado && (
                                <>
                                  <Link
                                    to={`/admin-taller?id=${taller.id}`}
                                    className={`${boton} inline-block`}
                                  >
                                    Editar
                                  </Link>
                                  <button
                                    type="button"
                                    className={boton}
                                    onClick={() => handleDeshacer(taller)}
                                    disabled={!!ocupado}
                                  >
                                    Deshacer
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {resultado && (
                            <p
                              className={`mt-2 text-sm ${
                                resultado.ok ? "text-green-700" : "text-red-600"
                              }`}
                            >
                              {resultado.ok ? "Migrado correctamente." : resultado.texto}
                            </p>
                          )}
                        </li>
                      );
                    })}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
