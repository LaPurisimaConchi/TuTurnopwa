// src/components/FormularioDatosContacto.jsx
// Nombre, email y teléfono de quien compra sin cuenta. Valida y llama a
// alEnviar({ nombre, email, telefono }); si falla, muestra el error.
import { useState } from "react";
import { Link } from "react-router-dom";
import { mensajeErrorInvitado, validarDatosContacto } from "../utils/invitado";

export default function FormularioDatosContacto({ alEnviar, textoBoton = "Continuar" }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const errorValidacion = validarDatosContacto({ nombre, email, telefono });
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setEnviando(true);

    try {
      await alEnviar({ nombre, email, telefono });
    } catch (err) {
      console.error("Error al continuar como invitado:", err);
      setError(mensajeErrorInvitado(err));
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        {enviando ? "Un momento..." : textoBoton}
      </button>

      <p className="text-xs text-gray-500 text-center leading-5">
        Al continuar aceptas nuestra{" "}
        <Link to="/politica-privacidad" className="underline">
          política de privacidad
        </Link>
        . Después podrás crear una contraseña para guardar tus reservas.
      </p>
    </form>
  );
}
