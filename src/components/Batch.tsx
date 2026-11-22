import { CheckCircle2, CircleDashed, Clapperboard, Download, ExternalLink, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import { exportVideo, pickMime, saveVideo } from "../engine/export";
import { animateAll } from "../lib/animate";
import { createStory } from "../lib/api";
import { formatTime, totalDuration } from "../lib/util";
import { useStore } from "../store";
import { DEFAULT_OPTIONS, OptionChips, type Options } from "./StoryOptions";
import { Thumb, TopBar } from "./ui";

type Status = "en cola" | "creando" | "lista" | "error" | "grabando" | "descargada";

interface Item {
  key: string;
  idea: string;
  status: Status;
  projectId?: string;
  error?: string;
  progress?: number;
}

const EXAMPLE = `Consejo del lunes: organiza tu semana en 5 minutos
Cómo nació nuestra panadería
3 datos curiosos sobre los pulpos`;

export function Batch() {
  const [text, setText] = useState("");
  const [opts, setOpts] = useState<Options>({ ...DEFAULT_OPTIONS, seconds: 15 });
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState<"crear" | "grabar" | null>(null);
  const projects = useStore((s) => s.projects);
  const { addFromDraft, go, toast } = useStore.getState();
  const stopRef = useRef(false);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const ideas = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const patch = (key: string, p: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...p } : x)));

  const generate = async () => {
    if (!ideas.length) return;
    const list: Item[] = ideas.slice(0, 30).map((idea, i) => ({ key: `${Date.now()}-${i}`, idea, status: "en cola" }));
    setItems(list);
    setRunning("crear");
    stopRef.current = false;
    let notice = "";
    let made = 0;
    for (const it of list) {
      if (stopRef.current) break;
      patch(it.key, { status: "creando" });
      try {
        const req = { ...opts, idea: it.idea };
        const res = await createStory(req);
        if (res.notice) notice = res.notice;
        const p = addFromDraft(res.draft, req, res.demo);
        // Estilo animado: la IA empieza a animar las escenas mientras ya ves el video
        if (p.styleId) void animateAll(p.id);
        patch(it.key, { status: "lista", projectId: p.id });
        made++;
      } catch (e) {
        patch(it.key, { status: "error", error: e instanceof Error ? e.message : "Error" });
      }
    }
    if (notice) toast(notice);
    if (made) toast(`¡Toma! ${made} ${made === 1 ? "video listo" : "videos listos"}`, "success");
    setRunning(null);
  };

  const recordAll = async () => {
    if (!pickMime()) return toast("Este navegador no puede grabar video. Usa Chrome o Edge.", "error");
    setRunning("grabar");
    stopRef.current = false;
    for (const it of items) {
      if (stopRef.current) break;
      const p = useStore.getState().projects.find((x) => x.id === it.projectId);
      if (!p || (it.status !== "lista" && it.status !== "descargada")) continue;
      patch(it.key, { status: "grabando", progress: 0 });
      try {
        const r = await exportVideo(p, { canvas: previewRef.current ?? undefined, onProgress: (v) => patch(it.key, { progress: v }) });
        await saveVideo(r);
        setTimeout(() => URL.revokeObjectURL(r.url), 60_000);
        patch(it.key, { status: "descargada" });
      } catch (e) {
        patch(it.key, { status: "error", error: e instanceof Error ? e.message : "No se pudo grabar" });
      }
    }
    setRunning(null);
  };

  const ready = items.filter((i) => i.status === "lista" || i.status === "descargada").length;

  return (
    <div>
      <TopBar active="batch" />
      <main className="batch">
        <section className="sheet composer">
          <h1>
            Muchas ideas. <span className="tag">Muchos videos.</span>
          </h1>
          <label htmlFor="ideas" className="vh">
            Ideas, una por línea
          </label>
          <textarea id="ideas" className="idea" placeholder={EXAMPLE} value={text} onChange={(e) => setText(e.target.value)} disabled={!!running} />
          <div className="compose-row">
            <OptionChips value={opts} onChange={setOpts} disabled={!!running} />
            {running ? (
              <button className="btn ghost" onClick={() => (stopRef.current = true)} style={{ marginLeft: "auto" }}>
                Parar después de esta
              </button>
            ) : (
              <button className="btn toma" onClick={generate} disabled={!ideas.length}>
                {ideas.length > 1 ? `¡Toma ×${ideas.length}!` : "¡Toma!"}
              </button>
            )}
          </div>
          {!text && (
            <div className="tries">
              <button className="try" onClick={() => setText(EXAMPLE)}>
                Usar 3 ideas de ejemplo
              </button>
            </div>
          )}
        </section>

        {items.length > 0 && (
          <section className="sheet queue">
            <div className="queue-head">
              <h2>Cola</h2>
              <span className="muted small">
                {ready}/{items.length} listos
              </span>
              <span className="grow" />
              <button className="btn ink" onClick={recordAll} disabled={!!running || !ready}>
                <Download size={17} /> {running === "grabar" ? "Grabando…" : `Grabar y descargar ${ready}`}
              </button>
            </div>
            <div className="batch-preview" hidden={running !== "grabar"}>
              <canvas ref={previewRef} />
              <span className="muted small">Deja esta pestaña a la vista mientras se graba.</span>
            </div>
            <ul className="queue-list">
              {items.map((it) => {
                const p = projects.find((x) => x.id === it.projectId);
                return (
                  <li key={it.key} className={`q-item ${it.status}`}>
                    <span className="q-thumb">{p ? <Thumb project={p} width={44} /> : <Clapperboard size={18} />}</span>
                    <span className="q-text">
                      <span className="q-title">{p?.title ?? it.idea}</span>
                      <span className="q-sub">{it.status === "error" ? it.error : p ? `${p.scenes.length} escenas · ${formatTime(totalDuration(p.scenes))}` : it.idea}</span>
                      {it.status === "grabando" && (
                        <span className="bar thin" style={{ display: "block" }}>
                          <span style={{ width: `${(it.progress ?? 0) * 100}%` }} />
                        </span>
                      )}
                    </span>
                    <span className="q-status">
                      {it.status === "en cola" && <CircleDashed size={17} />}
                      {(it.status === "creando" || it.status === "grabando") && <span className="spinner dark" />}
                      {(it.status === "lista" || it.status === "descargada") && <CheckCircle2 size={17} />}
                      {it.status === "error" && <XCircle size={17} />}
                      {it.status}
                    </span>
                    {p && (
                      <button className="icon-btn sm" onClick={() => go({ name: "result", id: p.id })} title="Abrir" aria-label={`Abrir ${p.title}`}>
                        <ExternalLink size={16} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
