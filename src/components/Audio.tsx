import { Bot, Mic, Music2, Square, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { deleteMedia, saveMedia } from "../lib/media";
import { ACTIVE, fitToVoice, musicKey, robotMusic, robotVoice, useRobot, voiceKey } from "../lib/robot";
import { useStore } from "../store";
import type { MediaRef, Project, Scene } from "../types";
import { DropZone, RobotLine, useMediaUrl } from "./Material";
import { useSettings } from "./Settings";
import { Field, Toggle } from "./ui";

function AudioRow({ media, onRemove, label }: { media: MediaRef; onRemove: () => void; label: string }) {
  const url = useMediaUrl(media);
  return (
    <div className="audio-row">
      <div className="audio-head">
        <strong>{label}</strong>
        <span className="muted small">{media.name}</span>
        <span className="grow" />
        <button className="icon-btn sm danger" onClick={onRemove} aria-label={`Quitar ${label.toLowerCase()}`} title="Quitar">
          <Trash2 size={15} />
        </button>
      </div>
      {url && <audio src={url} controls preload="metadata" />}
    </div>
  );
}

/** Grabar con el micrófono: el creador pone su propia voz a la escena */
function Recorder({ onDone }: { onDone: (f: File) => void }) {
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const { toast } = useStore.getState();
  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [rec]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: r.mimeType || "audio/webm" });
        onDone(new File([blob], `mi-voz-${Date.now()}.webm`, { type: blob.type }));
      };
      r.start();
      setSecs(0);
      setRec(r);
    } catch {
      toast("No pude usar el micrófono. Revisa el permiso del navegador.", "error");
    }
  };

  return rec ? (
    <button
      className="btn ink recording"
      onClick={() => {
        rec.stop();
        setRec(null);
      }}
    >
      <Square size={14} fill="currentColor" /> Parar · {secs}s
    </button>
  ) : (
    <button className="btn soft" onClick={start}>
      <Mic size={16} /> Grabar mi voz
    </button>
  );
}

export function VoiceOver({ project, scene }: { project: Project; scene: Scene }) {
  const { updateScene, toast } = useStore.getState();
  const run = useRobot((s) => s.runs[voiceKey(scene.id)]);
  const busy = !!run && ACTIVE.has(run.status);
  const eleven = useSettings((s) => s.elevenlabs.set);
  const attach = async (f: File) => {
    try {
      const media = await saveMedia(f);
      if (media.kind !== "audio" && media.kind !== "video") throw new Error("Eso no es un audio.");
      if (scene.voiceOver) void deleteMedia(scene.voiceOver.id);
      updateScene(project.id, scene.id, { voiceOver: media, ...(await fitToVoice(media, scene.duration)) });
      toast("¡Voz pegada en la escena!", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo usar ese audio", "error");
    }
  };
  return (
    <Field label="Voz en off" hint={scene.voiceOver ? "se graba en el video" : "opcional"}>
      {scene.voiceOver ? (
        <>
          <AudioRow
            media={scene.voiceOver}
            label="Voz"
            onRemove={() => {
              void deleteMedia(scene.voiceOver!.id);
              updateScene(project.id, scene.id, { voiceOver: undefined });
            }}
          />
          <button className="btn soft sm" style={{ alignSelf: "flex-start" }} disabled={busy} onClick={() => void robotVoice(project.id, scene.id)}>
            <Bot size={15} /> Otra versión con {eleven ? "ElevenLabs" : "Gemini"}
          </button>
        </>
      ) : (
        <>
          <button className="btn toma md robot-go" disabled={busy || !(scene.narration.trim() || scene.headline.trim())} onClick={() => void robotVoice(project.id, scene.id)}>
            <Bot size={17} strokeWidth={2.4} /> Que {eleven ? "ElevenLabs" : "Gemini"} lea la narración
          </button>
          <div className="voice-actions">
            <Recorder onDone={(f) => void attach(f)} />
            <DropZone accept="audio/*" onFile={(f) => void attach(f)}>
              <Upload size={16} /> Subir audio
            </DropZone>
          </div>
        </>
      )}
      <RobotLine runKey={voiceKey(scene.id)} />
    </Field>
  );
}

export function ClipAudioToggle({ project, scene }: { project: Project; scene: Scene }) {
  const { updateScene } = useStore.getState();
  if (scene.media?.kind !== "video") return null;
  return <Toggle checked={!!scene.clipAudio} onChange={(v) => updateScene(project.id, scene.id, { clipAudio: v })} label="Usar el sonido del clip" />;
}

export function SoundtrackControl({ project }: { project: Project }) {
  const { updateProject, toast } = useStore.getState();
  const run = useRobot((s) => s.runs[musicKey(project.id)]);
  const busy = !!run && ACTIVE.has(run.status);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="field">
      {project.soundtrack ? (
        <AudioRow
          media={project.soundtrack}
          label="Tu pista"
          onRemove={() => {
            void deleteMedia(project.soundtrack!.id);
            updateProject(project.id, { soundtrack: undefined });
          }}
        />
      ) : (
        <div className="voice-actions">
          <button className="btn toma md robot-go" disabled={busy} onClick={() => void robotMusic(project.id)}>
            <Bot size={16} strokeWidth={2.4} /> Flow Music
          </button>
          <button className="btn soft" onClick={() => input.current?.click()}>
            <Music2 size={15} /> Mi pista
          </button>
        </div>
      )}
      <RobotLine runKey={musicKey(project.id)} />
      <input
        ref={input}
        type="file"
        accept="audio/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            updateProject(project.id, { soundtrack: await saveMedia(f) });
            toast("¡Pista pegada! Suena en lugar de la música generada.", "success");
          } catch (err) {
            toast(err instanceof Error ? err.message : "No se pudo usar ese audio", "error");
          }
        }}
      />
      <Field label="Volumen de la música" hint={`${Math.round((project.musicVolume ?? 1) * 100)}%`}>
        <input type="range" min={0} max={1.5} step={0.05} value={project.musicVolume ?? 1} onChange={(e) => updateProject(project.id, { musicVolume: +e.target.value })} aria-label="Volumen de la música" />
      </Field>
    </div>
  );
}
