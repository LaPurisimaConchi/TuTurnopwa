import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";
import { cerrarCompraInvitado } from "./utils/invitado";

const PagoFallido = () => {
  const navigate = useNavigate();

  // La compra ha terminado: la siguiente vuelve a pedir los datos al invitado
  useEffect(() => {
    cerrarCompraInvitado();
  }, []);

  return (
    <div style={styles.body}>
      <div style={{ position: "absolute", top: "20px", left: "20px" }}>
        <BotonVolver />
      </div>

      <div style={styles.mensaje}>
        <h2>😞 El pago no se ha completado</h2>
        <p>Puedes volver a intentarlo desde tu perfil.</p>
      </div>
    </div>
  );
};

const styles = {
  body: {
    backgroundColor: "#ffe6e6",
    fontFamily: "'Segoe UI', sans-serif",
    textAlign: "center",
    padding: "50px",
    color: "#b00020",
    minHeight: "100vh",
    position: "relative"
  },
  mensaje: {
    backgroundColor: "#ffffff",
    padding: "30px",
    borderRadius: "20px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
    display: "inline-block",
    marginTop: "60px"
  }
};

export default PagoFallido;
