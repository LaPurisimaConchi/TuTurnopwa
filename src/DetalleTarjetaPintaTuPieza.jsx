import React from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";  

const DetalleTarjetaPintaTuPieza = () => {
  const navigate = useNavigate();

  const handleCanjear = () => {
    navigate("/resumen-pago", {
      state: {
        desdeTarjeta: true,
        tipo: "pintatupieza",
        clase: "Pinta tu pieza de cerámica",
        precio: 25
      }
    });
  };
  

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <BotonVolver />

        <img
          src="/img/pintatupiezaregalo.jpg"
          alt="Pinta tu pieza"
          style={styles.imagen}
          onError={(e) => (e.target.style.display = "none")}
        />

        <div style={styles.content}>
          <h1 style={styles.titulo}>Pinta tu pieza</h1>
          <div style={styles.precio}>Desde 25€</div>
          <p style={styles.descripcion}>
            Sesión de 3 horas para decorar una pieza ya hecha, eligiendo entre
            diferentes formas y tamaños. Cada pieza tiene su precio individual.
            Podrás pintar con esmaltes cerámicos y tu pieza se cocerá en el horno
            para llevártela lista para usar o regalar.
          </p>

          <button onClick={handleCanjear} style={styles.btn}>
            PAGAR
          </button>
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
    borderRadius: "12px",
    marginBottom: "20px",
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
  },
};

export default DetalleTarjetaPintaTuPieza;



