import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./firebase";
import PantallaConVolver from "./PantallaConVolver";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  // Si se viene de una reserva o compra, se vuelve allí con sus datos
  const destino = location.state?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");
    setCargando(true);

    try {
      await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
      navigate(destino || "/dondereservar", {
        replace: !!destino,
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
      <div className="bg-[#fdfaf5] min-h-screen flex items-center justify-center px-2 sm:px-4 py-6 sm:py-8 text-[#333]">
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
              </div>
            )}

           {mensaje && (
  <>
    <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 text-center">
      {mensaje}
    </div>

    <p className="text-xs text-[#7b6d62] mt-2 text-center">
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
                className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base outline-none focus:border-[#b36a4a]"
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
                  className="w-full border border-gray-300 rounded-xl px-3 py-3 pr-20 text-base outline-none focus:border-[#b36a4a]"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#8a5a44]"
                >
                  {mostrarPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="bg-[#b36a4a] hover:bg-[#9e5c3f] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-base sm:text-lg py-3 rounded-xl transition"
            >
              {cargando ? "Entrando..." : "Entrar"}
            </button>

            <div className="text-sm text-center">
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-[#8a5a44] font-semibold underline"
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