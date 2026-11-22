// Piloto automático: Toma controla una ventana de Chrome (perfil propio) para usar
// Flow y ChatGPT con la cuenta del creador. El creador inicia sesión él mismo;
// si algo cambia en la web, el trabajo pasa a modo asistido y espera a que el
// creador pulse «generar», pero sigue capturando el resultado automáticamente.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";

export type RobotTool = "flow" | "chatgpt" | "aistudio" | "flowmusic";
export type RobotKind = "video" | "image" | "voice" | "music";
export type JobStatus = "queued" | "opening" | "login" | "typing" | "generating" | "assist" | "downloading" | "done" | "error" | "cancelled";

export type RobotAspect = "9:16" | "1:1" | "16:9";

export interface RobotJob {
  id: string;
  tool: RobotTool;
  kind: RobotKind;
  aspect: RobotAspect;
  prompt: string;
  status: JobStatus;
  message: string;
  createdAt: number;
  startedAt?: number;
  file?: string;
  mime?: string;
}

const ROOT = path.resolve(process.env.TOMA_DATA_DIR ?? ".", ".toma-browser");
const PROFILE = path.join(ROOT, "profile");
const OUT = path.join(ROOT, "out");
const PORT = Number(process.env.TOMA_CHROME_PORT || 9333);
const URLS: Record<RobotTool, string> = {
  flow: process.env.FLOW_URL || "https://flow.google.com/",
  chatgpt: process.env.CHATGPT_URL || "https://chatgpt.com/",
  aistudio: process.env.AISTUDIO_URL || "https://aistudio.google.com/generate-speech",
  flowmusic: process.env.FLOWMUSIC_URL || "https://www.flowmusic.app/",
};
const HOSTS: Record<RobotTool, RegExp> = {
  flow: /flow\.google\.com|labs\.google\/fx/,
  chatgpt: /chatgpt\.com|chat\.openai/,
  aistudio: /aistudio\.google\.com/,
  flowmusic: /flowmusic\.app/,
};
const TOOL_NAME: Record<RobotTool, string> = { flow: "Flow", chatgpt: "ChatGPT", aistudio: "AI Studio", flowmusic: "Flow Music" };

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  path.join(process.env.LOCALAPPDATA ?? "", "Google\\Chrome\\Application\\chrome.exe"),
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
].filter(Boolean) as string[];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Pausas con ritmo humano */
const human = (min = 400, max = 1100) => sleep(min + Math.random() * (max - min));

// ---------- Navegador ----------

let browser: Browser | null = null;

async function connect(): Promise<Browser | null> {
  try {
    const b = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`, { timeout: 2500 });
    b.on("disconnected", () => (browser = null));
    return b;
  } catch {
    return null;
  }
}

async function ensureBrowser(): Promise<BrowserContext> {
  if (!browser?.isConnected()) browser = await connect();
  if (!browser) {
    const exe = CHROME_PATHS.find((p) => existsSync(p));
    if (!exe) throw new Error("No encontré Chrome ni Edge instalados. Define CHROME_PATH en .env.");
    mkdirSync(PROFILE, { recursive: true });
    // Chrome normal con un perfil propio de Toma y el puerto de depuración local
    const child = spawn(exe, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, "--no-first-run", "--no-default-browser-check", "about:blank"], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    for (let i = 0; i < 40 && !browser; i++) {
      await sleep(500);
      browser = await connect();
    }
    if (!browser) throw new Error("No pude abrir Chrome. Cierra otras ventanas de Toma y vuelve a intentarlo.");
  }
  return browser.contexts()[0] ?? (await browser.newContext());
}

async function toolPage(tool: RobotTool, fresh = false): Promise<Page> {
  const ctx = await ensureBrowser();
  let page = ctx.pages().find((p) => HOSTS[tool].test(p.url()));
  if (!page) {
    const blank = ctx.pages().find((p) => p.url() === "about:blank");
    page = blank ?? (await ctx.newPage());
    await page.goto(URLS[tool], { waitUntil: "domcontentloaded" });
  } else if (fresh && (tool === "chatgpt" || tool === "aistudio" || tool === "flowmusic")) {
    await page.goto(URLS[tool], { waitUntil: "domcontentloaded" });
  }
  return page;
}

export async function openTool(tool: RobotTool) {
  await (await toolPage(tool)).bringToFront();
}

export async function browserState() {
  if (!browser?.isConnected()) browser = await connect();
  const pages = browser ? browser.contexts().flatMap((c) => c.pages()) : [];
  return {
    open: !!browser,
    flow: pages.some((p) => HOSTS.flow.test(p.url())),
    chatgpt: pages.some((p) => HOSTS.chatgpt.test(p.url())),
    aistudio: pages.some((p) => HOSTS.aistudio.test(p.url())),
    flowmusic: pages.some((p) => HOSTS.flowmusic.test(p.url())),
  };
}

// ---------- Utilidades de página ----------

const PROMPT_BOX = 'textarea:visible, [contenteditable="true"]:visible, [role="textbox"]:visible';
const SUBMIT_LABEL = /^(iniciar generación|start generation|generate|create|crear|generar|send|enviar|submit|enviar mensaje|send prompt|arrow_forward)$/i;

/** Ajustes de Flow: tipo (imagen/vídeo), proporción y una sola salida para no gastar usos de más */
async function configureFlow(page: Page, kind: RobotKind, aspect: RobotAspect) {
  const radio = (name: RegExp) => page.getByRole("radio", { name }).first();
  const kindRadio = radio(kind === "video" ? /v[íi]deo$/i : /imagen$|image$/i);
  if (!(await kindRadio.isVisible().catch(() => false))) {
    const trigger = page.getByRole("button", { name: /activador de ajustes|settings toggle|ajustes de generación/i }).first();
    if (!(await trigger.count())) return false;
    await trigger.click();
    await page.waitForTimeout(900);
  }
  if (!(await kindRadio.isVisible().catch(() => false))) return false;
  await kindRadio.click();
  await human(500, 900);
  const aspectRadio = radio(new RegExp(`${aspect.replace(":", ":")}$`));
  if (await aspectRadio.isVisible().catch(() => false)) {
    await aspectRadio.click();
    await human(300, 600);
  }
  const one = radio(/^x1$/i);
  if (await one.isVisible().catch(() => false)) {
    await one.click();
    await human(300, 600);
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  return true;
}

async function findPromptBox(page: Page, tool: RobotTool) {
  if (tool === "chatgpt") {
    const box = page.locator("#prompt-textarea");
    if (await box.count()) return box.first();
  }
  if (tool === "flowmusic") {
    const box = page.locator('textarea[placeholder*="canción"], textarea[placeholder*="song"]');
    if (await box.count()) return box.first();
  }
  const boxes = page.locator(PROMPT_BOX);
  const n = await boxes.count();
  return n ? boxes.nth(n - 1) : null;
}

async function isLoggedOut(page: Page) {
  if (/accounts\.google\.com|auth\.openai\.com|\/login/.test(page.url())) return true;
  const signIn = page.getByRole("button", { name: /^(sign in|log in|iniciar sesión|acceder|entrar)$/i });
  const link = page.getByRole("link", { name: /^(sign in|log in|iniciar sesión|acceder)$/i });
  return (await signIn.count()) + (await link.count()) > 0 && !(await page.locator(PROMPT_BOX).count());
}

/** Fuentes de las imágenes y videos grandes que hay ahora en la página */
async function mediaSources(page: Page, kind: RobotKind): Promise<string[]> {
  return page.evaluate((k) => {
    const out: string[] = [];
    if (k === "music" && /flowmusic\.app/.test(location.host)) {
      // Flow Music: cada canción nueva es un enlace /song/<id>; su audio vive en un .m4a público.
      // Mientras el Producer sigue generando no se entrega nada.
      const busy = [...document.querySelectorAll("button")].some((b) => /stop generating|detener/i.test(b.getAttribute("aria-label") || ""));
      if (busy || /Thinking/.test(document.body.innerText.slice(-4000))) return out;
      const base = (window as unknown as { __tomaClipBase?: string }).__tomaClipBase ?? "https://storage.googleapis.com/producer-app-public/clips/";
      document.querySelectorAll('a[href*="/song/"]').forEach((a) => {
        const id = (a.getAttribute("href") || "").split("/song/")[1]?.split(/[?#/]/)[0];
        if (id) out.push(`${base}${id}.m4a`);
      });
      return [...new Set(out)];
    }
    if (k === "voice" || k === "music") {
      document.querySelectorAll("audio").forEach((a) => {
        const src = a.currentSrc || a.src || a.querySelector("source")?.src || "";
        // Solo audio con cuerpo: AI Studio crea el reproductor antes de terminar de generar
        if (src && a.readyState >= 1 && a.duration > 0.5) out.push(src);
      });
      return out;
    }
    if (k === "video") {
      document.querySelectorAll("video").forEach((v) => {
        const src = v.currentSrc || v.src || v.querySelector("source")?.src || "";
        // Solo videos ya cargables (no marcadores de «generando»)
        if (src && (v.readyState >= 1 || v.duration > 0)) out.push(src);
      });
    } else {
      document.querySelectorAll("img").forEach((img) => {
        const big = Math.max(img.naturalWidth, img.naturalHeight) >= 380 && Math.min(img.naturalWidth, img.naturalHeight) >= 200;
        if (big && img.src && !/gstatic\.com|\/ogw\/|data:image\/svg/.test(img.src)) out.push(img.src);
      });
    }
    return out;
  }, kind);
}

async function download(page: Page, src: string, kind: RobotKind): Promise<{ data: Buffer; mime: string }> {
  if (src.startsWith("http")) {
    const res = await page.context().request.get(src);
    if (res.ok()) return { data: Buffer.from(await res.body()), mime: res.headers()["content-type"] ?? fallbackMime(kind) };
  }
  // blob: o URLs que solo la página puede leer
  const b64 = await page.evaluate(async (u) => {
    const r = await fetch(u);
    const blob = await r.blob();
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { b64: btoa(s), type: blob.type };
  }, src);
  return { data: Buffer.from(b64.b64, "base64"), mime: b64.type || fallbackMime(kind) };
}

const fallbackMime = (kind: RobotKind) => (kind === "video" ? "video/mp4" : kind === "image" ? "image/png" : "audio/mpeg");

/** Abre la miniatura en el visor de Flow y devuelve la imagen más grande que aparezca */
async function fullResolution(page: Page, thumbSrc: string): Promise<string | null> {
  try {
    const area = (src: string) =>
      page.evaluate((u) => {
        const img = [...document.querySelectorAll("img")].find((i) => i.src === u);
        return img ? img.naturalWidth * img.naturalHeight : 0;
      }, src);
    const thumbArea = await area(thumbSrc);
    await page.locator(`img[src="${thumbSrc.replace(/"/g, '\\"')}"]`).first().click();
    await page.waitForTimeout(2500);
    const best = await page.evaluate((min) => {
      let pick: { src: string; a: number } | null = null;
      document.querySelectorAll("img").forEach((i) => {
        const a = i.naturalWidth * i.naturalHeight;
        if (a > min && (!pick || a > pick.a) && !/gstatic\.com|\/ogw\//.test(i.src)) pick = { src: i.src, a };
      });
      return pick ? (pick as { src: string }).src : null;
    }, thumbArea);
    await page.keyboard.press("Escape").catch(() => undefined);
    return best;
  } catch {
    return null;
  }
}

// ---------- Cola de trabajos ----------

const jobs = new Map<string, RobotJob>();
// Una cola por herramienta: Flow, AI Studio, Flow Music y ChatGPT trabajan a la vez, cada uno en su pestaña.
const queues: Partial<Record<RobotTool, string[]>> = {};
const running: Partial<Record<RobotTool, boolean>> = {};

// Flow acepta varias generaciones a la vez: se piden seguidas y se recogen según terminan.
// Este candado evita que dos trabajos toquen la página de Flow en el mismo instante.
let flowChain: Promise<void> = Promise.resolve();
function lockFlow(): Promise<() => void> {
  let unlock!: () => void;
  const next = new Promise<void>((r) => (unlock = r));
  const ready = flowChain.then(() => unlock);
  flowChain = flowChain.then(() => next);
  return ready;
}

const TILE = "flow-grid-tile-container";

/** Estado de la tarjeta de Flow que ocupa el puesto `rank` contando desde la más antigua */
function tileState(page: Page, rank: number, kind: RobotKind) {
  return page.evaluate(
    ([sel, r, k]) => {
      const tiles = [...document.querySelectorAll(sel as string)];
      const t = tiles[tiles.length - (r as number)];
      if (!t) return "missing";
      const img = t.querySelector("img") as HTMLImageElement | null;
      const text = (t.textContent || "").trim();
      if (/\d+\s*%/.test(text)) return "pending";
      if (img && img.naturalWidth > 0 && (k !== "video" || /play_circle|video/i.test(text + (img.alt || "")))) return "ready";
      if (/error|failed|no se pudo|infring|policy/i.test(text)) return "failed";
      return "pending";
    },
    [TILE, rank, kind] as const,
  ) as Promise<"missing" | "pending" | "ready" | "failed">;
}

/** URL del resultado de una tarjeta terminada (el vídeo aparece al pasar el ratón) */
async function tileMedia(page: Page, rank: number, kind: RobotKind): Promise<string | null> {
  const count = await page.locator(TILE).count();
  const tile = page.locator(TILE).nth(count - rank);
  if (kind === "image") {
    const src = await tile.locator("img").first().getAttribute("src");
    return src ? ((await fullResolution(page, src)) ?? src) : null;
  }
  await tile.scrollIntoViewIfNeeded().catch(() => undefined);
  await tile.hover();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(500);
    const src = await tile.evaluate((t) => {
      const v = t.querySelector("video");
      return v ? v.currentSrc || v.src : "";
    });
    if (src) {
      await page.mouse.move(4, 300);
      return src;
    }
  }
  return null;
}

export function getJob(id: string) {
  return jobs.get(id);
}

export function listJobs() {
  return [...jobs.values()].sort((a, b) => a.createdAt - b.createdAt).slice(-50);
}

export function cancelJob(id: string) {
  const j = jobs.get(id);
  if (j && !["done", "error"].includes(j.status)) set(j, "cancelled", "Cancelado");
}

function set(job: RobotJob, status: JobStatus, message: string) {
  job.status = status;
  job.message = message;
}

export function enqueue(tool: RobotTool, kind: RobotKind, prompt: string, aspect: RobotAspect = "9:16"): RobotJob {
  const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const job: RobotJob = { id, tool, kind, aspect, prompt, status: "queued", message: "En cola", createdAt: Date.now() };
  jobs.set(id, job);
  (queues[tool] ??= []).push(id);
  void pump(tool);
  return job;
}

async function pump(tool: RobotTool) {
  if (running[tool]) return;
  running[tool] = true;
  const queue = (queues[tool] ??= []);
  while (queue.length) {
    const job = jobs.get(queue.shift()!);
    if (!job || job.status === "cancelled") continue;
    // La cola avanza en cuanto el trabajo queda pedido (Flow) o cuando termina (el resto)
    await new Promise<void>((next) => {
      runJob(job, next)
        .catch((e) => {
          if ((job.status as JobStatus) !== "cancelled") set(job, "error", e instanceof Error ? e.message.split("\n")[0] : "Error inesperado");
        })
        .finally(next);
    });
    await human(700, 1500); // respiro entre trabajos
  }
  running[tool] = false;
}

const alive = (job: RobotJob) => job.status !== "cancelled";

async function runJob(job: RobotJob, release: () => void) {
  let unlock: (() => void) | null = job.tool === "flow" ? await lockFlow() : null;
  try {
    await runJobLocked(job, () => {
      unlock?.();
      unlock = null;
      release();
    });
  } finally {
    unlock?.();
  }
}

async function runJobLocked(job: RobotJob, release: () => void) {
  job.startedAt = Date.now();
  set(job, "opening", `Abriendo ${TOOL_NAME[job.tool]}…`);
  const page = await toolPage(job.tool, true);
  await page.waitForLoadState("domcontentloaded");
  await human();

  // 1. Sesión iniciada (la inicia el creador, nunca Toma)
  if (await isLoggedOut(page)) {
    set(job, "login", "Inicia sesión en la ventana de Chrome que abrió Toma. Te espero.");
    await page.bringToFront();
    const until = Date.now() + 10 * 60_000;
    while (alive(job) && Date.now() < until && (await isLoggedOut(page))) await sleep(2000);
    if (!alive(job)) return;
    if (await isLoggedOut(page)) throw new Error("No se inició sesión a tiempo.");
  }

  // 2. Campo del prompt (en Flow puede hacer falta abrir un proyecto)
  let box = await findPromptBox(page, job.tool);
  if (!box && job.tool === "flow") {
    // Desde la presentación de Flow hasta un proyecto con campo de prompt
    const steps = [
      /^(crear con google flow|create with google flow|probar en google flow|try in google flow|try flow|probar flow)$/i,
      /new project|nuevo proyecto|create project|crear proyecto/i,
    ];
    for (const name of steps) {
      if (box || !alive(job)) break;
      const target = page.getByRole("link", { name }).or(page.getByRole("button", { name })).first();
      if (await target.count()) {
        await target.click().catch(() => undefined);
        await page.waitForLoadState("domcontentloaded").catch(() => undefined);
        await page.waitForTimeout(3000);
        if (await isLoggedOut(page)) {
          set(job, "login", "Inicia sesión en la ventana de Chrome que abrió Toma. Te espero.");
          const until = Date.now() + 10 * 60_000;
          while (alive(job) && Date.now() < until && (await isLoggedOut(page))) await sleep(2000);
        }
        box = await findPromptBox(page, job.tool);
      }
    }
  }
  if (box && job.tool === "flow") {
    set(job, "typing", job.kind === "video" ? `Ajustando Flow: vídeo ${job.aspect}, una toma…` : `Ajustando Flow: imagen ${job.aspect}, una toma…`);
    await configureFlow(page, job.kind, job.aspect).catch(() => false);
    box = await findPromptBox(page, job.tool);
  }
  if (!box && job.tool === "aistudio") {
    const create = page.getByText(/create new dialog|crear nuevo diálogo/i).first();
    if (await create.count()) {
      await create.click().catch(() => undefined);
      await page.waitForTimeout(2500);
      const area = page.locator("textarea:visible").first();
      box = (await area.count()) ? area : null;
    }
  }
  const before = new Set(await mediaSources(page, job.kind));
  const tilesBefore = job.tool === "flow" ? await page.locator(TILE).count() : 0;
  let submitted = false;

  if (box) {
    set(job, "typing", "Escribiendo el prompt…");
    await box.click();
    await human(300, 700);
    await box.fill("");
    const text = job.tool === "chatgpt" ? `Genera esta imagen (solo la imagen, sin texto de respuesta):\n\n${job.prompt}` : job.prompt;
    await box.fill(text);
    await human(600, 1400);
    const button =
      job.tool === "chatgpt"
        ? page.locator('[data-testid="send-button"]')
        : job.tool === "aistudio"
          ? page.getByRole("button", { name: /^run/i })
          : job.tool === "flowmusic"
            ? page.getByRole("button", { name: /send message|enviar mensaje/i })
            : page.getByRole("button", { name: SUBMIT_LABEL });
    if (await button.count()) {
      await button.last().click().catch(() => undefined);
      submitted = true;
    } else {
      await box.press("Enter");
      submitted = true;
    }
  }
  if (!alive(job)) return;
  set(
    job,
    submitted ? "generating" : "assist",
    submitted
      ? `${TOOL_NAME[job.tool]} está generando…`
      : "No encontré el campo del prompt. Pega el prompt y pulsa generar en la ventana; yo recojo el resultado.",
  );

  // En Flow, la tarjeta nueva identifica este trabajo: se suelta la página para pedir el siguiente
  let rank = 0;
  if (submitted && job.tool === "flow") {
    for (let i = 0; i < 24 && !rank; i++) {
      await sleep(500);
      const n = await page.locator(TILE).count();
      if (n > tilesBefore) rank = n;
    }
    if (rank) release();
  }

  // 3. Esperar el resultado nuevo (si en 60 s no arranca, pedir ayuda pero seguir mirando)
  const limit = Date.now() + (job.kind === "video" || job.kind === "music" ? 10 : 4) * 60_000;
  let found: string | null = null;
  let lastSeen: string | null = null;
  let stableSince = 0;
  while (alive(job) && Date.now() < limit) {
    await sleep(rank ? 2000 : 3000);
    if (rank) {
      const state = await tileState(page, rank, job.kind).catch(() => "pending" as const);
      if (state === "failed") throw new Error("Flow no pudo generar esta escena. Prueba a cambiar el prompt.");
      if (state === "ready") {
        const unlock = await lockFlow();
        try {
          set(job, "downloading", "Descargando el resultado…");
          found = await tileMedia(page, rank, job.kind);
        } finally {
          unlock();
        }
        if (found) break;
        set(job, "generating", "Flow está generando…");
      }
      const s = Math.round((Date.now() - job.startedAt) / 1000);
      if (job.status === "generating") job.message = `Flow está generando… ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
      continue;
    }
    const now = await mediaSources(page, job.kind).catch(() => [] as string[]);
    const fresh = now.filter((s) => !before.has(s));
    const candidate = (job.kind === "music" ? fresh[0] : fresh[fresh.length - 1]) ?? null;
    if (candidate) {
      // ChatGPT muestra vistas previas que cambian: esperar a que la imagen se quede quieta
      if (candidate !== lastSeen) {
        lastSeen = candidate;
        stableSince = Date.now();
      } else if (Date.now() - stableSince > (job.kind === "video" ? 2000 : 7000)) {
        found = candidate;
        break;
      }
    }
    const secs = Math.round((Date.now() - job.startedAt) / 1000);
    const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
    if (job.status === "generating") {
      job.message =
        secs > 90 && !candidate
          ? `Sigo esperando (${clock}). Si en la ventana no se está generando nada, pulsa generar tú; yo recojo el resultado.`
          : `${TOOL_NAME[job.tool]} está generando… ${clock}`;
    }
  }
  if (!alive(job)) return;
  if (!found) throw new Error("No apareció ningún resultado nuevo a tiempo. Revisa la ventana de Chrome.");

  // 4. En Flow la cuadrícula muestra miniaturas: abrir el resultado para coger la versión grande
  set(job, "downloading", "Descargando el resultado…");
  if (job.tool === "flow" && job.kind === "image" && !rank) found = (await fullResolution(page, found)) ?? found;
  const { data, mime } = await download(page, found, job.kind);
  // Flow Music reproduce la canción nueva sola: pausarla para que no suene en tu equipo
  if (job.tool === "flowmusic") {
    const pause = page.getByRole("button", { name: /^(pause|pausar) /i });
    for (let i = 0; i < (await pause.count()); i++) await pause.nth(i).click().catch(() => undefined);
  }
  mkdirSync(OUT, { recursive: true });
  const isAudio = job.kind === "voice" || job.kind === "music";
  const ext = isAudio
    ? mime.includes("wav") ? "wav" : mime.includes("ogg") ? "ogg" : mime.includes("webm") ? "webm" : mime.includes("mp4") || mime.includes("aac") ? "m4a" : "mp3"
    : mime.includes("webm") ? "webm" : mime.includes("mp4") || job.kind === "video" ? "mp4" : mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
  const file = path.join(OUT, `${job.id}.${ext}`);
  writeFileSync(file, data);
  job.file = file;
  job.mime = mime.split(";")[0];
  set(job, "done", "¡Listo!");
}
