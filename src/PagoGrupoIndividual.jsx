import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { ref, get, push, set } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import { simularPagoAdmin } from "./utils/pagoAdmin";

const PagoGrupoIndividual = () => {
  const { grupoId } = useParams();
  const navigate = useNavigate();

 

  const [grupo, setGrupo] = useState(null);
const [cargando, setCargando] = useState(true);
const [mensaje, setMensaje] = useState("");
const [nombreAsistente, setNombreAsistente] = useState("");
const [telefonoAsistente, setTelefonoAsistente] = useState("");
const [procesando, setProcesando] = useState(false);

useEffect(() => {
  const cargarGrupo = async () => {
    setCargando(true);
    setMensaje("");

    try {
      if (!grupoId) {
        setMensaje("Este enlace no es válido.");
        setCargando(false);
        return;
      }

      console.log("grupoId recibido:", grupoId);
console.log("ruta Firebase:", `reservasGrupos/${grupoId}`);
console.log("userAgent:", navigator.userAgent);

const grupoRef = ref(dbRealtime, `reservasGrupos/${grupoId}`);
const snap = await get(grupoRef);
      

      if (!snap.exists()) {
        setMensaje("Este enlace ya no está disponible.");
        setGrupo(null);
        setCargando(false);
        return;
      }

      const datosGrupo = {
  id: grupoId,
  ...snap.val(),
};

if (datosGrupo.modoPago !== "individual") {
  setMensaje("Este enlace no corresponde a un pago individual.");
  setGrupo(null);
  setCargando(false);
  return;
}

if (
  datosGrupo.estado === "cancelada_por_caducidad" ||
  datosGrupo.estado === "Cancelada" ||
  datosGrupo.estado === "cancelada"
) {
  setMensaje("Esta reserva ya no está disponible.");
  setGrupo(null);
  setCargando(false);
  return;
}

const plazasPagadas = Number(datosGrupo.plazasPagadas || 0);
const plazasTotales = Number(datosGrupo.plazas || 0);

if (plazasTotales > 0 && plazasPagadas >= plazasTotales) {
  setMensaje("Este grupo ya está completo.");
  setGrupo(null);
  setCargando(false);
  return;
}


if (datosGrupo.fechaLimitePago) {
  const ahora = new Date();
  const limite = new Date(datosGrupo.fechaLimitePago);

  if (!Number.isNaN(limite.getTime()) && ahora > limite) {
    setMensaje("El plazo de pago ha finalizado.");
    setGrupo(null);
    setCargando(false);
    return;
  }
}

setGrupo(datosGrupo);
    } catch (error) {
      console.error("Error al cargar el grupo:", error);
      setMensaje(
  `No se pudo cargar la reserva de grupo. Error: ${
    error?.message || "error desconocido"
  }`
);
    } finally {
      setCargando(false);
    }
  };

  cargarGrupo();
}, [grupoId]);

const handleCrearPagoPendiente = async () => {
  if (!grupo) {
    alert("No se ha podido cargar la reserva de grupo.");
    return;
  }

  if (!nombreAsistente.trim() || !telefonoAsistente.trim()) {
    alert("Introduce tu nombre y teléfono para continuar.");
    return;
  }

  const plazasPagadas = Number(grupo.plazasPagadas || 0);
  const plazasTotales = Number(grupo.plazas || 0);

  if (plazasTotales > 0 && plazasPagadas >= plazasTotales) {
    alert("Este grupo ya está completo.");
    return;
  }

  try {
    setProcesando(true);

    const ahoraISO = new Date().toISOString();
    const orderId = Date.now().toString().slice(-12);

    const pagosRef = ref(
      dbRealtime,
      `reservasGrupos/${grupo.id}/pagosIndividuales`
    );

    const nuevoPagoRef = push(pagosRef);
    const pagoIndividualId = nuevoPagoRef.key;

    const pagoIndividual = {
      nombreAsistente: nombreAsistente.trim(),
      telefonoAsistente: telefonoAsistente.trim(),
      importe: Number(grupo.precioUnitario || 0),
      estadoPago: "pendiente_redsys",
      orderId,
      creadoEn: ahoraISO,
      pagadoEn: null,
    };

    await set(nuevoPagoRef, pagoIndividual);
    await set(ref(dbRealtime, `pedidosPendientes/${orderId}`), {
  orderId,
  uid: getAuth().currentUser?.uid || "",
  tipo: "pago_grupo_individual",
  grupoId: grupo.id,
  pagoIndividualId,
  nombreAsistente: nombreAsistente.trim(),
  telefonoAsistente: telefonoAsistente.trim(),
  clase: grupo.clase || "",
  fecha: grupo.fecha || "",
  turno: grupo.turno || "",
  precioTotal: Number(grupo.precioUnitario || 0),
  estadoPago: "pendiente",
  procesado: false,
  creadoEn: ahoraISO,
});

    if (await simularPagoAdmin(orderId)) {
      navigate(`/pago-grupo-exitoso/${grupo.id}`);
      return;
    }

    console.log("pago individual pendiente creado:", {
      grupoId: grupo.id,
      pagoIndividualId,
      pagoIndividual,
    });

console.log("redirigiendo pago individual a Redsys...", {
  orderId,
  importe: pagoIndividual.importe,
});

const amountCents = Math.round(
  Number(pagoIndividual.importe || 0) * 100
);

window.location.href =
  `/api/crear-sesion?` +
  new URLSearchParams({
    orderId,
    amountCents: String(amountCents),
    payMethod: "card",
    okUrl: `https://app.lapurisimaconchi.com/pago-grupo-exitoso/${grupo.id}`,
    koUrl: `https://app.lapurisimaconchi.com/pago-grupo-error/${grupo.id}`,
  }).toString();

    
  } catch (error) {
    console.error("Error al crear pago individual pendiente:", error);
    alert("No se pudo preparar el pago individual.");
  } finally {
    setProcesando(false);
  }
};
 return (
  <div style={styles.body}>
    {cargando ? (
      <div style={styles.container}>
        <p>Cargando grupo...</p>
      </div>
    ) : mensaje ? (
      <div style={styles.container}>
        <BotonVolver />

        <h2 style={styles.titulo}>Pago individual de grupo</h2>

        <div style={styles.errorBox}>{mensaje}</div>
      </div>
    ) : (
      <div style={styles.container}>
        <BotonVolver />

        <h2 style={styles.titulo}>Pago individual de grupo</h2>

        <p style={styles.descripcion}>
          Estás accediendo al pago de una plaza dentro de una reserva de grupo.
        </p>

      <div style={styles.infoBox}>
  <p>
    <strong>Grupo:</strong> {grupo?.nombreGrupo || "-"}
  </p>
  <p>
    <strong>Clase:</strong> {grupo?.clase || "-"}
  </p>
  <p>
    <strong>Fecha:</strong> {grupo?.fecha || "-"}
  </p>
  <p>
    <strong>Turno:</strong> {grupo?.turno || "-"}
  </p>
  <p>
    <strong>Precio por persona:</strong>{" "}
    {grupo?.precioUnitario ? `${grupo.precioUnitario} €` : "-"}
  </p>
  <p>
    <strong>Plazas pagadas:</strong>{" "}
    {grupo?.plazasPagadas ?? 0}/{grupo?.plazas || 0}
  </p>
  <p>
    <strong>Plazas pendientes:</strong>{" "}
    {grupo?.plazasPendientes ?? 0}
  </p>
</div>
<div style={styles.formBox}>
  <h3 style={styles.subtitulo}>Datos de la persona que paga esta plaza</h3>

  <input
    type="text"
    placeholder="Nombre del asistente"
    value={nombreAsistente}
    onChange={(e) => setNombreAsistente(e.target.value)}
    style={styles.input}
  />

  <input
    type="tel"
    placeholder="Teléfono del asistente"
    value={telefonoAsistente}
    onChange={(e) => setTelefonoAsistente(e.target.value)}
    style={styles.input}
     required
  />

  <button
  type="button"
  style={{
    ...styles.btn,
    opacity:
      procesando || !nombreAsistente.trim() || !telefonoAsistente.trim()
        ? 0.6
        : 1,
    cursor:
      procesando || !nombreAsistente.trim() || !telefonoAsistente.trim()
        ? "not-allowed"
        : "pointer",
  }}
  disabled={procesando || !nombreAsistente.trim() || !telefonoAsistente.trim()}
 onClick={handleCrearPagoPendiente}
>
    {procesando ? "Preparando pago..." : "Pagar mi plaza"}
  </button>
</div>
      </div>
    )}
  </div>
);
};

const styles = {
  body: {
    backgroundColor: "#fffef4",
    fontFamily: "'Segoe UI', sans-serif",
    minHeight: "100vh",
    padding: 20,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 16,
    maxWidth: 520,
    width: "100%",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
    textAlign: "center",
  },
  titulo: {
    color: "#6b3700",
    fontSize: "1.4rem",
    marginBottom: 10,
  },
  descripcion: {
    fontSize: "0.95rem",
    color: "#555",
    marginBottom: 20,
    lineHeight: 1.6,
  },
  infoBox: {
    backgroundColor: "#fffaf0",
    border: "1px solid #f1e7c6",
    borderRadius: 14,
    padding: 16,
    color: "#5c3c00",
    fontSize: "0.95rem",
    wordBreak: "break-word",
  },
  errorBox: {
  backgroundColor: "#fff0f0",
  border: "1px solid #f5c2c2",
  borderRadius: 14,
  padding: 16,
  color: "#8a1f1f",
  fontSize: "0.95rem",
  lineHeight: 1.5,
},
formBox: {
  marginTop: 22,
  textAlign: "left",
},

subtitulo: {
  color: "#6b3700",
  fontSize: "1.05rem",
  marginBottom: 12,
  textAlign: "center",
},

input: {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #ccc",
  marginBottom: 12,
  fontSize: "1rem",
  boxSizing: "border-box",
},

btn: {
  backgroundColor: "#f8b5b5",
  color: "white",
  padding: "12px 20px",
  fontWeight: "bold",
  borderRadius: 30,
  fontSize: "0.95rem",
  border: "none",
  cursor: "pointer",
  width: "100%",
},
};

export default PagoGrupoIndividual;