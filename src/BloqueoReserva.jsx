// src/BloqueoReserva.jsx
import { useEffect, useState } from "react";
import Icono from "./components/Icono";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";

// permitirVisitante: la pantalla se ve sin sesión y pide los datos al guardar
export default function BloqueoReserva({ children, permitirVisitante = false }) {
  const location = useLocation();
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
      setUsuarioLogueado(user);
      setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  if (cargando) {
    return (
      <div className="text-center text-tinta-suave py-10">
        Comprobando acceso...
      </div>
    );
  }

  if (!usuarioLogueado && !permitirVisitante) {
    return (
      <div className="text-center text-tinta bg-mostaza-suave border border-mostaza rounded-xl p-6 max-w-xl mx-auto shadow">
        <p className="text-lg font-semibold">
          <Icono nombre="candado" className="mr-1" />Inicia sesión para poder reservar esta clase.
        </p>
        <p className="mt-2">
          Puedes ver todos los detalles, pero para reservar necesitas estar registrado.
        </p>
        <Link
          to="/registro"
          state={{
            from: {
              pathname: location.pathname,
              search: location.search,
              hash: location.hash,
            },
          }}
          className="inline-block mt-4 bg-terracota hover:bg-terracota-oscuro text-white font-bold px-5 py-2 rounded-lg"
        >
          Registrarse
        </Link>
      </div>
    );
  }

  return children;
}
