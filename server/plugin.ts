import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Connect, Plugin } from "vite";
import { AiError, editScene, generateStory } from "./ai";

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
  if (req.method !== "POST" || !req.url?.startsWith("/api/")) return next();
  try {
    const body = await readJson(req);
    if (req.url.startsWith("/api/story")) {
      if (!body?.idea || typeof body.idea !== "string") return send(res, 400, { error: "Falta la idea" });
      return send(res, 200, await generateStory(body));
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
