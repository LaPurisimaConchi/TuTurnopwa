// src/AccesoCompra.jsx
// Envuelve las pantallas de reserva y pago. Si no hay sesión, ofrece seguir
// sin registrarse (sesión de invitado con nombre, email y teléfono) o entrar
// con cuenta. La pantalla de dentro se monta ya con sesión, para que pueda
// leer fechas bloqueadas, plazas, etc. (las reglas piden auth != null).
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import BotonVolver from "./BotonVolver";
import {
  abrirCompraInvitado,
  cancelarCierreCompraInvitado,
  cerrarCompraInvitadoTrasSalir,
  compraInvitadoAbierta,
  continuarComoInvitado,
  mensajeErrorInvitado,
  validarDatosContacto,
} from "./utils/invitado";

export default function AccesoCompra({ children }) {
  const location = useLocation();
  const [estado, setEstado] = useState("cargando"); // cargando | datos | listo
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);

  useEffect(() => {
    // Si venimos de otra pantalla de compra, el recorrido sigue abierto
    cancelarCierreCompraInvitado();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Mientras se crea la sesión de invitado, el submit decide el estado
      if (enviandoRef.current) return;

      if (!user) {
        setEstado("datos");
        return;
      }

      if (!user.isAnonymous) {
        setEstado("listo");
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
        setEstado("datos");
      }
    });

    return () => {
      unsubscribe();
      cerrarCompraInvitadoTrasSalir();
    };
  }, []);

  const handleContinuar = async (e) => {
    e.preventDefault();
    setError("");

    const errorValidacion = validarDatosContacto({ nombre, email, telefono });
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    enviandoRef.current = true;
    setEnviando(true);

    try {
      const user = await continuarComoInvitado({ nombre, email, telefono });
      abrirCompraInvitado(user.uid);
      setEstado("listo");
    } catch (err) {
      console.error("Error al continuar como invitado:", err);
      setError(mensajeErrorInvitado(err));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  if (estado === "cargando") {
    return (
      <div className="text-center text-gray-500 py-16">Cargando...</div>
    );
  }

  if (estado === "listo") return children;

  // Para volver aquí (con los datos de la tarjeta regalo, etc.) tras entrar
  const volverAqui = {
    from: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
    },
  };

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

        <form onSubmit={handleContinuar} className="space-y-4">
          <div>
            <label htmlFor="invitado-nombre" className="block font-bold text-sm mb-1">
              Nombre
            </label>
            <input
              id="invitado-nombre"
              type="text"
              autoComplete="name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base"
              placeholder="Tu nombre"
              required
            />
          </div>

          <div>
            <label htmlFor="invitado-email" className="block font-bold text-sm mb-1">
              Correo electrónico
            </label>
            <input
              id="invitado-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base"
              placeholder="tucorreo@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="invitado-telefono" className="block font-bold text-sm mb-1">
              Teléfono
            </label>
            <input
              id="invitado-telefono"
              type="tel"
              autoComplete="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base"
              placeholder="Tu teléfono"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full px-6 py-3 rounded-full text-white font-semibold
            bg-gradient-to-b from-[#F6D66A] to-[#F4C542]
            shadow-md hover:shadow-lg
            hover:from-[#F4C542] hover:to-[#E5B92F]
            transition-all duration-200 disabled:opacity-50"
          >
            {enviando ? "Un momento..." : "Continuar"}
          </button>

          <p className="text-xs text-gray-500 text-center leading-5">
            Al continuar aceptas nuestra{" "}
            <Link to="/politica-privacidad" className="underline">
              política de privacidad
            </Link>
            . Después podrás crear una contraseña para guardar tus reservas.
          </p>
        </form>

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
