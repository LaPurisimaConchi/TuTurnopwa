// src/TallerDinamico.jsx
// Página de un taller creado desde el panel admin (clases/{id} con dinamica: true)
import React, { useEffect, useState } from "react";
import Icono from "./components/Icono";
import { useNavigate, useParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonReserva from "./BotonReserva";
import { resumenHorarios } from "./utils/turnosTaller";
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
import { useConfigEspacio } from "./configuracionEspacio";
import { edicionesReservables, esMonografico } from "./utils/monografico";
import { fechaDMA, hoyMadrid } from "./utils/formatoFecha";

const NOTA_TARIFAS =
  "Las tarifas están sujetas a cambios. Si no asistes a tu formación en la fecha original y deseas reprogramarla cuando las tarifas hayan cambiado, deberás abonar la diferencia o elegir una formación acorde a la cantidad ya pagada.";

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
  const { config: configEspacio } = useConfigEspacio();
  const navigate = useNavigate();
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
  const horarios = resumenHorarios(clase);

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

  const [elegidas, setElegidas] = useState(() =>
    Object.fromEntries(grupos.map((g) => [g.clave, g.opciones[0]?.id || ""]))
  );

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
                    <img
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

            {grupos.length > 0 && (
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
                  Lo que elijas llegará marcado a la reserva; allí también puedes cambiarlo.
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

            {!esMonografico(clase) && horarios.length > 0 && (
              <div className="mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-tinta mb-2">
                  Horarios
                </h2>
                <ul className="text-sm text-tinta space-y-1">
                  {horarios.map((fila) => (
                    <li key={fila.dias}>
                      <strong>{fila.dias}:</strong> {fila.turnos}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-tinta-suave mt-2">
                  Los días con plaza se ven en el calendario al reservar.
                </p>
              </div>
            )}

            <div className="mt-3">
              <div className="hidden md:block">
                <BotonReserva
                  destino={destinoReserva}
                  className="shrink-0 !py-3 !mb-3"
                  texto={esBono ? "Comprar bono" : "Reservar ahora"}
                  disabled={faltaOpcion}
                />
              </div>
              {faltaOpcion && (
                <p className="text-xs text-tinta-suave mb-3" role="status">
                  Elige una opción de «{grupoSinElegir.etiqueta}» para poder reservar.
                </p>
              )}
              {exigeCuenta(clase) && (
                <p className="text-xs text-tinta-suave mt-2">
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
                className="w-full px-4 py-2 rounded-full border border-mostaza-borde text-tinta font-semibold text-sm hover:bg-mostaza-suave transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icono nombre="usuarios" className="mr-1" />Reservar para grupo ({configEspacio.minPersonasGrupo} o más)
              </button>
            )}

            {clase.regalable !== false && (
              <button
                type="button"
                onClick={() =>
                  navigate(`/comprar-tarjeta-regalo?taller=${encodeURIComponent(claseId)}`)
                }
                className="w-full px-4 py-2 rounded-full border border-terracota text-terracota font-semibold text-sm hover:bg-terracota-suave transition"
              >
                <Icono nombre="regalo" className="mr-1" />Regalar este taller
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
      <div className="md:hidden sticky bottom-0 z-30 -mb-6 mt-4 w-screen ml-[calc(50%-50vw)] flex items-center gap-3 border-t border-linea bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        {precioMostrado > 0 && (
          <div className="shrink-0 leading-tight">
            <p className="text-[11px] text-tinta-suave">{esDesde ? "Desde" : "Precio"}</p>
            <p className="text-lg font-bold text-tinta">{formatearEuros(precioMostrado)}</p>
          </div>
        )}
        <BotonReserva
          destino={destinoReserva}
          className="!mb-0 !py-3"
          texto={esBono ? "Comprar bono" : "Reservar ahora"}
          disabled={faltaOpcion}
        />
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
            <img
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
