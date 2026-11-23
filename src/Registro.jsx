import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  signOut,
  updateProfile,
} from "firebase/auth";
import { ref, update } from "firebase/database";
import { flujoAuth } from "./utils/guardiaVerificacion";
import { mensajeErrorAuth } from "./utils/erroresAuth";
import { enviarVerificacionEmail } from "./utils/verificarEmail";
import { auth, dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";
import { leerDatosContacto } from "./utils/invitado";

export default function Registro() {
  const navigate = useNavigate();
  const location = useLocation();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [error, setError] = useState("");
  const [emailEnviado, setEmailEnviado] = useState("");
  const [correoFallido, setCorreoFallido] = useState(false);
  const [cargando, setCargando] = useState(false);
  const esInvitado = !!auth.currentUser?.isAnonymous;

  // Un invitado que crea su cuenta ya dejó sus datos al reservar
  useEffect(() => {
    const user = auth.currentUser;
    if (!user?.isAnonymous) return;

    leerDatosContacto(user.uid)
      .then((datos) => {
        setNombre((actual) => actual || datos.nombre || "");
        setTelefono((actual) => actual || datos.telefono || "");
        setEmail((actual) => actual || datos.email || "");
      })
      .catch((err) => console.error("Error al leer los datos del invitado:", err));
  }, []);

  const normalizarTelefono = (valor) => {
  return valor.replace(/\s+/g, "").replace(/[^\d+]/g, "").trim();
};

 const handleRegistro = async (e) => {
  e.preventDefault();
  if (cargando) return;
  setError("");

  const nombreLimpio = nombre.trim();
  const emailLimpio = email.trim().toLowerCase();
  const telefonoLimpio = normalizarTelefono(telefono);

  if (!nombreLimpio) {
    setError("El nombre es obligatorio.");
    return;
  }

  if (!telefono.trim()) {
    setError("El teléfono es obligatorio.");
    return;
  }

  const telefonoValido = /^[+]?\d{9,15}$/.test(telefonoLimpio);
  if (!telefonoValido) {
    setError("Introduce un teléfono válido.");
    return;
  }

  if (password !== confirmar) {
    setError("Las contraseñas no coinciden.");
    return;
  }

  if (!aceptaPrivacidad) {
    setError("Para crear la cuenta tienes que aceptar la política de privacidad.");
    return;
  }

  setCargando(true);
  flujoAuth.ocupado += 1;
  try {
    // Si compró como invitado, la sesión anónima se convierte en su cuenta:
    // mismo uid, así conserva reservas, bonos y tarjetas regalo
    const invitado = auth.currentUser?.isAnonymous ? auth.currentUser : null;

    const userCredential = invitado
      ? await linkWithCredential(
          invitado,
          EmailAuthProvider.credential(emailLimpio, password)
        )
      : await createUserWithEmailAndPassword(auth, emailLimpio, password);

    const uid = userCredential.user.uid;

    await updateProfile(userCredential.user, {
      displayName: nombreLimpio,
    });

    if (invitado) {
      await update(ref(dbRealtime, `usuarios/${uid}`), {
        uid,
        nombre: nombreLimpio,
        telefono: telefonoLimpio,
        email: emailLimpio,
        invitado: false,
        fechaRegistro: new Date().toISOString(),
        privacidadAceptadaEn: new Date().toISOString(),
      });
    } else {
      // update y no set: las reglas dan permiso campo a campo (bonos y tarjetas
      // regalo solo los escribe el servidor)
      await update(ref(dbRealtime, `usuarios/${uid}`), {
        uid,
        nombre: nombreLimpio,
        telefono: telefonoLimpio,
        email: emailLimpio,
        fechaRegistro: new Date().toISOString(),
        privacidadAceptadaEn: new Date().toISOString(),
      });
    }

    // La cuenta nueva no se usa hasta confirmar el correo (las anteriores no lo necesitan)
    // Si el envío falla (p. ej. auth/too-many-requests) la cuenta ya existe: no se
    // muestra error de registro, y desde el login se puede reenviar el correo
    try {
      await enviarVerificacionEmail(userCredential.user);
    } catch (errorCorreo) {
      console.error("No se pudo enviar el correo de confirmación:", errorCorreo);
      setCorreoFallido(true);
    }
    await signOut(auth);
    setEmailEnviado(emailLimpio);
  } catch (error) {
    console.error("Error al registrar:", error);
    setError(
      mensajeErrorAuth(error, "No hemos podido crear tu cuenta. Revisa los datos e inténtalo de nuevo.")
    );
  } finally {
    flujoAuth.ocupado -= 1;
    setCargando(false);
  }
};

  if (emailEnviado) {
    return (
      <div className="flex flex-col items-center justify-center px-4 text-[#333]">
        <img src="/img/logoPCsin.png" alt="Logo La Purísima Conchi" className="w-40 mb-6" />
        <div className="bg-white shadow-md rounded-2xl p-6 w-full max-w-md text-center">
          <h1 className="text-2xl font-serif text-[#5c2e00] mb-3">Confirma tu correo</h1>
          {correoFallido ? (
            <p className="text-sm mb-2">
              Tu cuenta con <strong>{emailEnviado}</strong> está creada, pero no hemos podido
              enviar el correo ahora mismo. Espera unos minutos, inicia sesión y pulsa
              «Reenviar correo de confirmación».
            </p>
          ) : (
          <p className="text-sm mb-2">
            Te hemos enviado un enlace a <strong>{emailEnviado}</strong>. Ábrelo para
            activar tu cuenta y después inicia sesión.
          </p>
          )}
          <p className="text-xs text-tinta-suave mb-5">
            Si no lo ves, revisa la carpeta de spam o correo no deseado.
          </p>
          <button
            type="button"
            className="w-full py-2 px-4 rounded-full font-semibold text-white bg-terracota hover:bg-terracota-oscuro"
            onClick={() => navigate("/login", { replace: true, state: location.state })}
          >
            Ir a iniciar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-4 text-[#333]">
      <BotonVolver volverA="/" />

      <img
        src="/img/logoPCsin.png"
        alt="Logo La Purísima Conchi"
        className="w-40 mb-6"
      />

      <h1 className="text-2xl font-serif text-[#5c2e00] mb-4">Crear cuenta</h1>

      {esInvitado && (
        <p className="text-sm text-tinta-suave bg-mostaza-suave border border-linea rounded-xl px-4 py-3 mb-4 max-w-md text-center">
          Crea una contraseña y guardaremos en tu cuenta las reservas y compras
          que has hecho como invitado.
        </p>
      )}

      <form
        onSubmit={handleRegistro}
        className="bg-white shadow-md rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
      >
        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 text-center"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="nombre" className="block font-bold text-sm mb-1">
            Nombre
          </label>
          <input
            type="text"
            id="nombre"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base"
            placeholder="Tu nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="telefono" className="block font-bold text-sm mb-1">
            Teléfono
          </label>
          <input
            type="tel"
            id="telefono"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base"
            placeholder="Tu teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block font-bold text-sm mb-1">
            Correo electrónico
          </label>
          <input
            type="email"
            id="email"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base"
            placeholder="tucorreo@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block font-bold text-sm mb-1">
            Contraseña
          </label>
          <input
            type="password"
            id="password"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base"
            placeholder="Crea una contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="confirmar" className="block font-bold text-sm mb-1">
            Confirmar contraseña
          </label>
          <input
            type="password"
            id="confirmar"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-base"
            placeholder="Repite la contraseña"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-tinta">
          <input
            type="checkbox"
            className="mt-1"
            checked={aceptaPrivacidad}
            onChange={(e) => setAceptaPrivacidad(e.target.checked)}
            required
          />
          <span>
            He leído y acepto la{" "}
            <Link to="/politica-privacidad" target="_blank" className="text-terracota underline">
              política de privacidad
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={cargando}
          className="bg-terracota hover:bg-terracota-oscuro disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-lg py-3 rounded-full"
        >
          {cargando ? "Creando tu cuenta..." : "Registrarse"}
        </button>

        <div className="text-sm text-center mt-2">
          ¿Ya tienes cuenta?{" "}
          <span
            className="text-blue-700 font-bold cursor-pointer"
            onClick={() => navigate("/login", { state: location.state })}
          >
            Inicia sesión
          </span>
        </div>
      </form>
    </div>
  );
}