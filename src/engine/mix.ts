// Mezcla de audio del video: música (propia o generada), voces por escena y sonido de clips.
// La misma mezcla suena en la vista previa y se graba en la exportación.
import { audioBufferNow, preloadAudio } from "../lib/media";
import { totalDuration } from "../lib/util";
import type { Project } from "../types";
import { MusicPlayer } from "./music";
import { sceneStarts } from "./render";

/** Carga de antemano todo el audio que usa el proyecto */
export function preloadProjectAudio(project: Project) {
  const ids: string[] = [];
  if (project.soundtrack) ids.push(project.soundtrack.id);
  for (const s of project.scenes) {
    if (s.voiceOver) ids.push(s.voiceOver.id);
    if (s.clipAudio && s.media?.kind === "video") ids.push(s.media.id);
  }
  return preloadAudio(ids);
}

const VOICE_LEAD = 0.25; // la voz entra un poco después del corte

/**
 * Programa toda la mezcla desde `offset` segundos y devuelve cómo detenerla.
 * Si el audio de algo aún no se ha decodificado, simplemente no suena (nunca bloquea).
 */
export function startMix(ctx: AudioContext, dest: AudioNode, project: Project, offset: number, volume = 0.5) {
  const total = totalDuration(project.scenes);
  const { starts } = sceneStarts(project.scenes);
  const t0 = ctx.currentTime + 0.05 - offset;
  const sources: AudioScheduledSourceNode[] = [];
  const end = t0 + total;

  // --- Música ---
  const musicGain = ctx.createGain();
  musicGain.connect(dest);
  const vol = (project.musicVolume ?? 1) * volume;
  let generated: MusicPlayer | null = null;
  // Nivel de fondo: una pista propia suena más fuerte que la música generada, así que se atenúa más
  const base = project.soundtrack ? vol * 0.5 : 1;
  const track = project.soundtrack ? audioBufferNow(project.soundtrack.id) : null;
  if (track) {
    const src = ctx.createBufferSource();
    src.buffer = track;
    src.loop = track.duration < total;
    src.connect(musicGain);
    const start = Math.max(ctx.currentTime, t0 + offset);
    src.start(start, offset % track.duration);
    src.stop(end + 0.1);
    sources.push(src);
    musicGain.gain.setValueAtTime(0, start);
    musicGain.gain.linearRampToValueAtTime(base, start + 0.6);
    musicGain.gain.setValueAtTime(base, Math.max(start, end - 1.2));
    musicGain.gain.linearRampToValueAtTime(0, end);
  } else if (project.music !== "ninguna") {
    generated = new MusicPlayer(ctx);
    generated.start(musicGain, project.music, offset, total, vol);
  }

  // --- Voces y sonido de clips, con la música bajando mientras hablan ---
  const duck = (from: number, to: number) => {
    const a = Math.max(ctx.currentTime, from);
    const b = Math.max(a + 0.1, to);
    // La música baja mientras suena la voz y vuelve a su nivel, nunca por encima
    musicGain.gain.setTargetAtTime(base * 0.3, a, 0.15);
    musicGain.gain.setTargetAtTime(base, b, 0.3);
  };
  if (!track) musicGain.gain.value = 1;

  project.scenes.forEach((s, i) => {
    const sceneAt = t0 + starts[i];
    const play = (buf: AudioBuffer | null, lead: number, gain: number, maxLen: number) => {
      if (!buf) return;
      const at = sceneAt + lead;
      const len = Math.min(buf.duration, maxLen);
      if (at + len <= ctx.currentTime) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(g).connect(dest);
      const skip = Math.max(0, ctx.currentTime - at);
      src.start(Math.max(at, ctx.currentTime), skip, Math.max(0.05, len - skip));
      sources.push(src);
      duck(at, at + len);
    };
    if (s.voiceOver) play(audioBufferNow(s.voiceOver.id), VOICE_LEAD, 1, s.duration + 1.5);
    if (s.clipAudio && s.media?.kind === "video") play(audioBufferNow(s.media.id), 0, 0.9, s.duration);
  });

  return () => {
    generated?.stop();
    for (const s of sources) {
      try {
        s.stop();
      } catch {
        /* ya detenido */
      }
    }
    musicGain.disconnect();
  };
}

/** ¿Tiene el proyecto alguna voz grabada o generada? (si no, la vista previa usa la voz del navegador) */
export const hasVoiceTracks = (project: Project) => project.scenes.some((s) => s.voiceOver);
