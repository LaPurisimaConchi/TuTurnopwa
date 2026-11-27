import React, { useEffect, useState } from "react";
import { ref, get, push, remove } from "firebase/database";
import { useNavigate, useSearchParams } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";

import { fechaDMA, fechaHoraLegible } from "./utils/formatoFecha";
import EtiquetaInvitado from "./components/EtiquetaInvitado";
import CancelarTarjetaRegalo from "./components/CancelarTarjetaRegalo";
import { AvisoPagoTarjeta, EtiquetaEstadoTarjeta } from "./components/EtiquetasTarjetaRegalo";
import { avisar, preguntar } from "./utils/avisos";

const Bloque = ({ titulo, children }) => (
  <section className="rounded-2xl border border-linea bg-white p-4">
    <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-terracota">{titulo}</h2>
    <dl className="grid gap-3">{children}</dl>
  </section>
);

// Sin valor no se pinta: así no quedan filas con «—»
const Dato = ({ etiqueta, children }) =>
  children ? (
    <div>
      <dt className="text-xs text-tinta-suave">{etiqueta}</dt>
      <dd className="break-words text-sm text-tinta">{children}</dd>
    </div>
  ) : null;

const enlace = "text-left font-semibold text-terracota underline underline-offset-2 hover:text-terracota-oscuro";

const AdminDetalleTarjetaRegaloNuevo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("id");

  const [tarjeta, setTarjeta] = useState(null);
  const [notasInternas, setNotasInternas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [eliminandoNotaId, setEliminandoNotaId] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    const cargarDetalleTarjeta = async () => {
      try {
        const [usuariosSnap, notasSnap] = await Promise.all([
          get(ref(dbRealtime, "usuarios")),
          get(ref(dbRealtime, `reservasNotas/${orderId}/notasInternas`)),
        ]);

        let encontrada = null;

        if (usuariosSnap.exists()) {
          usuariosSnap.forEach((userSnap) => {
            const uid = userSnap.key;
            const userData = userSnap.val() || {};
            const nombreUsuario = userData.nombre || "";
            const invitado = userData.invitado === true;
            const emailUsuario = userData.email || "";
            const tarjetasUsuario = userData.tarjetasRegalo || {};

            Object.entries(tarjetasUsuario).forEach(([tarjetaId, tarjeta]) => {
              const t = tarjeta || {};
              const orderIdReal = t.orderId || tarjetaId;

              if (orderIdReal === orderId && !encontrada) {
                encontrada = {
                  id: tarjetaId,
                  uid,
                  orderId: orderIdReal,
                  clase: t.clase || "Tarjeta regalo",
                  codigo: t.codigo || "",
                  fechaCompra:
                    typeof t.fechaCompra === "string" ? t.fechaCompra : "—",
                  fecha:
                    typeof t.fechaCompra === "string" &&
                    t.fechaCompra.length >= 10
                      ? t.fechaCompra.slice(0, 10)
                      : "—",
                  estado: t.estadoCanje || "pendiente",
                  estadoPago: t.estadoPago || "—",
                  precioTotal: Number(t.precioTotal || 0),
                  precioUnitario: Number(
                    t.precioUnitario || t.precio || t.precioTotal || 0
                  ),
                  plazas: Number(t.plazas || 1),
                  nombreDestinatario: t.nombreDestinatario || "",
                  emailDestinatario: t.emailDestinatario || "",
                  mensajePersonalizado: t.mensajePersonalizado || "",
                  subtipo: t.subtipo || "",
                  tipo: t.tipo || "",
                  numeroClases: Number(t.numeroClases || 0),
                  procesado: t.procesado ?? false,
                  nombreUsuario,
                  invitado,
                  emailUsuario,
                };
              }
            });
          });
        }

        // Sin copia en el perfil del comprador, la tarjeta de verdad está en /tarjetasRegalo
        if (!encontrada) {
          const raizSnap = await get(ref(dbRealtime, `tarjetasRegalo/${orderId}`));
          if (raizSnap.exists()) {
            const t = raizSnap.val() || {};
            const uid = String(t.uidComprador || "");
            const comprador = usuariosSnap.exists() ? usuariosSnap.val()?.[uid] || {} : {};
            encontrada = {
              id: orderId,
              uid,
              orderId,
              clase: t.clase || "Tarjeta regalo",
              codigo: t.codigo || "",
              fechaCompra: typeof t.fechaCompra === "string" ? t.fechaCompra : "—",
              fecha:
                typeof t.fechaCompra === "string" && t.fechaCompra.length >= 10
                  ? t.fechaCompra.slice(0, 10)
                  : "—",
              estado: t.estadoCanje || "pendiente",
              estadoPago: t.estadoPago || "—",
              precioTotal: Number(t.precioTotal || 0),
              precioUnitario: Number(t.precioUnitario || t.precio || t.precioTotal || 0),
              plazas: Number(t.plazas || 1),
              nombreDestinatario: t.nombreDestinatario || "",
              emailDestinatario: t.emailDestinatario || "",
              mensajePersonalizado: t.mensajePersonalizado || "",
              subtipo: t.subtipo || "",
              tipo: t.tipo || "",
              numeroClases: Number(t.numeroClases || 0),
              procesado: t.procesado ?? false,
              nombreUsuario: comprador.nombre || "",
              invitado: comprador.invitado === true,
              emailUsuario: comprador.email || "",
            };
          }
        }

        // El estado que manda para el canje es el de /tarjetasRegalo (la copia del
        // perfil puede ir por detrás)
        if (encontrada) {
          const raiz = (await get(ref(dbRealtime, `tarjetasRegalo/${encontrada.id}`))).val();
          if (raiz) {
            encontrada.estado = raiz.estadoCanje || encontrada.estado;
            encontrada.cancelada = raiz.cancelada === true;
            encontrada.canceladaEn = raiz.canceladaEn || "";
            encontrada.fechaCaducidad = raiz.fechaCaducidad || "";
            encontrada.fechaCanje = raiz.fechaCanje || raiz.fechaUso || "";
            encontrada.fechaReserva = raiz.fechaReserva || "";
            encontrada.turnoReserva = raiz.turnoReserva || "";
            encontrada.sePuedeCancelar =
              !raiz.cancelada &&
              !raiz.usado &&
              !raiz.canjeado &&
              !["usada", "canjeado"].includes(String(raiz.estadoCanje || "").toLowerCase());
          }
        }

        setTarjeta(encontrada);

        const listaNotas = [];
        if (notasSnap.exists()) {
          notasSnap.forEach((notaSnap) => {
            const nota = notaSnap.val();
            if (nota) {
              listaNotas.push({
                id: notaSnap.key,
                texto: nota.texto || "",
                fecha: nota.fecha || "Sin fecha",
              });
            }
          });
        }

        listaNotas.sort((a, b) => {
          const fechaA = new Date(a.fecha || 0);
          const fechaB = new Date(b.fecha || 0);
          return fechaB - fechaA;
        });

        setNotasInternas(listaNotas);
      } catch (error) {
        console.error("Error al cargar detalle de tarjeta regalo:", error);
        setTarjeta(null);
        setNotasInternas([]);
      } finally {
        setCargando(false);
      }
    };

    cargarDetalleTarjeta();
  }, [orderId]);

  const formatearFechaNota = (fecha) => {
    if (!fecha) return "Sin fecha";

    const fechaParseada = new Date(fecha);

    if (!isNaN(fechaParseada.getTime())) {
      return fechaParseada.toLocaleString("es-ES");
    }

    return fecha;
  };

  const guardarNotaInterna = async () => {
    const texto = nuevaNota.trim();

    if (!texto) {
      alert("Escribe una nota antes de guardar.");
      return;
    }

    try {
      setGuardandoNota(true);

      const nota = {
        texto,
        fecha: new Date().toISOString(),
      };

      const nuevaNotaRef = await push(
        ref(dbRealtime, `reservasNotas/${orderId}/notasInternas`),
        nota
      );

      setNotasInternas((prev) => [
        ...prev,
        {
          id: nuevaNotaRef.key,
          ...nota,
        },
      ]);
      setNuevaNota("");
    } catch (error) {
      console.error("Error al guardar nota interna:", error);
      alert("No se pudo guardar la nota interna.");
    } finally {
      setGuardandoNota(false);
    }
  };

  const eliminarNotaInterna = async (notaId) => {
    const confirmar = await preguntar(
      "¿Seguro que quieres borrar esta nota interna?"
    );

    if (!confirmar) return;

    try {
      setEliminandoNotaId(notaId);

      await remove(
        ref(dbRealtime, `reservasNotas/${orderId}/notasInternas/${notaId}`)
      );

      setNotasInternas((prev) => prev.filter((nota) => nota.id !== notaId));
    } catch (error) {
      console.error("Error al borrar la nota interna:", error);
      alert("No se pudo borrar la nota interna.");
    } finally {
      setEliminandoNotaId(null);
    }
  };

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(tarjeta.codigo);
      avisar("Código copiado.", "ok");
    } catch {
      avisar("No se pudo copiar el código.", "error");
    }
  };

  if (cargando) {
    return <p className="p-10 text-center text-tinta-suave">Cargando tarjeta regalo...</p>;
  }

  if (!tarjeta) {
    return <p className="p-10 text-center text-tinta-suave">Tarjeta regalo no encontrada.</p>;
  }

  const hayDestinatario =
    tarjeta.nombreDestinatario || tarjeta.emailDestinatario || tarjeta.mensajePersonalizado;

  return (
    <div className="p-1 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-3 shadow-md sm:p-6">
        <BotonVolver />

        <header className="mb-4 rounded-2xl border border-linea bg-mostaza-suave p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xs font-bold uppercase tracking-wider text-terracota">Tarjeta regalo</h1>
            <div className="flex flex-wrap gap-1">
              <EtiquetaEstadoTarjeta tarjeta={tarjeta} />
              <AvisoPagoTarjeta tarjeta={tarjeta} />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="break-all font-mono text-xl font-bold tracking-wide text-tinta sm:text-2xl">
              {tarjeta.codigo || "Sin código"}
            </p>
            {tarjeta.codigo && (
              <button
                type="button"
                onClick={copiarCodigo}
                className="rounded-full border border-linea bg-white px-3 py-1 text-xs font-semibold text-tinta"
              >
                Copiar
              </button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <button
                type="button"
                className={enlace}
                onClick={() =>
                  navigate(
                    `/admin-detalle-clase?clase=${encodeURIComponent(
                      tarjeta.clase || ""
                    )}&nombre=${encodeURIComponent(tarjeta.clase || "")}`
                  )
                }
              >
                {tarjeta.clase}
              </button>
              <p className="text-sm text-tinta-suave">
                {[
                  tarjeta.subtipo,
                  `${tarjeta.plazas} ${tarjeta.plazas === 1 ? "plaza" : "plazas"}`,
                  tarjeta.numeroClases > 0 && `${tarjeta.numeroClases} clases`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <p className="text-2xl font-bold text-tinta">{tarjeta.precioTotal} €</p>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Bloque titulo="Fechas">
            <Dato etiqueta="Comprada">{tarjeta.fecha !== "—" && fechaDMA(tarjeta.fecha)}</Dato>
            <Dato etiqueta="Válida hasta">
              {tarjeta.fechaCaducidad && fechaDMA(tarjeta.fechaCaducidad)}
            </Dato>
            <Dato etiqueta="Canjeada">
              {tarjeta.fechaCanje && fechaHoraLegible(tarjeta.fechaCanje)}
            </Dato>
            <Dato etiqueta="Reservó al canjear">
              {tarjeta.fechaCanje &&
                tarjeta.fechaReserva &&
                [fechaDMA(tarjeta.fechaReserva), tarjeta.turnoReserva].filter(Boolean).join(" · ")}
            </Dato>
            <Dato etiqueta="Cancelada">
              {tarjeta.canceladaEn && fechaHoraLegible(tarjeta.canceladaEn)}
            </Dato>
          </Bloque>

          <Bloque titulo="Comprador">
            <Dato etiqueta="Nombre">
              <button
                type="button"
                className={enlace}
                onClick={() => navigate(`/admin-detalle-usuario?uid=${tarjeta.uid}`)}
              >
                {tarjeta.nombreUsuario || "Ver usuario"}
              </button>
              <EtiquetaInvitado invitado={tarjeta.invitado} />
            </Dato>
            <Dato etiqueta="Email">{tarjeta.emailUsuario}</Dato>
          </Bloque>

          {hayDestinatario && (
            <div className="sm:col-span-2">
              <Bloque titulo="Para quién es">
                <Dato etiqueta="Nombre">{tarjeta.nombreDestinatario}</Dato>
                <Dato etiqueta="Email">{tarjeta.emailDestinatario}</Dato>
                <Dato etiqueta="Mensaje">
                  {tarjeta.mensajePersonalizado && (
                    <span className="whitespace-pre-wrap italic">«{tarjeta.mensajePersonalizado}»</span>
                  )}
                </Dato>
              </Bloque>
            </div>
          )}
        </div>

        <details className="mt-4 rounded-2xl border border-linea px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-tinta-suave">Datos técnicos</summary>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Dato etiqueta="Número de pedido">{tarjeta.orderId}</Dato>
            <Dato etiqueta="UID del comprador">{tarjeta.uid}</Dato>
            <Dato etiqueta="Precio unitario">{`${tarjeta.precioUnitario} €`}</Dato>
            <Dato etiqueta="Estado del pago">{tarjeta.estadoPago}</Dato>
            <Dato etiqueta="Tipo">{tarjeta.tipo}</Dato>
            <Dato etiqueta="Procesado">{tarjeta.procesado ? "Sí" : "No"}</Dato>
          </dl>
        </details>

        <section className="mt-4 rounded-2xl border border-linea bg-white p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-terracota">Notas internas</h2>

          {notasInternas.length > 0 ? (
            <ul className="mb-3 divide-y divide-linea">
              {notasInternas.map((nota) => (
                <li key={nota.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="whitespace-pre-wrap break-words text-sm text-tinta">{nota.texto}</p>
                    <p className="text-xs text-tinta-suave">{formatearFechaNota(nota.fecha)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarNotaInterna(nota.id)}
                    disabled={eliminandoNotaId === nota.id}
                    className="shrink-0 text-sm font-semibold text-red-700 underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {eliminandoNotaId === nota.id ? "Borrando..." : "Eliminar"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm italic text-tinta-suave">Aún no hay notas.</p>
          )}

          <textarea
            value={nuevaNota}
            onChange={(e) => setNuevaNota(e.target.value)}
            placeholder="Escribe aquí una nota..."
            aria-label="Nueva nota interna"
            rows={3}
            className="w-full resize-y rounded-xl border border-linea p-3 text-sm focus:outline-none focus:ring-2 focus:ring-terracota"
          />
          <button
            type="button"
            onClick={guardarNotaInterna}
            disabled={guardandoNota}
            className="mt-2 rounded-full border border-linea bg-mostaza-suave px-4 py-2 text-sm font-semibold text-tinta disabled:opacity-50"
          >
            {guardandoNota ? "Guardando..." : "Guardar nota"}
          </button>
        </section>

        {(tarjeta.sePuedeCancelar || tarjeta.cancelada) && (
          <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-tinta">
              {tarjeta.cancelada
                ? "Tarjeta cancelada: su código ya no se puede canjear."
                : "Cancelar la tarjeta impide que se canjee. No devuelve el dinero."}
            </p>
            <button
              type="button"
              onClick={() => setCancelando(true)}
              className="rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              {tarjeta.cancelada ? "Enviar correo de cancelación" : "Cancelar tarjeta regalo"}
            </button>
          </section>
        )}

        {cancelando && (
          <CancelarTarjetaRegalo
            tarjeta={tarjeta}
            onCerrar={() => setCancelando(false)}
            onCancelada={() =>
              setTarjeta((t) => ({
                ...t,
                estado: "cancelada",
                cancelada: true,
                canceladaEn: t.canceladaEn || new Date().toISOString(),
                sePuedeCancelar: false,
              }))
            }
          />
        )}
      </div>
    </div>
  );
};

export default AdminDetalleTarjetaRegaloNuevo;
