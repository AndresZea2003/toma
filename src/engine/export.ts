// Exporta un proyecto a archivo de video grabando el canvas en tiempo real.
import { FORMAT_INFO } from "../lib/presets";
import { slugify, totalDuration } from "../lib/util";
import type { Project } from "../types";
import { preloadProjectAudio, startMix } from "./mix";
import { ensureFonts, loadSceneMedia, renderFrame, setLivePlayback } from "./render";

const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.640028,mp4a.40.2",
  "video/mp4;codecs=avc1.4d0028,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

/**
 * Reloj de 30 fps en un worker: a diferencia de requestAnimationFrame,
 * sigue latiendo si la pestaña queda en segundo plano.
 */
function createTicker(fn: () => void) {
  const src = "const id=setInterval(()=>postMessage(0),1000/30);onmessage=()=>clearInterval(id);";
  const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
  const worker = new Worker(url);
  worker.onmessage = fn;
  return () => {
    worker.postMessage(0);
    worker.terminate();
    URL.revokeObjectURL(url);
  };
}

export function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

export interface ExportResult {
  blob: Blob;
  url: string;
  filename: string;
  mime: string;
}

export interface ExportOptions {
  onProgress?: (p: number) => void;
  /** canvas donde se dibuja (se puede mostrar en pantalla) */
  canvas?: HTMLCanvasElement;
  signal?: AbortSignal;
  quality?: "hd" | "full";
}

export async function exportVideo(project: Project, opts: ExportOptions = {}): Promise<ExportResult> {
  const mime = pickMime();
  if (!mime) throw new Error("Este navegador no puede grabar video. Usa Chrome, Edge o Firefox actualizados.");
  const info = FORMAT_INFO[project.format];
  const scale = opts.quality === "hd" ? 2 / 3 : 1;
  const canvas = opts.canvas ?? document.createElement("canvas");
  canvas.width = Math.round((info.w * scale) / 2) * 2;
  canvas.height = Math.round((info.h * scale) / 2) * 2;
  const ctx = canvas.getContext("2d", { alpha: false })!;

  await ensureFonts();
  await loadSceneMedia(project);
  await preloadProjectAudio(project);
  setLivePlayback(true);
  const total = totalDuration(project.scenes);
  renderFrame(ctx, project, 0);

  const audio = new AudioContext();
  await audio.resume();
  const dest = audio.createMediaStreamDestination();

  const stream = canvas.captureStream(30);
  for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: opts.quality === "hd" ? 6_000_000 : 10_000_000,
    audioBitsPerSecond: 160_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const done = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
  recorder.start(500);
  const stopMix = startMix(audio, dest, project, 0, 0.55);
  const startAt = performance.now();

  let stopTicker = () => {};
  await new Promise<void>((resolve, reject) => {
    stopTicker = createTicker(() => {
      if (opts.signal?.aborted) {
        reject(new DOMException("Exportación cancelada", "AbortError"));
        return;
      }
      const t = (performance.now() - startAt) / 1000;
      renderFrame(ctx, project, Math.min(t, total));
      opts.onProgress?.(Math.min(1, t / total));
      if (t >= total + 0.15) resolve();
    });
  }).finally(() => {
    stopTicker();
    setLivePlayback(false);
    stopMix();
    if (recorder.state !== "inactive") recorder.stop();
  });
  await done;
  stream.getTracks().forEach((tr) => tr.stop());
  void audio.close();

  const type = mime.split(";")[0];
  const blob = new Blob(chunks, { type });
  const ext = type === "video/mp4" ? "mp4" : "webm";
  return { blob, url: URL.createObjectURL(blob), filename: `${slugify(project.title)}.${ext}`, mime: type };
}

export function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
