// Motor de render: dibuja cualquier instante t de un proyecto en un canvas.
import { loadMedia, mediaElement } from "../lib/media";
import { THEME_DEFS, type ThemeDef } from "../lib/presets";
import type { Actor, Project, Scene } from "../types";
import { LIGHT_BACKGROUNDS, drawBackground, hash } from "./backgrounds";

type Ctx = CanvasRenderingContext2D;

export const TRANSITION_TIME = 0.7;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOutCubic = (x: number) => {
  x = clamp01(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
const easeOutBack = (x: number) => {
  x = clamp01(x);
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

// ---------- Recursos ----------

/** Carga imágenes y clips importados de todas las escenas */
export function loadSceneMedia(project: Project) {
  return Promise.all(project.scenes.filter((s) => s.media).map((s) => loadMedia(s.media!)));
}

// Los clips corren solos mientras se reproduce; en pausa se colocan en el fotograma exacto.
let livePlayback = false;
export function setLivePlayback(on: boolean) {
  livePlayback = on;
}
let videosThisFrame = new Set<HTMLVideoElement>();
let videosLastFrame = new Set<HTMLVideoElement>();

function syncVideo(v: HTMLVideoElement, local: number) {
  videosThisFrame.add(v);
  const d = v.duration;
  if (!d || !isFinite(d)) return;
  const target = local % d;
  if (livePlayback) {
    if (v.paused) void v.play().catch(() => undefined);
    const drift = Math.abs(v.currentTime - target);
    if (drift > 0.35 && drift < d - 0.35) v.currentTime = target;
  } else {
    if (!v.paused) v.pause();
    if (Math.abs(v.currentTime - target) > 0.04) v.currentTime = target;
  }
}

let fontsReady: Promise<unknown> | null = null;
export function ensureFonts() {
  fontsReady ??= Promise.all(
    [
      '600 40px "Fraunces"',
      'italic 500 40px "Fraunces"',
      '700 40px "Plus Jakarta Sans"',
      '800 40px "Plus Jakarta Sans"',
      '600 40px "Plus Jakarta Sans"',
    ].map((f) => document.fonts.load(f).catch(() => null)),
  );
  return fontsReady;
}

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const emojiCache = new Map<string, HTMLCanvasElement>();
function emojiSprite(emoji: string, px: number) {
  const size = Math.max(16, Math.round(px / 8) * 8);
  const key = `${emoji}@${size}`;
  let c = emojiCache.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = c.height = Math.ceil(size * 1.3);
    const x = c.getContext("2d")!;
    x.font = `${size}px ${EMOJI_FONT}`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(emoji, c.width / 2, c.height / 2 + size * 0.06);
    emojiCache.set(key, c);
  }
  return c;
}

let grain: HTMLCanvasElement | null = null;
function grainPattern(ctx: Ctx) {
  if (!grain) {
    grain = document.createElement("canvas");
    grain.width = grain.height = 160;
    const g = grain.getContext("2d")!;
    const d = g.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
  }
  return ctx.createPattern(grain, "repeat")!;
}

const layers = new Map<string, HTMLCanvasElement>();
function layer(W: number, H: number, slot: string) {
  const key = `${slot}:${W}x${H}`;
  let c = layers.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    layers.set(key, c);
  }
  return c;
}

// ---------- Línea de tiempo ----------

export function sceneStarts(scenes: Scene[]) {
  const starts: number[] = [];
  let acc = 0;
  for (const s of scenes) {
    starts.push(acc);
    acc += s.duration;
  }
  return { starts, total: acc };
}

export function sceneIndexAt(scenes: Scene[], t: number) {
  const { starts } = sceneStarts(scenes);
  for (let i = starts.length - 1; i >= 0; i--) if (t >= starts[i]) return i;
  return 0;
}

// ---------- Dibujo de escena ----------

function drawCover(ctx: Ctx, el: HTMLImageElement | HTMLVideoElement, W: number, H: number) {
  const iw = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth;
  const ih = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
  if (!iw || !ih) return false;
  const s = Math.max(W / iw, H / ih);
  const w = iw * s,
    h = ih * s;
  ctx.drawImage(el, (W - w) / 2, (H - h) / 2, w, h);
  return true;
}

function actorTransform(a: Actor, i: number, local: number, W: number, H: number) {
  const u = Math.min(W, H);
  const delay = 0.15 + i * 0.18;
  const appear = easeOutBack((local - delay) / 0.6);
  let x = a.x * W,
    y = a.y * H,
    rot = 0,
    scale = appear,
    alpha = clamp01((local - delay) / 0.25);
  const ph = i * 1.7;
  switch (a.motion) {
    case "float":
      y += Math.sin(local * 1.6 + ph) * u * 0.018;
      rot = Math.sin(local * 1.1 + ph) * 0.06;
      break;
    case "bounce": {
      const b = Math.abs(Math.sin(local * 3.2 + ph));
      y -= b * u * 0.06;
      scale *= 1 + (1 - b) * 0.04;
      break;
    }
    case "enter-left":
    case "enter-right": {
      const k = easeOutCubic((local - delay) / 1.3);
      const from = a.motion === "enter-left" ? -0.25 * W : W * 1.25;
      x = from + (x - from) * k;
      y += Math.abs(Math.sin(local * 6)) * u * 0.012 * (1 - k * 0.7);
      scale = Math.min(1, appear + 0.6);
      alpha = clamp01((local - delay) / 0.1);
      break;
    }
    case "rise": {
      const k = easeOutCubic((local - delay) / 1.4);
      y = H * 1.15 + (y - H * 1.15) * k + Math.sin(local * 1.4) * u * 0.01;
      scale = 1;
      alpha = clamp01((local - delay) / 0.2);
      break;
    }
    case "pulse":
      scale *= 1 + Math.sin(local * 4 + ph) * 0.07;
      break;
    case "orbit":
      x += Math.cos(local * 1.3 + ph) * W * 0.1;
      y += Math.sin(local * 1.3 + ph) * H * 0.04;
      rot = Math.cos(local * 1.3 + ph) * 0.12;
      break;
    case "sway":
      rot = Math.sin(local * 2 + ph) * 0.2;
      break;
  }
  return { x, y, rot, scale, alpha };
}

function drawActors(ctx: Ctx, scene: Scene, local: number, W: number, H: number) {
  const u = Math.min(W, H);
  scene.actors.forEach((a, i) => {
    const px = u * (a.size === "s" ? 0.1 : a.size === "m" ? 0.16 : 0.24);
    const tr = actorTransform(a, i, local, W, H);
    if (tr.alpha <= 0 || tr.scale <= 0.01) return;
    // Sombra suave
    ctx.globalAlpha = tr.alpha * 0.16;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(tr.x, a.y * H + px * 0.55, px * 0.42 * tr.scale, px * 0.08 * tr.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    const sprite = emojiSprite(a.emoji, px);
    ctx.globalAlpha = tr.alpha;
    ctx.save();
    ctx.translate(tr.x, tr.y);
    ctx.rotate(tr.rot);
    ctx.scale(tr.scale, tr.scale);
    const d = px * 1.3;
    ctx.drawImage(sprite, -d / 2, -d / 2, d, d);
    ctx.restore();
    ctx.globalAlpha = 1;
  });
}

interface WordBox {
  word: string;
  x: number;
  y: number;
  w: number;
}

function layoutWords(ctx: Ctx, text: string, maxW: number, lineH: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const space = ctx.measureText(" ").width;
  const lines: WordBox[][] = [[]];
  let lineW = 0;
  for (const word of words) {
    const w = ctx.measureText(word).width;
    if (lineW > 0 && lineW + space + w > maxW) {
      lines.push([]);
      lineW = 0;
    }
    lines[lines.length - 1].push({ word, x: lineW + (lineW > 0 ? space : 0), y: 0, w });
    lineW += (lineW > 0 ? space : 0) + w;
  }
  const out: WordBox[] = [];
  const widths: number[] = [];
  lines.forEach((line, li) => {
    const lw = line.length ? line[line.length - 1].x + line[line.length - 1].w : 0;
    widths.push(lw);
    for (const b of line) out.push({ ...b, x: b.x - lw / 2, y: li * lineH });
  });
  return { boxes: out, lines: lines.length, widths };
}

function drawHeadline(ctx: Ctx, scene: Scene, local: number, W: number, H: number, theme: ThemeDef) {
  if (!scene.headline.trim()) return;
  const u = Math.min(W, H);
  const dark = LIGHT_BACKGROUNDS[scene.background] && !scene.media;
  const ink = dark ? "#2a2238" : theme.ink;
  const style = scene.textStyle;
  const size = u * (style === "title" ? 0.11 : style === "caption" ? 0.082 : 0.074);
  const font =
    style === "quote"
      ? `italic 500 ${size}px "${theme.display}"`
      : style === "title"
        ? `${theme.display === "Fraunces" ? 600 : 800} ${size}px "${theme.display}"`
        : `700 ${size}px "${theme.body}"`;
  ctx.font = font;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const lineH = size * 1.12;
  const { boxes, lines, widths } = layoutWords(ctx, scene.headline, W * 0.8, lineH);
  const cx = W / 2;
  const blockH = lines * lineH;
  const cy = H * (H > W ? 0.33 : 0.34) - blockH / 2 + size * 0.8;

  // Halo suave detrás del bloque de texto para garantizar contraste
  if (!dark) {
    const k = Math.min(1, (blockH + size * 3) / (W * 1.1));
    ctx.save();
    ctx.translate(cx, cy + blockH / 2 - size * 0.7);
    ctx.scale(1, k);
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.6);
    halo.addColorStop(0, "rgba(10,5,30,0.24)");
    halo.addColorStop(1, "rgba(10,5,30,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(-W * 0.6, -W * 0.6, W * 1.2, W * 1.2);
    ctx.restore();
  }
  ctx.shadowColor = dark ? "rgba(255,255,255,0.4)" : "rgba(10,5,30,0.55)";
  ctx.shadowBlur = size * 0.35;
  ctx.shadowOffsetY = size * 0.05;
  boxes.forEach((b, i) => {
    const k = easeOutCubic((local - 0.25 - i * 0.07) / 0.55);
    if (k <= 0) return;
    ctx.globalAlpha = k;
    ctx.fillStyle = ink;
    ctx.fillText(b.word, cx + b.x, cy + b.y + (1 - k) * size * 0.45);
  });
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = 1;

  const doneAt = 0.25 + boxes.length * 0.07 + 0.2;
  if (style === "title") {
    const k = easeInOutCubic((local - doneAt) / 0.6);
    const lw = Math.min(widths[widths.length - 1] ?? 0, W * 0.5) * 0.5;
    ctx.fillStyle = dark ? "#ff7a7a" : theme.accent;
    const y = cy + (lines - 1) * lineH + size * 0.32;
    roundRect(ctx, cx - (lw * k) / 2, y, lw * k, size * 0.09, size * 0.045);
    ctx.fill();
  } else if (style === "quote") {
    const k = easeOutCubic((local - 0.1) / 0.6);
    ctx.globalAlpha = k * 0.9;
    ctx.fillStyle = dark ? "#ff7a7a" : theme.accent;
    ctx.font = `600 ${size * 2.2}px "Fraunces"`;
    ctx.textAlign = "center";
    ctx.fillText("“", cx, cy - size * 0.75);
    ctx.globalAlpha = 1;
  }
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(0, w), h, Math.min(r, h / 2));
}

function drawScene(ctx: Ctx, scene: Scene, local: number, W: number, H: number, theme: ThemeDef) {
  const seed = hash(scene.id);
  const q = easeInOutCubic(local / Math.max(scene.duration + TRANSITION_TIME, 0.1));
  let s = 1.06,
    tx = 0;
  switch (scene.camera) {
    case "zoom-in":
      s = 1.02 + 0.1 * q;
      break;
    case "zoom-out":
      s = 1.12 - 0.1 * q;
      break;
    case "pan-left":
      s = 1.12;
      tx = W * 0.05 * (1 - 2 * q);
      break;
    case "pan-right":
      s = 1.12;
      tx = -W * 0.05 * (1 - 2 * q);
      break;
    case "still":
      s = 1.02;
      break;
  }
  ctx.save();
  ctx.translate(W / 2 + tx, H / 2);
  ctx.scale(s, s);
  ctx.translate(-W / 2, -H / 2);
  const el = scene.media ? mediaElement(scene.media.id) : undefined;
  if (el instanceof HTMLVideoElement) syncVideo(el, local);
  if (el && drawCover(ctx, el, W, H)) {
    const shade = ctx.createLinearGradient(0, 0, 0, H);
    shade.addColorStop(0, "rgba(0,0,0,0.35)");
    shade.addColorStop(0.45, "rgba(0,0,0,0.05)");
    shade.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, W, H);
  } else {
    drawBackground(ctx, scene.background, W, H, local, seed);
  }
  if (!(scene.media && scene.hideActors)) drawActors(ctx, scene, local, W, H);
  ctx.restore();

  if (theme.tintAlpha > 0) {
    ctx.globalAlpha = theme.tintAlpha;
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = theme.tint;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
  drawHeadline(ctx, scene, local, W, H, theme);
}

const DANGLING = /^(de|del|la|el|los|las|un|una|y|o|para|por|en|con|a|al|que|qué|sobre|su|sus|tu|tus|mi|mis|nuestra|nuestro|the|a|an|of|to|and|in|on|for)$/i;

/** Parte la narración en subtítulos por frases (máx. ~7 palabras), sin dejar artículos o preposiciones colgando */
export function captionChunks(text: string, max = 7) {
  const clauses = text.match(/[^,.;:!?¿¡]+[,.;:!?]*/g)?.map((c) => c.trim()).filter(Boolean) ?? [text];
  const out: string[][] = [];
  for (const clause of clauses) {
    const words = clause.split(/\s+/).filter(Boolean);
    const parts = Math.ceil(words.length / max);
    const per = Math.ceil(words.length / parts);
    for (let i = 0; i < words.length; i += per) out.push(words.slice(i, i + per));
  }
  // Une frases muy cortas con la siguiente y mueve palabras colgantes al trozo siguiente
  for (let i = 0; i < out.length - 1; i++) {
    while (out[i].length > 1 && DANGLING.test(out[i][out[i].length - 1].replace(/[,.;:!?]/g, ""))) out[i + 1].unshift(out[i].pop()!);
    if (out[i].length + out[i + 1].length <= 4) {
      out[i + 1] = [...out[i], ...out[i + 1]];
      out[i] = [];
    }
  }
  return out.filter((c) => c.length).map((c) => c.join(" "));
}

function drawCaptions(ctx: Ctx, scene: Scene, local: number, W: number, H: number, theme: ThemeDef) {
  const text = scene.narration.trim();
  if (!text) return;
  const chunks = captionChunks(text);
  const span = Math.max(0.5, scene.duration - 0.2);
  const ci = Math.min(chunks.length - 1, Math.floor((clamp01((local - 0.2) / span) * chunks.length)));
  const chunk = chunks[Math.max(0, ci)];
  const u = Math.min(W, H);
  const size = u * 0.042;
  ctx.font = `600 ${size}px "${theme.body}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const tw = Math.min(ctx.measureText(chunk).width, W * 0.86);
  const padX = size * 0.8,
    padY = size * 0.55;
  const y = H * (H > W ? 0.865 : 0.86);
  const k = easeOutCubic((local - 0.2) / 0.3);
  ctx.globalAlpha = k;
  ctx.fillStyle = theme.pill;
  roundRect(ctx, W / 2 - tw / 2 - padX, y - size / 2 - padY, tw + padX * 2, size + padY * 2, size);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(chunk, W / 2, y + size * 0.04, W * 0.86);
  ctx.globalAlpha = 1;
}

function drawFinish(ctx: Ctx, W: number, H: number) {
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.globalCompositeOperation = "overlay";
  const p = grainPattern(ctx);
  ctx.translate((Math.random() * 160) | 0, (Math.random() * 160) | 0);
  ctx.fillStyle = p;
  ctx.fillRect(-160, -160, W + 320, H + 320);
  ctx.restore();
}

// ---------- Frame completo ----------

export function renderFrame(ctx: Ctx, project: Project, t: number, opts: { grain?: boolean } = {}) {
  const W = ctx.canvas.width,
    H = ctx.canvas.height;
  const theme = THEME_DEFS[project.theme];
  const scenes = project.scenes;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#0b0a12";
  ctx.fillRect(0, 0, W, H);
  if (!scenes.length) return;

  const { starts } = sceneStarts(scenes);
  const i = sceneIndexAt(scenes, t);
  const scene = scenes[i];
  const local = t - starts[i];

  const inTransition = i > 0 && local < TRANSITION_TIME;
  if (!inTransition) {
    drawScene(ctx, scene, local, W, H, theme);
  } else {
    const prev = scenes[i - 1];
    drawScene(ctx, prev, prev.duration + local, W, H, theme);
    const p = easeInOutCubic(local / TRANSITION_TIME);
    const lc = layer(W, H, "next");
    const lctx = lc.getContext("2d")!;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, W, H);
    drawScene(lctx, scene, local, W, H, theme);
    ctx.save();
    switch (scene.transition) {
      case "fade":
        ctx.globalAlpha = p;
        ctx.drawImage(lc, 0, 0);
        break;
      case "slide":
        ctx.fillStyle = "rgba(0,0,0," + 0.25 * p + ")";
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(lc, (1 - p) * W, 0);
        break;
      case "zoom": {
        const s = 1.25 - 0.25 * p;
        ctx.globalAlpha = p;
        ctx.translate(W / 2, H / 2);
        ctx.scale(s, s);
        ctx.drawImage(lc, -W / 2, -H / 2);
        break;
      }
      case "wipe": {
        const r = Math.hypot(W, H) * 0.55 * p;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, Math.max(1, r), 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(lc, 0, 0);
        break;
      }
    }
    ctx.restore();
  }

  if (project.captions) drawCaptions(ctx, scene, local, W, H, theme);
  if (opts.grain !== false) drawFinish(ctx, W, H);

  // Pausar los clips de escenas que ya no están en pantalla
  for (const v of videosLastFrame) if (!videosThisFrame.has(v) && !v.paused) v.pause();
  videosLastFrame = videosThisFrame;
  videosThisFrame = new Set();

  // Fundido de entrada y salida del video
  const total = starts[starts.length - 1] + scenes[scenes.length - 1].duration;
  const edge = Math.min(clamp01(t / 0.35), clamp01((total - t) / 0.45));
  if (edge < 1) {
    ctx.fillStyle = `rgba(8,6,14,${1 - edge})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Miniatura de una escena (para listas y biblioteca) */
export function renderThumb(canvas: HTMLCanvasElement, project: Project, sceneIndex: number) {
  const ctx = canvas.getContext("2d")!;
  const { starts } = sceneStarts(project.scenes);
  const s = project.scenes[sceneIndex];
  if (!s) return;
  renderFrame(ctx, project, starts[sceneIndex] + Math.min(s.duration * 0.7, 2.6), { grain: false });
}
