// src/AdminTallerForm.jsx
// Alta y edición de talleres desde el panel admin.
// - Talleres gestionados desde el panel (nuevos, o los de siempre ya migrados
//   desde /admin-migrar-talleres): ficha completa en clases/{id} con
//   dinamica: true; se muestra en /taller/:id y se reserva en /reservar/:id.
//   Se pueden ocultar, editar y borrar.
// - Talleres de siempre sin migrar: solo fotos y visibilidad en portada.
// Las fotos se guardan comprimidas en imagenesClases/{id}.
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ref, get, set, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import {
  GRUPOS_TALLER,
  GRUPOS_TALLER_NUEVO,
  METODOS_TALLER,
  TALLERES_FIJOS,
  cargarGaleria,
  imagenPorDefecto,
} from "./catalogoTalleres";
import {
  DIAS,
  FORMULARIO_VACIO,
  GRUPO_BONOS,
  construirFicha,
  formularioDesdeClase,
  generarId,
  leerTurnos,
  numeroPositivo,
  turnoInvalido,
} from "./utils/fichaTaller";
import {
  LADO_MINIATURA,
  comprimirArchivoImagen,
  pesoDataUrlKb,
  reducirImagen,
} from "./utils/imagenes";
import { obtenerEstadoVisibleBono } from "./utils/bonos";

const MAX_IMAGENES = 8;

const hoyISO = () => {
  const d = new Date();
  const dosCifras = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
};

const pareceReserva = (obj) =>
  !!obj && typeof obj === "object" && ("orderId" in obj || "estado" in obj || "fecha" in obj);

// Lo que impide borrar un taller: reservas confirmadas de hoy en adelante
// (reservas/{ruta}/{fecha}/{turno}[/{metodo}]/{reservaId}), tarjetas regalo
// pagadas sin canjear y, en los bonos, bonos de clientes aún activos
async function comprobarDependencias(claseId, clase = {}) {
  const rutaReservas = clase.reservasPath || claseId;
  const idsTarjeta = [claseId, TALLERES_FIJOS[claseId]?.aliasRegalo].filter(Boolean);

  const [reservasSnap, tarjetasSnap, usuariosSnap] = await Promise.all([
    get(ref(dbRealtime, `reservas/${rutaReservas}`)),
    get(ref(dbRealtime, "tarjetasRegalo")),
    clase.tipoProducto === "bono" ? get(ref(dbRealtime, "usuarios")) : null,
  ]);

  const hoy = hoyISO();
  let reservasFuturas = 0;
  const contar = (reserva) => {
    if (String(reserva.estado || "").toLowerCase() === "confirmada") reservasFuturas += 1;
  };

  reservasSnap.forEach((fechaSnap) => {
    if (fechaSnap.key < hoy) return;

    fechaSnap.forEach((turnoSnap) => {
      turnoSnap.forEach((nivelSnap) => {
        const valor = nivelSnap.val();
        if (pareceReserva(valor)) {
          contar(valor);
          return;
        }
        nivelSnap.forEach((reservaSnap) => {
          const reserva = reservaSnap.val();
          if (pareceReserva(reserva)) contar(reserva);
        });
      });
    });
  });

  let tarjetasPendientes = 0;
  tarjetasSnap.forEach((tarjetaSnap) => {
    const tarjeta = tarjetaSnap.val() || {};
    if (
      idsTarjeta.includes(tarjeta.claseId) &&
      String(tarjeta.estadoPago || "").toLowerCase() === "pagado" &&
      !tarjeta.usado &&
      !tarjeta.canjeado
    ) {
      tarjetasPendientes += 1;
    }
  });

  let bonosActivos = 0;
  usuariosSnap?.forEach((usuarioSnap) => {
    Object.values(usuarioSnap.child("bonos").val() || {}).forEach((bono) => {
      if (bono?.claseId === claseId && obtenerEstadoVisibleBono(bono) === "Activo") {
        bonosActivos += 1;
      }
    });
  });

  return { reservasFuturas, tarjetasPendientes, bonosActivos };
}

export default function AdminTallerForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const idEditar = searchParams.get("id") || "";

  const [cargando, setCargando] = useState(!!idEditar);
  const [form, setForm] = useState(FORMULARIO_VACIO);
  const [claseOriginal, setClaseOriginal] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [imagenesCambiadas, setImagenesCambiadas] = useState(false);
  const [procesandoImagenes, setProcesandoImagenes] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState("");

  // Talleres de siempre sin migrar: tienen página propia, solo fotos y portada
  const esFijo = !!idEditar && !!claseOriginal && !claseOriginal.dinamica;
  const esNuevo = !idEditar;
  const esBono = form.tipoProducto === "bono";

  useEffect(() => {
    if (!idEditar) return;

    const cargar = async () => {
      try {
        const [snap, galeria] = await Promise.all([
          get(ref(dbRealtime, `clases/${idEditar}`)),
          cargarGaleria(idEditar),
        ]);

        if (!snap.exists()) {
          setError("No se ha encontrado este taller.");
          return;
        }

        const clase = snap.val() || {};
        setClaseOriginal(clase);
        setForm(formularioDesdeClase(idEditar, clase));
        setImagenes(galeria);
      } catch (err) {
        console.error("Error al cargar el taller:", err);
        setError("No se ha podido cargar el taller.");
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [idEditar]);

  const cambiar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));
  const cambiarAnidado = (campo, clave, valor) =>
    setForm((prev) => ({ ...prev, [campo]: { ...prev[campo], [clave]: valor } }));

  const cambiarNombre = (valor) =>
    setForm((prev) => ({
      ...prev,
      nombre: valor,
      // En un taller nuevo el id sigue al nombre hasta que se edite a mano
      id: esNuevo && (!prev.id || prev.id === generarId(prev.nombre)) ? generarId(valor) : prev.id,
    }));

  const cambiarTipoProducto = (tipo) =>
    setForm((prev) => ({
      ...prev,
      tipoProducto: tipo,
      modalidad: tipo === "bono" ? "unico" : prev.modalidad,
      grupo: tipo === "bono" ? GRUPO_BONOS : prev.grupo === GRUPO_BONOS ? "crear_piezas" : prev.grupo,
    }));

  const cambiarHorario = (dia, valor) =>
    setForm((prev) => ({ ...prev, horarios: { ...prev.horarios, [dia]: valor } }));

  // --- Secciones de texto ---
  const cambiarSeccion = (indice, campo, valor) =>
    setForm((prev) => ({
      ...prev,
      secciones: prev.secciones.map((s, i) => (i === indice ? { ...s, [campo]: valor } : s)),
    }));

  const añadirSeccion = (titulo = "") =>
    setForm((prev) => ({
      ...prev,
      secciones: [...prev.secciones, { titulo, texto: "", items: "", destacada: false }],
    }));

  const moverSeccion = (indice, destino) =>
    setForm((prev) => {
      if (destino < 0 || destino >= prev.secciones.length) return prev;
      const copia = [...prev.secciones];
      const [seccion] = copia.splice(indice, 1);
      copia.splice(destino, 0, seccion);
      return { ...prev, secciones: copia };
    });

  const quitarSeccion = (indice) =>
    setForm((prev) => ({ ...prev, secciones: prev.secciones.filter((_, i) => i !== indice) }));

  // --- Opciones con precio (tipo de pieza, tamaño…) ---
  const cambiarVariante = (indice, campo, valor) =>
    setForm((prev) => ({
      ...prev,
      variantes: prev.variantes.map((v, i) => (i === indice ? { ...v, [campo]: valor } : v)),
    }));

  const añadirVariante = () =>
    setForm((prev) => ({
      ...prev,
      variantes: [...prev.variantes, { id: "", nombre: "", precio: "" }],
    }));

  const quitarVariante = (indice) =>
    setForm((prev) => ({ ...prev, variantes: prev.variantes.filter((_, i) => i !== indice) }));

  const turnosInvalidos = useMemo(
    () =>
      [
        ...DIAS.flatMap(([dia]) => leerTurnos(form.horarios[dia])),
        ...leerTurnos(form.turnos),
      ].filter(turnoInvalido),
    [form.horarios, form.turnos]
  );

  // --- Fotos ---
  const handleSubirImagenes = async (e) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = "";
    if (!archivos.length) return;

    const hueco = MAX_IMAGENES - imagenes.length;
    if (hueco <= 0) {
      setError(`Máximo ${MAX_IMAGENES} fotos por taller.`);
      return;
    }

    setError("");
    setProcesandoImagenes(true);

    try {
      const nuevas = [];
      for (const archivo of archivos.slice(0, hueco)) {
        const { grande } = await comprimirArchivoImagen(archivo);
        nuevas.push({ key: `nueva-${Date.now()}-${nuevas.length}`, src: grande });
      }
      setImagenes((prev) => [...prev, ...nuevas]);
      setImagenesCambiadas(true);

      if (archivos.length > hueco) {
        setError(`Solo se han añadido ${hueco} fotos (máximo ${MAX_IMAGENES}).`);
      }
    } catch (err) {
      console.error("Error al procesar imágenes:", err);
      setError(err?.message || "No se han podido procesar las imágenes.");
    } finally {
      setProcesandoImagenes(false);
    }
  };

  const moverImagen = (indice, destino) => {
    setImagenes((prev) => {
      if (destino < 0 || destino >= prev.length) return prev;
      const copia = [...prev];
      const [img] = copia.splice(indice, 1);
      copia.splice(destino, 0, img);
      return copia;
    });
    setImagenesCambiadas(true);
  };

  const quitarImagen = (indice) => {
    setImagenes((prev) => prev.filter((_, i) => i !== indice));
    setImagenesCambiadas(true);
  };

  const validar = () => {
    if (esFijo) return "";
    if (!form.nombre.trim()) return "El nombre es obligatorio.";
    if (!form.id) return "El identificador es obligatorio.";

    if (esBono) {
      if (!numeroPositivo(form.precioUnico)) return "Indica el precio del bono.";
      if (!numeroPositivo(form.bono.numeroClases)) return "Indica cuántas clases tiene el bono.";
    } else if (form.modalidad === "metodos") {
      const marcados = METODOS_TALLER.filter((m) => form.metodos[m.id]);
      if (!marcados.length) return "Elige al menos un método (torno, modelado…).";
      const sinPrecio = marcados.find((m) => !numeroPositivo(form.precios[m.clavePrecio]));
      if (sinPrecio) return `Indica el precio de «${sinPrecio.nombre}».`;
    } else if (form.modalidad === "variante") {
      if (!form.variantes.length) return "Añade al menos una opción con precio.";
      const incompleta = form.variantes.find(
        (v) => !v.nombre.trim() || !numeroPositivo(v.precio)
      );
      if (incompleta) return "Cada opción necesita nombre y precio.";
      if (!METODOS_TALLER.slice(0, 2).some((m) => form.metodos[m.id])) {
        return "Elige si se hace con torno, a mano o ambos.";
      }
    } else if (!numeroPositivo(form.precioUnico)) {
      return "Indica el precio del taller.";
    }

    if (!esBono && !numeroPositivo(form.maxTotales)) {
      return "Indica el máximo de plazas por turno.";
    }
    if (turnosInvalidos.length) {
      return `Revisa los turnos (formato 17:30-20:30): ${turnosInvalidos.join(", ")}`;
    }
    if (!DIAS.some(([dia]) => leerTurnos(form.horarios[dia]).length)) {
      return "Añade al menos un día con turnos para que se pueda reservar.";
    }
    return "";
  };

  const guardarImagenes = async (id) => {
    const imagenesRef = ref(dbRealtime, `imagenesClases/${id}`);

    if (!imagenes.length) {
      await set(imagenesRef, null);
      return;
    }

    const galeria = {};
    imagenes.forEach((img, indice) => {
      const key = img.key.startsWith("nueva-") ? `img${Date.now()}${indice}` : img.key;
      galeria[key] = { src: img.src, orden: indice };
    });

    await set(imagenesRef, {
      miniatura: await reducirImagen(imagenes[0].src, {
        maxLado: LADO_MINIATURA,
        calidad: 0.75,
      }),
      galeria,
      actualizadoEn: new Date().toISOString(),
    });
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    const errorValidacion = validar();
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setGuardando(true);

    try {
      const id = esNuevo ? form.id : idEditar;
      const ahora = new Date().toISOString();

      if (esNuevo) {
        const existente = await get(ref(dbRealtime, `clases/${id}`));
        if (existente.exists()) {
          setError("Ya existe un taller con ese identificador. Cambia el nombre o el identificador.");
          setGuardando(false);
          return;
        }
      }

      if (esFijo) {
        await update(ref(dbRealtime, `clases/${id}`), {
          enPortada: !!form.enPortada,
          ...(form.orden === "" ? {} : { orden: Number(form.orden) }),
          actualizadoEn: ahora,
        });
      } else {
        await update(ref(dbRealtime, `clases/${id}`), {
          ...construirFicha(form, claseOriginal || {}),
          ...(esNuevo ? { creadoEn: ahora } : {}),
          actualizadoEn: ahora,
        });
      }

      if (esNuevo || imagenesCambiadas) {
        await guardarImagenes(id);
        setImagenesCambiadas(false);
      }

      if (esNuevo) {
        navigate(`/admin-taller?id=${id}`, { replace: true });
      }
      setMensaje("Taller guardado correctamente.");
    } catch (err) {
      console.error("Error al guardar el taller:", err);
      setError(
        err?.code === "PERMISSION_DENIED" || /permission/i.test(err?.message || "")
          ? "No tienes permiso para guardar talleres con esta cuenta."
          : "No se ha podido guardar el taller."
      );
    } finally {
      setGuardando(false);
    }
  };

  const handleBorrar = async () => {
    setErrorBorrado("");
    setMensaje("");
    setBorrando(true);

    try {
      const { reservasFuturas, tarjetasPendientes, bonosActivos } = await comprobarDependencias(
        idEditar,
        claseOriginal || {}
      );

      if (reservasFuturas || tarjetasPendientes || bonosActivos) {
        const motivos = [
          reservasFuturas &&
            `${reservasFuturas} ${reservasFuturas === 1 ? "reserva confirmada" : "reservas confirmadas"} de hoy en adelante`,
          tarjetasPendientes &&
            `${tarjetasPendientes} ${tarjetasPendientes === 1 ? "tarjeta regalo" : "tarjetas regalo"} sin canjear`,
          bonosActivos &&
            `${bonosActivos} ${bonosActivos === 1 ? "bono activo" : "bonos activos"} de clientes`,
        ]
          .filter(Boolean)
          .join(", ");

        setErrorBorrado(
          `No se puede borrar: tiene ${motivos}. Ponlo en «Oculto» para que deje de verse sin perder nada.`
        );
        return;
      }

      const confirmado = window.confirm(
        `¿Borrar «${form.nombre || idEditar}» definitivamente?\n\nSe eliminan su ficha, sus fotos y sus notas internas. Las reservas pasadas se conservan. No se puede deshacer.`
      );
      if (!confirmado) return;

      await update(ref(dbRealtime), {
        [`clases/${idEditar}`]: null,
        [`imagenesClases/${idEditar}`]: null,
        [`clasesNotas/${idEditar}`]: null,
      });

      navigate("/admin-clases-nuevo", { replace: true });
    } catch (err) {
      console.error("Error al borrar el taller:", err);
      setErrorBorrado(
        /permission/i.test(err?.message || "")
          ? "No tienes permiso para borrar talleres con esta cuenta."
          : "No se ha podido borrar el taller."
      );
    } finally {
      setBorrando(false);
    }
  };

  const rutaPublica = esFijo ? TALLERES_FIJOS[idEditar]?.ruta : `/taller/${idEditar}`;

  if (cargando) {
    return <p className="text-center text-gray-500 py-16">Cargando taller...</p>;
  }

  const input = "w-full border border-gray-300 rounded-xl px-3 py-2 text-base bg-white";
  const label = "block font-bold text-sm mb-1 text-[#3d3126]";
  const seccion = "bg-white rounded-2xl border border-[#eadfbe] p-5 shadow-sm space-y-4";
  const botonMini =
    "px-2.5 py-1 rounded-lg border border-[#eadfbe] bg-[#fffaf0] text-sm disabled:opacity-30";

  const gruposDisponibles = esBono
    ? GRUPOS_TALLER.filter((g) => g.id === GRUPO_BONOS)
    : GRUPOS_TALLER_NUEVO;
  const conMetodoOVariante = !esBono && (form.modalidad === "metodos" || form.modalidad === "variante");

  return (
    <div className="bg-[#fffef4] min-h-screen px-4 py-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <BotonVolver volverA="/admin-clases-nuevo" />

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-[#3d3126] font-serif">
            {esNuevo
              ? "Añadir taller nuevo"
              : esFijo
              ? `Fotos y portada · ${claseOriginal?.nombre || TALLERES_FIJOS[idEditar]?.nombre || idEditar}`
              : `Editar ${esBono ? "bono" : "taller"} · ${form.nombre || idEditar}`}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {esFijo
              ? "Este taller todavía tiene su página hecha a mano. Aquí puedes cambiar la foto de la portada y si aparece en ella."
              : "El taller tiene su propia página, se puede reservar y pagar online y sale en la portada y en su categoría."}
          </p>
          {!esNuevo && rutaPublica && (
            <Link to={rutaPublica} className="inline-block mt-2 text-sm text-blue-700 underline">
              Ver la página del taller →
            </Link>
          )}
          {esFijo && (
            <p className="text-sm text-gray-700 mt-3 bg-[#fff8df] border border-[#f1e7c6] rounded-xl p-3">
              Para editar todo, ocultarlo o borrarlo como el resto, primero hay que{" "}
              <Link to="/admin-migrar-talleres" className="text-blue-700 underline">
                migrarlo al panel
              </Link>
              .
            </p>
          )}
        </div>

        <form onSubmit={handleGuardar} className="space-y-5">
          {!esFijo && (
            <section className={seccion}>
              <h2 className="text-lg font-semibold text-[#3d3126]">Datos del taller</h2>

              {esNuevo && (
                <div>
                  <label htmlFor="taller-tipo" className={label}>Qué vas a crear</label>
                  <select
                    id="taller-tipo"
                    className={input}
                    value={form.tipoProducto}
                    onChange={(e) => cambiarTipoProducto(e.target.value)}
                  >
                    <option value="taller">Taller (se reserva una fecha)</option>
                    <option value="bono">Bono mensual (varias clases en un mes)</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="taller-nombre" className={label}>Nombre</label>
                <input
                  id="taller-nombre"
                  className={input}
                  value={form.nombre}
                  onChange={(e) => cambiarNombre(e.target.value)}
                  placeholder="Ej.: Crea tu set de café"
                  required
                />
              </div>

              <div>
                <label htmlFor="taller-id" className={label}>Identificador</label>
                <input
                  id="taller-id"
                  className={`${input} ${esNuevo ? "" : "bg-gray-100 text-gray-500"}`}
                  value={form.id}
                  onChange={(e) => cambiar("id", generarId(e.target.value))}
                  disabled={!esNuevo}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se usa en la dirección (/taller/{form.id || "…"}) y en las reservas. No se puede cambiar después.
                </p>
              </div>

              <div>
                <label htmlFor="taller-grupo" className={label}>Categoría</label>
                <select
                  id="taller-grupo"
                  className={input}
                  value={esBono ? GRUPO_BONOS : form.grupo}
                  onChange={(e) => cambiar("grupo", e.target.value)}
                  disabled={esBono}
                >
                  {gruposDisponibles.map((g) => (
                    <option key={g.id} value={g.id}>{g.titulo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="taller-corta" className={label}>Descripción corta</label>
                <textarea
                  id="taller-corta"
                  className={input}
                  rows={2}
                  value={form.descripcionCorta}
                  onChange={(e) => cambiar("descripcionCorta", e.target.value)}
                  placeholder="Se ve en la portada y en los listados"
                />
              </div>

              <div>
                <label htmlFor="taller-larga" className={label}>Descripción completa</label>
                <textarea
                  id="taller-larga"
                  className={input}
                  rows={5}
                  value={form.descripcionLarga}
                  onChange={(e) => cambiar("descripcionLarga", e.target.value)}
                />
              </div>

              {!esBono && (
                <div className="sm:w-1/2">
                  <label htmlFor="taller-sesiones" className={label}>Sesiones</label>
                  <input
                    id="taller-sesiones"
                    type="number"
                    min="1"
                    className={input}
                    value={form.sesiones}
                    onChange={(e) => cambiar("sesiones", e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Con 2 o más, la reserva guarda el aviso de que la segunda sesión
                    se habilita 4 semanas después de la primera.
                  </p>
                </div>
              )}
            </section>
          )}

          {!esFijo && (
            <section className={seccion}>
              <h2 className="text-lg font-semibold text-[#3d3126]">Secciones de la página</h2>
              <p className="text-sm text-gray-600">
                Bloques de texto que salen bajo la descripción, en este orden:
                «Qué aprenderás», «Qué incluye», «Duración», «Entrega de tu pieza»…
                Cada uno puede llevar un título, texto (separa los párrafos con
                una línea en blanco) y una lista, y puede destacarse en una caja.
              </p>

              <div className="space-y-3">
                {form.secciones.map((s, indice) => (
                  <div key={indice} className="rounded-xl border border-[#eadfbe] bg-[#fffaf0] p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-500">
                        Sección {indice + 1}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className={botonMini}
                          onClick={() => moverSeccion(indice, indice - 1)}
                          disabled={indice === 0}
                          aria-label="Subir sección"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className={botonMini}
                          onClick={() => moverSeccion(indice, indice + 1)}
                          disabled={indice === form.secciones.length - 1}
                          aria-label="Bajar sección"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          className={`${botonMini} text-red-600`}
                          onClick={() => quitarSeccion(indice)}
                          aria-label="Quitar sección"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <input
                      className={input}
                      value={s.titulo}
                      onChange={(e) => cambiarSeccion(indice, "titulo", e.target.value)}
                      placeholder="Título (opcional), p. ej. Qué incluye"
                      aria-label={`Título de la sección ${indice + 1}`}
                    />
                    <textarea
                      className={input}
                      rows={3}
                      value={s.texto}
                      onChange={(e) => cambiarSeccion(indice, "texto", e.target.value)}
                      placeholder="Texto"
                      aria-label={`Texto de la sección ${indice + 1}`}
                    />
                    <textarea
                      className={input}
                      rows={3}
                      value={s.items}
                      onChange={(e) => cambiarSeccion(indice, "items", e.target.value)}
                      placeholder={"Lista (una cosa por línea)"}
                      aria-label={`Lista de la sección ${indice + 1}`}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={s.destacada}
                        onChange={(e) => cambiarSeccion(indice, "destacada", e.target.checked)}
                      />
                      Destacar en una caja
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className={botonMini} onClick={() => añadirSeccion()}>
                  ➕ Añadir sección
                </button>
                <button type="button" className={botonMini} onClick={() => añadirSeccion("Qué incluye")}>
                  ➕ Qué incluye
                </button>
                <button type="button" className={botonMini} onClick={() => añadirSeccion("Duración")}>
                  ➕ Duración
                </button>
              </div>

              <div>
                <label htmlFor="taller-nota" className={label}>Nota importante (opcional)</label>
                <textarea
                  id="taller-nota"
                  className={input}
                  rows={2}
                  value={form.notaImportante}
                  onChange={(e) => cambiar("notaImportante", e.target.value)}
                  placeholder="Si se deja vacío se muestra el aviso habitual sobre tarifas"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.mostrarAvisos}
                  onChange={(e) => cambiar("mostrarAvisos", e.target.checked)}
                />
                Mostrar al final la nota importante y el aviso «Antes de reservar»
              </label>
            </section>
          )}

          {!esFijo && (
            <section className={seccion}>
              <h2 className="text-lg font-semibold text-[#3d3126]">
                {esBono ? "Precio y características del bono" : "Precio y plazas"}
              </h2>

              {!esBono && (
                <div className="flex flex-col gap-2">
                  {[
                    ["metodos", "Torno, modelado a mano o decoración, cada uno con su precio"],
                    ["variante", "Un precio por tipo o tamaño (con torno o a mano)"],
                    ["unico", "Precio único (sin elegir método)"],
                  ].map(([valor, texto]) => (
                    <label key={valor} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="modalidad"
                        checked={form.modalidad === valor}
                        onChange={() => cambiar("modalidad", valor)}
                      />
                      {texto}
                    </label>
                  ))}
                </div>
              )}

              {!esBono && form.modalidad === "metodos" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {METODOS_TALLER.map((m) => (
                    <div key={m.id}>
                      <label className="flex items-center gap-2 font-bold text-sm mb-1">
                        <input
                          type="checkbox"
                          checked={!!form.metodos[m.id]}
                          onChange={(e) => cambiarAnidado("metodos", m.id, e.target.checked)}
                        />
                        {m.nombre} (€)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        className={input}
                        value={form.precios[m.clavePrecio]}
                        onChange={(e) => cambiarAnidado("precios", m.clavePrecio, e.target.value)}
                        disabled={!form.metodos[m.id]}
                        aria-label={`Precio ${m.nombre}`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {!esBono && form.modalidad === "variante" && (
                <div className="space-y-3">
                  <div className="sm:w-1/2">
                    <label htmlFor="taller-etiqueta" className={label}>Qué se elige</label>
                    <input
                      id="taller-etiqueta"
                      className={input}
                      value={form.varianteEtiqueta}
                      onChange={(e) => cambiar("varianteEtiqueta", e.target.value)}
                      placeholder="Tipo de pieza, Tamaño…"
                    />
                  </div>

                  {form.variantes.map((v, indice) => (
                    <div key={indice} className="grid grid-cols-[1fr_110px_auto] gap-2 items-center">
                      <input
                        className={input}
                        value={v.nombre}
                        onChange={(e) => cambiarVariante(indice, "nombre", e.target.value)}
                        placeholder="Nombre de la opción"
                        aria-label={`Nombre de la opción ${indice + 1}`}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        className={input}
                        value={v.precio}
                        onChange={(e) => cambiarVariante(indice, "precio", e.target.value)}
                        placeholder="€"
                        aria-label={`Precio de la opción ${indice + 1}`}
                      />
                      <button
                        type="button"
                        className={`${botonMini} text-red-600`}
                        onClick={() => quitarVariante(indice)}
                        aria-label="Quitar opción"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <button type="button" className={botonMini} onClick={añadirVariante}>
                    ➕ Añadir opción
                  </button>

                  <div className="flex flex-wrap gap-4 pt-1">
                    {METODOS_TALLER.slice(0, 2).map((m) => (
                      <label key={m.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!form.metodos[m.id]}
                          onChange={(e) => cambiarAnidado("metodos", m.id, e.target.checked)}
                        />
                        Se puede hacer con {m.nombre.toLowerCase()}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {(esBono || form.modalidad === "unico") && (
                <div className="sm:w-1/2">
                  <label htmlFor="taller-precio" className={label}>
                    {esBono ? "Precio del bono (€)" : "Precio (€ por persona)"}
                  </label>
                  <input
                    id="taller-precio"
                    type="number"
                    min="0"
                    step="0.5"
                    className={input}
                    value={form.precioUnico}
                    onChange={(e) => cambiar("precioUnico", e.target.value)}
                  />
                </div>
              )}

              {!esBono && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="taller-max" className={label}>Plazas máximas por turno</label>
                    <input
                      id="taller-max"
                      type="number"
                      min="1"
                      className={input}
                      value={form.maxTotales}
                      onChange={(e) => cambiar("maxTotales", e.target.value)}
                    />
                  </div>
                  {conMetodoOVariante && form.metodos.torno && (
                    <div>
                      <label htmlFor="taller-max-torno" className={label}>De ellas, con torno</label>
                      <input
                        id="taller-max-torno"
                        type="number"
                        min="1"
                        className={input}
                        value={form.maxTorno}
                        onChange={(e) => cambiar("maxTorno", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
              {conMetodoOVariante && (
                <p className="text-xs text-gray-500">
                  Como en el resto de talleres de torno/modelado, las plazas se
                  comparten con las demás clases del mismo turno.
                </p>
              )}

              {esBono && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="bono-clases" className={label}>Clases del bono</label>
                    <input
                      id="bono-clases"
                      type="number"
                      min="1"
                      className={input}
                      value={form.bono.numeroClases}
                      onChange={(e) => cambiarAnidado("bono", "numeroClases", e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="bono-duracion" className={label}>Duración de cada clase</label>
                    <input
                      id="bono-duracion"
                      className={input}
                      value={form.bono.duracionClase}
                      onChange={(e) => cambiarAnidado("bono", "duracionClase", e.target.value)}
                      placeholder="3 horas"
                    />
                  </div>
                  <div>
                    <label htmlFor="bono-modalidad" className={label}>Modalidad</label>
                    <input
                      id="bono-modalidad"
                      className={input}
                      value={form.bono.modalidad}
                      onChange={(e) => cambiarAnidado("bono", "modalidad", e.target.value)}
                      placeholder="torno, modelado a mano…"
                    />
                  </div>
                  <div>
                    <label htmlFor="bono-distribucion" className={label}>Distribución (opcional)</label>
                    <input
                      id="bono-distribucion"
                      className={input}
                      value={form.bono.distribucionClases}
                      onChange={(e) => cambiarAnidado("bono", "distribucionClases", e.target.value)}
                      placeholder="2 torno + 2 decoración"
                    />
                  </div>
                  <div>
                    <label htmlFor="bono-extra" className={label}>
                      Extra por cambiar una clase a torno (€, opcional)
                    </label>
                    <input
                      id="bono-extra"
                      type="number"
                      min="0"
                      step="0.5"
                      className={input}
                      value={form.bono.extraCambioTorno}
                      onChange={(e) => cambiarAnidado("bono", "extraCambioTorno", e.target.value)}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm self-end pb-2">
                    <input
                      type="checkbox"
                      checked={form.bono.incluyeDecoracion}
                      onChange={(e) => cambiarAnidado("bono", "incluyeDecoracion", e.target.checked)}
                    />
                    Incluye clases de decoración
                  </label>
                </div>
              )}
            </section>
          )}

          {!esFijo && (
            <section className={seccion}>
              <h2 className="text-lg font-semibold text-[#3d3126]">Horario semanal</h2>
              <p className="text-sm text-gray-600">
                Escribe los turnos de cada día separados por comas, por ejemplo{" "}
                <code className="bg-gray-100 px-1 rounded">11:30-14:30, 17:30-20:30</code>.
                Deja vacío el día que no haya taller. Las fechas bloqueadas y
                habilitadas desde el panel también se aplican.
              </p>

              <div className="space-y-3">
                {DIAS.map(([dia, nombreDia]) => (
                  <div key={dia} className="grid grid-cols-[88px_1fr] items-center gap-3">
                    <label htmlFor={`horario-${dia}`} className="text-sm font-semibold">
                      {nombreDia}
                    </label>
                    <input
                      id={`horario-${dia}`}
                      className={input}
                      value={form.horarios[dia]}
                      onChange={(e) => cambiarHorario(dia, e.target.value)}
                      placeholder="Sin taller"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor="taller-turnos" className={label}>
                  Turnos para fechas especiales (opcional)
                </label>
                <input
                  id="taller-turnos"
                  className={input}
                  value={form.turnos}
                  onChange={(e) => cambiar("turnos", e.target.value)}
                  placeholder="Si se deja vacío: los turnos del horario semanal"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Son los turnos que se abren cuando habilitas una fecha fuera del
                  horario habitual.
                </p>
              </div>

              {turnosInvalidos.length > 0 && (
                <p className="text-sm text-red-600">
                  Formato no válido: {turnosInvalidos.join(", ")} (usa 17:30-20:30)
                </p>
              )}
            </section>
          )}

          <section className={seccion}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#3d3126]">Fotos</h2>
              <span className="text-xs text-gray-500">
                {imagenes.length}/{MAX_IMAGENES}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              La primera foto es la principal: sale en la portada y en los
              listados. Se reducen automáticamente para que carguen rápido.
            </p>

            {imagenes.length === 0 && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <img
                  src={imagenPorDefecto(idEditar || form.id)}
                  alt=""
                  className="w-20 h-16 object-cover rounded-lg border border-[#eadfbe]"
                />
                {esFijo
                  ? "Sin fotos subidas: se usa la foto actual de su página."
                  : "Sin fotos todavía: se mostrará el logo."}
              </div>
            )}

            {imagenes.length > 0 && (
              <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {imagenes.map((img, indice) => (
                  <li key={img.key} className="rounded-xl border border-[#eadfbe] overflow-hidden bg-[#fffaf0]">
                    <div className="relative aspect-[4/3] bg-gray-100">
                      <img src={img.src} alt={`Foto ${indice + 1}`} className="w-full h-full object-cover" />
                      {indice === 0 && (
                        <span className="absolute left-1 top-1 rounded-full bg-[#F4C542] px-2 py-0.5 text-[11px] font-bold text-[#5c3c00]">
                          Principal
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-1.5 py-1 text-sm">
                      <div className="flex">
                        <button
                          type="button"
                          onClick={() => moverImagen(indice, indice - 1)}
                          disabled={indice === 0}
                          className="px-2 py-1 disabled:opacity-30"
                          aria-label="Mover a la izquierda"
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          onClick={() => moverImagen(indice, indice + 1)}
                          disabled={indice === imagenes.length - 1}
                          className="px-2 py-1 disabled:opacity-30"
                          aria-label="Mover a la derecha"
                        >
                          ▶
                        </button>
                      </div>
                      <span className="text-[11px] text-gray-400">{pesoDataUrlKb(img.src)} KB</span>
                      <button
                        type="button"
                        onClick={() => quitarImagen(indice)}
                        className="px-2 py-1 text-red-600"
                        aria-label="Quitar foto"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <label
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#eadfbe] bg-[#fffaf0] text-sm font-semibold cursor-pointer ${
                imagenes.length >= MAX_IMAGENES || procesandoImagenes ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {procesandoImagenes ? "Procesando fotos..." : "📷 Añadir fotos"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleSubirImagenes}
                disabled={imagenes.length >= MAX_IMAGENES || procesandoImagenes}
              />
            </label>
          </section>

          <section className={seccion}>
            <h2 className="text-lg font-semibold text-[#3d3126]">Visibilidad</h2>

            {!esFijo && (
              <div>
                <label htmlFor="taller-estado" className={label}>Estado</label>
                <select
                  id="taller-estado"
                  className={input}
                  value={form.estado}
                  onChange={(e) => cambiar("estado", e.target.value)}
                >
                  <option value="activa">Activo: se puede ver y reservar</option>
                  <option value="oculta">Oculto: no aparece en la app</option>
                </select>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enPortada}
                onChange={(e) => cambiar("enPortada", e.target.checked)}
              />
              Mostrar en la portada
            </label>

            {!esFijo && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.regalable}
                  onChange={(e) => cambiar("regalable", e.target.checked)}
                />
                Se puede regalar con tarjeta regalo
              </label>
            )}

            <div className="sm:w-1/2">
              <label htmlFor="taller-orden" className={label}>Orden en la portada</label>
              <input
                id="taller-orden"
                type="number"
                className={input}
                value={form.orden}
                onChange={(e) => cambiar("orden", e.target.value)}
                placeholder="Menor = antes"
              />
            </div>

            {esFijo && (
              <p className="text-sm text-gray-600">
                Precios, plazas y horarios de este taller:{" "}
                <Link to={`/admin-detalle-clase?clase=${idEditar}`} className="text-blue-700 underline">
                  ficha de la clase
                </Link>
                .
              </p>
            )}
          </section>

          {error && (
            <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </p>
          )}
          {mensaje && (
            <p className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
              {mensaje}
            </p>
          )}

          <button
            type="submit"
            disabled={guardando || procesandoImagenes}
            className="w-full px-6 py-3 rounded-full text-white font-semibold bg-[#b36a4a] hover:bg-[#9e5c3f] shadow-md disabled:opacity-50"
          >
            {guardando ? "Guardando..." : esNuevo ? "Crear taller" : "Guardar cambios"}
          </button>
        </form>

        {!esNuevo && !esFijo && (
          <section className="mt-8 rounded-2xl border border-red-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold text-red-800">Borrar taller</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Elimina la ficha, las fotos y las notas internas del taller. Solo se
              puede si no tiene reservas confirmadas de hoy en adelante, tarjetas
              regalo sin canjear ni bonos activos de clientes. Las reservas
              pasadas se conservan y siguen apareciendo en «Ver reservas».
            </p>

            {errorBorrado && (
              <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                {errorBorrado}
              </p>
            )}

            <button
              type="button"
              onClick={handleBorrar}
              disabled={borrando || guardando}
              className="px-5 py-2.5 rounded-full border border-red-300 bg-white text-red-700 font-semibold hover:bg-red-50 disabled:opacity-50"
            >
              {borrando ? "Comprobando..." : "Borrar taller"}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
