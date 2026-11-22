import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { aiApiPlugin } from "./server/plugin";

export default defineConfig(({ mode }) => {
  // Carga .env (también variables sin prefijo VITE_) solo en el lado del servidor.
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["ANTHROPIC_API_KEY", "CLAUDE_MODEL", "FLOW_URL", "CHATGPT_URL", "CHROME_PATH"]) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }
  return {
    plugins: [react(), aiApiPlugin()],
    server: { port: 5173, watch: { ignored: ["**/.toma-browser/**", "**/.impeccable/**"] } },
  };
});
