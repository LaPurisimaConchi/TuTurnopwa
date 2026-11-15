import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import { useNavigate } from "react-router-dom";
import BotonVolver from "./BotonVolver";


const HistorialTarjetasRegalo = () => {
  const [tarjetas, setTarjetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const cargarTarjetas = async () => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) return;

      try {
        const snapshot = await get(ref(dbRealtime, "tarjetas_regalo"));

        if (snapshot.exists()) {
          const datos = snapshot.val();

          const tarjetasCompradas = Object.values(datos).filter(
            (tarjeta) => tarjeta.compradorUID === user.uid && tarjeta.desdeTarjeta === true
          );

          setTarjetas(tarjetasCompradas);
        } else {
          setTarjetas([]);
        }
      } catch (error) {
        console.error("Error al cargar historial de tarjetas:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarTarjetas();
  }, []);

  if (loading) return <p style={{ textAlign: "center" }}>Cargando tarjetas...</p>;

  return (
    <div style={styles.container}>
      <BotonVolver />

      <h2 style={styles.titulo}>Mis tarjetas regalo compradas</h2>
      {tarjetas.length === 0 ? (
        <p style={styles.vacio}>Aún no has comprado ninguna tarjeta.</p>
      ) : (
        <ul style={styles.lista}>
          {tarjetas.map((tarjeta, idx) => (
            <li key={idx} style={styles.item}>
              <strong>Código:</strong> {tarjeta.codigo} <br />
              <strong>Tipo:</strong> {tarjeta.tipo} <br />
              <strong>Fecha:</strong> {new Date(tarjeta.fechaCompra).toLocaleDateString()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: "#fdfaf5",
    padding: 20,
    fontFamily: "Segoe UI, sans-serif",
    maxWidth: 600,
    margin: "auto",
  },
  titulo: {
    textAlign: "center",
    fontSize: "1.5rem",
    color: "#3f3128",
    marginBottom: 20,
  },
  vacio: {
    textAlign: "center",
    color: "#888",
  },
  lista: {
    listStyle: "none",
    padding: 0,
  },
  item: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  },
};

export default HistorialTarjetasRegalo;

