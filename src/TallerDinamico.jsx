// src/TallerDinamico.jsx
// Página de un taller creado desde el panel admin (clases/{id} con dinamica: true)
import React, { useEffect, useRef, useState } from "react";
import Icono from "./components/Icono";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import { NOMBRE_WEB } from "./utils/titulos";
import BotonReserva from "./BotonReserva";
import { FormularioReserva } from "./ReservaTallerDinamico";
import ReservaBonoDinamico from "./ReservaBonoDinamico";
import PantallaConVolver from "./PantallaConVolver";
import {
  cargarGaleria,
  estadoPublico,
  exigeCuenta,
  formatearEuros,
  metodosDelTaller,
  precioDesde,
  variantesDelTaller,
} from "./catalogoTalleres";
import { edicionesReservables, esMonografico } from "./utils/monografico";
import { diasCaducidadBono } from "./utils/estadoBono";
import { fechaDMA, hoyMadrid } from "./utils/formatoFecha";

const NOTA_TARIFAS =
  "Las tarifas están sujetas a cambios. Si no asistes a tu formación en la fecha original y deseas reprogramarla cuando las tarifas hayan cambiado, deberás abonar la diferencia o elegir una formación acorde a la cantidad ya pagada.";

// Patrón de corazones y confeti (rojo translúcido) para el botón de regalo
const PATRON_REGALO =
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'44\' height=\'40\'%3E%3Cg fill=\'%23d62839\' fill-opacity=\'.13\'%3E%3Cpath d=\'M11 17c-5-3.4-6-6.6-3.6-8.4 1.7-1.2 3.2-.4 3.6 1 .4-1.4 1.9-2.2 3.6-1C17 10.400 16 13.600 11 17z\'/%3E%3Cpath d=\'M34 33c-3.300-2.300-4-4.400-2.400-5.600 1.100-.8 2.100-.3 2.400.7.300-1 1.300-1.500 2.400-.7C38 28.600 37.300 30.700 34 33z\'/%3E%3Ccircle cx=\'30\' cy=\'9\' r=\'1.6\'/%3E%3Ccircle cx=\'6\' cy=\'31\' r=\'1.3\'/%3E%3C/g%3E%3Cg stroke=\'%23d62839\' stroke-opacity=\'.13\' stroke-width=\'1.6\' stroke-linecap=\'round\'%3E%3Cpath d=\'M22 22l3-2M38 15l2.500 2M17 35l2-2.500\'/%3E%3C/g%3E%3C/svg%3E")';

export default function TallerDinamico() {
  const { claseId } = useParams();
  const navigate = useNavigate();

  const [cargando, setCargando] = useState(true);
  const [clase, setClase] = useState(null);
  const [imagenes, setImagenes] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const [snap, galeria] = await Promise.all([
          get(ref(dbRealtime, `clases/${claseId}`)),
          cargarGaleria(claseId).catch(() => []),
        ]);

        const datos = snap.exists() ? snap.val() : null;
        setClase(datos?.dinamica ? datos : null);
        setImagenes(galeria.map((img) => img.src).filter(Boolean));
      } catch (error) {
        console.error("Error al cargar el taller:", error);
        setClase(null);
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [claseId]);

  // La pestaña lleva el nombre del taller
  useEffect(() => {
    if (clase?.nombre) document.title = `${clase.nombre} · ${NOMBRE_WEB}`;
  }, [clase?.nombre]);

  if (cargando) {
    return (
      <PantallaConVolver>
        <p className="text-center text-tinta-suave py-16">Cargando taller...</p>
      </PantallaConVolver>
    );
  }

  if (!clase || estadoPublico(clase) !== "activa") {
    return (
      <PantallaConVolver>
        <div className="bg-white text-[#333] font-sans max-w-3xl w-full mx-auto shadow-md rounded-2xl overflow-hidden p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-tinta mb-4">
            Este taller no está disponible ahora mismo
          </h1>
          <p className="text-sm text-tinta leading-relaxed mb-6">
            Este taller está temporalmente oculto o pausado y no puede reservarse
            en este momento.
          </p>
          <button
            onClick={() => navigate("/clases")}
            className="px-6 py-3 rounded-full bg-terracota text-white font-semibold hover:bg-terracota-oscuro transition"
          >
            Volver a talleres
          </button>
        </div>
      </PantallaConVolver>
    );
  }

  return <VistaTaller claseId={claseId} clase={clase} imagenes={imagenes} />;
}

// La página del taller, ya con sus datos cargados
export function VistaTaller({ claseId, clase, imagenes = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [imagenActiva, setImagenActiva] = useState(imagenes[0] || "");
  const [modalAbierto, setModalAbierto] = useState(false);
  const esBono = clase.tipoProducto === "bono";
  const edicionesAbiertas = edicionesReservables(clase, hoyMadrid());
  const variantes = variantesDelTaller(clase);
  const metodosDelProducto = metodosDelTaller(clase);
  const metodos = variantes.length ? [] : metodosDelProducto;
  const desde = precioDesde(clase);
  const preciosIguales =
    new Set((variantes.length ? variantes : metodos).map((m) => m.precio)).size <= 1;
  const sesiones = Number(clase.sesiones || 1);
  const secciones = Array.isArray(clase.secciones) ? clase.secciones : [];
  // Fichas creadas antes de las secciones: lista de «incluye» y duración sueltas
  const incluye =
    !secciones.length && Array.isArray(clase.incluye) ? clase.incluye.filter(Boolean) : [];
  const mostrarAvisos = clase.mostrarAvisos !== false;

  // Los talleres y los bonos se reservan aquí mismo, en el panel de reserva de la
  // ficha. Los monográficos (ediciones con fechas fijas) siguen con su pantalla
  const reservaEnFicha = !esMonografico(clase);
  const desdeTarjeta = !!(location.state?.desdeTarjeta || location.state?.desdeTarjetaRegalo);
  const panelRef = useRef(null);
  const [panelVisible, setPanelVisible] = useState(false);

  // Lo que se elige aquí y llega marcado a la reserva: el tipo o tamaño (variante)
  // y/o el método. Con variantes, el método no cambia el precio pero sí se elige.
  // La primera opción de cada grupo viene elegida de entrada
  const grupos = [
    variantes.length > 0 && {
      clave: "variante",
      etiqueta: clase.variante?.etiqueta || "Opción",
      opciones: variantes,
    },
    // Con tipo o tamaño, el método se muestra aunque solo haya uno (para ver su extra)
    !esBono &&
      (metodosDelProducto.length > 1 || (variantes.length > 0 && metodosDelProducto.length === 1)) && {
        clave: "metodo",
        etiqueta: "Método",
        opciones: metodosDelProducto,
      },
  ].filter(Boolean);

  // (?variante= / ?metodo= vienen de enlaces antiguos a la reserva o de «volver»)
  const [elegidas, setElegidas] = useState(() => {
    const url = new URLSearchParams(location.search);
    return Object.fromEntries(
      grupos.map((g) => {
        const deUrl = g.opciones.find((o) => o.id === url.get(g.clave))?.id;
        return [g.clave, deUrl || g.opciones[0]?.id || ""];
      })
    );
  });

  // Con opciones que elegir, reservar necesita que haya una elegida en cada grupo
  // Precio según lo elegido (tipo o tamaño + extra del método); si no se puede
  // saber, el «desde» de siempre
  const varianteElegida = variantes.find((v) => v.id === elegidas.variante);
  const metodoElegido = metodosDelProducto.find((m) => m.id === elegidas.metodo);
  const precioExacto = varianteElegida
    ? varianteElegida.precio + (metodoElegido?.extra || 0)
    : !variantes.length && metodoElegido?.precio > 0 && !preciosIguales
    ? metodoElegido.precio
    : 0;
  const precioMostrado = precioExacto > 0 ? precioExacto : desde;
  const esDesde = !(precioExacto > 0) && !preciosIguales;

  const grupoSinElegir = grupos.find((g) => !elegidas[g.clave]);
  const faltaOpcion = !!grupoSinElegir;

  const parametros = new URLSearchParams();
  grupos.forEach((g) => {
    if (elegidas[g.clave]) parametros.set(g.clave, elegidas[g.clave]);
  });
  const destinoGrupo = `/reserva-grupos?taller=${encodeURIComponent(claseId)}${
    parametros.toString() ? `&${parametros.toString()}` : ""
  }`;
  const destinoReserva = `/reservar/${claseId}${
    parametros.toString() ? `?${parametros.toString()}` : ""
  }`;

  const irAReserva = () =>
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Al llegar desde un enlace de reserva (#reservar) se baja hasta el panel
  useEffect(() => {
    if (!reservaEnFicha || location.hash !== "#reservar") return;
    const temporizador = setTimeout(irAReserva, 100);
    return () => clearTimeout(temporizador);
  }, [reservaEnFicha, location.hash]);

  // La barra de «Reservar ahora» del móvil sobra cuando el panel ya está a la vista
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || typeof IntersectionObserver === "undefined") return;
    const observador = new IntersectionObserver(([entrada]) => setPanelVisible(entrada.isIntersecting), {
      threshold: 0.05,
    });
    observador.observe(panel);
    return () => observador.disconnect();
  }, [reservaEnFicha]);

  return (
    <PantallaConVolver recortar={false}>
      <div className="bg-white text-[#333] font-sans max-w-5xl w-full mx-auto shadow-md rounded-3xl overflow-clip">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* En escritorio la foto se queda a la vista mientras se lee el resto */}
          <div className="p-3 sm:p-5 md:sticky md:top-20 md:self-start">
            <button
              type="button"
              onClick={() => imagenActiva && setModalAbierto(true)}
              className="w-full rounded-2xl overflow-hidden bg-crema flex items-center justify-center aspect-[4/3] sm:aspect-[16/10] md:aspect-square"
            >
              <img
                src={imagenActiva || "/img/logoPCsin.png"}
                alt={clase.nombre}
                className={
                  imagenActiva
                    ? "w-full h-full object-cover"
                    : "w-40 opacity-80"
                }
              />
            </button>

            {imagenes.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {imagenes.map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setImagenActiva(img)}
                    className={`shrink-0 rounded-xl overflow-hidden border-2 w-16 h-16 sm:w-[72px] sm:h-[72px] ${
                      imagenActiva === img ? "border-terracota" : "border-linea"
                    }`}
                  >
                    <img loading="lazy" decoding="async"
                      src={img}
                      alt={`Miniatura ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {imagenActiva && (
              <p className="text-xs text-tinta-suave mt-1">Toca la foto para verla en grande</p>
            )}
          </div>

          <div className="px-4 pb-6 pt-2 sm:px-6 md:pt-6 flex flex-col justify-start min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-tinta mb-2 leading-tight break-words">
              {clase.nombre}
            </h1>

            {precioMostrado > 0 && (
              <p className="flex items-baseline gap-2 mb-1">
                {esDesde && <span className="text-sm text-tinta-suave">Desde</span>}
                <span className="text-2xl font-bold text-tinta">
                  {formatearEuros(precioMostrado)}
                </span>
                <span className="text-sm text-tinta-suave">{esBono ? "" : "por persona"}</span>
              </p>
            )}

            {grupos.length > 0 && !(reservaEnFicha && desdeTarjeta) && (
              <div className="mt-3 mb-5 space-y-4 rounded-2xl bg-crema border border-linea p-4">
                {grupos.map((grupo) => (
                  <div key={grupo.clave} role="radiogroup" aria-label={grupo.etiqueta}>
                    <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">
                      {grupo.etiqueta}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {grupo.opciones.map((opcion) => {
                        const elegida = elegidas[grupo.clave] === opcion.id;

                        return (
                          <button
                            key={opcion.id}
                            type="button"
                            role="radio"
                            aria-checked={elegida}
                            onClick={() =>
                              setElegidas((previas) => ({ ...previas, [grupo.clave]: opcion.id }))
                            }
                            className={`px-4 py-2 rounded-xl border text-left transition ${
                              elegida
                                ? "bg-terracota border-terracota text-white ring-2 ring-terracota-suave"
                                : "bg-mostaza-suave border-mostaza text-tinta hover:bg-mostaza/40"
                            }`}
                          >
                            <span className="block text-sm font-semibold">{opcion.nombre}</span>
                            {opcion.precio > 0 && (
                              <span className="block text-xs">{formatearEuros(opcion.precio)}</span>
                            )}
                            {opcion.extra > 0 && (
                              <span className="block text-xs">+{formatearEuros(opcion.extra)}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-tinta-suave">
                  {reservaEnFicha
                    ? "Lo que elijas se aplica a la reserva de más abajo."
                    : "Lo que elijas llegará marcado a la reserva; allí también puedes cambiarlo."}
                </p>
              </div>
            )}

            {esMonografico(clase) && edicionesAbiertas.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">
                  Sesiones ({clase.sesionesCurso || edicionesAbiertas[0].fechas.length}{" "}
                  {Number(clase.sesionesCurso || edicionesAbiertas[0].fechas.length) === 1 ? "sesión" : "sesiones"})
                </h2>
                <ul className="text-sm text-tinta space-y-2">
                  {edicionesAbiertas.map((edicion, i) => (
                    <li key={edicion.id}>
                      <strong>Edición {i + 1}:</strong>{" "}
                      {edicion.fechas
                        .map((f) => `${fechaDMA(f.fecha)} (${f.turno.replace("-", " – ")}${f.torno ? ", torno" : ""})`)
                        .join(" · ")}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-tinta-suave mt-2">
                  Se reserva la edición completa, con todas sus sesiones.
                </p>
              </div>
            )}


            {esBono && (
              <div className="mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">Validez</h2>
                {/* La misma regla con la que caduca el bono (src/utils/estadoBono.js) */}
                <p className="text-sm text-tinta">
                  {diasCaducidadBono(clase)} días desde tu primera clase, que eliges al comprarlo.
                </p>
              </div>
            )}

            <div className="mt-3">
              {reservaEnFicha ? (
                <div id="reservar" ref={panelRef} className="scroll-mt-20">
                  {esBono ? (
                    <ReservaBonoDinamico incrustado claseId={claseId} clase={clase} />
                  ) : (
                    <FormularioReserva
                      incrustado
                      claseId={claseId}
                      clase={clase}
                      eleccion={{ variante: elegidas.variante, metodo: elegidas.metodo }}
                    />
                  )}
                </div>
              ) : (
                <div className="hidden md:block">
                  <BotonReserva
                    destino={destinoReserva}
                    className="shrink-0 !py-3 !mb-3"
                    texto={esBono ? "Comprar bono" : "Reservar ahora"}
                    disabled={faltaOpcion}
                  />
                </div>
              )}
              {faltaOpcion && (
                <p className="text-xs text-tinta-suave mb-3" role="status">
                  Elige una opción de «{grupoSinElegir.etiqueta}» para poder reservar.
                </p>
              )}
              {exigeCuenta(clase) && !reservaEnFicha && (
                <p className="text-xs text-tinta-suave mt-2 mb-4">
                  {esBono
                    ? "Para comprar un bono necesitas una cuenta: tus clases se reservan desde tu perfil."
                    : "Para reservar este taller necesitas una cuenta."}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 empty:hidden">
            {!esBono && !esMonografico(clase) && (
              <button
                type="button"
                onClick={() => navigate(destinoGrupo)}
                disabled={faltaOpcion}
                className="relative w-full px-4 py-4 rounded-full bg-mostaza text-tinta hover:bg-mostaza-borde font-bold text-sm shadow-sm transition outline outline-1 outline-dashed outline-tinta/40 -outline-offset-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icono nombre="usuarios" color="currentColor" className="mr-1" />Reservar para grupo
              </button>
            )}

            {clase.regalable !== false && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/comprar-tarjeta-regalo?taller=${encodeURIComponent(claseId)}${
                      parametros.toString() ? `&${parametros.toString()}` : ""
                    }`
                  )
                }
                className="relative overflow-hidden w-full pl-11 pr-3 py-4 rounded-full bg-white text-tinta hover:bg-[#fff1f1] font-bold text-sm shadow-sm transition border border-[#e9c4c8] outline outline-1 outline-dashed outline-[#d62839]/40 -outline-offset-4 before:content-[''] before:absolute before:-inset-y-6 before:left-6 before:w-4 before:-rotate-[28deg] before:bg-[#d62839] before:border-x before:border-[#a81b2b] before:pointer-events-none"
                style={{ backgroundImage: PATRON_REGALO }}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 28 20"
                  className="absolute left-[14px] top-1/2 -translate-y-1/2 w-9 h-7 pointer-events-none"
                >
                  <path d="M14 10C9 1 1 2 3 8c1 3 7 3 11 2zM14 10c5-9 13-8 11-2-1 3-7 3-11 2z" fill="#e63946" stroke="#fff" strokeWidth="1.300" strokeLinejoin="round" />
                  <path d="M14 10l-6 8M14 10l6 8" stroke="#fff" strokeWidth="3.200" strokeLinecap="round" />
                  <path d="M14 10l-6 8M14 10l6 8" stroke="#e63946" strokeWidth="1.600" strokeLinecap="round" />
                  <rect x="11" y="7" width="6" height="6" rx="1.800" fill="#7d1220" stroke="#fff" strokeWidth="1.300" />
                </svg>
                <span className="relative whitespace-nowrap">Regalar este taller</span>
              </button>
            )}
            </div>

            <div className="mb-5 min-w-0 border-t border-linea pt-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">
                {esBono ? "Información del bono" : "Información del taller"}
              </h2>

              {clase.descripcionCorta && (
                <p className="text-sm text-tinta mb-3 leading-relaxed break-words">
                  {clase.descripcionCorta}
                </p>
              )}

              {clase.descripcionLarga && (
                <p className="text-sm text-tinta mb-4 leading-relaxed break-words whitespace-pre-line">
                  {clase.descripcionLarga}
                </p>
              )}

              {secciones.map((seccion, indice) => {
                const items = Array.isArray(seccion.items) ? seccion.items : [];
                const contenido = (
                  <>
                    {seccion.titulo && (
                      <p className="text-sm text-tinta mb-2 font-semibold">
                        {seccion.titulo}:
                      </p>
                    )}
                    {seccion.texto &&
                      String(seccion.texto)
                        .split(/\n{2,}/)
                        .map((parrafo, i) => (
                          <p
                            key={i}
                            className={`text-sm text-tinta leading-relaxed break-words whitespace-pre-line ${
                              seccion.destacada ? "italic mb-2 last:mb-0" : "mb-3"
                            }`}
                          >
                            {parrafo}
                          </p>
                        ))}
                    {items.length > 0 && (
                      <ul className="text-sm text-tinta space-y-2 mb-4 leading-relaxed break-words">
                        {items.map((item, i) => (
                          <li key={i}>• {item}</li>
                        ))}
                      </ul>
                    )}
                  </>
                );

                return seccion.destacada ? (
                  <div
                    key={indice}
                    className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-4"
                  >
                    {contenido}
                  </div>
                ) : (
                  <div key={indice}>{contenido}</div>
                );
              })}

              {incluye.length > 0 && (
                <>
                  <p className="text-sm text-tinta mb-2 font-semibold">
                    Qué incluye:
                  </p>
                  <ul className="text-sm text-tinta space-y-2 mb-4 leading-relaxed break-words">
                    {incluye.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </>
              )}

              {!secciones.length && (clase.duracion || sesiones > 1) && (
                <>
                  <p className="text-sm text-tinta mb-2 font-semibold">
                    Duración:
                  </p>
                  <p className="text-sm text-tinta mb-4 leading-relaxed break-words">
                    {[sesiones > 1 ? `${sesiones} sesiones` : "", clase.duracion]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </>
              )}
            </div>

            {mostrarAvisos && (
              <div className="bg-crema border-l-4 border-mostaza rounded-xl p-4 mb-5">
                <p className="text-sm text-tinta italic mb-2 leading-relaxed break-words">
                  <strong>Nota importante:</strong> {clase.notaImportante || NOTA_TARIFAS}
                </p>

                <p className="text-sm text-tinta italic leading-relaxed break-words">
                  <strong>Antes de reservar:</strong> por favor revisa nuestra
                  Política de Reservas. Al proceder con la reserva, confirmas que
                  has leído y aceptado los términos.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Móvil: el precio y el botón de reservar siempre a mano, a todo el ancho de la
        pantalla. Es "sticky" dentro de la página, así que al llegar al final se queda
        sobre el pie y no lo tapa */}
      <div
        className={`md:hidden sticky bottom-0 z-30 ${reservaEnFicha && panelVisible ? "hidden" : ""} -mb-6 mt-4 w-screen ml-[calc(50%-50vw)] flex items-center gap-3 border-t border-linea bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur`}
      >
        {precioMostrado > 0 && (
          <div className="shrink-0 leading-tight">
            <p className="text-[11px] text-tinta-suave">{esDesde ? "Desde" : "Precio"}</p>
            <p className="text-lg font-bold text-tinta">{formatearEuros(precioMostrado)}</p>
          </div>
        )}
        {reservaEnFicha ? (
          <button
            type="button"
            onClick={irAReserva}
            className="w-full bg-terracota hover:bg-terracota-oscuro text-white font-semibold px-6 py-3 rounded-full transition"
          >
            {esBono ? "Comprar bono" : "Reservar ahora"}
          </button>
        ) : (
          <BotonReserva
            destino={destinoReserva}
            className="!mb-0 !py-3"
            texto={esBono ? "Comprar bono" : "Reservar ahora"}
            disabled={faltaOpcion}
          />
        )}
      </div>

      {modalAbierto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setModalAbierto(false)}
        >
          <div
            className="relative w-full max-w-4xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalAbierto(false)}
              className="absolute top-2 right-2 bg-white text-black rounded-full w-10 h-10 text-xl font-bold shadow"
            >
              ×
            </button>
            <img loading="lazy" decoding="async"
              src={imagenActiva}
              alt={`${clase.nombre} ampliada`}
              className="w-full max-h-[85vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}
    </PantallaConVolver>
  );
}
