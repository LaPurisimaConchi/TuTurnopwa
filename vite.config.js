import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Variables de .env.local (sin prefijo VITE_, solo para el servidor de desarrollo)
  const env = loadEnv(mode, process.cwd(), "");

  // En local, /api se redirige a API_PROXY_TARGET (por defecto, producción)
  const apiTarget = env.API_PROXY_TARGET || "https://app.lapurisimaconchi.com";
  const bypass = env.VERCEL_PROTECTION_BYPASS;

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          // Los Preview de Vercel están protegidos; este token permite pasar
          headers: bypass ? { "x-vercel-protection-bypass": bypass } : {}
        }
      }
    }
  };
});
