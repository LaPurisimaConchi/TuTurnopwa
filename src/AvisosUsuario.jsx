import React, { useEffect, useState } from "react";
import Icono from "./components/Icono";
import { auth } from "./firebase";
import { ref, get } from "firebase/database";
import { dbRealtime } from "./firebase";

export default function AvisosUsuario() {
  const [avisos, setAvisos] = useState([]);

  useEffect(() => {
    const cargarAvisos = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const avisosRef = ref(dbRealtime, `usuarios/${user.uid}/avisos`);
      const snapshot = await get(avisosRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const lista = Object.values(data)
          .filter((a) => a.mensaje) // ⚠️ solo los que tienen mensaje
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // más recientes primero

        setAvisos(lista);
      } else {
        setAvisos([]);
      }
    };

    cargarAvisos();
  }, []);

  if (avisos.length === 0) return null;

  return (
    <div className="bg-red-100 rounded-xl p-4 mt-4">
      <h3 className="text-red-700 font-semibold mb-2">Avisos del administrador</h3>
      <ul className="text-sm text-red-800 list-disc pl-4">
        {avisos.map((aviso, index) => (
          <li key={index}>
            {aviso.mensaje || "Sin mensaje registrado"}{" "}
            <span className="text-gray-500 text-xs">
              ({aviso.fecha ? new Date(aviso.fecha).toLocaleDateString("es-ES") : "Sin fecha"})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
