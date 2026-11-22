// Piloto automático (cliente): lanza trabajos en el navegador controlado,
// sigue su estado y pega el resultado donde toca, aunque cambies de pantalla.
import { create } from "zustand";
import { useStore } from "../store";
import type { MediaRef, Project, Scene } from "../types";
import { totalDuration } from "./util";
import { scenePrompt } from "./prompts";
import { audioBuffer, deleteMedia, saveMedia } from "./media";

export type RobotTool = "flow" | "chatgpt" | "aistudio" | "flowmusic";
export type RobotKind = "video" | "image" | "voice" | "music";

export interface RobotJob {
  id: string;
  tool: RobotTool;
  kind: RobotKind;
  status: "queued" | "opening" | "login" | "typing" | "generating" | "assist" | "downloading" | "done" | "error" | "cancelled";
  message: string;
}

interface Run {
  jobId: string;
  tool: RobotTool;
  kind: RobotKind;
  status: RobotJob["status"];
  message: string;
}

interface RobotState {
  /** Trabajos en curso por clave: id de escena (visual), voice:<escena> o music:<proyecto> */
  runs: Record<string, Run>;
  setRun: (key: string, run: Run | null) => void;
}

export const useRobot = create<RobotState>((set) => ({
  runs: {},
  setRun: (key, run) =>
    set((s) => {
      const runs = { ...s.runs };
      if (run) runs[key] = run;
      else delete runs[key];
      return { runs };
    }),
}));

export const ACTIVE = new Set<RobotJob["status"]>(["queued", "opening", "login", "typing", "generating", "assist", "downloading"]);
export const voiceKey = (sceneId: string) => `voice:${sceneId}`;
export const musicKey = (projectId: string) => `music:${projectId}`;

async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body === undefined ? undefined : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
  return data as T;
}

export async function openRobotTool(tool: RobotTool) {
  await api("/api/robot/open", { tool });
}

// ---------- Prompts de audio ----------

const MOOD: Record<string, string> = {
  Inspirador: "uplifting, hopeful, warm",
  Divertido: "playful, bouncy, light",
  Misterioso: "mysterious, atmospheric, curious",
  Educativo: "calm, clear, gently curious",
  Emotivo: "emotional, tender, cinematic",
  Vendedor: "energetic, confident, modern pop",
};

export function musicPrompt(project: Project) {
  const secs = Math.round(totalDuration(project.scenes));
  return [
    `Instrumental background music for a ${secs}-second ${project.format === "9:16" ? "vertical social media story" : "short video"}.`,
    `Topic: ${project.idea}.`,
    `Mood: ${MOOD[project.tone] ?? "warm, modern"}. No vocals, no lyrics.`,
    `Length about ${secs} seconds, clean ending, works under a voice-over.`,
  ].join(" ");
}

/** Solo el texto a leer: el lector de AI Studio lee en voz alta todo lo que recibe */
export function voicePrompt(_project: Project, scene: Scene) {
  return scene.narration.trim() || scene.headline.trim();
}

// ---------- Motor común ----------

async function runJob(key: string, tool: RobotTool, kind: RobotKind, prompt: string, aspect: string, deliver: (file: File) => Promise<void>) {
  const { toast } = useStore.getState();
  const { setRun } = useRobot.getState();
  let job: RobotJob;
  try {
    job = await api<RobotJob>("/api/robot/jobs", { tool, kind, aspect, prompt });
  } catch (e) {
    toast(e instanceof Error ? e.message : "No pude iniciar el piloto", "error");
    return;
  }
  setRun(key, { jobId: job.id, tool, kind, status: job.status, message: job.message });

  for (;;) {
    await new Promise((r) => setTimeout(r, 1500));
    try {
      job = await api<RobotJob>(`/api/robot/jobs/${job.id}`);
    } catch {
      continue;
    }
    if (!useRobot.getState().runs[key]) return; // cancelado desde la interfaz
    setRun(key, { jobId: job.id, tool, kind, status: job.status, message: job.message });
    if (!ACTIVE.has(job.status)) break;
  }

  if (job.status !== "done") {
    if (job.status === "error") toast(job.message, "error");
    setTimeout(() => useRobot.getState().runs[key]?.jobId === job.id && setRun(key, null), 4000);
    return;
  }
  try {
    const blob = await fetch(`/api/robot/files/${job.id}`).then((r) => r.blob());
    const type = blob.type || (kind === "video" ? "video/mp4" : kind === "image" ? "image/png" : "audio/mpeg");
    const ext = type.split("/")[1]?.replace("mpeg", "mp3").replace("jpeg", "jpg").split(";")[0] ?? "bin";
    await deliver(new File([blob], `${tool}-${kind}-${Date.now()}.${ext}`, { type }));
  } catch (e) {
    toast(e instanceof Error ? e.message : "No pude traer el resultado", "error");
  } finally {
    setTimeout(() => useRobot.getState().runs[key]?.jobId === job.id && setRun(key, null), 1200);
  }
}

/** Si la voz es más larga que la escena, alarga la escena para que no se corte */
export async function fitToVoice(media: MediaRef, duration: number): Promise<{ duration?: number }> {
  const buf = await audioBuffer(media.id);
  if (!buf) return {};
  const needed = Math.ceil((buf.duration + 0.8) * 2) / 2; // 0,25 s de entrada + respiro, en medios segundos
  return needed > duration ? { duration: Math.min(needed, 20) } : {};
}

const find = (projectId: string, sceneId?: string) => {
  const project = useStore.getState().projects.find((p) => p.id === projectId);
  return { project, scene: sceneId ? project?.scenes.find((s) => s.id === sceneId) : undefined };
};

const replace = (old?: MediaRef) => old && void deleteMedia(old.id);

/** Clip o imagen de una escena */
export async function robotGenerate(projectId: string, sceneId: string, tool: RobotTool, kind: RobotKind = tool === "flow" ? "video" : "image") {
  const { project, scene } = find(projectId, sceneId);
  if (!project || !scene) return;
  await runJob(sceneId, tool, kind, scenePrompt(project, scene, kind === "video" ? "video" : "image"), project.format, async (file) => {
    const media = await saveMedia(file);
    const st = useStore.getState();
    const current = find(projectId, sceneId).scene;
    if (!current) return;
    replace(current.media);
    st.updateScene(projectId, sceneId, { media, hideActors: current.hideActors ?? true, clipAudio: kind === "video" ? current.clipAudio : undefined });
    st.toast(kind === "video" ? "¡Toma! Clip de Flow pegado en la escena." : `¡Toma! Imagen de ${tool === "flow" ? "Flow" : "ChatGPT"} pegada en la escena.`, "success");
  });
}

/** Voz en off de una escena con Gemini (AI Studio) */
export async function robotVoice(projectId: string, sceneId: string) {
  const { project, scene } = find(projectId, sceneId);
  if (!project || !scene) return;
  await runJob(voiceKey(sceneId), "aistudio", "voice", voicePrompt(project, scene), project.format, async (file) => {
    const media = await saveMedia(file);
    const current = find(projectId, sceneId).scene;
    if (!current) return;
    replace(current.voiceOver);
    useStore.getState().updateScene(projectId, sceneId, { voiceOver: media, ...(await fitToVoice(media, current.duration)) });
    useStore.getState().toast("¡Toma! Voz de Gemini pegada en la escena.", "success");
  });
}

/** Banda sonora del video con Flow Music */
export async function robotMusic(projectId: string) {
  const { project } = find(projectId);
  if (!project) return;
  await runJob(musicKey(projectId), "flowmusic", "music", musicPrompt(project), project.format, async (file) => {
    const media = await saveMedia(file);
    replace(find(projectId).project?.soundtrack);
    useStore.getState().updateProject(projectId, { soundtrack: media });
    useStore.getState().toast("¡Toma! Música de Flow Music puesta en el video.", "success");
  });
}

export async function robotCancel(key: string) {
  const run = useRobot.getState().runs[key];
  if (!run) return;
  useRobot.getState().setRun(key, null);
  await api(`/api/robot/jobs/${run.jobId}/cancel`, {}).catch(() => undefined);
}

const stagger = <T,>(items: T[], fn: (t: T) => Promise<void>) =>
  // Se encolan todas; el servidor las hace una a una con ritmo humano
  Promise.all(items.map((t, i) => new Promise((r) => setTimeout(r, i * 150)).then(() => fn(t))));

/** Material de todas las escenas que aún no lo tienen */
export async function robotGenerateAll(projectId: string, tool: RobotTool, kind?: RobotKind) {
  const { project } = find(projectId);
  if (!project) return;
  const pending = project.scenes.filter((s) => !s.media && !useRobot.getState().runs[s.id]);
  await stagger(pending, (s) => robotGenerate(projectId, s.id, tool, kind));
}

/** Voces de todas las escenas con narración que aún no tienen voz */
export async function robotVoicesAll(projectId: string) {
  const { project } = find(projectId);
  if (!project) return;
  const pending = project.scenes.filter((s) => !s.voiceOver && (s.narration.trim() || s.headline.trim()) && !useRobot.getState().runs[voiceKey(s.id)]);
  await stagger(pending, (s) => robotVoice(projectId, s.id));
}

export const STATUS_TEXT: Record<RobotJob["status"], string> = {
  queued: "En cola",
  opening: "Abriendo…",
  login: "Inicia sesión en Chrome",
  typing: "Escribiendo…",
  generating: "Generando…",
  assist: "Necesito tu ayuda",
  downloading: "Descargando…",
  done: "¡Listo!",
  error: "Falló",
  cancelled: "Cancelado",
};
