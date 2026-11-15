import React from "react";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver"; 

const GaleriaTarjetasRegalo = () => {
  const navigate = useNavigate();

  const tarjetas = [
    {
      titulo: "2 clases de 4 horas al mes",
      descripcion: "Ideal para iniciarse poco a poco. Sin experiencia previa.",
      imagen: "/img/2clasesregalo.jpg",
      ruta: "/tarjeta-regalo/2clases"


    },
    {
      titulo: "Pinta tu pieza de cerámica",
      descripcion: "Decora una pieza blanca libremente. Muy relajante.",
      imagen: "/img/pintatupiezaregalo.jpg",
      ruta: "/tarjeta-regalo/pintatupieza"
    },
    {
      titulo: "Crea tu pieza favorita",
      descripcion: "Modelado básico + decoración. Elige lo que más te guste.",
      imagen: "/img/creatupiezafavoritaregalo.jpg",
      ruta: "/tarjeta-regalo/creapiezafavorita"
    },
    {
      titulo: "Torno intensivo individual (1 día)",
      descripcion: "Experiencia completa personalizada. Torno durante 1 jornada.",
      imagen: "/img/tornointensivoregalo.jpg",
      ruta: "/tarjeta-regalo/tornointensivo"
    },
    {
      titulo: "4 clases de 3 horas al mes",
      descripcion: "Ideal para quienes quieren practicar cada semana.",
      imagen: "/img/4clasesregalo.jpg",
      ruta: "/tarjeta-regalo/4clases"
    }
  ];

  return (
    <div style={styles.body}>
      <BotonVolver />
      <h1 style={styles.title}>Tarjetas regalo disponibles</h1>
      <div style={styles.grid}>
        {tarjetas.map((tarjeta, index) => (
          <div key={index} style={styles.tarjeta}>
            <img
              src={tarjeta.imagen}
              alt={tarjeta.titulo}
              style={styles.imagen}
              onError={(e) => (e.target.style.display = "none")}
            />
            <div style={styles.info}>
              <h2 style={styles.tarjetaTitulo}>{tarjeta.titulo}</h2>
              <p style={styles.descripcion}>{tarjeta.descripcion}</p>
              <button
                onClick={() => navigate(tarjeta.ruta)}
                style={styles.btn}
              >
                Ver más
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  body: {
    backgroundColor: "#fdfaf5",
    fontFamily: "'Segoe UI', sans-serif",
    padding: 20,
    minHeight: "100vh",
  },
  title: {
    textAlign: "center",
    fontFamily: "Georgia, serif",
    color: "#3f3128",
    fontSize: "2rem",
    marginBottom: 30,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 20,
  },
  tarjeta: {
    backgroundColor: "#fff1ee",
    borderLeft: "6px solid #e06c75",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    alignItems: "center",
    boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
  },
  imagen: {
    width: 60,
    height: 60,
    borderRadius: 8,
    objectFit: "cover",
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  tarjetaTitulo: {
    fontSize: "1.1rem",
    color: "#3f3128",
    margin: "0 0 6px 0",
  },
  descripcion: {
    margin: 0,
    fontSize: "0.9rem",
    color: "#555",
  },
  btn: {
    marginTop: 10,
    backgroundColor: "#e0a800",
    color: "white",
    padding: "6px 12px",
    borderRadius: 10,
    fontSize: "0.85rem",
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
  }
};

export default GaleriaTarjetasRegalo;
