import React from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";  

const DetalleTarjeta4Clases = () => {
  const navigate = useNavigate();

  const handleCanjear = () => {
    navigate("/resumen-pago", {
      state: {
        desdeTarjeta: true,
        tipo: "4clases",
        clase: "4 clases de 3h al mes",
        precio: 125
      }
    });
  };
  

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <BotonVolver />

      <img
  src="/img/4clasesregalo.jpg"
  alt="4 clases al mes"
  style={{
    width: "100%",
    maxWidth: "400px", // ✅ límite de ancho
    height: "auto",
    display: "block",
    margin: "0 auto",
    borderRadius: "12px"
  }}
        />
        <div style={styles.content}>
          <h1 style={styles.titulo}>4 clases de 3h al mes</h1>
          <div style={styles.precio}>79€</div>
          <p style={styles.descripcion}>
            Cuatro sesiones mensuales de 3 horas para experimentar con el torno o técnicas manuales.
            Ideal para aprender y desarrollar proyectos personales a tu ritmo.
            Incluye todos los materiales, esmaltes y cocción de tus piezas en el taller.
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

export default DetalleTarjeta4Clases;


