import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";

const ConfirmacionPago = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [cargando, setCargando] = useState(true);
  const [esTarjetaRegalo, setEsTarjetaRegalo] = useState(false);
  const [tarjeta, setTarjeta] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCargando(false);
        return;
      }

      try {
        const [tarjetasSnap, reservasSnap] = await Promise.all([
          get(ref(dbRealtime, `usuarios/${user.uid}/tarjetasRegalo`)),
          get(ref(dbRealtime, `usuarios/${user.uid}/listaReservas`)),
        ]);

        const tarjetas = tarjetasSnap.exists() ? tarjetasSnap.val() : {};
        const reservas = reservasSnap.exists() ? reservasSnap.val() : {};

        const ultimaTarjeta = obtenerUltimaTarjetaRegalo(tarjetas);
        const ultimaReserva = obtenerUltimaReserva(reservas);

        const fechaTarjeta = obtenerFechaComparable(ultimaTarjeta);
        const fechaReserva = obtenerFechaComparable(ultimaReserva);

        const ahora = Date.now();
        const DOS_HORAS = 2 * 60 * 60 * 1000;

        const tarjetaReciente =
          fechaTarjeta && ahora - fechaTarjeta <= DOS_HORAS;

        const tarjetaMasRecienteQueReserva =
          fechaTarjeta && (!fechaReserva || fechaTarjeta >= fechaReserva);

        if (ultimaTarjeta && tarjetaReciente && tarjetaMasRecienteQueReserva) {
          setEsTarjetaRegalo(true);
          setTarjeta(ultimaTarjeta);
        } else {
          setEsTarjetaRegalo(false);
          setTarjeta(null);
        }
      } catch (error) {
        console.error("Error al cargar la confirmación del pago:", error);
        setErrorCarga("No se pudo comprobar la información del pago.");
      } finally {
        setCargando(false);
      }
    });

    return () => unsubscribe();
  }, [location.state]);

  const copiarCodigo = async () => {
    if (!tarjeta?.codigo) return;

    try {
      await navigator.clipboard.writeText(tarjeta.codigo);
      alert("Código copiado.");
    } catch (error) {
      console.error("Error al copiar el código:", error);
      alert("No se pudo copiar el código.");
    }
  };

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <div style={styles.check}>✓</div>

        {cargando ? (
          <>
            <h1 style={styles.title}>Comprobando pago...</h1>
            <p style={styles.text}>Estamos preparando la información.</p>
          </>
        ) : esTarjetaRegalo && tarjeta ? (
          <>
            <h1 style={styles.title}>¡Pago realizado con éxito!</h1>

            <p style={styles.text}>
              Tu tarjeta regalo ya está lista. Ya puedes compartir el código con
              la persona que la va a disfrutar.
            </p>

            <div style={styles.cardBox}>
              <p style={styles.label}>
                <strong>Clase regalo:</strong> {tarjeta.clase || "Tarjeta regalo"}
              </p>

              {tarjeta.subtipo ? (
                <p style={styles.label}>
                  <strong>Opción:</strong> {tarjeta.subtipo}
                </p>
              ) : null}

              <p style={styles.label}>
                <strong>Importe:</strong> {Number(tarjeta.precioTotal || 0)} €
              </p>

              <p style={{ ...styles.label, marginBottom: 8 }}>
                <strong>Código:</strong>
              </p>

              <div style={styles.codigoBox}>{tarjeta.codigo || "—"}</div>

              {tarjeta.nombreDestinatario ? (
                <p style={{ ...styles.label, marginTop: 14 }}>
                  <strong>Para:</strong> {tarjeta.nombreDestinatario}
                </p>
              ) : null}

              {tarjeta.nombreComprador ? (
                <p style={styles.label}>
                  <strong>De parte de:</strong> {tarjeta.nombreComprador}
                </p>
              ) : null}

              {tarjeta.mensajePersonalizado ? (
                <p style={styles.label}>
                  <strong>Mensaje:</strong> {tarjeta.mensajePersonalizado}
                </p>
              ) : null}
            </div>

            <div style={styles.botones}>
              <button onClick={copiarCodigo} style={styles.botonPrincipal}>
                Copiar código
              </button>

              <button
                onClick={() => navigate("/perfil")}
                style={styles.botonSecundario}
              >
                Ver mi perfil
              </button>
            </div>
            <div style={styles.descargaBox}>
  <p style={styles.descargaTexto}>
    Descarga una tarjeta para imprimir y escribir a mano el código.
  </p>

  <a
    href="/tarjetas-regalo/postal regalo.pdf"
    download
    style={styles.botonDescarga}
  >
    Descargar tarjeta regalo
  </a>
</div>
          </>
        ) : (
          <>
            <h1 style={styles.title}>¡Pago realizado con éxito!</h1>

            <p style={styles.text}>
              Gracias por tu reserva. Te esperamos en el taller con muchas ganas.
            </p>

            {location.state?.pagoSimuladoPorAdministrador ? (
              <p style={styles.text}>
                Pago de prueba confirmado para la cuenta de administrador; no se
                ha realizado ningún cargo.
              </p>
            ) : null}

            {errorCarga ? <p style={styles.errorText}>{errorCarga}</p> : null}
            

            <div style={styles.botones}>

              
              <button
                onClick={() => navigate("/dondereservar")}
                style={styles.botonPrincipal}
              >
                Seguir reservando
              </button>

              <button
                onClick={() => navigate("/perfil")}
                style={styles.botonSecundario}
              >
                Ver mi reserva
              </button>
            </div>
          </>
        )}

        <img
          src="/img/logoPC.png"
          alt="Logo TuTurno"
          style={styles.logo}
        />
      </div>
    </div>
  );
};

function obtenerFechaComparable(item) {
  if (!item) return null;

  const fecha =
    item.actualizadoEn ||
    item.fechaCompra ||
    item.creadoEn ||
    item.timestamp ||
    item.fechaUso ||
    item.fechaCanje ||
    null;

  if (!fecha) return null;

  const ms = new Date(fecha).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function obtenerUltimaTarjetaRegalo(tarjetasObj) {
  const tarjetas = Object.values(tarjetasObj || {}).filter(Boolean);

  if (!tarjetas.length) return null;

  tarjetas.sort((a, b) => {
    const fechaA = obtenerFechaComparable(a) || 0;
    const fechaB = obtenerFechaComparable(b) || 0;
    return fechaB - fechaA;
  });

  return tarjetas[0] || null;
}

function obtenerUltimaReserva(reservasObj) {
  const reservas = Object.values(reservasObj || {}).filter(Boolean);

  if (!reservas.length) return null;

  reservas.sort((a, b) => {
    const fechaA = obtenerFechaComparable(a) || 0;
    const fechaB = obtenerFechaComparable(b) || 0;
    return fechaB - fechaA;
  });

  return reservas[0] || null;
}

const styles = {
  body: {
    backgroundColor: "#fffef4",
    fontFamily: "'Segoe UI', sans-serif",
    margin: 0,
    padding: 20,
    minHeight: "100vh",
    color: "#333",
  },
  container: {
    maxWidth: 480,
    margin: "0 auto",
    backgroundColor: "white",
    borderRadius: 16,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    padding: 24,
    textAlign: "center",
  },
  check: {
    fontSize: "4rem",
    color: "#4BB543",
    marginBottom: 20,
  },
  title: {
    fontSize: "1.6rem",
    marginBottom: 10,
    color: "#6b3700",
  },
  text: {
    fontSize: "1rem",
    marginBottom: 24,
    lineHeight: 1.5,
  },
  errorText: {
    fontSize: "0.92rem",
    color: "#a94442",
    marginBottom: 16,
  },
  cardBox: {
    backgroundColor: "#fffaf0",
    border: "1px solid #f1e7c6",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    textAlign: "left",
  },
  label: {
    fontSize: "0.95rem",
    color: "#5c3c00",
    marginBottom: 8,
    lineHeight: 1.5,
  },
  codigoBox: {
    backgroundColor: "#f8f8f8",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: "1.15rem",
    fontWeight: "bold",
    color: "#5c3c00",
    textAlign: "center",
    letterSpacing: "1px",
  },
  botones: {
    display: "flex",
    justifyContent: "center",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 24,
  },
  descargaBox: {
  marginBottom: 24,
},

descargaTexto: {
  fontSize: "0.92rem",
  color: "#7a6a5a",
  marginBottom: 12,
  lineHeight: 1.5,
},

botonDescarga: {
  display: "inline-block",
  backgroundColor: "#f5f1ea",
  color: "#5f5247",
  padding: "12px 20px",
  border: "1px solid #d1c7b8",
  borderRadius: "999px",
  fontSize: "0.98rem",
  fontWeight: "600",
  textDecoration: "none",
  cursor: "pointer",
},
  botonPrincipal: {
    backgroundColor: "#f59e8f",
    color: "white",
    padding: "12px 20px",
    border: "none",
    borderRadius: "999px",
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: "pointer",
  },
  botonSecundario: {
    backgroundColor: "white",
    color: "#5f6368",
    padding: "12px 20px",
    border: "1px solid #d1d5db",
    borderRadius: "999px",
    fontSize: "1rem",
    fontWeight: "500",
    cursor: "pointer",
  },
  logo: {
    display: "block",
    margin: "10px auto 0",
    width: 80,
    height: "auto",
  },
};

export default ConfirmacionPago;