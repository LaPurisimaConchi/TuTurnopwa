import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, sendEmailVerification } from "firebase/auth";
import { esAdministrador, esEmailAdministrador } from "./utils/administradores";

// Las reglas de la base de datos solo dan permisos de administrador con el email
// verificado. Una cuenta de administrador sin verificar ve cómo hacerlo en vez del panel.
function VerificarEmailAdmin({ usuario, alVerificar }) {
  const [estado, setEstado] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const enviar = async () => {
    setOcupado(true);
    try {
      await sendEmailVerification(usuario);
      setEstado(`Te hemos enviado un correo a ${usuario.email}. Abre el enlace y vuelve aquí.`);
    } catch (error) {
      console.error("No se pudo enviar el correo de verificación:", error);
      setEstado("No se pudo enviar el correo. Espera unos minutos y vuelve a intentarlo.");
    } finally {
      setOcupado(false);
    }
  };

  const comprobar = async () => {
    setOcupado(true);
    try {
      await usuario.reload();
      // El token nuevo lleva email_verified, que es lo que miran las reglas
      await usuario.getIdToken(true);
      if (getAuth().currentUser?.emailVerified) alVerificar(getAuth().currentUser);
      else setEstado("Aún no consta como verificado. Abre el enlace del correo y vuelve a pulsar.");
    } finally {
      setOcupado(false);
    }
  };

  const boton =
    "w-full py-2 px-4 rounded-xl font-semibold text-white bg-terracota hover:bg-terracota-oscuro disabled:opacity-60";

  return (
    <div className="bg-crema min-h-screen flex items-center justify-center px-4 py-8">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6 text-center text-tinta">
        <h1 className="text-xl font-semibold mb-3">Verifica tu email para entrar al panel</h1>
        <p className="text-sm mb-5">
          Por seguridad, el panel de administración solo se abre con el email verificado.
          Solo hay que hacerlo una vez.
        </p>
        <div className="space-y-3">
          <button type="button" className={boton} onClick={enviar} disabled={ocupado}>
            Enviarme el correo de verificación
          </button>
          <button
            type="button"
            className="w-full py-2 px-4 rounded-xl font-semibold border border-terracota text-terracota disabled:opacity-60"
            onClick={comprobar}
            disabled={ocupado}
          >
            Ya lo he verificado
          </button>
        </div>
        {estado && <p className="text-sm mt-4">{estado}</p>}
      </div>
    </div>
  );
}

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

  if (usuario && esEmailAdministrador(usuario.email) && !usuario.emailVerified) {
    return <VerificarEmailAdmin usuario={usuario} alVerificar={(u) => setUsuario({ ...u, emailVerified: true })} />;
  }

  if (!esAdministrador(usuario)) {
    return <Navigate to="/portada" replace />;
  }

  return children;
};

export default RutaAdmin;
