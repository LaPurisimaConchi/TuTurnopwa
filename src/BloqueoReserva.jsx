// src/BloqueoReserva.jsx
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";

export default function BloqueoReserva({ children }) {
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
      <div className="text-center text-gray-500 py-10">
        Comprobando acceso...
      </div>
    );
  }

  if (!usuarioLogueado) {
    return (
      <div className="text-center text-gray-700 bg-yellow-100 border border-yellow-300 rounded-xl p-6 max-w-xl mx-auto shadow">
        <p className="text-lg font-semibold">
          🔒 Inicia sesión para poder reservar esta clase.
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
          className="inline-block mt-4 bg-[#b36a4a] hover:bg-[#9e5c3f] text-white font-bold px-5 py-2 rounded-lg"
        >
          Registrarse
        </Link>
      </div>
    );
  }

  return children;
}
