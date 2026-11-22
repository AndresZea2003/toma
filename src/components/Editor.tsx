import { ArrowLeft, Download, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sceneStarts } from "../engine/render";
import { listVoices, speechAvailable } from "../engine/speech";
import { MUSIC_LABELS, THEME_DEFS } from "../lib/presets";
import { useProject, useStore } from "../store";
import { MUSIC, THEMES } from "../types";
import { SoundtrackControl } from "./Audio";
import { ExportDialog } from "./ExportDialog";
import { Inspector, type InspectorTab } from "./Inspector";
import { importToScene } from "./Material";
import { Player, type PlayerHandle } from "./Player";
import { SceneList } from "./SceneList";
import { Field, Logo, Toggle, useDismiss } from "./ui";

const LANG_PREFIX: Record<string, string> = { English: "en", Português: "pt", Français: "fr" };

function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(listVoices);
  useEffect(() => {
    if (!speechAvailable()) return;
    const on = () => setVoices(listVoices());
    speechSynthesis.addEventListener("voiceschanged", on);
    return () => speechSynthesis.removeEventListener("voiceschanged", on);
  }, []);
  return voices;
}

function VideoSettings({ id }: { id: string }) {
  const project = useProject(id)!;
  const { updateProject } = useStore.getState();
  const set = (patch: Parameters<typeof updateProject>[1]) => updateProject(id, patch);
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const voices = useVoices().filter((v) => v.lang.toLowerCase().startsWith(LANG_PREFIX[project.language] ?? "es"));

  return (
    <div className="rel" ref={ref}>
      <button className="btn soft" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Settings2 size={17} /> Ajustes del video
      </button>
      {open && (
        <div className="settings" role="dialog" aria-label="Ajustes del video">
          <Field label="Estilo">
            <select className="select" value={project.theme} onChange={(e) => set({ theme: e.target.value as typeof project.theme })}>
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {THEME_DEFS[t].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={project.soundtrack ? "Música generada (sin uso: suena tu pista)" : "Música"}>
            <select className="select" value={project.music} onChange={(e) => set({ music: e.target.value as typeof project.music })}>
              {MUSIC.map((m) => (
                <option key={m} value={m}>
                  {MUSIC_LABELS[m]}
                </option>
              ))}
            </select>
          </Field>
          <SoundtrackControl project={project} />
          <Toggle checked={project.captions} onChange={(v) => set({ captions: v })} label="Subtítulos" />
          {speechAvailable() && <Toggle checked={project.voice} onChange={(v) => set({ voice: v })} label="Voz en off (solo vista previa)" />}
          {project.voice && voices.length > 0 && (
            <select className="select" value={project.voiceName ?? ""} onChange={(e) => set({ voiceName: e.target.value || undefined })} aria-label="Voz">
              <option value="">Voz automática</option>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name.replace(/Microsoft |Google |Online \(Natural\)/g, "").slice(0, 32)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

export function Editor({ id, initialScene = 0, initialTab = "texto" }: { id: string; initialScene?: number; initialTab?: InspectorTab }) {
  const project = useProject(id);
  const { go, updateProject } = useStore.getState();
  const [selected, setSelected] = useState(initialScene);
  const [tab, setTab] = useState<InspectorTab>(initialTab);
  const [exporting, setExporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const playerRef = useRef<PlayerHandle>(null);

  const selectScene = (i: number) => {
    setSelected(i);
    const p = useStore.getState().projects.find((x) => x.id === id);
    const s = p?.scenes[i];
    if (p && s) playerRef.current?.seek(sceneStarts(p.scenes).starts[i] + Math.min(1.6, s.duration * 0.6));
  };

  useEffect(() => {
    selectScene(initialScene);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!project) return null;
  const sel = Math.min(selected, project.scenes.length - 1);
  const scene = project.scenes[sel];

  return (
    <div className="editor">
      <header className="topbar">
        <button className="icon-btn" onClick={() => go({ name: "result", id })} aria-label="Volver al video" title="Volver al video">
          <ArrowLeft size={19} />
        </button>
        <Logo onClick={() => go({ name: "home" })} />
        <input className="ed-title" value={project.title} onChange={(e) => updateProject(id, { title: e.target.value })} aria-label="Título del video" />
        {project.demo && <span className="badge">Modo demo</span>}
        <span className="grow" />
        <VideoSettings id={id} />
        <button
          className="btn toma md"
          onClick={() => {
            playerRef.current?.pause();
            setExporting(true);
          }}
        >
          <Download size={18} strokeWidth={2.6} /> Descargar
        </button>
      </header>

      <div className="ed-body">
        <SceneList project={project} selected={sel} onSelect={selectScene} />
        <main
          className="ed-center"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={(e) => e.currentTarget === e.target && setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f && scene) void importToScene(project, scene, f);
          }}
        >
          <Player ref={playerRef} project={project} selectedIndex={sel} onSceneChange={setSelected} />
          <p className="hint">{dragOver ? `Suelta para pegarlo en la escena ${sel + 1}` : "Espacio para reproducir · arrastra un clip o imagen aquí para la escena actual"}</p>
        </main>
        {scene && <Inspector key={scene.id} project={project} scene={scene} tab={tab} onTab={setTab} />}
      </div>
      {exporting && <ExportDialog project={project} onClose={() => setExporting(false)} />}
    </div>
  );
}
