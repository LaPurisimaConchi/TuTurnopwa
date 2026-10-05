import React, { useEffect, useMemo, useState } from "react";
import { ref, get, push, remove, runTransaction, set, update } from "firebase/database";
import { useSearchParams } from "react-router-dom";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";

function obtenerEstadoVisibleBono(bono) {
  if (!bono) return "—";

  const restantes = Number(bono.clasesRestantes || 0);
  const estadoGuardado = String(bono.estadoBono || "").toLowerCase();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let fechaCaducidad = null;
  if (bono.fechaCaducidadBono) {
    fechaCaducidad = new Date(`${bono.fechaCaducidadBono}T00:00:00`);
  }

  const estaCaducado =
    fechaCaducidad instanceof Date &&
    !isNaN(fechaCaducidad.getTime()) &&
    hoy > fechaCaducidad;

  if (estadoGuardado === "caducado" || estaCaducado) {
    return "Caducado";
  }

  if (estadoGuardado === "agotado" || restantes <= 0) {
    return "Agotado";
  }

  return "Activo";
}

function formatearFechaNota(fecha) {
  if (!fecha) return "Sin fecha";

  const fechaParseada = new Date(fecha);

  if (!isNaN(fechaParseada.getTime())) {
    return fechaParseada.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return fecha;
}

const AdminDetalleBonoNuevo = () => {
  const [searchParams] = useSearchParams();
  const bonoId = searchParams.get("id");
  const uid = searchParams.get("uid");

  const [bono, setBono] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [notasInternas, setNotasInternas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [editandoFechaInicio, setEditandoFechaInicio] = useState(false);
  const [fechaInicioEditada, setFechaInicioEditada] = useState("");
  const [guardandoFechaInicio, setGuardandoFechaInicio] = useState(false);
  const [editandoCaducidad, setEditandoCaducidad] = useState(false);
  const [fechaCaducidadEditada, setFechaCaducidadEditada] = useState("");
  const [guardandoCaducidad, setGuardandoCaducidad] = useState(false);
  const [anadiendoClase, setAnadiendoClase] = useState(false);
  const [descontandoClase, setDescontandoClase] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

useEffect(() => {
  const onResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", onResize);

  return () => window.removeEventListener("resize", onResize);
}, []);

  useEffect(() => {
    const cargarDetalle = async () => {
      setCargando(true);

      try {
        if (!uid || !bonoId) {
          setBono(null);
          setUsuario(null);
          return;
        }

        const usuarioSnap = await get(ref(dbRealtime, `usuarios/${uid}`));

        if (!usuarioSnap.exists()) {
          setBono(null);
          setUsuario(null);
          return;
        }

        const usuarioData = usuarioSnap.val() || {};
        const bonoData = usuarioData?.bonos?.[bonoId] || null;

        setUsuario({
          uid,
          nombre: usuarioData.nombre || "",
          email: usuarioData.email || "",
          telefono: usuarioData.telefono || "",
        });

        if (!bonoData) {
          setBono(null);
          return;
        }

        setBono({
          bonoId,
          uid,
          clase: bonoData.clase || "Bono",
          claseId: bonoData.claseId || "",
          fechaInicio: bonoData.fechaInicio || "",
          fechaCaducidadBono: bonoData.fechaCaducidadBono || "",
          numeroClases: Number(bonoData.numeroClases || 0),
          clasesConsumidas: Number(bonoData.clasesConsumidas || 0),
          clasesRestantes: Number(bonoData.clasesRestantes || 0),
          estadoBono: bonoData.estadoBono || "activo",
          estadoPago: bonoData.estadoPago || "—",
          precioTotal: Number(bonoData.precioTotal || bonoData.precioBase || 0),
          creadoEn: bonoData.creadoEn || "",
          actualizadoEn: bonoData.actualizadoEn || "",
          orderId: bonoData.orderId || bonoId,
          tipoTaller: bonoData.tipoTaller || "",
          subtipo: bonoData.subtipo || "",
        });
      } catch (error) {
        console.error("Error al cargar detalle del bono:", error);
        setBono(null);
        setUsuario(null);
      } finally {
        setCargando(false);
      }
    };

    cargarDetalle();
  }, [uid, bonoId]);

  useEffect(() => {
    const cargarNotas = async () => {
      try {
        if (!uid || !bonoId) {
          setNotasInternas([]);
          return;
        }

        const notasSnap = await get(
          ref(dbRealtime, `usuarios/${uid}/bonos/${bonoId}/notasInternas`)
        );

        if (!notasSnap.exists()) {
          setNotasInternas([]);
          return;
        }

        const notasObj = notasSnap.val() || {};
        const notasArray = Object.entries(notasObj).map(([id, nota]) => ({
          id,
          ...nota,
        }));

        notasArray.sort((a, b) => {
          const fechaA = new Date(a.fecha || 0).getTime();
          const fechaB = new Date(b.fecha || 0).getTime();
          return fechaB - fechaA;
        });

        setNotasInternas(notasArray);
      } catch (error) {
        console.error("Error al cargar notas del bono:", error);
        setNotasInternas([]);
      }
    };

    cargarNotas();
  }, [uid, bonoId]);

  const estadoVisible = useMemo(() => obtenerEstadoVisibleBono(bono), [bono]);

  const guardarFechaInicio = async () => {
    if (!uid || !bonoId || !fechaInicioEditada) return;

    try {
      setGuardandoFechaInicio(true);
      const actualizadoEn = new Date().toISOString();
      await update(ref(dbRealtime, `usuarios/${uid}/bonos/${bonoId}`), {
        fechaInicio: fechaInicioEditada,
        actualizadoEn,
      });

      setBono((actual) => ({
        ...actual,
        fechaInicio: fechaInicioEditada,
        actualizadoEn,
      }));
      setEditandoFechaInicio(false);
    } catch (error) {
      console.error("Error al cambiar la fecha de inicio del bono:", error);
      alert("No se pudo cambiar la fecha de inicio. Revisa la consola.");
    } finally {
      setGuardandoFechaInicio(false);
    }
  };

  const guardarFechaCaducidad = async () => {
    if (!uid || !bonoId || !fechaCaducidadEditada) return;

    try {
      setGuardandoCaducidad(true);
      const actualizadoEn = new Date().toISOString();
      await update(ref(dbRealtime, `usuarios/${uid}/bonos/${bonoId}`), {
        fechaCaducidadBono: fechaCaducidadEditada,
        actualizadoEn,
      });

      setBono((actual) => ({
        ...actual,
        fechaCaducidadBono: fechaCaducidadEditada,
        actualizadoEn,
      }));
      setEditandoCaducidad(false);
    } catch (error) {
      console.error("Error al cambiar la fecha de caducidad del bono:", error);
      alert("No se pudo cambiar la fecha de caducidad. Revisa la consola.");
    } finally {
      setGuardandoCaducidad(false);
    }
  };

  const anadirClase = async () => {
    if (!uid || !bonoId) return;

    try {
      setAnadiendoClase(true);
      const bonoRef = ref(dbRealtime, `usuarios/${uid}/bonos/${bonoId}`);
      const bonoInicialSnap = await get(bonoRef);
      if (!bonoInicialSnap.exists()) {
        throw new Error("No se encontró el bono en la base de datos.");
      }
      const bonoInicial = bonoInicialSnap.val();
      const actualizadoEn = new Date().toISOString();
      let primeraEjecucion = true;
      const resultado = await runTransaction(bonoRef, (bonoActual) => {
        const datosBono = bonoActual || (primeraEjecucion ? bonoInicial : null);
        primeraEjecucion = false;
        if (!datosBono) return;

        const numeroClases = Number(datosBono.numeroClases || 0);
        const clasesConsumidas = Number(datosBono.clasesConsumidas || 0);
        const clasesRestantes = Number(
          datosBono.clasesRestantes ?? Math.max(numeroClases - clasesConsumidas, 0)
        );
        const estabaCaducado =
          String(datosBono.estadoBono || "").toLowerCase() === "caducado";

        return {
          ...datosBono,
          numeroClases: numeroClases + 1,
          clasesRestantes: clasesRestantes + 1,
          estadoBono: estabaCaducado ? datosBono.estadoBono : "activo",
          actualizadoEn,
        };
      });

      if (!resultado.committed) {
        throw new Error("No se pudo actualizar el bono porque ya no existe.");
      }

      const bonoActualizado = resultado.snapshot.val();
      setBono((actual) => ({
        ...actual,
        numeroClases: Number(bonoActualizado.numeroClases || 0),
        clasesRestantes: Number(bonoActualizado.clasesRestantes || 0),
        estadoBono: bonoActualizado.estadoBono || "activo",
        actualizadoEn: bonoActualizado.actualizadoEn || actualizadoEn,
      }));
    } catch (error) {
      console.error("Error al añadir una clase al bono:", error);
      const detalle = error instanceof Error ? error.message : String(error);
      alert(`No se pudo añadir la clase al bono. ${detalle}`);
    } finally {
      setAnadiendoClase(false);
    }
  };

  const descontarClase = async () => {
    if (!uid || !bonoId) return;

    try {
      setDescontandoClase(true);
      const bonoRef = ref(dbRealtime, `usuarios/${uid}/bonos/${bonoId}`);
      const bonoInicialSnap = await get(bonoRef);
      if (!bonoInicialSnap.exists()) {
        throw new Error("No se encontró el bono en la base de datos.");
      }
      const bonoInicial = bonoInicialSnap.val();
      const actualizadoEn = new Date().toISOString();
      let primeraEjecucion = true;
      const resultado = await runTransaction(bonoRef, (bonoActual) => {
        const datosBono = bonoActual || (primeraEjecucion ? bonoInicial : null);
        primeraEjecucion = false;
        if (!datosBono) return;

        const numeroClases = Number(datosBono.numeroClases || 0);
        const clasesConsumidas = Number(datosBono.clasesConsumidas || 0);
        const clasesRestantes = Number(
          datosBono.clasesRestantes ?? Math.max(numeroClases - clasesConsumidas, 0)
        );

        if (clasesRestantes <= 0) return;

        const nuevasRestantes = clasesRestantes - 1;
        const estabaCaducado =
          String(datosBono.estadoBono || "").toLowerCase() === "caducado";

        return {
          ...datosBono,
          clasesConsumidas: clasesConsumidas + 1,
          clasesRestantes: nuevasRestantes,
          estadoBono: estabaCaducado
            ? datosBono.estadoBono
            : nuevasRestantes === 0
              ? "agotado"
              : "activo",
          actualizadoEn,
        };
      });

      if (!resultado.committed) {
        throw new Error("El bono no tiene clases restantes para descontar.");
      }

      const bonoActualizado = resultado.snapshot.val();
      setBono((actual) => ({
        ...actual,
        clasesConsumidas: Number(bonoActualizado.clasesConsumidas || 0),
        clasesRestantes: Number(bonoActualizado.clasesRestantes || 0),
        estadoBono: bonoActualizado.estadoBono || "agotado",
        actualizadoEn: bonoActualizado.actualizadoEn || actualizadoEn,
      }));
    } catch (error) {
      console.error("Error al descontar una clase del bono:", error);
      const detalle = error instanceof Error ? error.message : String(error);
      alert(`No se pudo descontar una clase. ${detalle}`);
    } finally {
      setDescontandoClase(false);
    }
  };

  const porcentajeUso = useMemo(() => {
    if (!bono || !bono.numeroClases || bono.numeroClases <= 0) return 0;
    const porcentaje = (bono.clasesConsumidas / bono.numeroClases) * 100;
    return Math.min(100, Math.max(0, porcentaje));
  }, [bono]);

  const renderEstado = () => {
    if (estadoVisible === "Caducado") {
      return <span style={styles.badgeCaducado}>Caducado</span>;
    }

    if (estadoVisible === "Agotado") {
      return <span style={styles.badgeAgotado}>Agotado</span>;
    }

    return <span style={styles.badgeActivo}>Activo</span>;
  };

  const guardarNota = async () => {
    const texto = nuevaNota.trim();

    if (!texto || !uid || !bonoId) return;

    try {
      setGuardandoNota(true);

      const nuevaNotaRef = push(
        ref(dbRealtime, `usuarios/${uid}/bonos/${bonoId}/notasInternas`)
      );

      const notaData = {
        texto,
        fecha: new Date().toISOString(),
      };

      await set(nuevaNotaRef, notaData);

      setNotasInternas((prev) =>
        [{ id: nuevaNotaRef.key, ...notaData }, ...prev].sort((a, b) => {
          const fechaA = new Date(a.fecha || 0).getTime();
          const fechaB = new Date(b.fecha || 0).getTime();
          return fechaB - fechaA;
        })
      );

      setNuevaNota("");
    } catch (error) {
      console.error("Error al guardar nota del bono:", error);
      alert("No se pudo guardar la nota. Revisa la consola.");
    } finally {
      setGuardandoNota(false);
    }
  };

  const eliminarNota = async (notaId) => {
    if (!uid || !bonoId || !notaId) return;

    const confirmar = window.confirm("¿Quieres eliminar esta nota?");
    if (!confirmar) return;

    try {
      await remove(
        ref(
          dbRealtime,
          `usuarios/${uid}/bonos/${bonoId}/notasInternas/${notaId}`
        )
      );

      setNotasInternas((prev) => prev.filter((nota) => nota.id !== notaId));
    } catch (error) {
      console.error("Error al eliminar nota del bono:", error);
      alert("No se pudo eliminar la nota. Revisa la consola.");
    }
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

        <h1 style={styles.titulo}>Detalle del bono</h1>
        <p style={styles.subtitulo}>
          Información completa del bono comprado por el usuario.
        </p>

        {cargando ? (
          <p style={styles.mensaje}>Cargando detalle del bono...</p>
        ) : !bono ? (
          <p style={styles.mensaje}>No se ha encontrado el bono.</p>
        ) : (
          <>
            <div style={styles.hero}>
              <div style={styles.heroTexto}>
                <p style={styles.heroEyebrow}>Bono</p>
                <h2 style={styles.heroTitulo}>{bono.clase || "—"}</h2>
                <p style={styles.heroSubtexto}>
                  Usuario: {usuario?.nombre || usuario?.email || usuario?.uid || "—"}
                </p>
              </div>

              <div style={styles.heroEstado}>{renderEstado()}</div>
            </div>

            <div style={styles.bloque}>
              <h2 style={styles.bloqueTitulo}>Resumen principal</h2>

              <div style={styles.gridResumen}>
                <div style={styles.cardResumen}>
                  <div style={styles.caducidadHeader}>
                    <span style={styles.label}>Fecha inicio</span>
                    {!editandoFechaInicio && (
                      <button
                        type="button"
                        onClick={() => {
                          setFechaInicioEditada(bono.fechaInicio || "");
                          setEditandoFechaInicio(true);
                        }}
                        style={styles.botonAccion}
                      >
                        Cambiar fecha
                      </button>
                    )}
                  </div>
                  {editandoFechaInicio ? (
                    <div style={styles.editarCaducidad}>
                      <input
                        type="date"
                        value={fechaInicioEditada}
                        onChange={(event) =>
                          setFechaInicioEditada(event.target.value)
                        }
                        style={styles.inputFecha}
                        aria-label="Nueva fecha de inicio"
                      />
                      <div style={styles.accionesCaducidad}>
                        <button
                          type="button"
                          onClick={guardarFechaInicio}
                          disabled={guardandoFechaInicio || !fechaInicioEditada}
                          style={styles.botonAccion}
                        >
                          {guardandoFechaInicio ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditandoFechaInicio(false)}
                          disabled={guardandoFechaInicio}
                          style={styles.botonAccionSecundario}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span style={styles.valorGrande}>{bono.fechaInicio || "—"}</span>
                  )}
                </div>

                <div style={styles.cardResumen}>
                  <div style={styles.caducidadHeader}>
                    <span style={styles.label}>Caduca</span>
                    {!editandoCaducidad && (
                      <button
                        type="button"
                        onClick={() => {
                          setFechaCaducidadEditada(bono.fechaCaducidadBono || "");
                          setEditandoCaducidad(true);
                        }}
                        style={styles.botonAccion}
                      >
                        Cambiar fecha
                      </button>
                    )}
                  </div>
                  {editandoCaducidad ? (
                    <div style={styles.editarCaducidad}>
                      <input
                        type="date"
                        value={fechaCaducidadEditada}
                        onChange={(event) =>
                          setFechaCaducidadEditada(event.target.value)
                        }
                        style={styles.inputFecha}
                        aria-label="Nueva fecha de caducidad"
                      />
                      <div style={styles.accionesCaducidad}>
                        <button
                          type="button"
                          onClick={guardarFechaCaducidad}
                          disabled={guardandoCaducidad || !fechaCaducidadEditada}
                          style={styles.botonAccion}
                        >
                          {guardandoCaducidad ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditandoCaducidad(false)}
                          disabled={guardandoCaducidad}
                          style={styles.botonAccionSecundario}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span style={styles.valorGrande}>
                      {bono.fechaCaducidadBono || "—"}
                    </span>
                  )}
                </div>

                <div style={styles.cardResumen}>
                  <span style={styles.label}>Precio</span>
                  <span style={styles.valorGrande}>{bono.precioTotal}€</span>
                </div>

                <div style={styles.cardResumen}>
                  <span style={styles.label}>Estado pago</span>
                  <span style={styles.valorGrande}>{bono.estadoPago || "—"}</span>
                </div>
              </div>
            </div>

            <div style={styles.bloque}>
              <h2 style={styles.bloqueTitulo}>Uso del bono</h2>

              <div style={styles.gridUso}>
                <div style={styles.cardUso}>
                  <span style={styles.label}>Incluidas</span>
                  <span style={styles.valorGrande}>{bono.numeroClases}</span>
                </div>

                <div style={styles.cardUso}>
                  <span style={styles.label}>Consumidas</span>
                  <span style={styles.valorGrande}>{bono.clasesConsumidas}</span>
                </div>

                <div style={styles.cardUso}>
                  <span style={styles.label}>Restantes</span>
                  <span style={styles.valorGrande}>{bono.clasesRestantes}</span>
                </div>
              </div>

              <div style={styles.accionesClases}>
                <button
                  type="button"
                  onClick={anadirClase}
                  disabled={anadiendoClase || descontandoClase}
                  style={{
                    ...styles.botonAccion,
                    opacity: anadiendoClase || descontandoClase ? 0.6 : 1,
                    cursor: anadiendoClase || descontandoClase ? "wait" : "pointer",
                  }}
                >
                  {anadiendoClase ? "Añadiendo..." : "Añadir una clase"}
                </button>
                <button
                  type="button"
                  onClick={descontarClase}
                  disabled={
                    descontandoClase ||
                    anadiendoClase ||
                    bono.clasesRestantes <= 0
                  }
                  style={{
                    ...styles.botonAccionSecundario,
                    opacity:
                      descontandoClase ||
                      anadiendoClase ||
                      bono.clasesRestantes <= 0
                        ? 0.6
                        : 1,
                    cursor:
                      descontandoClase ||
                      anadiendoClase ||
                      bono.clasesRestantes <= 0
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {descontandoClase ? "Descontando..." : "Descontar una clase"}
                </button>
              </div>

              <div style={styles.progresoBox}>
                <div style={styles.progresoTextoFila}>
                  <span style={styles.progresoLabel}>Progreso</span>
                  <span style={styles.progresoValor}>
                    {bono.clasesConsumidas} de {bono.numeroClases} clases usadas
                  </span>
                </div>

                <div style={styles.progresoBarraFondo}>
                  <div
                    style={{
                      ...styles.progresoBarraRelleno,
                      width: `${porcentajeUso}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={styles.bloque}>
              <h2 style={styles.bloqueTitulo}>Datos técnicos del bono</h2>

              <div style={styles.listaDatos}>
                <div
  style={{
    ...styles.filaDato,
    ...(isMobile ? styles.filaDatoMobile : {}),
  }}
>
                  <span style={styles.filaLabel}>Order ID</span>
                  <span style={styles.filaValor}>{bono.orderId || "—"}</span>
                </div>

                <div
  style={{
    ...styles.filaDato,
    ...(isMobile ? styles.filaDatoMobile : {}),
  }}
>
                  <span style={styles.filaLabel}>Clase ID</span>
                  <span style={styles.filaValor}>{bono.claseId || "—"}</span>
                </div>

                <div
  style={{
    ...styles.filaDato,
    ...(isMobile ? styles.filaDatoMobile : {}),
  }}
>
                  <span style={styles.filaLabel}>Subtipo</span>
                  <span style={styles.filaValor}>{bono.subtipo || "—"}</span>
                </div>

                <div
  style={{
    ...styles.filaDato,
    ...(isMobile ? styles.filaDatoMobile : {}),
  }}
>
                  <span style={styles.filaLabel}>Tipo taller</span>
                  <span style={styles.filaValor}>{bono.tipoTaller || "—"}</span>
                </div>

                <div
  style={{
    ...styles.filaDato,
    ...(isMobile ? styles.filaDatoMobile : {}),
  }}
>
                  <span style={styles.filaLabel}>Creado en</span>
                  <span style={styles.filaValor}>{bono.creadoEn || "—"}</span>
                </div>

                <div
  style={{
    ...styles.filaDato,
    ...(isMobile ? styles.filaDatoMobile : {}),
  }}
>
                  <span style={styles.filaLabel}>Actualizado en</span>
                  <span style={styles.filaValor}>{bono.actualizadoEn || "—"}</span>
                </div>
              </div>
            </div>

            <div style={styles.bloque}>
              <h2 style={styles.bloqueTitulo}>Usuario</h2>

              <div style={styles.gridUsuario}>
                <div style={styles.cardUsuario}>
                  <span style={styles.label}>Nombre</span>
                  <span style={styles.valor}>{usuario?.nombre || "—"}</span>
                </div>

                <div style={styles.cardUsuario}>
                  <span style={styles.label}>Email</span>
                  <span style={styles.valor}>{usuario?.email || "—"}</span>
                </div>

                <div style={styles.cardUsuario}>
                  <span style={styles.label}>Teléfono</span>
                  <span style={styles.valor}>{usuario?.telefono || "—"}</span>
                </div>

                <div style={styles.cardUsuario}>
                  <span style={styles.label}>UID</span>
                  <span style={styles.valor}>{usuario?.uid || "—"}</span>
                </div>
              </div>
            </div>

            <div style={styles.bloque}>
              <h2 style={styles.bloqueTitulo}>Notas internas</h2>

              <div style={styles.notaBox}>
                <textarea
                  value={nuevaNota}
                  onChange={(e) => setNuevaNota(e.target.value)}
                  placeholder="Escribe aquí una nota..."
                  style={styles.textarea}
                />

                <button
                  onClick={guardarNota}
                  disabled={guardandoNota || !nuevaNota.trim()}
                  style={{
                    ...styles.botonGuardarNota,
                    opacity: guardandoNota || !nuevaNota.trim() ? 0.6 : 1,
                    cursor:
                      guardandoNota || !nuevaNota.trim()
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {guardandoNota ? "Guardando..." : "Guardar nota"}
                </button>
              </div>

              {notasInternas.length === 0 ? (
                <p style={styles.mensajeSecundario}>
                  Todavía no hay notas para este bono.
                </p>
              ) : (
                <div style={styles.listaNotas}>
                  {notasInternas.map((nota) => (
                    <div key={nota.id} style={styles.cardNota}>
                      <div style={styles.cardNotaHeader}>
                        <span style={styles.fechaNota}>
                          {formatearFechaNota(nota.fecha)}
                        </span>

                        <button
                          onClick={() => eliminarNota(nota.id)}
                          style={styles.botonEliminarNota}
                        >
                          Eliminar
                        </button>
                      </div>

                      <p style={styles.textoNota}>{nota.texto || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
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
    maxWidth: 1100,
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
    margin: 0,
    textAlign: "center",
    color: "#2f2f2f",
    fontSize: "2rem",
  },
  subtitulo: {
    textAlign: "center",
    color: "#7a7a7a",
    marginTop: 8,
    marginBottom: 24,
  },
  mensaje: {
    textAlign: "center",
    color: "#7a7a7a",
    padding: 20,
  },
  hero: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
  },
  heroTexto: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  heroEyebrow: {
    margin: 0,
    color: "#7a6331",
    fontSize: "0.9rem",
    fontWeight: 600,
  },
  heroTitulo: {
    margin: 0,
    color: "#2f2f2f",
    fontSize: "1.6rem",
    lineHeight: 1.2,
  },
  heroSubtexto: {
    margin: 0,
    color: "#7a7a7a",
    fontSize: "0.98rem",
  },
  heroEstado: {
    display: "flex",
    alignItems: "center",
  },
  bloque: {
    backgroundColor: "#fffdf7",
    border: "1px solid #f0e5cf",
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
  },
  bloqueTitulo: {
    margin: "0 0 16px 0",
    color: "#4b3a2a",
    fontSize: "1.2rem",
  },
  gridResumen: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
  },
  cardResumen: {
    backgroundColor: "#fffaf0",
    border: "1px solid #eadfbe",
    borderRadius: 16,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  caducidadHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  editarCaducidad: {
    display: "grid",
    gap: 10,
  },
  inputFecha: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #eadfbe",
    borderRadius: 10,
    padding: "9px 10px",
    font: "inherit",
    color: "#2f2f2f",
  },
  accionesCaducidad: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  botonAccion: {
    backgroundColor: "#7a6331",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "8px 13px",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  botonAccionSecundario: {
    backgroundColor: "#fff",
    color: "#7a6331",
    border: "1px solid #d8cba8",
    borderRadius: 999,
    padding: "8px 13px",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  accionesClases: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  gridUso: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  cardUso: {
    backgroundColor: "#fffaf0",
    border: "1px solid #eadfbe",
    borderRadius: 16,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    textAlign: "center",
  },
  progresoBox: {
    backgroundColor: "#fffaf0",
    border: "1px solid #eadfbe",
    borderRadius: 16,
    padding: 16,
  },
  progresoTextoFila: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  progresoLabel: {
    color: "#7a6331",
    fontSize: "0.9rem",
    fontWeight: 600,
  },
  progresoValor: {
    color: "#2f2f2f",
    fontSize: "0.95rem",
    fontWeight: 600,
  },
  progresoBarraFondo: {
    width: "100%",
    height: 12,
    borderRadius: 999,
    backgroundColor: "#f1e7c9",
    overflow: "hidden",
  },
  progresoBarraRelleno: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#d8b65a",
    transition: "width 0.3s ease",
  },
  listaDatos: {
    display: "grid",
    gap: 10,
  },
  filaDato: {
    display: "grid",
    gridTemplateColumns: "180px 1fr",
    gap: 14,
    alignItems: "start",
    padding: "10px 0",
    borderBottom: "1px solid #f3ead7",
  },
  filaDatoMobile: {
  gridTemplateColumns: "1fr",
  gap: 4,
},
  filaLabel: {
    color: "#7a6331",
    fontSize: "0.9rem",
    fontWeight: 600,
  },
  filaValor: {
    color: "#2f2f2f",
    fontSize: "0.96rem",
    wordBreak: "break-word",
  },
  gridUsuario: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  cardUsuario: {
    backgroundColor: "#fffaf0",
    border: "1px solid #eadfbe",
    borderRadius: 16,
    padding: 14,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    color: "#7a6331",
    fontSize: "0.88rem",
    fontWeight: 600,
  },
  valor: {
    color: "#2f2f2f",
    fontSize: "0.96rem",
    wordBreak: "break-word",
  },
  valorGrande: {
    color: "#2f2f2f",
    fontSize: "1.1rem",
    fontWeight: 700,
    wordBreak: "break-word",
  },
  badgeActivo: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    backgroundColor: "#e7f7e7",
    border: "1px solid #b7dfb7",
    color: "#2f6b2f",
    fontSize: "0.85rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  badgeAgotado: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    backgroundColor: "#f1ece4",
    border: "1px solid #d8cbbb",
    color: "#6f5d47",
    fontSize: "0.85rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  badgeCaducado: {
    display: "inline-block",
    padding: "6px 12px",
    borderRadius: 999,
    backgroundColor: "#fbe1e1",
    border: "1px solid #e7b7b7",
    color: "#8a3b3b",
    fontSize: "0.85rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  notaBox: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginBottom: 18,
  },
  textarea: {
    width: "100%",
    minHeight: 110,
    borderRadius: 14,
    border: "1px solid #eadfbe",
    padding: 14,
    fontSize: "0.96rem",
    fontFamily: "'Segoe UI', sans-serif",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    backgroundColor: "#fffaf0",
    color: "#2f2f2f",
  },
  botonGuardarNota: {
    alignSelf: "flex-start",
    backgroundColor: "#7a6331",
    color: "#fff",
    border: "none",
    borderRadius: 999,
    padding: "10px 18px",
    fontSize: "0.92rem",
    fontWeight: 700,
  },
  mensajeSecundario: {
    color: "#7a7a7a",
    margin: 0,
  },
  listaNotas: {
    display: "grid",
    gap: 12,
  },
  cardNota: {
    backgroundColor: "#fffaf0",
    border: "1px solid #eadfbe",
    borderRadius: 16,
    padding: 14,
  },
  cardNotaHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  fechaNota: {
    color: "#7a6331",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  textoNota: {
    margin: 0,
    color: "#2f2f2f",
    fontSize: "0.96rem",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  botonEliminarNota: {
    backgroundColor: "#fff",
    color: "#8a3b3b",
    border: "1px solid #e7b7b7",
    borderRadius: 999,
    padding: "6px 12px",
    fontSize: "0.82rem",
    fontWeight: 700,
    cursor: "pointer",
  },
};

export default AdminDetalleBonoNuevo;