import React, { useEffect, useState } from "react";
import Icono from "./components/Icono";
import { getAuth } from "firebase/auth";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import PantallaConVolver from "./PantallaConVolver";

export default function HistorialReservasUsuario() {
  const [reservasFuturas, setReservasFuturas] = useState([]);
  const [reservasPasadas, setReservasPasadas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarReservas = async () => {
      const user = getAuth().currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const uid = user.uid;
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const refListaReservas = ref(dbRealtime, `usuarios/${uid}/listaReservas`);
        const snapListaReservas = await get(refListaReservas);

        const futuras = [];
        const pasadas = [];

        if (snapListaReservas.exists()) {
          const todas = Object.values(snapListaReservas.val());

          for (const reserva of todas) {
            const fechaBase = reserva.fecha || reserva.fechaInicio;
            if (!fechaBase) continue;

            const fechaReserva = new Date(fechaBase);
            fechaReserva.setHours(0, 0, 0, 0);

            if (fechaReserva < hoy) {
              pasadas.push(reserva);
            } else {
              futuras.push(reserva);
            }
          }
        }

        futuras.sort((a, b) => {
          const fa = new Date(a.fecha || a.fechaInicio || 0);
          const fb = new Date(b.fecha || b.fechaInicio || 0);
          return fa - fb;
        });

        pasadas.sort((a, b) => {
          const fa = new Date(a.timestamp || a.fecha || a.fechaInicio || 0);
          const fb = new Date(b.timestamp || b.fecha || b.fechaInicio || 0);
          return fb - fa;
        });

        setReservasFuturas(futuras);
        setReservasPasadas(pasadas);
      } catch (error) {
        console.error("Error al cargar reservas:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarReservas();
  }, []);

  if (loading) {
    return <p className="text-center">Cargando reservas...</p>;
  }

  return (
    <PantallaConVolver>
      <div className="mt-8 px-4">
        <h3 className="text-lg font-semibold text-tinta mb-4 text-center">
          <Icono nombre="chincheta" className="mr-1.5" />Reservas activas
        </h3>

        {reservasFuturas.length === 0 ? (
          <p className="text-center text-tinta-suave">No tienes reservas futuras.</p>
        ) : (
          <ul className="space-y-4 mb-8">
            {reservasFuturas.map((reserva, idx) => (
              <ReservaItem key={idx} reserva={reserva} />
            ))}
          </ul>
        )}

        <h3 className="text-lg font-semibold text-tinta mb-4 text-center">
          <Icono nombre="historial" className="mr-1.5" />Historial de reservas
        </h3>

        {reservasPasadas.length === 0 ? (
          <p className="text-center text-tinta-suave">No hay reservas anteriores.</p>
        ) : (
          <ul className="space-y-4">
            {reservasPasadas.map((reserva, idx) => (
              <ReservaItem key={idx} reserva={reserva} />
            ))}
          </ul>
        )}
      </div>
    </PantallaConVolver>
  );
}

function ReservaItem({ reserva }) {
  const fechaMostrada = reserva.fecha || reserva.fechaInicio;

  return (
    <li className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-sm text-[#333]">
      <p><strong>Clase:</strong> {reserva.clase}</p>
      <p>
        <strong>Fecha:</strong>{" "}
        {fechaMostrada
          ? new Date(fechaMostrada).toLocaleDateString("es-ES")
          : "—"}
      </p>
      <p><strong>Turno:</strong> {reserva.turno || "—"}</p>
      <p><strong>Ubicación:</strong> {reserva.ubicacion || "—"}</p>
      <p><strong>Método:</strong> {reserva.metodo || reserva.modalidad || "N/A"}</p>
      <p><strong>Plazas:</strong> {reserva.plazas || 1}</p>
      <p>
        <strong>Reserva vía:</strong>{" "}
        {reserva.desdeTarjeta || reserva.tipoReserva === "tarjetaRegalo"
          ? "Tarjeta regalo"
          : "Normal"}
      </p>
    </li>
  );
}