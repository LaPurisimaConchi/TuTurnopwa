import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, dbRealtime } from "./firebase";
import BotonVolver from "./BotonVolver";

export default function Registro() {
  const navigate = useNavigate();
  const location = useLocation();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");

  const normalizarTelefono = (valor) => {
  return valor.replace(/\s+/g, "").replace(/[^\d+]/g, "").trim();
};

 const handleRegistro = async (e) => {
  e.preventDefault();
  setError("");

  const nombreLimpio = nombre.trim();
  const emailLimpio = email.trim().toLowerCase();
  const telefonoLimpio = normalizarTelefono(telefono);

  if (!nombreLimpio) {
    setError("El nombre es obligatorio.");
    return;
  }

  if (!telefonoLimpio) {
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

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      emailLimpio,
      password
    );

    const uid = userCredential.user.uid;

    await updateProfile(userCredential.user, {
      displayName: nombreLimpio,
    });

    await set(ref(dbRealtime, `usuarios/${uid}`), {
      uid,
      nombre: nombreLimpio,
      telefono: telefonoLimpio,
      email: emailLimpio,
      fechaRegistro: new Date().toISOString(),
      reservas: 0,
      bonos: {},
    });

    navigate(location.state?.from || "/perfil", { replace: true });
  } catch (error) {
    setError("Error al registrar: " + error.message);
  }
};

  return (
    <div className="bg-[#fdfaf5] min-h-screen flex flex-col items-center justify-center px-4 text-[#333]">
      <BotonVolver volverA="/" />

      <img
        src="/img/logoPCsin.png"
        alt="Logo La Purísima Conchi"
        className="w-40 mb-6"
      />

      <h1 className="text-2xl font-serif text-[#5c2e00] mb-4">Crear cuenta</h1>

      <form
        onSubmit={handleRegistro}
        className="bg-white shadow-md rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
      >
        {error && (
          <div className="text-red-600 text-sm text-center">{error}</div>
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

        <button
          type="submit"
          className="bg-[#b36a4a] hover:bg-[#9e5c3f] text-white font-bold text-lg py-3 rounded-xl"
        >
          Registrarse
        </button>

        <div className="text-sm text-center mt-2">
          ¿Ya tienes cuenta?{" "}
          <span
            className="text-blue-700 font-bold cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Inicia sesión
          </span>
        </div>
      </form>
    </div>
  );
}