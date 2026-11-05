import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, updateProfile, onAuthStateChanged } from "firebase/auth";
import { getDatabase, ref, get, update } from "firebase/database";
import PantallaConVolver from "./PantallaConVolver";
import Footer from "./Footer";

export default function EditarPerfil() {
  const navigate = useNavigate();
  const auth = getAuth();
  const db = getDatabase();

  const [usuario, setUsuario] = useState(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const normalizarTelefono = (valor) => {
    return valor.replace(/\s+/g, "").replace(/[^\d+]/g, "").trim();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        setUsuario(user);
        setEmail(user.email || "");

        const userRef = ref(db, `usuarios/${user.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          const datos = snapshot.val();
          setNombre(datos.nombre || user.displayName || "");
          setTelefono(datos.telefono || "");
          // Invitados: su email solo está en usuarios/{uid}
          if (!user.email) setEmail(datos.email || "");
        } else {
          setNombre(user.displayName || "");
          setTelefono("");
        }
      } catch (err) {
        console.error("Error al cargar datos del perfil:", err);
        setError("No se pudieron cargar tus datos.");
      } finally {
        setCargando(false);
      }
    });

    return () => unsubscribe();
  }, [auth, db, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const nombreLimpio = nombre.trim();
    const telefonoLimpio = normalizarTelefono(telefono);

    if (!nombreLimpio) {
      setError("El nombre no puede estar vacío.");
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

    if (!usuario) {
      setError("No se ha encontrado el usuario.");
      return;
    }

    setGuardando(true);

    try {
      await updateProfile(usuario, { displayName: nombreLimpio });

      const userRef = ref(db, `usuarios/${usuario.uid}`);
      await update(userRef, {
        nombre: nombreLimpio,
        telefono: telefonoLimpio,
        email: email || "",
      });

      setSuccess("Perfil actualizado correctamente.");

      setTimeout(() => {
        navigate("/perfil");
      }, 1200);
    } catch (err) {
      console.error("Error al actualizar perfil:", err);
      setError("Hubo un problema al actualizar tu perfil.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <PantallaConVolver volverA="/perfil">
        <div className="max-w-md w-full mx-auto bg-[#fcfaf6] rounded-[30px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-[#eee6da] p-5 text-[#3b3025]">
          <p className="text-sm text-[#7b6d62] text-center">Cargando perfil...</p>
        </div>
        <Footer />
      </PantallaConVolver>
    );
  }

  return (
    <PantallaConVolver volverA="/perfil">
      <div className="max-w-md w-full mx-auto bg-[#fcfaf6] rounded-[30px] shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-[#eee6da] p-5 text-[#3b3025]">
        <div className="text-center mb-6">
          <h1 className="text-[2rem] font-serif font-bold text-[#6f3d22] mb-2">
            Editar perfil
          </h1>
          <p className="text-sm text-[#7b6d62]">
            Actualiza tus datos de contacto
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-[#efe7db] px-4 py-4 shadow-sm space-y-4"
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 text-center">
              {success}
            </div>
          )}

          <div>
            <label className="block font-semibold text-sm mb-1">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base outline-none focus:border-[#b36a4a]"
              placeholder="Tu nombre"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-sm mb-1">Teléfono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base outline-none focus:border-[#b36a4a]"
              placeholder="Tu teléfono"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-sm mb-1">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full border border-gray-200 bg-[#f8f6f2] text-[#7b6d62] rounded-xl px-3 py-3 text-base outline-none cursor-not-allowed"
            />
            <p className="text-xs text-[#8e7f73] mt-1">
              El correo no se puede modificar desde aquí.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="submit"
              disabled={guardando}
              className="bg-[#b36a4a] hover:bg-[#9e5c3f] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3 rounded-2xl transition"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/perfil")}
              className="bg-white border border-[#d8cfc2] text-[#5f5247] font-bold py-3 rounded-2xl hover:bg-[#f8f5f0] transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </PantallaConVolver>
  );
}