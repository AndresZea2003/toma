// Servidor propio de Toma (sin Vite): sirve la interfaz ya compilada y la misma API.
// Lo usa la app de escritorio.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import path from "node:path";
import { handler } from "./plugin";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

export function startServer(distDir: string, port: number): Promise<Server> {
  const root = path.resolve(distDir);
  const server = createServer((req, res) => {
    void handler(req as never, res, () => {
      // Archivos estáticos, con index.html como respaldo
      const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
      let file = path.join(root, urlPath);
      if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = path.join(root, "index.html");
      res.statusCode = 200;
      res.setHeader("Content-Type", TYPES[path.extname(file)] ?? "application/octet-stream");
      createReadStream(file).pipe(res);
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    // Solo accesible desde este equipo
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
