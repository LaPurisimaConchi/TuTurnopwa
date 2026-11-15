import React from "react";

const FuncionamientoTarjetaRegalo = () => {
  const handleDescargar = () => {
    // Sustituye el enlace por la ruta real de descarga cuando la tengas
    const url = "/plantilla_tarjeta_regalo.pdf";
    window.open(url, "_blank");
  };

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <img
          src="/tarjetaregalo.jpg"
          alt="Imagen tarjeta regalo"
          style={styles.imagen}
        />

        <h2 style={styles.titulo}>¿Cómo regalar un taller de cerámica?</h2>

        <ol style={styles.lista}>
          <li>
            <strong>Elige y compra un taller:</strong><br />
            Navega por los talleres disponibles y selecciona el que más te guste. Al finalizar el pago, recibirás un código de compra único.
          </li>
          <li>
            <strong>Descarga e imprime la tarjeta:</strong><br />
            Usa la plantilla para rellenar la tarjeta regalo e incluye el código en el espacio indicado.
          </li>
          <li>
            <strong>Entrega tu regalo:</strong><br />
            Regala la tarjeta impresa a quien tú quieras. ¡Así podrá reservar el taller cuando quiera!
          </li>
        </ol>

        <div style={styles.extra}>
          ¿Tienes dudas?<br />
          Escríbenos por WhatsApp o llámanos sin compromiso.
        </div>

        <button style={styles.button} onClick={handleDescargar}>
          DESCARGAR TARJETA
        </button>
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
    display: "flex",
    justifyContent: "center",
    minHeight: "100vh"
  },
  container: {
    background: "white",
    padding: 24,
    borderRadius: 16,
    maxWidth: 420,
    width: "100%",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)"
  },
  imagen: {
    width: "100%",
    borderRadius: 12,
    marginBottom: 20
  },
  titulo: {
    textAlign: "center",
    color: "#3f3128",
    fontSize: "1.2rem",
    marginBottom: 20
  },
  lista: {
    paddingLeft: 20,
    fontSize: "0.95rem",
    color: "#333",
    marginBottom: 20
  },
  extra: {
    fontSize: "0.9rem",
    color: "#555",
    marginBottom: 20,
    textAlign: "center"
  },
  button: {
    display: "block",
    width: "100%",
    backgroundColor: "#f4a6b4",
    color: "white",
    padding: 12,
    borderRadius: 999,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "1rem",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.3s ease"
  }
};

export default FuncionamientoTarjetaRegalo;

