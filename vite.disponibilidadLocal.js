// vite.disponibilidadLocal.js
// Sirve /api/disponibilidad desde `npm run dev`, para no depender de que la
// función esté desplegada en el Vercel al que apunta API_PROXY_TARGET. Lee la base
// de datos de las variables VITE_FIREBASE_* (staging) con una sesión anónima del
// propio servidor de desarrollo, que se abre al primer uso y dura mientras
// el servidor esté levantado. Sin esas variables (apunta a producción) deja pasar
// la petición al proxy de siempre.
import { resolverDisponibilidad } from "./src/utils/disponibilidadServidor.js";

export function disponibilidadLocal(env) {
  const databaseURL = env.VITE_FIREBASE_DATABASE_URL;
  let lector = null;

  const abrirLector = async () => {
    const { initializeApp } = await import("firebase/app");
    const { getAuth, signInAnonymously } = await import("firebase/auth");
    const { getDatabase, ref, get } = await import("firebase/database");

    const app = initializeApp(
      {
        apiKey: env.VITE_FIREBASE_API_KEY,
        authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
        databaseURL,
        projectId: env.VITE_FIREBASE_PROJECT_ID,
        appId: env.VITE_FIREBASE_APP_ID,
      },
      "disponibilidad-local"
    );

    await signInAnonymously(getAuth(app));
    const db = getDatabase(app);

    return (ruta) => get(ref(db, ruta));
  };

  return {
    name: "disponibilidad-local",
    apply: "serve",
    configureServer(server) {
      if (!databaseURL) return;

      server.middlewares.use("/api/disponibilidad", async (req, res) => {
        const enviar = (codigo, cuerpo) => {
          res.statusCode = codigo;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(cuerpo));
        };

        if (req.method !== "GET") {
          return enviar(405, { ok: false, error: "Método no permitido" });
        }

        try {
          lector ??= abrirLector();
          const leer = await lector;
          const consulta = new URL(req.originalUrl || req.url, "http://localhost").searchParams;

          const { codigo, cuerpo } = await resolverDisponibilidad(
            {
              tipo: consulta.get("tipo") || "",
              fecha: consulta.get("fecha") || "",
              turno: consulta.get("turno") || "",
              ruta: consulta.get("ruta") || "",
            },
            leer
          );

          enviar(codigo, cuerpo);
        } catch (error) {
          lector = null;
          console.error("[disponibilidad-local]", error);
          enviar(500, { ok: false, error: "No se pudo leer la disponibilidad" });
        }
      });
    },
  };
}
