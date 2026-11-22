import { ArrowLeft, Bot, ClipboardCopy, Download, Mic, Music2, SlidersHorizontal, Wand2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sceneStarts } from "../engine/render";
import { FORMAT_INFO } from "../lib/presets";
import { projectKit } from "../lib/prompts";
import { ACTIVE, musicKey, robotGenerateAll, robotMusic, robotVoicesAll, useRobot, voiceKey } from "../lib/robot";
import { formatTime, totalDuration } from "../lib/util";
import { useProject, useStore } from "../store";
import { ExportDialog } from "./ExportDialog";
import { Player, type PlayerHandle } from "./Player";
import { AnimProgress } from "./Styles";
import { Thumb, TopBar, useCopy } from "./ui";

export function Result({ id, fresh }: { id: string; fresh?: boolean }) {
  const project = useProject(id);
  const { go, updateProject } = useStore.getState();
  const [scene, setScene] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [stamp, setStamp] = useState<"in" | "out" | null>(fresh ? "in" : null);
  const playerRef = useRef<PlayerHandle>(null);
  const { copied, copy } = useCopy();
  const runs = useRobot((s) => s.runs);

  useEffect(() => {
    if (!fresh) return;
    const a = setTimeout(() => setStamp("out"), 2400);
    const b = setTimeout(() => setStamp(null), 3100);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [fresh]);

  if (!project) return null;
  const activeRuns = [...project.scenes.flatMap((s) => [runs[s.id], runs[voiceKey(s.id)]]), runs[musicKey(project.id)]].filter((r) => r && ACTIVE.has(r.status));
  const withVoice = project.scenes.filter((s) => s.voiceOver).length;
  const running = activeRuns.length;
  const firstRun = activeRuns.find((r) => r!.status !== "queued") ?? activeRuns[0];
  const withMedia = project.scenes.filter((s) => s.media).length;
  const info = FORMAT_INFO[project.format];
  const stageH = project.format === "16:9" ? "min(62vh, 560px)" : "calc(100vh - 150px)";

  return (
    <div>
      <TopBar>
        <button className="btn ghost" onClick={() => go({ name: "home" })}>
          <ArrowLeft size={17} /> Crear otro
        </button>
      </TopBar>
      <main className="result">
        <div className="result-stage" style={{ height: stageH, width: project.format === "16:9" ? undefined : `calc((${stageH} - 66px) * ${info.w / info.h})`, minWidth: 300 }}>
          <Player ref={playerRef} project={project} selectedIndex={scene} onSceneChange={setScene} autoPlay />
          {stamp && (
            <span className={stamp === "in" ? "stamp slap" : "stamp out"} aria-hidden>
              ¡Toma!
            </span>
          )}
        </div>

        <aside className="result-side">
          <div>
            <label htmlFor="title" className="vh">
              Título
            </label>
            <textarea id="title" className="title-edit" rows={1} value={project.title} onChange={(e) => updateProject(project.id, { title: e.target.value })} />
            <div className="meta" style={{ marginTop: 12 }}>
              <span>
                {info.label} {project.format}
              </span>
              <span>{formatTime(totalDuration(project.scenes))}</span>
              <span>{project.scenes.length} escenas</span>
              {project.demo && <span>Modo demo</span>}
            </div>
          </div>

          <div className="actions">
            <button
              className="btn toma"
              onClick={() => {
                playerRef.current?.pause();
                setExporting(true);
              }}
            >
              <Download size={22} strokeWidth={2.6} /> Descargar video
            </button>
            <button className="btn ink" onClick={() => go({ name: "editor", id: project.id, scene })}>
              <SlidersHorizontal size={18} /> Retocar
            </button>
          </div>

          <div>
            <div className="label" style={{ marginBottom: 8 }}>
              Escenas · toca una para retocarla
            </div>
            <div className="strip">
              {project.scenes.map((s, i) => (
                <button
                  key={s.id}
                  className={[i === scene ? "strip-item on" : "strip-item", fresh && "slap"].filter(Boolean).join(" ")}
                  style={fresh ? { ["--d" as string]: `${500 + i * 140}ms`, ["--r" as string]: `${[-3, 2, -1.5, 2.5, -2][i % 5]}deg` } : undefined}
                  onClick={() => {
                    setScene(i);
                    playerRef.current?.seek(sceneStarts(project.scenes).starts[i] + Math.min(1.6, s.duration * 0.6));
                  }}
                  onDoubleClick={() => go({ name: "editor", id: project.id, scene: i })}
                  aria-label={`Escena ${i + 1}: ${s.headline}`}
                >
                  <Thumb project={project} index={i} width={58} />
                  {s.media && <span className="dot" aria-hidden />}
                </button>
              ))}
            </div>
          </div>

          <AnimProgress project={project} />

          <section className="boost" aria-label="Mejorar con tus herramientas">
            <h3>Súbele el nivel con tus herramientas</h3>
            <p>Toma abre Chrome con tu cuenta: clips en Flow, voces con Gemini y música en Flow Music. Lo genera con tus usos y lo pega aquí solo.</p>
            <div className="meter" aria-label={`${withMedia} de ${project.scenes.length} escenas con material`}>
              {project.scenes.map((s) => (
                <i key={s.id} className={s.media ? "on" : runs[s.id] ? "busy" : undefined} />
              ))}
              <span>
                {withMedia}/{project.scenes.length} con material
              </span>
            </div>
            {running > 0 && (
              <p className="robot-line" role="status">
                <span className="spinner dark" aria-hidden />
                <span>
                  <strong>
                    Toma está trabajando · {running} {running === 1 ? "tarea" : "tareas"} en cola
                  </strong>
                  {firstRun && <small>{firstRun.message}</small>}
                </span>
              </p>
            )}
            <div className="actions">
              <button className="btn toma md" disabled={(withMedia === project.scenes.length && withVoice === project.scenes.length && !!project.soundtrack) || running > 0} onClick={() => {
                  // Todo a la vez: clips en Flow, voces en Gemini y música en Flow Music
                  void robotGenerateAll(project.id, "flow");
                  void robotVoicesAll(project.id);
                  if (!project.soundtrack) void robotMusic(project.id);
                }}>
                <Bot size={18} strokeWidth={2.4} /> {running > 0 ? "Generando…" : "Generar todo de una vez"}
              </button>
              <div className="two">
                <button className="btn soft" disabled={withVoice === project.scenes.length} onClick={() => void robotVoicesAll(project.id)}>
                  <Mic size={16} /> Voces con Gemini
                </button>
                <button className="btn soft" disabled={!!runs[musicKey(project.id)]} onClick={() => void robotMusic(project.id)}>
                  <Music2 size={16} /> {project.soundtrack ? "Otra música" : "Música"}
                </button>
              </div>
              <button className="btn ghost" onClick={() => go({ name: "editor", id: project.id, scene: Math.max(0, project.scenes.findIndex((s) => !s.media)), tab: "material" })}>
                <Wand2 size={17} /> Elegir escena por escena
              </button>
              <button className="btn ghost copy" onClick={() => copy("kit", projectKit(project))}>
                <ClipboardCopy size={16} /> Copiar todos los prompts
                {copied === "kit" && <span className="copied slap">¡Copiado!</span>}
              </button>
            </div>
          </section>
        </aside>
      </main>
      {exporting && <ExportDialog project={project} onClose={() => setExporting(false)} />}
    </div>
  );
}
