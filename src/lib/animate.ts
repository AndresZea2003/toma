// Estilos animados por IA: lista de la biblioteca y generación de la animación de cada escena.
import { create } from "zustand";
import { testCode } from "../engine/sandbox";
import { useStore } from "../store";

export interface StyleInfo {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
}

interface AnimState {
  styles: StyleInfo[];
  /** Estado por escena mientras la IA escribe su animación */
  working: Record<string, "working" | "error">;
  loadStyles: () => Promise<void>;
  set: (sceneId: string, s: "working" | "error" | null) => void;
}

export const useAnim = create<AnimState>((set) => ({
  styles: [],
  working: {},
  loadStyles: async () => {
    try {
      const styles = (await fetch("/api/styles").then((r) => r.json())) as StyleInfo[];
      if (Array.isArray(styles)) set({ styles });
    } catch {
      /* sin servidor: solo el estilo clásico */
    }
  },
  set: (sceneId, s) =>
    set((st) => {
      const working = { ...st.working };
      if (s) working[sceneId] = s;
      else delete working[sceneId];
      return { working };
    }),
}));

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(body as object), ai: useStore.getState().ai }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.code === "no_key" ? "Los estilos animados necesitan IA: elige Claude Code o Codex en el chip de IA, o pon tu clave." : (data.error ?? `Error ${res.status}`));
  return data as T;
}

/** La IA escribe (o reescribe) la animación de una escena */
export async function animateScene(projectId: string, sceneId: string, opts: { instruction?: string; error?: string; repaired?: boolean } = {}) {
  const st = useStore.getState();
  const project = st.projects.find((p) => p.id === projectId);
  const index = project?.scenes.findIndex((s) => s.id === sceneId) ?? -1;
  if (!project?.styleId || index < 0) return false;
  const scene = project.scenes[index];
  const prev = project.scenes[index - 1];
  const { set } = useAnim.getState();
  set(sceneId, "working");
  try {
    const { code } = await post<{ code: string }>("/api/scene-code", {
      styleId: project.styleId,
      title: project.title,
      idea: project.idea,
      language: project.language,
      format: project.format,
      styleGuide: project.styleGuide,
      index,
      total: project.scenes.length,
      scene: { headline: scene.headline, narration: scene.narration, visualPrompt: scene.visualPrompt, duration: scene.duration },
      previous: prev ? `${prev.headline} — ${prev.visualPrompt}` : undefined,
      currentCode: opts.instruction || opts.error ? scene.code : undefined,
      error: opts.error,
      instruction: opts.instruction,
    });
    // Probarla antes de darla por buena; si falla, la IA la corrige una vez con el error en la mano
    const final = code;
    const broken = opts.repaired ? null : await testCode(code, scene.duration);
    useStore.getState().updateScene(projectId, sceneId, { code: final });
    if (broken) return animateScene(projectId, sceneId, { error: broken, repaired: true });
    set(sceneId, null);
    return true;
  } catch (e) {
    set(sceneId, "error");
    useStore.getState().toast(e instanceof Error ? e.message : "No se pudo animar la escena", "error");
    return false;
  }
}

/** Anima todas las escenas sin animación, varias a la vez */
export async function animateAll(projectId: string) {
  const project = useStore.getState().projects.find((p) => p.id === projectId);
  if (!project?.styleId) return;
  const pending = project.scenes.filter((s) => !s.code && useAnim.getState().working[s.id] !== "working").map((s) => s.id);
  pending.forEach((id) => useAnim.getState().set(id, "working"));
  let next = 0;
  let ok = 0;
  const worker = async () => {
    while (next < pending.length) if (await animateScene(projectId, pending[next++])) ok++;
  };
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
  if (ok) useStore.getState().toast(ok === pending.length ? "¡Toma! Todas las escenas están animadas." : `Animadas ${ok} de ${pending.length} escenas.`, "success");
}

/** Crea un estilo propio: la IA escribe su skill a partir de la descripción */
export async function createStyle(name: string, brief: string) {
  const style = await post<StyleInfo>("/api/styles", { name, brief });
  await useAnim.getState().loadStyles();
  return style;
}

export async function deleteStyle(id: string) {
  await fetch(`/api/styles/${encodeURIComponent(id)}`, { method: "DELETE" });
  await useAnim.getState().loadStyles();
}
