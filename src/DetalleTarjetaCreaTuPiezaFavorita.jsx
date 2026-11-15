import React from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";  

const DetalleTarjetaCreaTuPiezaFavorita = () => {
  const navigate = useNavigate();

  const handleCanjear = () => {
    navigate("/resumen-pago", {
      state: {
        desdeTarjeta: true,
        tipo: "creapiezafavorita",
        clase: "Crea tu pieza favorita",
        precio: 55
      }
    });
  };
  

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <BotonVolver />

        <img
          src="/img/creatupiezafavoritaregalo.jpg"
          alt="Crea tu pieza favorita"
          style={styles.imagen}
          onError={(e) => (e.target.style.display = "none")}
        />
        <div style={styles.content}>
          <h1 style={styles.titulo}>Crea tu pieza favorita</h1>
          <div style={styles.precio}>55€</div>
          <p style={styles.descripcion}>
            Clase de 3 horas en la que podrás crear tu pieza favorita desde cero. Puedes elegir torno o técnicas a mano.
            Incluye todos los materiales, esmalte y cocción de tu pieza para que puedas llevártela lista para usar o regalar.
          </p>
          <button onClick={handleCanjear} style={styles.btn}>PAGAR</button>
        </div>
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
    color: "#333",
    minHeight: "100vh",
  },
  container: {
    backgroundColor: "white",
    maxWidth: 500,
    margin: "auto",
    borderRadius: 16,
    boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  imagen: {
    width: "100%",
    height: "auto",
    display: "block",
    borderRadius: "12px 12px 0 0",
    marginBottom: 20
  },
  content: {
    padding: 20,
    textAlign: "center",
  },
  titulo: {
    fontSize: "1.3rem",
    marginBottom: 6,
    color: "#3f3128",
  },
  precio: {
    fontSize: "1.1rem",
    color: "#e06c75",
    fontWeight: "bold",
    marginBottom: 14,
  },
  descripcion: {
    fontSize: "0.95rem",
    lineHeight: 1.5,
    marginBottom: 24,
  },
  btn: {
    backgroundColor: "#f8b5b5",
    color: "white",
    padding: "10px 20px",
    fontWeight: "bold",
    borderRadius: 30,
    fontSize: "0.9rem",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    transition: "background-color 0.3s ease",
  }
};

export default DetalleTarjetaCreaTuPiezaFavorita;



