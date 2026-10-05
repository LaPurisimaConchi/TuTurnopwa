import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { esAdministrador } from "./utils/administradores";

const RutaAdmin = ({ children }) => {
  const [usuario, setUsuario] = useState(undefined);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user || null);
    });

    return () => unsubscribe();
  }, []);

  if (usuario === undefined) {
    return <p style={{ padding: 40, textAlign: "center" }}>Cargando...</p>;
  }

  if (!esAdministrador(usuario)) {
    return <Navigate to="/portada" replace />;
  }

  return children;
};

export default RutaAdmin;