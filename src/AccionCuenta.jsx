// Página a la que llevan los enlaces de los correos de Firebase Auth (confirmar el
// correo y restablecer la contraseña), con el estilo de la web en vez de la página
// en inglés de Firebase. Ruta: /auth/accion?mode=verifyEmail|resetPassword&oobCode=…
// Los dos correos (confirmar y restablecer) los monta api/_correoVerificacion.js apuntando aquí.
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "./firebase";
import PantallaConVolver from "./PantallaConVolver";
import { mensajeErrorAuth } from "./utils/erroresAuth";

const ENLACE_INVALIDO =
  "Este enlace ya se ha usado o ha caducado. Si acabas de confirmar tu correo, ya puedes iniciar sesión; si no, pide uno nuevo desde el inicio de sesión.";

const boton =
  "w-full bg-terracota hover:bg-terracota-oscuro disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-base py-3 rounded-full transition";

function Tarjeta({ titulo, children }) {
  return (
    <PantallaConVolver>
      <div className="flex items-center justify-center px-2 sm:px-4 py-6 sm:py-8 text-[#333]">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <img src="/img/logoPC.png" alt="Logo La Purísima Conchi" className="w-28 sm:w-36 md:w-40 mb-4" />
            <h1 className="text-2xl sm:text-3xl font-serif text-[#5c2e00] text-center">{titulo}</h1>
          </div>
          <div className="bg-white shadow-md rounded-2xl p-4 sm:p-6 w-full flex flex-col gap-4 text-center">
            {children}
          </div>
        </div>
      </div>
    </PantallaConVolver>
  );
}

function Aviso({ tipo, children }) {
  const estilos =
    tipo === "ok"
      ? "bg-green-50 border-green-200 text-green-700"
      : "bg-red-50 border-red-200 text-red-700";
  return (
    <div role={tipo === "ok" ? "status" : "alert"} className={`border text-sm rounded-xl px-4 py-3 ${estilos}`}>
      {children}
    </div>
  );
}

function ConfirmarCorreo({ codigo }) {
  const navigate = useNavigate();
  const [estado, setEstado] = useState("cargando");
  const [error, setError] = useState("");
  const hecho = useRef(false);

  useEffect(() => {
    // El código solo vale una vez: en desarrollo React monta dos veces el efecto
    if (hecho.current) return;
    hecho.current = true;
    applyActionCode(auth, codigo)
      .then(() => setEstado("ok"))
      .catch((e) => {
        console.error("No se pudo confirmar el correo:", e);
        setError(
          ["auth/invalid-action-code", "auth/expired-action-code"].includes(e?.code)
            ? ENLACE_INVALIDO
            : mensajeErrorAuth(e, "No hemos podido confirmar tu correo. Inténtalo de nuevo.")
        );
        setEstado("error");
      });
  }, [codigo]);

  return (
    <Tarjeta titulo={estado === "ok" ? "¡Correo confirmado!" : "Confirmar tu correo"}>
      {estado === "cargando" && <p className="text-sm text-tinta-suave">Confirmando tu correo…</p>}
      {estado === "ok" && (
        <Aviso tipo="ok">Tu cuenta ya está activa. Inicia sesión para continuar.</Aviso>
      )}
      {estado === "error" && <Aviso tipo="error">{error}</Aviso>}
      {estado !== "cargando" && (
        <button type="button" className={boton} onClick={() => navigate("/login", { replace: true })}>
          Ir a iniciar sesión
        </button>
      )}
    </Tarjeta>
  );
}

function NuevaContrasena({ codigo }) {
  const navigate = useNavigate();
  const [estado, setEstado] = useState("cargando");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    verifyPasswordResetCode(auth, codigo)
      .then((correo) => {
        setEmail(correo);
        setEstado("formulario");
      })
      .catch((e) => {
        console.error("Enlace de contraseña no válido:", e);
        setError(
          ["auth/invalid-action-code", "auth/expired-action-code"].includes(e?.code)
            ? "Este enlace ya se ha usado o ha caducado. Pide uno nuevo desde «¿Has olvidado tu contraseña?»."
            : mensajeErrorAuth(e)
        );
        setEstado("error");
      });
  }, [codigo]);

  const guardar = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setGuardando(true);
    try {
      await confirmPasswordReset(auth, codigo, password);
      setEstado("ok");
    } catch (err) {
      console.error("No se pudo cambiar la contraseña:", err);
      setError(mensajeErrorAuth(err, "No hemos podido cambiar la contraseña. Inténtalo de nuevo."));
    } finally {
      setGuardando(false);
    }
  };

  const irALogin = () => navigate("/login", { replace: true });

  return (
    <Tarjeta titulo={estado === "ok" ? "Contraseña cambiada" : "Nueva contraseña"}>
      {estado === "cargando" && <p className="text-sm text-tinta-suave">Comprobando el enlace…</p>}

      {estado === "formulario" && (
        <form onSubmit={guardar} className="flex flex-col gap-4 text-left">
          <p className="text-sm text-center">
            Elige una contraseña nueva para <strong>{email}</strong>.
          </p>
          {error && <Aviso tipo="error">{error}</Aviso>}
          <div>
            <label htmlFor="nueva" className="block font-bold text-sm mb-1">Contraseña nueva</label>
            <input
              id="nueva"
              type="password"
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base outline-none focus:border-terracota"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="repetir" className="block font-bold text-sm mb-1">Repite la contraseña</label>
            <input
              id="repetir"
              type="password"
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base outline-none focus:border-terracota"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className={boton} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      )}

      {estado === "ok" && (
        <>
          <Aviso tipo="ok">Ya puedes iniciar sesión con tu contraseña nueva.</Aviso>
          <button type="button" className={boton} onClick={irALogin}>Ir a iniciar sesión</button>
        </>
      )}

      {estado === "error" && (
        <>
          <Aviso tipo="error">{error}</Aviso>
          <button type="button" className={boton} onClick={irALogin}>Ir a iniciar sesión</button>
        </>
      )}
    </Tarjeta>
  );
}

export default function AccionCuenta() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const modo = params.get("mode");
  const codigo = params.get("oobCode");

  if (codigo && modo === "verifyEmail") return <ConfirmarCorreo codigo={codigo} />;
  if (codigo && modo === "resetPassword") return <NuevaContrasena codigo={codigo} />;

  return (
    <Tarjeta titulo="Enlace no válido">
      <Aviso tipo="error">Este enlace no es válido. Pide uno nuevo desde el inicio de sesión.</Aviso>
      <button type="button" className={boton} onClick={() => navigate("/login", { replace: true })}>
        Ir a iniciar sesión
      </button>
    </Tarjeta>
  );
}
