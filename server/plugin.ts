import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";
import { AiError, createStyleSkill, editScene, generateSceneCode, generateStory } from "./ai";

function readJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 1_000_000) reject(new Error("Petición demasiado grande"));
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

/** Carpeta donde Toma deja los videos terminados: Videos/Toma (Películas/Toma en Mac) */
function videosDir() {
  const dir = process.env.TOMA_VIDEOS_DIR || path.join(os.homedir(), process.platform === "darwin" ? "Movies" : "Videos", "Toma");
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function saveRoute(req: IncomingMessage, res: ServerResponse, url: string) {
  const dir = videosDir();
  if (url.startsWith("/api/save/open")) {
    // Abrir la carpeta en el explorador del sistema
    const cmd = process.platform === "win32" ? "explorer" : process.platform === "darwin" ? "open" : "xdg-open";
    spawn(cmd, [dir], { detached: true, stdio: "ignore" }).unref();
    return send(res, 200, { dir });
  }
  const raw = new URL(url, "http://x").searchParams.get("name") || "video.mp4";
  // Solo el nombre, sin rutas ni caracteres raros
  const clean = path.basename(raw).replace(/[^\w.\- áéíóúñÁÉÍÓÚÑ]/g, "").slice(0, 80) || "video.mp4";
  const ext = path.extname(clean) || ".mp4";
  const base = clean.slice(0, clean.length - path.extname(clean).length) || "video";
  let file = path.join(dir, base + ext);
  for (let n = 2; existsSync(file); n++) file = path.join(dir, `${base} (${n})${ext}`);
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(file);
    req.pipe(out);
    out.on("finish", () => resolve());
    out.on("error", reject);
    req.on("error", reject);
  });
  return send(res, 200, { file, dir, name: path.basename(file) });
}

const TOOLS = ["flow", "chatgpt", "aistudio", "flowmusic"] as const;
const KINDS = ["video", "image", "voice", "music"] as const;

/** Piloto automático: /api/robot/... */
async function robotRoute(req: IncomingMessage, res: ServerResponse, url: string) {
  const robot = await import("./robot");
  const parts = url.split("?")[0].split("/").filter(Boolean); // api, robot, ...
  const [, , section, id, action] = parts;
  if (req.method === "GET" && section === "status") {
    return send(res, 200, { browser: await robot.browserState(), jobs: robot.listJobs() });
  }
  if (req.method === "POST" && section === "open") {
    const body = await readJson(req);
    const tool = TOOLS.includes(body.tool) ? body.tool : "flow";
    await robot.openTool(tool);
    return send(res, 200, { ok: true });
  }
  if (req.method === "GET" && section === "preview" && TOOLS.includes(id as never)) {
    const shot = await robot.preview(id as (typeof TOOLS)[number]);
    if (!shot) return send(res, 404, { error: "Sin ventana" });
    res.statusCode = 200;
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "no-store");
    res.end(shot);
    return;
  }
  if (req.method === "POST" && section === "hide") {
    await robot.hideWindow();
    return send(res, 200, { ok: true });
  }
  if (req.method === "POST" && section === "panel") {
    const body = await readJson(req);
    if (body.tool === null) robot.showPanel(null);
    else if (TOOLS.includes(body.tool)) await robot.openTool(body.tool);
    return send(res, 200, { ok: true });
  }
  if (section === "jobs" && !id && req.method === "POST") {
    const body = await readJson(req);
    if (!TOOLS.includes(body.tool) || !KINDS.includes(body.kind) || typeof body.prompt !== "string" || !body.prompt.trim()) {
      return send(res, 400, { error: "Faltan datos del trabajo" });
    }
    const aspect = ["9:16", "1:1", "16:9"].includes(body.aspect) ? body.aspect : "9:16";
    return send(res, 200, robot.enqueue(body.tool, body.kind, body.prompt.slice(0, 4000), aspect));
  }
  const job = id ? robot.getJob(id) : undefined;
  if (section === "jobs" && job && req.method === "GET" && !action) return send(res, 200, job);
  if (section === "jobs" && job && req.method === "POST" && action === "cancel") {
    robot.cancelJob(job.id);
    return send(res, 200, job);
  }
  if (section === "files" && job?.file && req.method === "GET") {
    res.statusCode = 200;
    res.setHeader("Content-Type", job.mime ?? "application/octet-stream");
    res.end(readFileSync(job.file));
    return;
  }
  return send(res, 404, { error: "No encontrado" });
}

export const handler: Connect.NextHandleFunction = async (req, res, next) => {
  if (req.url?.startsWith("/api/robot/")) {
    try {
      return await robotRoute(req, res, req.url);
    } catch (error) {
      console.error("[toma:robot]", error);
      return send(res, 500, { error: error instanceof Error ? error.message.split("\n")[0] : "Error del piloto" });
    }
  }
  if (req.method === "POST" && req.url?.startsWith("/api/save")) {
    try {
      return await saveRoute(req, res, req.url);
    } catch (error) {
      return send(res, 500, { error: error instanceof Error ? error.message : "No se pudo guardar" });
    }
  }
  // Solo la propia app puede llamar a la API: ni otras webs ni el código de animación aislado
  const origin = req.headers.origin;
  if (req.url?.startsWith("/api/") && origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return send(res, 403, { error: "Origen no permitido" });
  }
  if (req.url?.startsWith("/api/styles")) {
    try {
      const styles = await import("./styles");
      const pub = (s: { id: string; name: string; description: string; builtin: boolean }) => ({ id: s.id, name: s.name, description: s.description, builtin: s.builtin });
      if (req.method === "GET") return send(res, 200, styles.listStyles().map(pub));
      if (req.method === "DELETE") return send(res, 200, { ok: styles.deleteStyle(decodeURIComponent(req.url.split("/")[3] ?? "")) });
      if (req.method === "POST") {
        const body = await readJson(req);
        if (!body?.name?.trim() || !body?.brief?.trim()) return send(res, 400, { error: "Falta el nombre o la descripción" });
        return send(res, 200, pub(await createStyleSkill({ name: String(body.name).slice(0, 60), brief: String(body.brief).slice(0, 4000), ai: body.ai })));
      }
    } catch (error) {
      if (error instanceof AiError) return send(res, error.code === "no_key" ? 503 : 502, { error: error.message, code: error.code });
      return send(res, 500, { error: error instanceof Error ? error.message : "Error con los estilos" });
    }
  }
  if (req.url?.startsWith("/api/update")) {
    const host = (globalThis as { __tomaUpdate?: { get(): unknown; check(): void; install(): void } }).__tomaUpdate;
    if (!host) return send(res, 200, { desktop: false });
    if (req.method === "POST" && req.url.includes("/check")) host.check();
    if (req.method === "POST" && req.url.includes("/install")) host.install();
    return send(res, 200, host.get());
  }
  if (req.method === "GET" && req.url?.startsWith("/api/ai/providers")) {
    const { cliVersion } = await import("./cli");
    const [claude, codex] = await Promise.all([cliVersion("claude-code"), cliVersion("codex")]);
    return send(res, 200, { api: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN), "claude-code": claude, codex });
  }
  if (req.method !== "POST" || !req.url?.startsWith("/api/")) return next();
  try {
    const body = await readJson(req);
    if (req.url.startsWith("/api/story")) {
      if (!body?.idea || typeof body.idea !== "string") return send(res, 400, { error: "Falta la idea" });
      return send(res, 200, await generateStory(body));
    }
    if (req.url.startsWith("/api/scene-code")) {
      if (!body?.styleId || !body?.scene) return send(res, 400, { error: "Faltan datos" });
      return send(res, 200, await generateSceneCode(body));
    }
    if (req.url.startsWith("/api/scene")) {
      if (!body?.scene || !body?.instruction) return send(res, 400, { error: "Faltan datos" });
      return send(res, 200, await editScene(body));
    }
    return send(res, 404, { error: "Ruta no encontrada" });
  } catch (error) {
    if (error instanceof AiError) {
      const status = error.code === "no_key" ? 503 : error.code === "rate_limit" ? 429 : 502;
      return send(res, status, { error: error.message, code: error.code });
    }
    console.error("[lienzo]", error);
    return send(res, 500, { error: "Error inesperado del servidor" });
  }
};

export function aiApiPlugin(): Plugin {
  return {
    name: "lienzo-ai-api",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
