// src/AccesoCompra.jsx
// Envuelve las pantallas de reserva y pago. Si no hay sesión, ofrece seguir
// sin registrarse (sesión de invitado con nombre, email y teléfono) o entrar
// con cuenta. La pantalla de dentro se monta ya con sesión, para que pueda
// leer fechas bloqueadas, plazas, etc. (las reglas piden auth != null).
// - requiereCuenta (bonos y talleres que se gestionan desde el perfil): no se
//   ofrece la compra de invitado, hace falta iniciar sesión o crear cuenta.
// - permitirVisita: la pantalla se monta sin sesión y es ella la que pide los
//   datos al guardar (DatosContactoInvitado); lee la disponibilidad de
//   /api/disponibilidad. Así mirar fechas no crea ninguna cuenta anónima.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, dbRealtime } from "./firebase";
import { exigeCuenta } from "./catalogoTalleres";
import BotonVolver from "./BotonVolver";
import FormularioDatosContacto from "./components/FormularioDatosContacto";
import {
  abriendoSesionInvitado,
  cancelarCierreCompraInvitado,
  cerrarCompraInvitadoTrasSalir,
  compraInvitadoAbierta,
  iniciarCompraInvitado,
} from "./utils/invitado";

// Para /reservar/:claseId: mira en la ficha del taller si exige cuenta
// (clases es de lectura pública, se puede leer antes de tener sesión)
export function AccesoCompraTaller({ children }) {
  const { claseId } = useParams();
  const [requiereCuenta, setRequiereCuenta] = useState(null);

  useEffect(() => {
    let cancelado = false;
    setRequiereCuenta(null);

    get(ref(dbRealtime, `clases/${claseId}`))
      .then((snap) => {
        if (!cancelado) setRequiereCuenta(exigeCuenta(snap.exists() ? snap.val() || {} : {}));
      })
      .catch((error) => {
        // Sin poder leerla, la propia pantalla de reserva avisará del error
        console.error("Error al leer la ficha del taller:", error);
        if (!cancelado) setRequiereCuenta(false);
      });

    return () => {
      cancelado = true;
    };
  }, [claseId]);

  if (requiereCuenta === null) {
    return <div className="text-center text-gray-500 py-16">Cargando...</div>;
  }

  return (
    <AccesoCompra requiereCuenta={requiereCuenta} permitirVisita={!requiereCuenta}>
      {children}
    </AccesoCompra>
  );
}

export default function AccesoCompra({
  children,
  requiereCuenta = false,
  permitirVisita = false,
}) {
  const location = useLocation();
  const [estado, setEstado] = useState("cargando"); // cargando | datos | cuenta | visita | listo
  const enviandoRef = useRef(false);

  useEffect(() => {
    // Si venimos de otra pantalla de compra, el recorrido sigue abierto
    cancelarCierreCompraInvitado();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Mientras se crea la sesión de invitado, quien la crea decide el estado
      if (enviandoRef.current || abriendoSesionInvitado()) return;

      if (!user) {
        setEstado(requiereCuenta ? "cuenta" : permitirVisita ? "visita" : "datos");
        return;
      }

      if (!user.isAnonymous) {
        setEstado("listo");
        return;
      }

      // Un invitado no puede seguir en un producto que pide cuenta; si inicia
      // sesión o se registra, la sesión de invitado se sustituye o se conserva
      if (requiereCuenta) {
        setEstado("cuenta");
        return;
      }

      // Invitado en plena compra: ya dejó sus datos al empezar
      if (compraInvitadoAbierta(user.uid)) {
        setEstado("listo");
        return;
      }

      // Invitado de una compra anterior: no se recuerdan sus datos. Se cierra su
      // sesión y se vuelven a pedir (el aviso de sesión nula muestra el formulario)
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Error al cerrar la sesión del invitado anterior:", err);
        setEstado(permitirVisita ? "visita" : "datos");
      }
    });

    return () => {
      unsubscribe();
      cerrarCompraInvitadoTrasSalir();
    };
  }, [requiereCuenta, permitirVisita]);

  const handleContinuar = async (datos) => {
    enviandoRef.current = true;

    try {
      await iniciarCompraInvitado(datos);
      setEstado("listo");
    } finally {
      enviandoRef.current = false;
    }
  };

  if (estado === "cargando") {
    return (
      <div className="text-center text-gray-500 py-16">Cargando...</div>
    );
  }

  // «visita» y «listo» devuelven lo mismo: al abrirse la sesión desde dentro la
  // pantalla no se vuelve a montar y conserva lo que la persona había elegido
  if (estado === "listo" || estado === "visita") return children;

  // Para volver aquí (con los datos de la tarjeta regalo, etc.) tras entrar
  const volverAqui = {
    from: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
    },
  };

  if (estado === "cuenta") {
    return (
      <div className="bg-[#fffef4] min-h-screen flex items-center justify-center px-4 py-8">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6">
          <BotonVolver />

          <div className="text-center mb-5">
            <img
              src="/img/logoPCsin.png"
              alt="La Purísima Conchi"
              className="w-20 mx-auto mb-3"
            />
            <h1 className="text-2xl text-[#5c3c00] font-serif">
              Necesitas una cuenta
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Las reservas de este producto se gestionan desde tu perfil, así
              que necesitas iniciar sesión o crear una cuenta para continuar.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/login"
              state={volverAqui}
              className="whitespace-nowrap px-5 py-2 rounded-lg border border-[#b36a4a] text-[#b36a4a] font-semibold text-sm hover:bg-[#f9ece6]"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/registro"
              state={volverAqui}
              className="whitespace-nowrap px-5 py-2 rounded-lg bg-[#b36a4a] hover:bg-[#9e5c3f] text-white font-semibold text-sm"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fffef4] min-h-screen flex items-center justify-center px-4 py-8">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-md p-6">
        <BotonVolver />

        <div className="text-center mb-5">
          <img
            src="/img/logoPCsin.png"
            alt="La Purísima Conchi"
            className="w-20 mx-auto mb-3"
          />
          <h1 className="text-2xl text-[#5c3c00] font-serif">
            Reserva sin registrarte
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Solo necesitamos tus datos de contacto para confirmar tu reserva o
            tu compra y avisarte si hay cualquier cambio.
          </p>
        </div>

        <FormularioDatosContacto alEnviar={handleContinuar} />

        <div className="mt-6 pt-5 border-t border-[#f1e7c6] text-center">
          <p className="text-sm text-gray-600 mb-3">¿Ya tienes cuenta?</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/login"
              state={volverAqui}
              className="whitespace-nowrap px-5 py-2 rounded-lg border border-[#b36a4a] text-[#b36a4a] font-semibold text-sm hover:bg-[#f9ece6]"
            >
              Iniciar sesión
            </Link>
            <Link
              to="/registro"
              state={volverAqui}
              className="whitespace-nowrap px-5 py-2 rounded-lg bg-[#b36a4a] hover:bg-[#9e5c3f] text-white font-semibold text-sm"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
