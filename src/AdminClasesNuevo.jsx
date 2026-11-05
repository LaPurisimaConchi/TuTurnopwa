import React, { useEffect, useMemo, useState } from "react";
import { ref, get, update } from "firebase/database";
import { dbRealtime } from "./firebase";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";
import { TALLERES_FIJOS } from "./catalogoTalleres";

const AdminClasesNuevo = () => {
  const navigate = useNavigate();
  const [notasPorClase, setNotasPorClase] = useState({});

    const [clases, setClases] = useState([]);
  const [resumen, setResumen] = useState({});
   const [cargando, setCargando] = useState(true);
  const [editandoPrecios, setEditandoPrecios] = useState({});
  const [guardandoPrecios, setGuardandoPrecios] = useState({});
   const [editandoPlazas, setEditandoPlazas] = useState({});
  const [guardandoPlazas, setGuardandoPlazas] = useState({});
  const [editandoHorarios, setEditandoHorarios] = useState({});
  const [guardandoHorarios, setGuardandoHorarios] = useState({});

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

useEffect(() => {
  const onResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", onResize);

  return () => window.removeEventListener("resize", onResize);
}, []);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [clasesSnap, reservasSnap, clasesNotasSnap] = await Promise.all([
          get(ref(dbRealtime, "clases")),
          get(ref(dbRealtime, "reservas")),
          get(ref(dbRealtime, "clasesNotas")),
        ]);

        const listaClases = [];
        const mapaResumen = {};
        const mapaNotas = {};

        if (clasesNotasSnap.exists()) {
          clasesNotasSnap.forEach((claseNotaSnap) => {
            const claseId = claseNotaSnap.key;
            const notasInternas = claseNotaSnap.child("notasInternas").val() || {};
            mapaNotas[claseId] = Object.keys(notasInternas).length;
          });
        }

        if (clasesSnap.exists()) {
          clasesSnap.forEach((claseSnap) => {
            const claseId = claseSnap.key;
            const claseData = claseSnap.val() || {};

            

            const nombre = claseData.nombre || claseId;

           const estadoClase =
  typeof claseData.estado === "string" && claseData.estado.trim()
    ? claseData.estado.trim().toLowerCase()
    : claseData.activa === false
    ? "oculta"
    : "activa";

listaClases.push({
  id: claseId,
  nombre,
  categoria: claseData.categoria || "Sin categoría",
  precioDesde: claseData.precioDesde || "",
  precio: claseData.precio ?? "",
  precios: claseData.precios || {},
  plazas: claseData.plazas || {},
  turnos: claseData.turnos || [],
  horarios: claseData.horarios || claseData.horario || {},
  estado: estadoClase,
  activa: estadoClase === "activa",
  dinamica: !!claseData.dinamica,
});

            mapaResumen[claseId] = {
              reservasTotales: 0,
              plazasTotales: 0,
              reservasFuturas: 0,
              plazasFuturas: 0,
              proximaFecha: "",
            };
          });
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        if (reservasSnap.exists()) {
          reservasSnap.forEach((claseSnap) => {
            const claseKey = claseSnap.key;

            claseSnap.forEach((fechaSnap) => {
              const fechaKey = fechaSnap.key;

              fechaSnap.forEach((turnoSnap) => {
                turnoSnap.forEach((nivelSnap) => {
                  const nivelVal = nivelSnap.val();

                  if (!nivelVal || typeof nivelVal !== "object") return;

                  const procesarReserva = (reserva) => {
                    if (!reserva || typeof reserva !== "object") return;
                    if (reserva.estado !== "Confirmada") return;

                    const claseIdReal = reserva.claseId || claseKey;
                    if (!mapaResumen[claseIdReal]) return;

                    const plazas = Number(reserva.plazas || 1);
                    const fecha = reserva.fecha || fechaKey;
                    const fechaObj = new Date(`${fecha}T00:00:00`);

                    mapaResumen[claseIdReal].reservasTotales += 1;
                    mapaResumen[claseIdReal].plazasTotales += plazas;

                    if (fechaObj >= hoy) {
                      mapaResumen[claseIdReal].reservasFuturas += 1;
                      mapaResumen[claseIdReal].plazasFuturas += plazas;

                      if (
                        !mapaResumen[claseIdReal].proximaFecha ||
                        fecha < mapaResumen[claseIdReal].proximaFecha
                      ) {
                        mapaResumen[claseIdReal].proximaFecha = fecha;
                      }
                    }
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
                    procesarReserva(reservaSnap.val());
                  });
                });
              });
            });
          });
        }

        listaClases.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

        setClases(listaClases);
        setResumen(mapaResumen);
        setNotasPorClase(mapaNotas);
      } catch (error) {
        console.error("Error al cargar clases:", error);
        setClases([]);
        setResumen({});
        setNotasPorClase({});
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

   const clasesConResumen = useMemo(() => {
    return clases.map((clase) => ({
      ...clase,
      ...(resumen[clase.id] || {
        reservasTotales: 0,
        plazasTotales: 0,
        reservasFuturas: 0,
        plazasFuturas: 0,
        proximaFecha: "",
      }),
    }));
  }, [clases, resumen]);

  const formatearPrecios = (clase) => {
    if (clase.precios && Object.keys(clase.precios).length > 0) {
      return Object.entries(clase.precios)
        .map(([key, value]) => `${key}: ${value}€`)
        .join(" · ");
    }

    if (clase.precioDesde) return `Desde ${clase.precioDesde}€`;
    if (clase.precio) return `${clase.precio}€`;

    return "—";
  };

  const formatearPlazas = (clase) => {
    const maxTorno = clase.plazas?.maxTorno;
    const maxTotales =
      clase.plazas?.maxTotales ?? clase.plazas?.plazasTotales;

    if (maxTorno && maxTotales) {
      return `Torno: ${maxTorno} · Totales: ${maxTotales}`;
    }

    if (maxTotales) {
      return `Totales: ${maxTotales}`;
    }

    return "—";
  };

  const formatearTurnos = (turnos) => {
    if (!turnos) return "—";

    if (Array.isArray(turnos)) {
      return turnos.join(" · ") || "—";
    }

    if (typeof turnos === "object") {
      return Object.values(turnos).join(" · ") || "—";
    }

    return "—";
  };

    const formatearHorarios = (horarios) => {
    if (!horarios || typeof horarios !== "object") return "—";

    const dias = Object.keys(horarios);
    if (dias.length === 0) return "—";

    return dias.join(" · ");
  };

  const iniciarEdicionPrecios = (clase) => {
    setEditandoPrecios((prev) => ({
      ...prev,
      [clase.id]: { ...(clase.precios || {}) },
    }));
  };

  const cambiarPrecioEditado = (claseId, campo, valor) => {
    setEditandoPrecios((prev) => ({
      ...prev,
      [claseId]: {
        ...(prev[claseId] || {}),
        [campo]: valor,
      },
    }));
  };

  const guardarPrecios = async (claseId) => {
    const preciosEditados = editandoPrecios[claseId];
    if (!preciosEditados) return;

    try {
      setGuardandoPrecios((prev) => ({ ...prev, [claseId]: true }));

      const preciosLimpios = {};
      Object.entries(preciosEditados).forEach(([key, value]) => {
        const numero = Number(value);
        if (!Number.isNaN(numero) && value !== "") {
          preciosLimpios[key] = numero;
        }
      });

      await update(ref(dbRealtime, `clases/${claseId}`), {
        precios: preciosLimpios,
      });

      setClases((prev) =>
        prev.map((clase) =>
          clase.id === claseId
            ? { ...clase, precios: preciosLimpios }
            : clase
        )
      );

      setEditandoPrecios((prev) => {
        const copia = { ...prev };
        delete copia[claseId];
        return copia;
      });

      alert("Precios guardados correctamente");
    } catch (error) {
      console.error("Error al guardar precios:", error);
      alert("Hubo un error al guardar los precios");
    } finally {
      setGuardandoPrecios((prev) => ({ ...prev, [claseId]: false }));
    }
  };

    const cancelarEdicionPrecios = (claseId) => {
    setEditandoPrecios((prev) => {
      const copia = { ...prev };
      delete copia[claseId];
      return copia;
    });
  };

  const iniciarEdicionPlazas = (clase) => {
    setEditandoPlazas((prev) => ({
      ...prev,
      [clase.id]: { ...(clase.plazas || {}) },
    }));
  };

  const cambiarPlazaEditada = (claseId, campo, valor) => {
    setEditandoPlazas((prev) => ({
      ...prev,
      [claseId]: {
        ...(prev[claseId] || {}),
        [campo]: valor,
      },
    }));
  };

  const guardarPlazas = async (claseId) => {
    const plazasEditadas = editandoPlazas[claseId];
    if (!plazasEditadas) return;

    try {
      setGuardandoPlazas((prev) => ({ ...prev, [claseId]: true }));

      const plazasLimpias = {};
      Object.entries(plazasEditadas).forEach(([key, value]) => {
        const numero = Number(value);
        if (!Number.isNaN(numero) && value !== "") {
          plazasLimpias[key] = numero;
        }
      });

      await update(ref(dbRealtime, `clases/${claseId}`), {
        plazas: plazasLimpias,
      });

      setClases((prev) =>
        prev.map((clase) =>
          clase.id === claseId
            ? { ...clase, plazas: plazasLimpias }
            : clase
        )
      );

      setEditandoPlazas((prev) => {
        const copia = { ...prev };
        delete copia[claseId];
        return copia;
      });

      alert("Plazas guardadas correctamente");
    } catch (error) {
      console.error("Error al guardar plazas:", error);
      alert("Hubo un error al guardar las plazas");
    } finally {
      setGuardandoPlazas((prev) => ({ ...prev, [claseId]: false }));
    }
  };

   const cancelarEdicionPlazas = (claseId) => {
    setEditandoPlazas((prev) => {
      const copia = { ...prev };
      delete copia[claseId];
      return copia;
    });
  };

  const iniciarEdicionHorarios = (clase) => {
    const horariosActuales = clase.horarios || {};
    const horariosTexto = {};

    Object.entries(horariosActuales).forEach(([dia, turnos]) => {
      if (Array.isArray(turnos)) {
        horariosTexto[dia] = turnos.join(", ");
      } else if (typeof turnos === "string") {
        horariosTexto[dia] = turnos;
      } else {
        horariosTexto[dia] = "";
      }
    });

    setEditandoHorarios((prev) => ({
      ...prev,
      [clase.id]: horariosTexto,
    }));
  };

  const cambiarHorarioEditado = (claseId, dia, valor) => {
    setEditandoHorarios((prev) => ({
      ...prev,
      [claseId]: {
        ...(prev[claseId] || {}),
        [dia]: valor,
      },
    }));
  };

  const guardarHorarios = async (claseId) => {
    const horariosEditados = editandoHorarios[claseId];
    if (!horariosEditados) return;

    try {
      setGuardandoHorarios((prev) => ({ ...prev, [claseId]: true }));

      const horariosLimpios = {};
      Object.entries(horariosEditados).forEach(([dia, valor]) => {
        const listaTurnos = String(valor || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

        horariosLimpios[dia] = listaTurnos;
      });

      await update(ref(dbRealtime, `clases/${claseId}`), {
        horarios: horariosLimpios,
      });

      setClases((prev) =>
        prev.map((clase) =>
          clase.id === claseId
            ? { ...clase, horarios: horariosLimpios }
            : clase
        )
      );

      setEditandoHorarios((prev) => {
        const copia = { ...prev };
        delete copia[claseId];
        return copia;
      });

      alert("Horarios guardados correctamente");
    } catch (error) {
      console.error("Error al guardar horarios:", error);
      alert("Hubo un error al guardar los horarios");
    } finally {
      setGuardandoHorarios((prev) => ({ ...prev, [claseId]: false }));
    }
  };

  const cancelarEdicionHorarios = (claseId) => {
    setEditandoHorarios((prev) => {
      const copia = { ...prev };
      delete copia[claseId];
      return copia;
    });
  };
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

        <div style={styles.header}>
          <h1 style={styles.titulo}>Clases</h1>
          <p style={styles.subtitulo}>
            Resumen general de actividad por clase.
          </p>
          <button
            style={{ ...styles.boton, marginTop: 12 }}
            onClick={() => navigate("/admin-taller")}
          >
            ➕ Añadir taller nuevo
          </button>
          {clases.some((c) => !c.dinamica && c.id in TALLERES_FIJOS) && (
            <button
              style={{ ...styles.boton, marginTop: 12, marginLeft: 8 }}
              onClick={() => navigate("/admin-migrar-talleres")}
            >
              🔁 Migrar talleres existentes al panel
            </button>
          )}
        </div>

        {cargando ? (
          <p style={styles.mensaje}>Cargando clases...</p>
        ) : clasesConResumen.length === 0 ? (
          <p style={styles.mensaje}>No hay clases para mostrar.</p>
        ) : (
          <div
  style={{
    ...styles.grid,
    ...(isMobile ? styles.gridMobile : {}),
  }}
>
  {clasesConResumen.map((clase) => (
             <div
  key={clase.id}
  style={{
    ...styles.card,
    ...(isMobile ? styles.cardMobile : {}),
  }}
  onClick={() =>
    navigate(`/admin-detalle-clase?clase=${clase.id}`)
  }
>
                <div style={styles.cardTop}>
                  <div>
                    <h2 style={styles.nombre}>{clase.nombre}</h2>
                    <p style={styles.categoria}>{clase.categoria}</p>

                    {notasPorClase[clase.id] > 0 && (
                      <span style={styles.badgeNotas}>
                        {notasPorClase[clase.id]} nota{notasPorClase[clase.id] !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <span style={styles.badge}>
                    {clase.reservasFuturas} futura
                    {clase.reservasFuturas !== 1 ? "s" : ""}
                  </span>
                </div>

                <div style={styles.infoBox}>
                  <p style={styles.linea}>
  <strong>Estado:</strong> {clase.estado || "activa"}
</p>
                  <p style={styles.linea}>
                    <strong>Reservas totales:</strong> {clase.reservasTotales}
                  </p>
                  <p style={styles.linea}>
                    <strong>Plazas totales:</strong> {clase.plazasTotales}
                  </p>
                  <p style={styles.linea}>
                    <strong>Reservas futuras:</strong> {clase.reservasFuturas}
                  </p>
                  <p style={styles.linea}>
                    <strong>Plazas futuras:</strong> {clase.plazasFuturas}
                  </p>
                  <p style={styles.linea}>
                    <strong>Próxima fecha:</strong>{" "}
                    {clase.proximaFecha || "Sin reservas futuras"}
                  </p>
                  <p style={styles.linea}>
                    <strong>Precio base:</strong>{" "}
                    {clase.precioDesde ? `${clase.precioDesde}€` : "—"}
                  </p>
                                    <p style={styles.linea}>
                    <strong>Precios configurados:</strong>{" "}
                    {formatearPrecios(clase)}
                  </p>
                  <p style={styles.linea}>
                    <strong>Plazas configuradas:</strong>{" "}
                    {formatearPlazas(clase)}
                  </p>
                  <p style={styles.linea}>
                    <strong>Turnos:</strong>{" "}
                    {formatearTurnos(clase.turnos)}
                  </p>
                  <p style={styles.linea}>
                    <strong>Días con horario:</strong>{" "}
                    {formatearHorarios(clase.horarios)}
                  </p>
                </div>

               
                                 <div style={styles.acciones}>
                  <button
                    style={styles.boton}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin-reservas-nuevo?clase=${clase.id}`);
                    }}
                  >
                    Ver reservas
                  </button>

                  <button
                    style={styles.boton}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin-taller?id=${clase.id}`);
                    }}
                  >
                    {clase.dinamica ? "Editar ficha y fotos" : "Fotos y portada"}
                  </button>

                                   {!editandoPrecios[clase.id] ? (
                    <button
                      style={{ ...styles.boton, }}
                      onClick={(e) => {
                        e.stopPropagation();
                        iniciarEdicionPrecios(clase);
                      }}
                    >
                      Editar precios
                    </button>
                  ) : (
                    <div
                      style={styles.editorPrecios}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {Object.keys(clase.precios || {}).map((campo) => (
                        <div key={campo} style={styles.campoPrecio}>
                          <label style={styles.labelPrecio}>{campo}</label>
                          <input
                            type="number"
                            value={editandoPrecios[clase.id]?.[campo] ?? ""}
                            onChange={(e) =>
                              cambiarPrecioEditado(
                                clase.id,
                                campo,
                                e.target.value
                              )
                            }
                            style={styles.inputPrecio}
                          />
                        </div>
                      ))}

                      <div style={styles.botonesEditor}>
                        <button
                          style={styles.botonGuardar}
                          onClick={() => guardarPrecios(clase.id)}
                          disabled={guardandoPrecios[clase.id]}
                        >
                          {guardandoPrecios[clase.id]
                            ? "Guardando..."
                            : "Guardar precios"}
                        </button>

                        <button
                          style={styles.botonCancelar}
                          onClick={() => cancelarEdicionPrecios(clase.id)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                                   {!editandoPlazas[clase.id] ? (
                    <button
                      style={{ ...styles.boton, }}
                      onClick={(e) => {
                        e.stopPropagation();
                        iniciarEdicionPlazas(clase);
                      }}
                    >
                      Editar plazas
                    </button>
                  ) : (
                    <div
                      style={styles.editorPrecios}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {Object.keys(clase.plazas || {}).map((campo) => (
                        <div key={campo} style={styles.campoPrecio}>
                          <label style={styles.labelPrecio}>{campo}</label>
                          <input
                            type="number"
                            value={editandoPlazas[clase.id]?.[campo] ?? ""}
                            onChange={(e) =>
                              cambiarPlazaEditada(
                                clase.id,
                                campo,
                                e.target.value
                              )
                            }
                            style={styles.inputPrecio}
                          />
                        </div>
                      ))}

                      <div style={styles.botonesEditor}>
                        <button
                          style={styles.botonGuardar}
                          onClick={() => guardarPlazas(clase.id)}
                          disabled={guardandoPlazas[clase.id]}
                        >
                          {guardandoPlazas[clase.id]
                            ? "Guardando..."
                            : "Guardar plazas"}
                        </button>

                        <button
                          style={styles.botonCancelar}
                          onClick={() => cancelarEdicionPlazas(clase.id)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {!editandoHorarios[clase.id] ? (
                    <button
                      style={{ ...styles.boton, }}
                      onClick={(e) => {
                        e.stopPropagation();
                        iniciarEdicionHorarios(clase);
                      }}
                    >
                      Editar horarios
                    </button>
                  ) : (
                    <div
                      style={styles.editorPrecios}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {Object.keys(clase.horarios || {}).map((dia) => (
                        <div key={dia} style={styles.campoPrecio}>
                          <label style={styles.labelPrecio}>{dia}</label>
                          <input
                            type="text"
                            value={editandoHorarios[clase.id]?.[dia] ?? ""}
                            onChange={(e) =>
                              cambiarHorarioEditado(
                                clase.id,
                                dia,
                                e.target.value
                              )
                            }
                            placeholder="Ej: 17:30-20:30, 18:00-21:00"
                            style={styles.inputPrecio}
                          />
                        </div>
                      ))}

                      <div style={styles.botonesEditor}>
                        <button
                          style={styles.botonGuardar}
                          onClick={() => guardarHorarios(clase.id)}
                          disabled={guardandoHorarios[clase.id]}
                        >
                          {guardandoHorarios[clase.id]
                            ? "Guardando..."
                            : "Guardar horarios"}
                        </button>

                        <button
                          style={styles.botonCancelar}
                          onClick={() => cancelarEdicionHorarios(clase.id)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
    maxWidth: 1200,
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
  header: {
    textAlign: "center",
    marginBottom: 26,
  },
  gridMobile: {
  gridTemplateColumns: "1fr",
  gap: 14,
},
  titulo: {
    margin: 0,
    color: "#2f2f2f",
    fontSize: "2rem",
  },
  subtitulo: {
    marginTop: 8,
    color: "#7a7a7a",
  },
  mensaje: {
    textAlign: "center",
    color: "#7a7a7a",
    padding: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 18,
  },
  card: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 22,
    padding: 20,
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
    cursor: "pointer",
    transition: "0.2s",
  },
  cardMobile: {
  padding: 14,
},
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  nombre: {
    margin: 0,
    color: "#4b3a2a",
    fontSize: "1.15rem",
  },
  categoria: {
    margin: "6px 0 0 0",
    color: "#7a7a7a",
    fontSize: "0.92rem",
  },
  badge: {
    backgroundColor: "#fff8da",
    color: "#7a6331",
    border: "1px solid #f1e7c6",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: "0.88rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  badgeNotas: {
    backgroundColor: "#eef3ff",
    color: "#4d63b3",
    border: "1px solid #cfd9ff",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: "0.82rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
    display: "inline-block",
    marginTop: 8,
  },
  infoBox: {
    display: "grid",
    gap: 8,
    marginBottom: 16,
  },
  linea: {
    margin: 0,
    color: "#333",
    fontSize: "0.94rem",
  },
  acciones: {
  marginTop: 8,
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
},
  boton: {
    display: "inline-block",
    padding: "12px 16px",
    backgroundColor: "#fffaf0",
    color: "#3d3126",
    border: "1px solid #eadfbe",
    borderRadius: 14,
    fontSize: "0.96rem",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  },
    editorPrecios: {
    marginTop: 14,
    padding: 14,
    backgroundColor: "#fffaf3",
    border: "1px solid #eadfbe",
    borderRadius: 16,
    display: "grid",
    gap: 10,
  },
  campoPrecio: {
    display: "grid",
    gap: 6,
  },
  labelPrecio: {
    fontSize: "0.9rem",
    color: "#5b4a3a",
    fontWeight: 600,
    textTransform: "capitalize",
  },
  inputPrecio: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d9c9a8",
    fontSize: "0.95rem",
    outline: "none",
  },
  botonesEditor: {
    display: "flex",
    gap: 10,
    marginTop: 6,
    flexWrap: "wrap",
  },
  botonGuardar: {
    padding: "10px 14px",
    backgroundColor: "#e9f7e9",
    color: "#2f5a2f",
    border: "1px solid #bdddbd",
    borderRadius: 12,
    fontSize: "0.94rem",
    cursor: "pointer",
  },
  botonCancelar: {
    padding: "10px 14px",
    backgroundColor: "#fff1f1",
    color: "#8a3d3d",
    border: "1px solid #e3bcbc",
    borderRadius: 12,
    fontSize: "0.94rem",
    cursor: "pointer",
  },
};

export default AdminClasesNuevo;