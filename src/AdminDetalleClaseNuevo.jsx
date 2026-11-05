import React, { useEffect, useState } from "react";
import { ref, get, push, remove, update } from "firebase/database";
import { useNavigate, useSearchParams } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import { TALLERES_FIJOS } from "./catalogoTalleres";
import useCategorias from "./components/useCategorias";

const AdminDetalleClaseNuevo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const claseId = searchParams.get("clase");
  const nombreClase = searchParams.get("nombre") || "";

  const [clase, setClase] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [notasInternas, setNotasInternas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [guardandoInfo, setGuardandoInfo] = useState(false);
  const [eliminandoNotaId, setEliminandoNotaId] = useState(null);

  const [nombreEditado, setNombreEditado] = useState("");
  const [descripcionCortaEditada, setDescripcionCortaEditada] = useState("");
  const [descripcionLargaEditada, setDescripcionLargaEditada] = useState("");
  const [incluyeEditado, setIncluyeEditado] = useState("");
  const [notaImportanteEditada, setNotaImportanteEditada] = useState("");
  const [estadoEditado, setEstadoEditado] = useState("activa");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const categorias = useCategorias({ incluirOcultas: true });

useEffect(() => {
  const onResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", onResize);

  return () => window.removeEventListener("resize", onResize);
}, []);

  const normalizarEstadoClase = (data = {}) => {
    if (typeof data.estado === "string" && data.estado.trim()) {
      return data.estado.trim().toLowerCase();
    }

    if (data.activa === false) {
      return "oculta";
    }

    return "activa";
  };

  const construirClaseNormalizada = (id, data = {}) => {
    const estadoNormalizado = normalizarEstadoClase(data);

    return {
      id,
      nombre: data.nombre || id,
      categoria: data.categoria || "Sin categoría",
      dinamica: !!data.dinamica,
      grupo: data.dinamica ? data.grupo || "otros" : TALLERES_FIJOS[id]?.grupo || "",
      precioDesde: data.precioDesde || "",
      precio: data.precio || "",
      descripcionCorta: data.descripcionCorta || "",
      descripcionLarga: data.descripcionLarga || "",
      incluye: Array.isArray(data.incluye) ? data.incluye : [],
      notaImportante: data.notaImportante || "",
      estado: estadoNormalizado,
      activa: estadoNormalizado === "activa",
    };
  };

  const guardarInformacionClase = async () => {
    if (!clase?.id) return;

    try {
      setGuardandoInfo(true);

      const incluyeArray = incluyeEditado
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

      const estadoNormalizado = (estadoEditado || "activa").trim().toLowerCase();
      const activaNormalizada = estadoNormalizado === "activa";

      const datosActualizados = {
        nombre: nombreEditado.trim(),
        descripcionCorta: descripcionCortaEditada.trim(),
        descripcionLarga: descripcionLargaEditada.trim(),
        incluye: incluyeArray,
        notaImportante: notaImportanteEditada.trim(),
        estado: estadoNormalizado,
        activa: activaNormalizada,
      };

      await update(ref(dbRealtime, `clases/${clase.id}`), datosActualizados);

      setClase((prev) => ({
        ...prev,
        ...datosActualizados,
      }));

      setEstadoEditado(estadoNormalizado);

      alert("Información de la clase guardada correctamente.");
    } catch (error) {
      console.error("Error al guardar información de la clase:", error);
      alert("No se pudo guardar la información de la clase.");
    } finally {
      setGuardandoInfo(false);
    }
  };

  useEffect(() => {
    const cargarDetalleClase = async () => {
      try {
        if (!claseId) {
          setCargando(false);
          return;
        }

        const [claseSnap, reservasSnap] = await Promise.all([
          get(ref(dbRealtime, `clases/${claseId}`)),
          get(ref(dbRealtime, "reservas")),
        ]);

        let claseEncontrada = null;
        let claseIdReal = claseId;

        if (claseSnap.exists()) {
          const data = claseSnap.val() || {};
          claseEncontrada = construirClaseNormalizada(claseId, data);
        } else {
          const todasLasClasesSnap = await get(ref(dbRealtime, "clases"));

          if (todasLasClasesSnap.exists()) {
            todasLasClasesSnap.forEach((itemSnap) => {
              const data = itemSnap.val() || {};
              const nombre = (data.nombre || "").trim().toLowerCase();
              const nombreBuscado = nombreClase.trim().toLowerCase();

              if (!claseEncontrada && nombre && nombre === nombreBuscado) {
                claseIdReal = itemSnap.key;
                claseEncontrada = construirClaseNormalizada(itemSnap.key, data);
              }
            });
          }
        }

        setClase(claseEncontrada);

        const datos = [];
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        if (reservasSnap.exists()) {
          reservasSnap.forEach((claseSnapReserva) => {
            const claseKey = claseSnapReserva.key;

            claseSnapReserva.forEach((fechaSnap) => {
              const fechaKey = fechaSnap.key;

              fechaSnap.forEach((turnoSnap) => {
                const turnoKey = turnoSnap.key;

                turnoSnap.forEach((nivelSnap) => {
                  const nivelVal = nivelSnap.val();
                  if (!nivelVal || typeof nivelVal !== "object") return;

                  const procesarReserva = (reserva, metodoPorDefecto = "—") => {
                    if (!reserva || typeof reserva !== "object") return;

                    const claseReal = reserva.claseId || claseKey;
                    if (claseReal !== (claseIdReal || claseId)) return;

                    if (reserva.estado !== "Confirmada") return;

                    const fecha = reserva.fecha || fechaKey;
                    const fechaObj = new Date(`${fecha}T00:00:00`);
                    if (fechaObj < hoy) return;

                    datos.push({
                      id:
                        reserva.orderId ||
                        reserva.id ||
                        `${claseReal}-${fechaKey}-${turnoKey}-${Math.random()}`,
                      orderId: reserva.orderId || "",
                      fecha,
                      turno: reserva.turno || turnoKey,
                      metodo:
                        reserva.metodo ||
                        reserva.tipoClase ||
                        metodoPorDefecto,
                      plazas: Number(reserva.plazas || 1),
                      estadoPago: reserva.estadoPago || "—",
                      precioTotal: Number(
                        reserva.precioTotal ||
                          reserva.precioUnitario ||
                          reserva.precio ||
                          0
                      ),
                    });
                  };

                  const pareceReservaDirecta =
                    "fecha" in nivelVal ||
                    "estado" in nivelVal ||
                    "estadoPago" in nivelVal ||
                    "uid" in nivelVal ||
                    "orderId" in nivelVal;

                  if (pareceReservaDirecta) {
                    procesarReserva(nivelVal);
                    return;
                  }

                  nivelSnap.forEach((reservaSnap) => {
                    procesarReserva(reservaSnap.val(), nivelSnap.key);
                  });
                });
              });
            });
          });
        }

        datos.sort((a, b) => {
          const fechaA = new Date(`${a.fecha}T00:00:00`);
          const fechaB = new Date(`${b.fecha}T00:00:00`);
          if (fechaA - fechaB !== 0) return fechaA - fechaB;
          return (a.turno || "").localeCompare(b.turno || "", "es");
        });

        setReservas(datos);
      } catch (error) {
        console.error("Error al cargar detalle de clase:", error);
        setClase(null);
        setReservas([]);
      } finally {
        setCargando(false);
      }
    };

    cargarDetalleClase();
  }, [claseId, nombreClase]);

  useEffect(() => {
    const cargarNotasInternasClase = async () => {
      try {
        if (!claseId) return;

        const notasSnap = await get(
          ref(dbRealtime, `clasesNotas/${claseId}/notasInternas`)
        );

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
        console.error("Error al cargar notas internas de la clase:", error);
        setNotasInternas([]);
      }
    };

    cargarNotasInternasClase();
  }, [claseId]);

  useEffect(() => {
    if (!clase) return;

    setNombreEditado(clase.nombre || "");
    setDescripcionCortaEditada(clase.descripcionCorta || "");
    setDescripcionLargaEditada(clase.descripcionLarga || "");
    setIncluyeEditado(
      Array.isArray(clase.incluye) ? clase.incluye.join("\n") : ""
    );
    setNotaImportanteEditada(clase.notaImportante || "");
    setEstadoEditado(normalizarEstadoClase(clase));
  }, [clase]);

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
        ref(dbRealtime, `clasesNotas/${clase.id}/notasInternas`),
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
      console.error("Error al guardar nota interna de la clase:", error);
      alert("No se pudo guardar la nota interna.");
    } finally {
      setGuardandoNota(false);
    }
  };

  const eliminarNotaInterna = async (notaId) => {
    const confirmar = window.confirm(
      "¿Seguro que quieres borrar esta nota interna?"
    );

    if (!confirmar) return;

    try {
      setEliminandoNotaId(notaId);

      await remove(
        ref(dbRealtime, `clasesNotas/${clase.id}/notasInternas/${notaId}`)
      );

      setNotasInternas((prev) => prev.filter((nota) => nota.id !== notaId));
    } catch (error) {
      console.error("Error al borrar nota interna de la clase:", error);
      alert("No se pudo borrar la nota interna.");
    } finally {
      setEliminandoNotaId(null);
    }
  };

  const formatearFechaNota = (fecha) => {
    if (!fecha) return "Sin fecha";

    const fechaParseada = new Date(fecha);

    if (!isNaN(fechaParseada.getTime())) {
      return fechaParseada.toLocaleString("es-ES");
    }

    return fecha;
  };

  if (cargando) {
    return <p style={styles.mensaje}>Cargando clase...</p>;
  }

  if (!clase) {
    return <p style={styles.mensaje}>Clase no encontrada.</p>;
  }

  // La categoría real sale del grupo del taller (no del texto guardado, que puede estar desfasado)
  const tituloCategoria =
    categorias.find((c) => c.id === clase.grupo)?.titulo || clase.categoria;

  return (
   <div
  style={{
    ...styles.body,
    ...(isMobile ? styles.bodyMobile : {}),
  }}
>
  <div
    style={{
      ...styles.container,
      ...(isMobile ? styles.containerMobile : {}),
    }}
  >
        <BotonVolver />

        <h1 style={styles.titulo}>Detalle de clase</h1>

        <div style={styles.card}>
          <p><strong>Nombre:</strong> {clase.nombre}</p>
          <p><strong>ID:</strong> {clase.id}</p>
          <p><strong>Categoría:</strong> {tituloCategoria}</p>
          <p><strong>Estado:</strong> {clase.estado || "activa"}</p>
          <p>
            <strong>Activa:</strong> {clase.activa ? "Sí" : "No"}
          </p>
          <p>
            <strong>Precio base:</strong>{" "}
            {clase.precioDesde
              ? `${clase.precioDesde}€`
              : clase.precio
              ? `${clase.precio}€`
              : "—"}
          </p>
          <p><strong>Reservas futuras:</strong> {reservas.length}</p>

          <hr style={styles.separador} />

          <p><strong>Descripción corta:</strong> {clase.descripcionCorta || "—"}</p>
          <p><strong>Descripción larga:</strong> {clase.descripcionLarga || "—"}</p>

          <div>
            <strong>Incluye:</strong>
            {clase.incluye && clase.incluye.length > 0 ? (
              <ul style={styles.listaIncluye}>
                {clase.incluye.map((item, index) => (
                  <li key={index} style={styles.itemIncluye}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <span> —</span>
            )}
          </div>

          <p><strong>Nota importante:</strong> {clase.notaImportante || "—"}</p>
        </div>

        {clase.dinamica ? (
          <div style={styles.bloque}>
            <h2 style={styles.subtitulo}>Editar este taller</h2>
            <p style={{ margin: "0 0 14px 0", color: "#5f5247", lineHeight: 1.5 }}>
              Se edita con el mismo formulario que al crearlo: categoría, fotos, textos,
              secciones, precios, días y turnos, plazas y visibilidad.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/admin-taller?id=${clase.id}`)}
              style={styles.botonGuardar}
            >
              Editar taller
            </button>
          </div>
        ) : (
        <div style={styles.bloque}>
          <h2 style={styles.subtitulo}>Editar información de la clase</h2>

          <p style={{ margin: "0 0 14px 0", color: "#5f5247", lineHeight: 1.5 }}>
            Este taller todavía tiene su página hecha a mano: su categoría no se puede cambiar
            aquí y sus fotos se editan en «Fotos y portada». Migrándolo al panel se edita con
            el mismo formulario que un taller nuevo (categoría, fotos, textos, precios y más).
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => navigate(`/admin-taller?id=${clase.id}`)}
              style={styles.botonGuardar}
            >
              Fotos y portada
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin-migrar-talleres")}
              style={styles.botonGuardar}
            >
              Migrar al panel
            </button>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.campo}>
              <label style={styles.label}>Nombre</label>
              <input
                type="text"
                value={nombreEditado}
                onChange={(e) => setNombreEditado(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.campo}>
              <label style={styles.label}>Categoría</label>
              <input
                type="text"
                value={tituloCategoria}
                disabled
                style={styles.input}
              />
            </div>

            <div style={styles.campo}>
              <label style={styles.label}>Estado</label>
              <select
                value={estadoEditado}
                onChange={(e) => setEstadoEditado(e.target.value)}
                style={styles.input}
              >
                <option value="activa">Activa</option>
                <option value="oculta">Oculta</option>
                <option value="pausada">Pausada</option>
              </select>
            </div>
          </div>

          <div style={styles.campo}>
            <label style={styles.label}>Texto introductorio</label>
            <textarea
              value={descripcionCortaEditada}
              onChange={(e) => setDescripcionCortaEditada(e.target.value)}
              style={styles.textarea}
              rows={3}
            />
          </div>

          <div style={styles.campo}>
            <label style={styles.label}>Texto explicativo</label>
            <textarea
              value={descripcionLargaEditada}
              onChange={(e) => setDescripcionLargaEditada(e.target.value)}
              style={styles.textarea}
              rows={5}
            />
          </div>

          <div style={styles.campo}>
            <label style={styles.label}>
              Qué incluye esta clase
              <span style={styles.labelAyuda}> (escribe una cosa por línea)</span>
            </label>
            <textarea
              value={incluyeEditado}
              onChange={(e) => setIncluyeEditado(e.target.value)}
              style={styles.textarea}
              rows={5}
              placeholder={`Materiales incluidos
Cocciones incluidas
Acompañamiento en el taller`}
            />
          </div>

          <div style={styles.campo}>
            <label style={styles.label}>Nota importante</label>
            <textarea
              value={notaImportanteEditada}
              onChange={(e) => setNotaImportanteEditada(e.target.value)}
              style={styles.textarea}
              rows={4}
            />
          </div>

          <button
            onClick={guardarInformacionClase}
            style={styles.botonGuardar}
            disabled={guardandoInfo}
          >
            {guardandoInfo ? "Guardando..." : "Guardar cambios de la clase"}
          </button>
        </div>
        )}

        <div style={styles.bloque}>
          <h2 style={styles.subtitulo}>Notas internas de la clase</h2>

          {notasInternas.length > 0 ? (
            <div style={styles.listaNotas}>
              {notasInternas.map((nota) => (
                <div
  key={nota.id}
  style={{
    ...styles.notaItem,
    ...(isMobile ? styles.notaItemMobile : {}),
  }}
>
                  <div
  style={{
    ...styles.notaHeader,
    ...(isMobile ? styles.notaHeaderMobile : {}),
  }}
>
                    <div>
                      <p style={styles.notaTexto}>{nota.texto}</p>
                      <p style={styles.notaFecha}>
                        {formatearFechaNota(nota.fecha)}
                      </p>
                    </div>

                    <button
                      onClick={() => eliminarNotaInterna(nota.id)}
                      style={styles.botonEliminar}
                      disabled={eliminandoNotaId === nota.id}
                    >
                      {eliminandoNotaId === nota.id ? "Borrando..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.textoVacio}>
              Aún no hay notas  para esta clase.
            </p>
          )}

          <textarea
            value={nuevaNota}
            onChange={(e) => setNuevaNota(e.target.value)}
            placeholder="Escribe aquí una nota  sobre esta clase..."
            style={styles.textarea}
            rows={4}
          />

          <button
            onClick={guardarNotaInterna}
            style={styles.botonGuardar}
            disabled={guardandoNota}
          >
            {guardandoNota ? "Guardando..." : "Guardar nota"}
          </button>
        </div>

        <div style={styles.bloque}>
          <h2 style={styles.subtitulo}>Próximas reservas de esta clase</h2>

          {reservas.length === 0 ? (
            <p style={styles.textoVacio}>No hay reservas futuras confirmadas.</p>
          ) : (
            <div style={styles.lista}>
              {reservas.map((r, index) => {
                const destino = r.orderId
                  ? `/admin-detalle-reserva?id=${r.orderId}`
                  : null;

                return (
                  <div
                    key={`${r.id}-${index}`}
                    style={styles.reservaItem}
                    onClick={() => {
                      if (destino) navigate(destino);
                    }}
                  >
                    <p style={styles.linea}>
                      <strong>Fecha:</strong> {r.fecha}
                    </p>
                    <p style={styles.linea}>
                      <strong>Turno:</strong> {r.turno}
                    </p>
                    <p style={styles.linea}>
                      <strong>Método:</strong> {r.metodo}
                    </p>
                    <p style={styles.linea}>
                      <strong>Plazas:</strong> {r.plazas}
                    </p>
                    <p style={styles.linea}>
                      <strong>Estado pago:</strong> {r.estadoPago}
                    </p>
                    <p style={styles.linea}>
                      <strong>Precio total:</strong> {r.precioTotal}€
                    </p>
                    <p style={styles.linea}>
                      <strong>Order ID:</strong> {r.orderId || "—"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  body: {
    backgroundColor: "#fdf8ee",
    minHeight: "100vh",
    padding: 30,
    fontFamily: "'Segoe UI', sans-serif",
  },
  bodyMobile: {
  padding: 4,
},
  container: {
    maxWidth: 850,
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 28,
    boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
  },
  containerMobile: {
  width: "100%",
  maxWidth: "100%",
  borderRadius: 16,
  padding: 10,
  boxSizing: "border-box",
},
  titulo: {
    textAlign: "center",
    margin: "0 0 20px 0",
    color: "#2f2f2f",
    fontSize: "2rem",
  },
  notaHeaderMobile: {
  flexDirection: "column",
  alignItems: "stretch",
},
  subtitulo: {
    margin: "0 0 14px 0",
    color: "#4b3a2a",
    fontSize: "1.2rem",
  },
  notaItemMobile: {
  padding: 10,
},
  card: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    display: "grid",
    gap: 8,
  },
  separador: {
    border: "none",
    borderTop: "1px solid #eee",
    margin: "10px 0",
  },
  listaIncluye: {
    marginTop: 8,
    paddingLeft: 20,
  },
  itemIncluye: {
    marginBottom: 4,
  },
  bloque: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 16,
  },
  campo: {
    display: "grid",
    gap: 6,
    marginBottom: 14,
  },
  label: {
    fontSize: "0.92rem",
    fontWeight: 600,
    color: "#5b4a2d",
  },
  input: {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid #ddd",
    fontSize: "0.95rem",
    fontFamily: "'Segoe UI', sans-serif",
    boxSizing: "border-box",
    backgroundColor: "#fff",
  },
  lista: {
    display: "grid",
    gap: 12,
  },
  reservaItem: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#fffaf0",
    border: "1px solid #eadfbe",
    cursor: "pointer",
    transition: "0.2s",
  },
  linea: {
    margin: "4px 0",
    color: "#333",
    fontSize: "0.94rem",
  },
  textoVacio: {
    margin: 0,
    color: "#7a7a7a",
  },
  mensaje: {
    textAlign: "center",
    padding: 40,
    color: "#7a7a7a",
  },
  listaNotas: {
    display: "grid",
    gap: 10,
    marginBottom: 14,
  },
  notaItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    border: "1px solid #eee",
  },
  notaHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  notaTexto: {
    margin: 0,
    color: "#333",
    whiteSpace: "pre-wrap",
  },
  notaFecha: {
    margin: "6px 0 0 0",
    fontSize: "0.82rem",
    color: "#777",
  },
  textarea: {
    width: "100%",
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    border: "1px solid #ddd",
    fontSize: "0.95rem",
    fontFamily: "'Segoe UI', sans-serif",
    resize: "vertical",
    boxSizing: "border-box",
  },
  botonGuardar: {
    marginTop: 10,
    padding: "10px 14px",
    border: "1px solid #e5d8b8",
    backgroundColor: "#fff8da",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 600,
    color: "#5b4a2d",
  },
  botonEliminar: {
    padding: "8px 12px",
    border: "1px solid #e7c9c9",
    backgroundColor: "#fff1f1",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    color: "#8a3b3b",
    flexShrink: 0,
  },
  labelAyuda: {
    fontWeight: 400,
    color: "#8a7b65",
    fontSize: "0.88rem",
  },
};

export default AdminDetalleClaseNuevo;