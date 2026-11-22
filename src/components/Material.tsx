import { Bot, Check, ClipboardCopy, ExternalLink, Film, Hand, ImageIcon, Trash2, Upload, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { deleteMedia, getMediaBlob, saveMedia } from "../lib/media";
import { ClipAudioToggle } from "./Audio";
import { ACTIVE, STATUS_TEXT, robotCancel, robotGenerate, useRobot } from "../lib/robot";
import { TOOLS, referencePrompt, scenePrompt, type PromptTarget } from "../lib/prompts";
import { useStore } from "../store";
import type { MediaRef, Project, Scene } from "../types";
import { Field, Toggle, useCopy } from "./ui";

export function useMediaUrl(ref?: MediaRef) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!ref) return setUrl(null);
    let u: string | null = null;
    let alive = true;
    void getMediaBlob(ref.id).then((b) => {
      if (!alive || !b) return;
      u = URL.createObjectURL(b);
      setUrl(u);
    });
    return () => {
      alive = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [ref?.id]);
  return url;
}

/** Zona para soltar una imagen o un clip (o elegirlo con un clic) */
export function DropZone({ onFile, children, accept = "image/*,video/*" }: { onFile: (f: File) => void; children: ReactNode; accept?: string }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div
      className={over ? "drop over" : "drop"}
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      }}
    >
      {children}
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
    </div>
  );
}

function MediaPreview({ media, url }: { media: MediaRef; url: string | null }) {
  if (!url) return <span className="thumb" />;
  return media.kind === "video" ? <video className="thumb" src={url} muted loop autoPlay playsInline /> : <img className="thumb" src={url} alt="" />;
}

/** Estado en vivo del piloto para una escena */
export function RobotLine({ runKey }: { runKey: string }) {
  const run = useRobot((s) => s.runs[runKey]);
  if (!run) return null;
  const help = run.status === "login" || run.status === "assist";
  return (
    <div className={help ? "robot-line help" : run.status === "done" ? "robot-line done" : "robot-line"} role="status">
      {run.status === "done" ? <Check size={16} strokeWidth={3} /> : help ? <Hand size={16} /> : <span className="spinner dark" aria-hidden />}
      <span>
        <strong>{STATUS_TEXT[run.status]}</strong>
        {run.message && run.message !== STATUS_TEXT[run.status] && <small>{run.message}</small>}
      </span>
      {ACTIVE.has(run.status) && (
        <button className="icon-btn sm" onClick={() => void robotCancel(runKey)} aria-label="Cancelar" title="Cancelar">
          <X size={15} />
        </button>
      )}
    </div>
  );
}

function ToolCard({ target, text, project, scene }: { target: PromptTarget; text: string; project: Project; scene: Scene }) {
  const tool = TOOLS[target];
  const run = useRobot((s) => s.runs[scene.id]);
  const busy = !!run && ACTIVE.has(run.status);
  const { copied, copy } = useCopy();
  return (
    <div className="tool-card">
      <div className="tool-head">
        {target === "video" ? <Film size={17} /> : <ImageIcon size={17} />}
        <strong>{target === "video" ? "Clip en Flow" : "Imagen"}</strong>
        <span className="pill">{target === "video" ? "Clip de 8 s" : "Imagen"}</span>
        <span className="grow" />
        <a href={tool.url} target="_blank" rel="noreferrer">
          Abrir <ExternalLink size={13} />
        </a>
      </div>
      {target === "video" ? (
        <button className="btn toma md robot-go" disabled={busy} onClick={() => void robotGenerate(project.id, scene.id, "flow", "video")}>
          <Bot size={18} strokeWidth={2.4} /> Que Toma genere el clip en Flow
        </button>
      ) : (
        <div className="two">
          <button className="btn toma md robot-go" disabled={busy} onClick={() => void robotGenerate(project.id, scene.id, "flow", "image")}>
            <Bot size={17} strokeWidth={2.4} /> En Flow
          </button>
          <button className="btn soft robot-go" disabled={busy} onClick={() => void robotGenerate(project.id, scene.id, "chatgpt", "image")}>
            <Bot size={17} /> En ChatGPT
          </button>
        </div>
      )}
      {run && (target === "video") === (run.kind === "video") && <RobotLine runKey={scene.id} />}
      <details className="prompt-details">
        <summary>Ver o copiar el prompt</summary>
        <div className="prompt">{text}</div>
        <button className="btn ink sm copy" onClick={() => copy(target, text)}>
          <ClipboardCopy size={15} /> Copiar prompt
          {copied === target && <span className="copied slap">¡Copiado!</span>}
        </button>
      </details>
    </div>
  );
}

/** Importa un archivo como material de la escena */
export async function importToScene(project: Project, scene: Scene, file: File) {
  const { updateScene, toast } = useStore.getState();
  try {
    const media = await saveMedia(file);
    if (scene.media) void deleteMedia(scene.media.id);
    updateScene(project.id, scene.id, { media, hideActors: scene.hideActors ?? true });
    toast(media.kind === "video" ? "¡Clip pegado en la escena!" : "¡Imagen pegada en la escena!", "success");
  } catch (e) {
    toast(e instanceof Error ? e.message : "No se pudo importar el archivo", "error");
  }
}

export function MaterialTab({ project, scene }: { project: Project; scene: Scene }) {
  const { updateScene, updateProject, toast } = useStore.getState();
  const url = useMediaUrl(scene.media);
  const refUrl = useMediaUrl(project.reference);
  const { copied, copy } = useCopy();

  return (
    <>
      {scene.media ? (
        <div className="media-now">
          <MediaPreview media={scene.media} url={url} />
          <div>
            <strong>{scene.media.name}</strong>
            {scene.media.kind === "video" ? "Clip en esta escena" : "Imagen en esta escena"}
          </div>
          <button
            className="icon-btn sm danger"
            aria-label="Quitar material"
            title="Quitar"
            onClick={() => {
              void deleteMedia(scene.media!.id);
              updateScene(project.id, scene.id, { media: undefined });
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ) : null}
      {scene.media && <Toggle checked={!!scene.hideActors} onChange={(v) => updateScene(project.id, scene.id, { hideActors: v })} label="Ocultar personajes emoji" />}
      <ClipAudioToggle project={project} scene={scene} />

      <DropZone onFile={(f) => void importToScene(project, scene, f)}>
        <Upload size={20} />
        {scene.media ? "Cambiar por otro archivo" : "Arrastra aquí tu clip o imagen"}
        <small>o haz clic para elegirlo · MP4, WebM, PNG, JPG</small>
      </DropZone>

      <ToolCard target="video" text={scenePrompt(project, scene, "video")} project={project} scene={scene} />
      <ToolCard target="image" text={scenePrompt(project, scene, "image")} project={project} scene={scene} />

      <section className="tool-card" aria-label="Personaje y estilo">
        <div className="tool-head">
          <UserRound size={17} />
          <strong>Personaje y estilo</strong>
        </div>
        <p className="tool-sub">Se aplica a todas las escenas.</p>
        <Field label="Guía de estilo (va en todos los prompts)">
          <textarea className="text-input" rows={3} value={project.styleGuide} onChange={(e) => updateProject(project.id, { styleGuide: e.target.value })} />
        </Field>
        {project.reference ? (
          <div className="ref-card">
            {refUrl && <img src={refUrl} alt="Hoja de personaje" />}
            <span className="small">Adjunta esta imagen en Flow o ChatGPT: los prompts ya lo piden.</span>
            <button
              className="icon-btn sm danger"
              aria-label="Quitar referencia"
              onClick={() => {
                void deleteMedia(project.reference!.id);
                updateProject(project.id, { reference: undefined });
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ) : (
          <>
            <button className="btn soft sm copy" onClick={() => copy("ref", referencePrompt(project))}>
              <ClipboardCopy size={15} /> Copiar prompt de hoja de personaje
              {copied === "ref" && <span className="copied slap">¡Copiado!</span>}
            </button>
            <DropZone
              accept="image/*"
              onFile={async (f) => {
                try {
                  const media = await saveMedia(f);
                  updateProject(project.id, { reference: media });
                  toast("¡Referencia guardada! Ahora tus prompts mantienen al personaje.", "success");
                } catch (e) {
                  toast(e instanceof Error ? e.message : "No se pudo guardar", "error");
                }
              }}
            >
              <UserRound size={18} />
              Suelta aquí la hoja de personaje
              <small>La usarás como referencia en cada escena</small>
            </DropZone>
          </>
        )}
      </section>
    </>
  );
}
