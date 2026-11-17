import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { ref, get } from "firebase/database";
import { mensajeErrorAuth } from "./utils/erroresAuth";
import { enviarVerificacionEmail } from "./utils/verificarEmail";
import { auth, dbRealtime } from "./firebase";
import PantallaConVolver from "./PantallaConVolver";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  // Se vuelve a la pantalla donde estaba antes de entrar (con sus datos, si es una
  // reserva o compra); sin ninguna, a la portada
  const origen = location.state?.from;
  const destino =
    origen && !["/login", "/registro"].includes(origen.pathname || origen) ? origen : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [sinVerificar, setSinVerificar] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");
    setSinVerificar(false);
    setCargando(true);

    try {
      const { user } = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      // Las cuentas creadas con confirmación de correo no entran hasta confirmarlo;
      // las anteriores (sin la marca) siguen entrando como siempre
      if (!user.emailVerified) {
        await user.reload();
      }
      if (!auth.currentUser.emailVerified) {
        const marca = await get(ref(dbRealtime, `usuarios/${user.uid}/requiereVerificacion`));
        if (marca.val() === true) {
          await signOut(auth);
          setSinVerificar(true);
          setError("Confirma tu correo para entrar. Te enviamos un enlace al registrarte.");
          return;
        }
      }
      navigate(destino || "/portada", {
        replace: true,
        state: destino?.state,
      });
    } catch (error) {
      setError(
        "No se ha podido iniciar sesión. Revisa el correo y la contraseña."
      );
    } finally {
      setCargando(false);
    }
  };

  const reenviarVerificacion = async () => {
    setError("");
    setMensaje("");
    try {
      const { user } = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      await enviarVerificacionEmail(user);
      await signOut(auth);
      setMensaje("Te hemos reenviado el correo de confirmación.");
    } catch (error) {
      setError(mensajeErrorAuth(error, "No se ha podido reenviar el correo. Espera unos minutos e inténtalo de nuevo."));
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setMensaje("");

    const emailLimpio = email.trim().toLowerCase();

    if (!emailLimpio) {
      setError(
        "Escribe tu correo electrónico para recuperar la contraseña."
      );
      return;
    }

    try {
      await sendPasswordResetEmail(auth, emailLimpio);
      setMensaje(
        "Si el correo es correcto, te hemos enviado un enlace para restablecer tu contraseña."
      );
    } catch (error) {
      setError(
        "No se ha podido enviar el correo de recuperación. Inténtalo de nuevo."
      );
    }
  };

  return (
    <PantallaConVolver>
      <div className="flex items-center justify-center px-2 sm:px-4 py-6 sm:py-8 text-[#333]">
  <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/img/logoPC.png"
              alt="Logo La Purísima Conchi"
              className="w-28 sm:w-36 md:w-40 mb-4"
            />

            <h1 className="text-2xl sm:text-3xl font-serif text-[#5c2e00] text-center">
              Iniciar sesión
            </h1>

            <p className="text-sm sm:text-base text-[#7a6a58] text-center mt-2">
              Accede a tu cuenta para gestionar tus reservas.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
           className="bg-white shadow-md rounded-2xl p-4 sm:p-6 w-full flex flex-col gap-4"
          >
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 text-center">
                {error}
                {sinVerificar && (
                  <button
                    type="button"
                    onClick={reenviarVerificacion}
                    className="block mx-auto mt-2 font-semibold underline"
                  >
                    Reenviar correo de confirmación
                  </button>
                )}
              </div>
            )}

           {mensaje && (
  <>
    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 text-center">
      {mensaje}
    </div>

    <p className="text-xs text-tinta-suave mt-2 text-center">
      Si no ves el email, revisa tu carpeta de spam o correo no deseado.
    </p>
  </>
)}

            <div>
              <label htmlFor="email" className="block font-bold text-sm mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                id="email"
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base outline-none focus:border-terracota"
                placeholder="tucorreo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-bold text-sm mb-1">
                Contraseña
              </label>

              <div className="relative">
                <input
                  type={mostrarPassword ? "text" : "password"}
                  id="password"
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 pr-20 text-base outline-none focus:border-terracota"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() =>
                    setMostrarPassword((prev) => !prev)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-tinta-suave"
                >
                  {mostrarPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="bg-terracota hover:bg-terracota-oscuro disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-base sm:text-lg py-3 rounded-full transition"
            >
              {cargando ? "Entrando..." : "Entrar"}
            </button>

            <div className="text-sm text-center">
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-tinta-suave font-semibold underline"
              >
                ¿Has olvidado tu contraseña?
              </button>
            </div>

            <div className="text-sm text-center mt-1">
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                className="text-blue-700 font-bold"
                onClick={() => navigate("/registro", { state: location.state })}
              >
                Regístrate aquí
              </button>
            </div>
          </form>
        </div>
      </div>
    </PantallaConVolver>
  );
}