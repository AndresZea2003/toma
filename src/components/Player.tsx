import { Pause, Play, RotateCcw } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { sharedAudio } from "../engine/music";
import { hasVoiceTracks, preloadProjectAudio, startMix } from "../engine/mix";
import { ensureFonts, loadSceneMedia, renderFrame, sceneIndexAt, sceneStarts, setLivePlayback } from "../engine/render";
import { onMediaFrame } from "../lib/media";
import { speak, stopSpeech } from "../engine/speech";
import { FORMAT_INFO } from "../lib/presets";
import { formatTime } from "../lib/util";
import type { Project } from "../types";

export interface PlayerHandle {
  seek: (t: number) => void;
  toggle: () => void;
  pause: () => void;
}

interface Props {
  project: Project;
  selectedIndex: number;
  onSceneChange: (index: number) => void;
  autoPlay?: boolean;
  onPlayingChange?: (playing: boolean) => void;
}

export const Player = forwardRef<PlayerHandle, Props>(function Player({ project, selectedIndex, onSceneChange, autoPlay, onPlayingChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef(project);
  const timeRef = useRef(0);
  const playRef = useRef<{ startT: number; startNow: number } | null>(null);
  const mixRef = useRef<(() => void) | null>(null);
  const lastSceneRef = useRef(-1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [ready, setReady] = useState(false);
  const autoRef = useRef(autoPlay);

  useEffect(() => onPlayingChange?.(playing), [playing, onPlayingChange]);

  const { total } = sceneStarts(project.scenes);
  const info = FORMAT_INFO[project.format];

  projectRef.current = project;

  const draw = (t: number) => {
    const c = canvasRef.current;
    if (!c) return;
    renderFrame(c.getContext("2d", { alpha: false })!, projectRef.current, t);
    if (playheadRef.current) {
      const tot = sceneStarts(projectRef.current.scenes).total || 1;
      playheadRef.current.style.left = `${(t / tot) * 100}%`;
    }
  };

  const stopAudio = () => {
    mixRef.current?.();
    mixRef.current = null;
    stopSpeech();
  };

  const pause = () => {
    playRef.current = null;
    setPlaying(false);
    setLivePlayback(false);
    stopAudio();
    setTime(timeRef.current);
    draw(timeRef.current);
  };

  const play = () => {
    const tot = sceneStarts(projectRef.current.scenes).total;
    if (timeRef.current >= tot - 0.05) timeRef.current = 0;
    playRef.current = { startT: timeRef.current, startNow: performance.now() };
    lastSceneRef.current = -1;
    setPlaying(true);
    setLivePlayback(true);
    const audio = sharedAudio();
    mixRef.current?.();
    mixRef.current = startMix(audio, audio.destination, projectRef.current, timeRef.current, 0.45);
  };

  const seek = (t: number) => {
    const tot = sceneStarts(projectRef.current.scenes).total;
    timeRef.current = Math.max(0, Math.min(t, tot));
    if (playRef.current) {
      pause();
    }
    setTime(timeRef.current);
    draw(timeRef.current);
  };

  useImperativeHandle(ref, () => ({ seek, toggle: () => (playRef.current ? pause() : play()), pause }));

  // Carga inicial de fuentes e imágenes
  useEffect(() => {
    let alive = true;
    void Promise.all([ensureFonts(), loadSceneMedia(project), preloadProjectAudio(project)]).then(() => {
      if (!alive) return;
      setReady(true);
      draw(timeRef.current);
      if (autoRef.current) {
        autoRef.current = false;
        setTimeout(() => !playRef.current && play(), 350);
      }
    });
    // En pausa, redibujar cuando un clip llega al fotograma pedido
    const off = onMediaFrame(() => !playRef.current && draw(timeRef.current));
    return () => {
      alive = false;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [[project.soundtrack?.id, ...project.scenes.map((s) => `${s.media?.id}:${s.voiceOver?.id}:${s.clipAudio}`)].join("|")]);

  // Redibujar al cambiar el proyecto en pausa
  useEffect(() => {
    if (!playRef.current && ready) draw(timeRef.current);
  });

  // Bucle de reproducción
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let lastUi = 0;
    const loop = (now: number) => {
      const st = playRef.current;
      if (!st) return;
      const p = projectRef.current;
      const tot = sceneStarts(p.scenes).total;
      const t = st.startT + (now - st.startNow) / 1000;
      if (t >= tot) {
        timeRef.current = tot;
        draw(tot);
        pause();
        return;
      }
      timeRef.current = t;
      draw(t);
      const idx = sceneIndexAt(p.scenes, t);
      if (idx !== lastSceneRef.current) {
        lastSceneRef.current = idx;
        onSceneChange(idx);
        if (p.voice && !hasVoiceTracks(p)) speak(p.scenes[idx].narration, p.voiceName, p.language);
      }
      if (now - lastUi > 120) {
        lastUi = now;
        setTime(t);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(
    () => () => {
      playRef.current = null;
      setLivePlayback(false);
      stopAudio();
    },
    [],
  );

  // Barra espaciadora = reproducir/pausar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code !== "Space" || /INPUT|TEXTAREA|SELECT|BUTTON/.test(el.tagName) || el.isContentEditable) return;
      e.preventDefault();
      playRef.current ? pause() : play();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onTimelinePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seek(k * total);
    onSceneChange(sceneIndexAt(project.scenes, k * total));
  };

  return (
    <div className="player">
      <div className="stage">
        <canvas
          ref={canvasRef}
          width={info.w / 2}
          height={info.h / 2}
          className={`stage-canvas f-${project.format.replace(":", "x")}`}
          onClick={() => (playRef.current ? pause() : play())}
          aria-label="Vista previa del video"
        />
      </div>
      <div className="transport">
        <button className="play-btn" onClick={() => (playRef.current ? pause() : play())} aria-label={playing ? "Pausar" : "Reproducir"}>
          {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>
        <button className="icon-btn ghost" onClick={() => seek(0)} aria-label="Volver al inicio" title="Volver al inicio">
          <RotateCcw size={16} />
        </button>
        <span className="time">
          {formatTime(time)} <span className="muted">/ {formatTime(total)}</span>
        </span>
        <div
          className="timeline"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            onTimelinePointer(e);
          }}
          onPointerMove={(e) => e.buttons === 1 && onTimelinePointer(e)}
          role="slider"
          aria-label="Línea de tiempo"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(time)}
        >
          {project.scenes.map((s, i) => (
            <div
              key={s.id}
              className={["tl-seg", s.media && "media", i === selectedIndex && "on"].filter(Boolean).join(" ")}
              style={{ flexGrow: s.duration }}
              title={s.media ? `${s.headline} · con material` : s.headline}
            >
              <span>{i + 1}</span>
            </div>
          ))}
          <div ref={playheadRef} className="playhead" style={{ left: `${(time / (total || 1)) * 100}%` }} />
        </div>
      </div>
    </div>
  );
});
