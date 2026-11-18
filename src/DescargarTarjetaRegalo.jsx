import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import { descargarPlantillaGestionada } from "./components/DescargasTarjetaRegalo";

// Destino de los botones del correo de compra: /tarjeta-regalo-pdf/{id}. Lee el PDF gestionado
// desde el panel (público por id) y lo descarga.
export default function DescargarTarjetaRegalo() {
  const { id } = useParams();
  const [plantilla, setPlantilla] = useState(null);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    let vivo = true;
    get(ref(dbRealtime, `plantillasTarjetaRegalo/${id}`))
      .then(async (snap) => {
        if (!vivo) return;
        if (!snap.exists()) return setEstado("no-existe");
        const p = { id, archivo: snap.val().archivo || `${id}.pdf`, nombre: snap.val().nombre || "Tarjeta regalo" };
        setPlantilla(p);
        try {
          await descargarPlantillaGestionada(p);
          if (vivo) setEstado("listo");
        } catch {
          if (vivo) setEstado("error");
        }
      })
      .catch(() => vivo && setEstado("error"));
    return () => {
      vivo = false;
    };
  }, [id]);

  const reintentar = () => descargarPlantillaGestionada(plantilla).catch(() => setEstado("error"));

  return (
    <main style={{ maxWidth: 480, margin: "40px auto", padding: "0 16px", textAlign: "center", fontFamily: "'Segoe UI', sans-serif" }}>
      <BotonVolver />
      <h1 style={{ color: "#3f3128", fontSize: "1.5rem" }}>{plantilla?.nombre || "Tarjeta regalo"}</h1>
      {estado === "cargando" && <p>Preparando tu PDF…</p>}
      {estado === "no-existe" && <p>Este PDF ya no está disponible. Escríbenos y te lo enviamos.</p>}
      {estado === "error" && <p>No se pudo descargar el PDF. Inténtalo de nuevo.</p>}
      {estado === "listo" && <p>Si no se ha descargado solo, pulsa el botón.</p>}
      {plantilla && (estado === "listo" || estado === "error") && (
        <button type="button" onClick={reintentar} style={{ padding: "12px 24px", borderRadius: 999, border: "none", background: "#c2410c", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
          Descargar PDF
        </button>
      )}
    </main>
  );
}
