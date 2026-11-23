import React, { useEffect, useState } from "react";
import Icono from "./components/Icono";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import {
  cancelarCierreSesionInvitado,
  cerrarCompraInvitado,
  cerrarSesionInvitadoTrasSalir,
  conservarSesionInvitado,
} from "./utils/invitado";
import CodigoReserva from "./components/CodigoReserva";
import { leerTipoPagoEnCurso } from "./utils/pagoServidor";
import { BotonPlantilla, usePlantillasTarjetaRegalo } from "./components/DescargasTarjetaRegalo";

const ConfirmacionPago = () => {
  const plantillasTarjeta = usePlantillasTarjetaRegalo();
  const navigate = useNavigate();
  const location = useLocation();

  const [cargando, setCargando] = useState(true);
  const [esTarjetaRegalo, setEsTarjetaRegalo] = useState(false);
  const [tarjeta, setTarjeta] = useState(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [esInvitado, setEsInvitado] = useState(false);
  const [orderIdReserva, setOrderIdReserva] = useState("");
  // Compra de un bono (su primera clase llega a listaReservas marcada desdeBono)
  const [esBono, setEsBono] = useState(false);
  // Pago de prueba del administrador (no pasa por el TPV)
  const esPagoSimulado = !!location.state?.pagoSimuladoPorAdministrador;
  // Reserva hecha canjeando una tarjeta regalo: no hay pago
  const esCanje = !!(location.state?.desdeTarjeta || location.state?.usandoTarjetaRegalo);

  // La compra ha terminado: la siguiente vuelve a pedir los datos al invitado
  useEffect(() => {
    leerTipoPagoEnCurso(); // el pago ha ido bien: se olvida lo que estaba en curso
    cancelarCierreSesionInvitado();
    cerrarCompraInvitado();
    // Al salir de aquí se cierra la sesión de invitado: no queda perfil en la web
    return () => cerrarSesionInvitadoTrasSalir();
  }, []);

  useEffect(() => {
    const auth = getAuth();

    let cancelado = false;
    let temporizador = null;

    // Si cambia el pedido con la pantalla ya abierta, se empieza de cero
    setCargando(true);
    setEsTarjetaRegalo(false);
    setTarjeta(null);
    setOrderIdReserva("");
    setEsBono(false);
    setErrorCarga("");

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCargando(false);
        return;
      }

      setEsInvitado(user.isAnonymous);

      // El pedido que se acaba de pagar: Redsys vuelve con ?pedido=, y las pantallas de la
      // web (canje con tarjeta, pago simulado del admin) lo pasan en el estado
      const pedido = String(
        location.state?.orderId || new URLSearchParams(location.search).get("pedido") || ""
      );
      // Sin pedido (se abrió la dirección a mano) no hay nada que celebrar
      if (!pedido) {
        setCargando(false);
        return;
      }

      // Quien reserva con una tarjeta regalo, o el admin con un pago de prueba, ya viene
      // con la reserva hecha: no se espera ningún aviso del TPV
      if (esCanje || esPagoSimulado) {
        setOrderIdReserva(pedido);
        setCargando(false);
        return;
      }

      // Con el TPV, el pago se da por bueno cuando el aviso de Redsys ya lo ha confirmado en
      // la cuenta; si aún no ha llegado, se vuelve a mirar unos segundos
      const buscarPedido = async () => {
        const [tarjetaSnap, reservasSnap] = await Promise.all([
          get(ref(dbRealtime, `usuarios/${user.uid}/tarjetasRegalo/${pedido}`)),
          get(ref(dbRealtime, `usuarios/${user.uid}/listaReservas`)),
        ]);
        const pagado = (x) => String(x?.estadoPago || "").toLowerCase() === "pagado";

        const t = tarjetaSnap.exists() ? tarjetaSnap.val() : null;
        if (pagado(t)) {
          setEsTarjetaRegalo(true);
          setTarjeta(t);
          return true;
        }

        const entrada = Object.values(reservasSnap.exists() ? reservasSnap.val() : {}).find(
          (r) => r?.orderId === pedido && pagado(r)
        );
        if (entrada) {
          setOrderIdReserva(pedido);
          setEsBono(entrada.desdeBono === true);
          return true;
        }
        return false;
      };

      let intentos = 0;
      const consultar = async () => {
        try {
          if (await buscarPedido()) {
            if (!cancelado) setCargando(false);
            return;
          }
        } catch (error) {
          console.error("Error al cargar la confirmación del pago:", error);
          if (!cancelado) {
            setErrorCarga("No se pudo comprobar la información del pago.");
            setCargando(false);
          }
          return;
        }
        intentos += 1;
        if (cancelado) return;
        if (intentos >= 8) {
          setCargando(false);
          return;
        }
        temporizador = setTimeout(consultar, 2500);
      };
      consultar();
    });

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
      unsubscribe();
    };
  }, [location.state, location.search, esCanje, esPagoSimulado]);

  // Abrir /pago/exito a mano no es haber pagado: solo se celebra el pago si el pedido (?pedido=)
  // consta ya como pagado en la cuenta, o si es un canje o un pago simulado. Si el aviso
  // del TPV aún no ha llegado, se dice que puede tardar unos segundos.
  const sinPagoReciente = !cargando && !esTarjetaRegalo && !esCanje && !esPagoSimulado && !orderIdReserva;

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
        {sinPagoReciente ? null : <div style={styles.check}><Icono nombre="check" tamano={32} /></div>}

        {sinPagoReciente ? (
          <>
            <h1 style={styles.title}>No encontramos ningún pago reciente</h1>
            <p style={styles.text}>
              Si acabas de pagar, tu reserva puede tardar unos segundos en aparecer: revisa tu
              perfil o el correo de confirmación. Si no has pagado, no se ha cobrado nada.
            </p>
            {errorCarga ? <p style={styles.errorText}>{errorCarga}</p> : null}
            <div style={styles.botones}>
              <button onClick={() => window.location.reload()} style={styles.botonPrincipal}>
                Comprobar de nuevo
              </button>
              {!esInvitado && (
                <button onClick={() => navigate("/perfil")} style={styles.botonSecundario}>
                  Ver mi perfil
                </button>
              )}
              <button onClick={() => navigate("/portada")} style={styles.botonSecundario}>
                Ir al inicio
              </button>
            </div>
          </>
        ) : cargando ? (
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

              {Number(tarjeta.plazas || 1) > 1 ? (
                <p style={styles.label}>
                  <strong>Plazas:</strong> {Number(tarjeta.plazas)} personas
                </p>
              ) : null}

              <p style={styles.label}>
                <strong>Importe:</strong> {Number(tarjeta.precioTotal || 0)} €
              </p>

              <p style={{ ...styles.label, marginBottom: 8 }}>
                <strong>Código para regalar:</strong>
              </p>

              <div style={styles.codigoBox}>{tarjeta.codigo || "—"}</div>
              <p style={{ ...styles.label, marginTop: 8, fontSize: "0.85rem" }}>
                Es el que tiene que escribir la persona que recibe el regalo al canjearlo.
              </p>

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

            {tarjeta.orderId || tarjeta.id ? (
              <CodigoReserva
                tipo="pedido"
                orderId={String(tarjeta.orderId || tarjeta.id)}
                soloCodigo
                className="my-4 text-left"
              />
            ) : null}

            <div style={styles.botones}>
              <button onClick={copiarCodigo} style={styles.botonPrincipal}>
                Copiar código para regalar
              </button>

              {!esInvitado && (
                <button
                  onClick={() => navigate("/perfil")}
                  style={styles.botonSecundario}
                >
                  Ver mi perfil
                </button>
              )}
            </div>
            <div style={styles.descargaBox}>
  <p style={styles.descargaTexto}>
    Descarga una tarjeta para imprimir y escribir a mano el código.
  </p>

  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    {plantillasTarjeta.map((plantilla) => (
      <BotonPlantilla key={plantilla.id} plantilla={plantilla} style={styles.botonDescarga}>
        {plantillasTarjeta.length > 1 ? plantilla.nombre : "Descargar tarjeta regalo"}
      </BotonPlantilla>
    ))}
  </div>
</div>
          </>
        ) : (
          <>
            <h1 style={styles.title}>{esCanje ? "¡Reserva confirmada!" : "¡Pago realizado con éxito!"}</h1>

            <p style={styles.text}>
              {esCanje
                ? "Has reservado con tu tarjeta regalo, así que no se ha cobrado nada. Te esperamos en el taller con muchas ganas."
                : esBono
                ? "Tu bono ya está activo y tu primera clase, reservada. Las demás clases las reservas desde tu perfil, en «Bonos»."
                : "Gracias por tu reserva. Te esperamos en el taller con muchas ganas."}
            </p>

            {location.state?.pagoSimuladoPorAdministrador ? (
              <p style={styles.text}>
                Pago de prueba confirmado para la cuenta de administrador; no se
                ha realizado ningún cargo.
              </p>
            ) : null}

            {errorCarga ? <p style={styles.errorText}>{errorCarga}</p> : null}

            {orderIdReserva ? (
              <CodigoReserva tipo="pedido" orderId={orderIdReserva} esBono={esBono} className="my-4 text-left" />
            ) : null}

            <div style={styles.botones}>

              
              <button
                onClick={() => navigate("/portada")}
                style={styles.botonPrincipal}
              >
                Seguir reservando
              </button>

              {!esInvitado && (
                <button
                  onClick={() => navigate("/perfil")}
                  style={styles.botonSecundario}
                >
                  Ver mi reserva
                </button>
              )}
            </div>
          </>
        )}

        {!cargando && !sinPagoReciente && esInvitado ? (
          <div style={styles.avisoInvitado}>
            <p style={styles.avisoInvitadoTexto}>
              {esTarjetaRegalo
                ? "Has comprado sin cuenta. Guarda bien el código y, si quieres, crea una contraseña para consultar tus compras desde cualquier dispositivo."
                : "Has reservado sin cuenta. El taller ya tiene tus datos de contacto; si creas una contraseña podrás consultar tus reservas desde cualquier dispositivo."}
            </p>
            <button
              onClick={() => {
                conservarSesionInvitado();
                navigate("/registro");
              }}
              style={styles.botonSecundario}
            >
              Crear mi cuenta
            </button>
          </div>
        ) : null}

        <img
          src="/img/logoPC.png"
          alt="Logo de La Purísima Conchi"
          style={styles.logo}
        />
      </div>
    </div>
  );
};




const styles = {
  body: {
    backgroundColor: "#fdfaf5",
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
    color: "#3f3128",
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
    backgroundColor: "#fdfaf5",
    border: "1px solid #eadfd2",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    textAlign: "left",
  },
  label: {
    fontSize: "0.95rem",
    color: "#3f3128",
    marginBottom: 8,
    lineHeight: 1.5,
  },
  codigoBox: {
    backgroundColor: "#f6efe6",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: "1.15rem",
    fontWeight: "bold",
    color: "#3f3128",
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
  backgroundColor: "#f6efe6",
  color: "#7a6858",
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
  avisoInvitado: {
    backgroundColor: "#fff6d6",
    border: "1px solid #eadfd2",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  avisoInvitadoTexto: {
    fontSize: "0.92rem",
    color: "#7a6858",
    lineHeight: 1.5,
    marginBottom: 12,
  },
  logo: {
    display: "block",
    margin: "10px auto 0",
    width: 80,
    height: "auto",
  },
};

export default ConfirmacionPago;