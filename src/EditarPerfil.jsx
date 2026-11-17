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
        navigate("/login", { state: { from: { pathname: "/editar-perfil" } }, replace: true });
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

  const campo =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-base outline-none focus:border-terracota";
  const inicial = (nombre || email || "?").trim().charAt(0).toUpperCase();

  const envolver = (children) => (
    <PantallaConVolver volverA="/perfil">
      <div className="max-w-3xl w-full mx-auto bg-white rounded-2xl shadow-md p-5 sm:p-6 text-tinta">
        <h1 className="text-center font-serif text-tinta mb-5">
          <span className="block text-sm font-sans font-semibold uppercase tracking-wider text-terracota">
            Tu cuenta
          </span>
          <span className="block text-3xl md:text-4xl font-bold leading-tight mt-1">Editar perfil</span>
        </h1>
        {children}
      </div>
      <Footer />
    </PantallaConVolver>
  );

  if (cargando) {
    return (
      envolver(<p className="text-sm text-tinta-suave text-center py-6">Cargando perfil...</p>)
    );
  }

  return envolver(
      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-[13rem_1fr] md:gap-x-10">
        {/* Izquierda: quién eres */}
        <div className="bg-crema border border-linea rounded-xl p-4 text-center md:self-start">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-terracota text-white font-serif text-3xl font-bold">
            {inicial}
          </span>
          <p className="mt-3 font-semibold truncate">{nombre || "Sin nombre"}</p>
          <p className="text-xs text-tinta-suave truncate">{email || "—"}</p>
          <p className="mt-3 text-xs text-tinta-suave leading-relaxed">
            Estos datos se usan para contactar contigo sobre tus reservas.
          </p>
        </div>

        {/* Derecha: formulario */}
        <div className="space-y-4">
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 text-center"
            >
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 text-center">
              {success}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="perfil-nombre" className="block font-bold text-sm mb-1">
                Nombre <span className="text-red-600">*</span>
              </label>
              <input
                id="perfil-nombre"
                type="text"
                autoComplete="name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={campo}
                placeholder="Tu nombre"
                required
              />
            </div>

            <div>
              <label htmlFor="perfil-telefono" className="block font-bold text-sm mb-1">
                Teléfono <span className="text-red-600">*</span>
              </label>
              <input
                id="perfil-telefono"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className={campo}
                placeholder="Tu teléfono"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="perfil-email" className="block font-bold text-sm mb-1">
              Correo electrónico
            </label>
            <input
              id="perfil-email"
              type="email"
              value={email}
              readOnly
              className="w-full border border-gray-200 bg-arena text-tinta-suave rounded-lg px-3 py-2 text-base outline-none cursor-not-allowed"
            />
            <p className="text-xs text-tinta-suave mt-1">El correo no se puede modificar desde aquí.</p>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/perfil")}
              className="sm:w-40 bg-white border border-terracota text-terracota hover:bg-terracota-suave font-semibold py-3 rounded-full transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="sm:w-48 bg-terracota hover:bg-terracota-oscuro disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-full shadow-md transition"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>
      </form>
  );
}
