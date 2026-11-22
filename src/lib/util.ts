import {
  ACTOR_SIZES,
  BACKGROUNDS,
  CAMERAS,
  MOTIONS,
  MUSIC,
  TEXT_STYLES,
  THEMES,
  TRANSITIONS,
  type Actor,
  type Scene,
  type StoryDraft,
} from "../types";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Limpia y acota lo que llegue de la IA para que el motor nunca falle. */
export function normalizeScene(s: Partial<Scene>, i = 0): Omit<Scene, "id"> {
  const actors: Actor[] = (Array.isArray(s.actors) ? s.actors : []).slice(0, 4).map((a, j) => ({
    emoji: typeof a?.emoji === "string" && a.emoji.trim() ? [...a.emoji.trim()].slice(0, 4).join("") : "✨",
    motion: pick(a?.motion, MOTIONS, "float"),
    size: pick(a?.size, ACTOR_SIZES, "m"),
    x: clamp(Number(a?.x ?? 0.3 + j * 0.2) || 0.5, 0.05, 0.95),
    y: clamp(Number(a?.y ?? 0.68) || 0.68, 0.05, 0.95),
  }));
  return {
    headline: String(s.headline ?? "").slice(0, 90),
    narration: String(s.narration ?? "").slice(0, 400),
    duration: clamp(Number(s.duration) || 4, 1.5, 15),
    background: pick(s.background, BACKGROUNDS, BACKGROUNDS[i % BACKGROUNDS.length]),
    actors,
    camera: pick(s.camera, CAMERAS, "zoom-in"),
    transition: pick(s.transition, TRANSITIONS, "fade"),
    textStyle: pick(s.textStyle, TEXT_STYLES, i === 0 ? "title" : "caption"),
    visualPrompt: String(s.visualPrompt ?? "").slice(0, 800),
    ...(s.media ? { media: s.media } : {}),
    ...(s.hideActors ? { hideActors: true } : {}),
  };
}

export function normalizeDraft(d: Partial<StoryDraft>): StoryDraft {
  const scenes = (Array.isArray(d.scenes) ? d.scenes : []).slice(0, 20).map((s, i) => normalizeScene(s, i));
  return {
    title: String(d.title || "Historia sin título").slice(0, 80),
    theme: pick(d.theme, THEMES, "suave"),
    music: pick(d.music, MUSIC, "calma"),
    styleGuide: String(d.styleGuide ?? "").slice(0, 1200),
    scenes,
  };
}

export const totalDuration = (scenes: Scene[]) => scenes.reduce((a, s) => a + s.duration, 0);

export function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "video"
  );
}
