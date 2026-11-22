// Ejecuta las animaciones escritas por la IA sin darles acceso a nada.
// El código corre en un worker dentro de un iframe aislado (sin origen, sin red, sin DOM de Toma):
// solo recibe el tiempo y devuelve una imagen del fotograma.

const HELPERS = `
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const h = {
  clamp,
  lerp: (a, b, k) => a + (b - a) * k,
  prog: (t, start, dur) => clamp((t - start) / Math.max(dur, 0.0001)),
  ease: (x) => 1 - Math.pow(1 - clamp(x), 3),
  easeInOut: (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
  easeOutBack: (x) => { x = clamp(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  rand: (seed) => { const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); },
};
`;

const WORKER = `
${HELPERS}
const fns = new Map();
const NL = String.fromCharCode(10);
let canvas = null;
onmessage = (e) => {
  const { key, code, t, W, H, D } = e.data;
  try {
    let fn = fns.get(code);
    if (!fn) { fn = new Function("ctx", "t", "W", "H", "D", "h", "const u = Math.min(W, H) / 100; return (function () {" + NL + code + NL + "})();"); fns.set(code, fn); }
    if (!canvas || canvas.width !== W || canvas.height !== H) canvas = new OffscreenCanvas(W, H);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0; ctx.filter = "none";
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    ctx.save();
    fn(ctx, t, W, H, D, h);
    ctx.restore();
    const bmp = canvas.transferToImageBitmap();
    postMessage({ key, bmp }, [bmp]);
  } catch (err) {
    postMessage({ key, error: String(err && err.message || err).slice(0, 200) });
  }
};
`;

const FRAME = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:"><script>
const SRC = ${JSON.stringify(WORKER)};
let worker = null, busy = null, timer = 0, queue = new Map();
function boot() { worker = new Worker(URL.createObjectURL(new Blob([SRC], { type: "text/javascript" }))); worker.onmessage = done; }
function done(e) { clearTimeout(timer); busy = null; parent.postMessage(e.data, "*", e.data.bmp ? [e.data.bmp] : []); next(); }
function next() {
  if (busy || !queue.size) return;
  const [key, job] = queue.entries().next().value; queue.delete(key);
  busy = job; worker.postMessage(job);
  // Un bucle infinito en el código generado no cuelga la app: se corta el worker
  timer = setTimeout(() => { worker.terminate(); boot(); const k = busy.key; busy = null; parent.postMessage({ key: k, error: "La animación tardó demasiado en dibujarse." }, "*"); next(); }, 2500);
}
boot();
onmessage = (e) => { queue.set(e.data.key, e.data); next(); };
<\/script>`;

interface Slot {
  bmp: ImageBitmap | null;
  asked: string;
  error?: string;
}

const slots = new Map<string, Slot>();
const errors = new Map<string, string>(); // por código
const listeners = new Set<() => void>();
let frame: HTMLIFrameElement | null = null;

/** Avisa cuando llega un fotograma pedido para una imagen fija (miniaturas, pausa) */
export function onCodeFrame(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

function ensureFrame() {
  if (frame) return frame;
  frame = document.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts"); // sin allow-same-origin: origen opaco
  frame.style.display = "none";
  frame.srcdoc = FRAME;
  document.body.appendChild(frame);
  window.addEventListener("message", (e) => {
    if (!frame || e.source !== frame.contentWindow) return;
    const { key, bmp, error } = e.data as { key: string; bmp?: ImageBitmap; error?: string };
    const slot = slots.get(key);
    if (!slot) return bmp?.close();
    if (bmp) {
      slot.bmp?.close();
      slot.bmp = bmp;
      slot.error = undefined;
    } else if (error) slot.error = error;
    const code = codeOf.get(key);
    if (code) error ? errors.set(code, error) : errors.delete(code);
    if (stillKeys.delete(key)) listeners.forEach((f) => f());
  });
  return frame;
}

const codeOf = new Map<string, string>();
const stillKeys = new Set<string>();
let ready = false;

/**
 * Pide el fotograma del instante t y devuelve el último disponible (puede ir un fotograma por detrás).
 * `still` marca peticiones de imagen fija, que avisan al llegar para redibujar.
 */
export function codeFrame(id: string, code: string, t: number, W: number, H: number, D: number, still: boolean): ImageBitmap | null {
  const f = ensureFrame();
  const key = `${id}@${W}x${H}${still ? "s" : ""}`;
  let slot = slots.get(key);
  if (!slot) slots.set(key, (slot = { bmp: null, asked: "" }));
  const ask = `${t.toFixed(3)}|${code.length}|${code.slice(0, 40)}`;
  if (ask !== slot.asked) {
    const send = () => {
      slot!.asked = ask;
      codeOf.set(key, code);
      if (still) stillKeys.add(key);
      f.contentWindow?.postMessage({ key, code, t, W, H, D }, "*");
    };
    if (ready) send();
    else
      f.addEventListener(
        "load",
        () => {
          ready = true;
          send();
        },
        { once: true },
      );
  }
  return slot.bmp;
}

/** Prueba una animación en varios instantes y devuelve el primer error, o null si dibuja bien */
export async function testCode(code: string, D: number): Promise<string | null> {
  const f = ensureFrame();
  if (!ready) await new Promise<void>((r) => f.addEventListener("load", () => ((ready = true), r()), { once: true }));
  for (const t of [0.05, D * 0.5, D + 0.5]) {
    const key = `test-${Math.random().toString(36).slice(2)}`;
    const error = await new Promise<string | null>((resolve) => {
      const done = (e: MessageEvent) => {
        if (e.source !== f.contentWindow || e.data?.key !== key) return;
        window.removeEventListener("message", done);
        e.data.bmp?.close();
        resolve(e.data.error ?? null);
      };
      window.addEventListener("message", done);
      f.contentWindow?.postMessage({ key, code, t, W: 270, H: 480, D }, "*");
      setTimeout(() => resolve(null), 6000);
    });
    if (error) return error;
  }
  return null;
}

/** Error al ejecutar el código de una escena, si lo hubo */
export const codeError = (code: string) => errors.get(code);
