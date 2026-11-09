import React, { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";

import { fechaDMA } from "./utils/formatoFecha";
const AdminNuevo = () => {
  const [reservas, setReservas] = useState([]);
  const [stats, setStats] = useState({
    hoy: 0,
    semana: 0,
    futuras: 0,
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

useEffect(() => {
  const onResize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  window.addEventListener("resize", onResize);

  return () => window.removeEventListener("resize", onResize);
}, []);

  useEffect(() => {
    const cargarReservas = async () => {
      try {
        const snapshot = await get(ref(dbRealtime, "reservas"));
        const datos = [];

        if (!snapshot.exists()) return;

        snapshot.forEach((claseSnap) => {
          claseSnap.forEach((fechaSnap) => {
            fechaSnap.forEach((turnoSnap) => {
              turnoSnap.forEach((metodoSnap) => {
                metodoSnap.forEach((reservaSnap) => {
                  const reserva = reservaSnap.val();

                  if (!reserva || reserva.estado !== "Confirmada") return;

                  datos.push({
                    id: reservaSnap.key,
                    ...reserva,
                  });
                });
              });
            });
          });
        });

        setReservas(datos);

        calcularStats(datos);
      } catch (error) {
        console.error("Error cargando reservas:", error);
      }
    };

    cargarReservas();
  }, []);

  const calcularStats = (reservas) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const finSemana = new Date(hoy);
    finSemana.setDate(hoy.getDate() + 7);

    let countHoy = 0;
    let countSemana = 0;
    let countFuturas = 0;

    reservas.forEach((r) => {
      const fechaReserva = new Date(r.fecha + "T00:00:00");

      if (fechaReserva.getTime() === hoy.getTime()) {
        countHoy += r.plazas || 1;
      }

      if (fechaReserva >= hoy && fechaReserva <= finSemana) {
        countSemana += r.plazas || 1;
      }

      if (fechaReserva > finSemana) {
        countFuturas += r.plazas || 1;
      }
    });

    setStats({
      hoy: countHoy,
      semana: countSemana,
      futuras: countFuturas,
    });
  };

  const obtenerProximasReservas = () => {
    return reservas
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(0, 6);
  };

  return (
    <div
  style={{
    ...styles.container,
    ...(isMobile ? styles.containerMobile : {}),
  }}
>
      <BotonVolver />

      <h2 style={styles.titulo}>📊 Panel de Control</h2>

      {/* TARJETAS */}
     <div
  style={{
    ...styles.grid,
    ...(isMobile ? styles.gridMobile : {}),
  }}
>
        <div style={styles.card}>
          <h4>Reservas hoy</h4>
          <p>{stats.hoy}</p>
        </div>

        <div style={styles.card}>
          <h4>Reservas esta semana</h4>
          <p>{stats.semana}</p>
        </div>

        <div style={styles.card}>
          <h4>Reservas futuras</h4>
          <p>{stats.futuras}</p>
        </div>
      </div>

      {/* PRÓXIMAS RESERVAS */}
      <div
  style={{
    ...styles.bloque,
    ...(isMobile ? styles.bloqueMobile : {}),
  }}
>
        <h3>📅 Próximas reservas</h3>

        {obtenerProximasReservas().length === 0 ? (
          <p>No hay reservas.</p>
        ) : (
          obtenerProximasReservas().map((r) => (
            <div key={r.id} style={styles.item}>
              <strong>{fechaDMA(r.fecha)}</strong> — {r.clase} ({r.turno}) —{" "}
              {r.plazas} plaza(s)
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: 20,
    fontFamily: "sans-serif",
  },
  containerMobile: {
  padding: 4,
  width: "100%",
  boxSizing: "border-box",
},

  titulo: {
    textAlign: "center",
    marginBottom: 20,
  },
  grid: {
    display: "flex",
    gap: 20,
    justifyContent: "center",
    marginBottom: 30,
  },
  gridMobile: {
  flexDirection: "column",
  gap: 12,
},
  card: {
    background: "#f3e4b6",
    padding: 20,
    borderRadius: 12,
    minWidth: 150,
    textAlign: "center",
  },
  bloque: {
    background: "#fff",
    padding: 20,
    borderRadius: 12,
    maxWidth: 600,
    margin: "auto",
  },
  bloqueMobile: {
  maxWidth: "100%",
  padding: 12,
  boxSizing: "border-box",
},
  item: {
    padding: 10,
    borderBottom: "1px solid #eee",
  },
};

export default AdminNuevo;