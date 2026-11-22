import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { animateAll } from "../lib/animate";
import { createStory } from "../lib/api";
import { IDEA_SAMPLES } from "../lib/presets";
import { useStore } from "../store";
import type { Project } from "../types";
import { ExportDialog } from "./ExportDialog";
import { DEFAULT_OPTIONS, OptionChips, type Options } from "./StoryOptions";
import { Thumb, TopBar } from "./ui";

const STEPS = ["Leyendo tu idea…", "Escribiendo el guion…", "Dirigiendo las escenas…", "Eligiendo música…", "Casi listo…"];

/** Ligera inclinación estable por posición, como pegatinas puestas a mano */
const tilt = (i: number) => `${[-2.5, 1.5, -1, 2.5, -1.8, 1][i % 6]}deg`;

function useStep(active: boolean) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) return setI(0);
    const t = setInterval(() => setI((x) => Math.min(STEPS.length - 1, x + 1)), 3500);
    return () => clearInterval(t);
  }, [active]);
  return STEPS[i];
}

export function Home() {
  const projects = useStore((s) => s.projects);
  const { addFromDraft, go, toast, deleteProject } = useStore.getState();
  const [idea, setIdea] = useState("");
  const [opts, setOpts] = useState<Options>(DEFAULT_OPTIONS);
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [peeling, setPeeling] = useState<Project | null>(null);
  const ideaRef = useRef<HTMLTextAreaElement>(null);
  const step = useStep(busy);

  const submit = async () => {
    if (busy) return;
    if (!idea.trim()) {
      // Sin idea no se deshabilita nada: el campo la pide con un gesto
      setNudge(false);
      requestAnimationFrame(() => setNudge(true));
      ideaRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const req = { ...opts, idea: idea.trim() };
      const res = await createStory(req);
      const p = addFromDraft(res.draft, req, res.demo);
        // Estilo animado: la IA empieza a animar las escenas mientras ya ves el video
        if (p.styleId) void animateAll(p.id);
      if (res.notice) toast(res.notice);
      go({ name: "result", id: p.id, fresh: true });
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo crear el video. Inténtalo otra vez.", "error");
      setBusy(false);
    }
  };

  return (
    <div>
      <TopBar active="home" />
      <main className="create">
        <section className="sheet composer">
          <h1>
            Escribe una idea. <span className="tag">Sale un video.</span>
          </h1>
          <label htmlFor="idea" className="vh">
            Tu idea
          </label>
          <textarea
            id="idea"
            ref={ideaRef}
            className={nudge ? "idea nudge" : "idea"}
            placeholder="Por ejemplo: un faro que se siente solo hasta que llega un barco de papel"
            value={idea}
            onChange={(e) => {
              setIdea(e.target.value);
              setNudge(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
            }}
            disabled={busy}
            autoFocus
          />
          <div className="compose-row">
            <OptionChips value={opts} onChange={setOpts} disabled={busy} />
          </div>
          <div className="compose-foot">
            <span className={nudge ? "small nudge-msg" : "muted small"} aria-live="polite">
              {nudge ? "Escribe primero tu idea, aunque sea una frase." : "Todo lo demás se puede cambiar después."}
            </span>
            <button className="btn toma" onClick={submit} disabled={busy} title="Ctrl + Enter">
              {busy ? (
                <>
                  <span className="spinner" aria-hidden /> {step}
                </>
              ) : (
                "¡Toma!"
              )}
            </button>
          </div>
          {!idea && !busy && (
            <div className="tries" aria-label="Ideas de ejemplo">
              {IDEA_SAMPLES.map((s) => (
                <button key={s} className="try" onClick={() => setIdea(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="pliego" aria-label="Tus videos">
          <h2>
            Tu pliego {projects.length > 0 && <span className="count">{projects.length}</span>}
          </h2>
          <div className="pliego-grid">
            <div className={busy ? "slot busy" : "slot"}>{busy ? "Imprimiendo…" : "Tu próximo video va aquí"}</div>
            {projects.map((p, i) => (
              <div key={p.id} className="vid-wrap slap" style={{ ["--d" as string]: `${Math.min(i, 8) * 70}ms` }}>
                <div className={i === 0 ? "peelable cue" : "peelable"} style={{ rotate: tilt(i) }}>
                  <button className="vid" onClick={() => go({ name: "result", id: p.id })} aria-label={`Abrir ${p.title}`}>
                    <Thumb project={p} width={150} />
                  </button>
                  <button className="peel-btn" onClick={() => setPeeling(p)} aria-label={`Despegar y descargar ${p.title}`} title="Despegar para descargar" />
                </div>
                <span className="peel-tip" aria-hidden>
                  Despégala ↘ descarga
                </span>
                <span className="vid-title">{p.title}</span>
                <button
                  className="vid-del"
                  aria-label={`Borrar ${p.title}`}
                  title="Borrar"
                  onClick={() => confirm(`¿Borrar «${p.title}»? No se puede deshacer.`) && deleteProject(p.id)}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </aside>
      </main>
      {peeling && <ExportDialog project={peeling} onClose={() => setPeeling(null)} />}
    </div>
  );
}
