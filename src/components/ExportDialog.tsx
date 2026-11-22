import { Check, Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { download, exportVideo, pickMime, type ExportResult } from "../engine/export";
import { FORMAT_INFO } from "../lib/presets";
import { formatTime, totalDuration } from "../lib/util";
import type { Project } from "../types";
import { Modal, Seg } from "./ui";

type Phase = "setup" | "rendering" | "done" | "error";

export function ExportDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const [quality, setQuality] = useState<"full" | "hd">("full");
  const [phase, setPhase] = useState<Phase>("setup");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mime = pickMime();
  const info = FORMAT_INFO[project.format];
  const total = totalDuration(project.scenes);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => () => void (result && URL.revokeObjectURL(result.url)), [result]);

  const start = async () => {
    setPhase("rendering");
    setProgress(0);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const r = await exportVideo(project, { canvas: canvasRef.current!, quality, signal: ac.signal, onProgress: setProgress });
      setResult(r);
      setPhase("done");
      download(r.url, r.filename);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return setPhase("setup");
      setError(e instanceof Error ? e.message : "No se pudo grabar el video.");
      setPhase("error");
    }
  };

  const close = () => {
    abortRef.current?.abort();
    onClose();
  };

  return (
    <Modal onClose={phase === "rendering" ? undefined : close} width={560}>
      <div className="modal-head">
        <h2>{phase === "done" ? "¡Toma! Tu video" : phase === "rendering" ? "Despegando tu video…" : "Descargar video"}</h2>
        <button className="icon-btn" onClick={close} aria-label="Cerrar">
          <X size={19} />
        </button>
      </div>

      <div className="modal-body">
        <div className="export-stage" hidden={phase === "setup" || phase === "error"}>
          <div className={phase === "done" ? "peelable peeled peeling" : "peelable"}>
            <canvas ref={canvasRef} />
            {phase === "done" && result && <video src={result.url} controls autoPlay muted loop playsInline />}
          </div>
        </div>

        {phase === "setup" && (
          <>
            <div className="facts">
              <span>{formatTime(total)}</span>
              <span>
                {info.label} {project.format}
              </span>
              <span>{mime ? (mime.includes("mp4") ? "MP4" : "WebM") : "Sin grabación"}</span>
            </div>
            <Seg
              label="Calidad"
              value={quality}
              onChange={setQuality}
              options={[
                { value: "full", label: "Full HD" },
                { value: "hd", label: "Ligera" },
              ]}
            />
            <p className="muted small">
              Se graba en tiempo real (≈{formatTime(total)}). Deja esta pestaña a la vista mientras tanto.
              {project.voice && " La voz del navegador no se graba: el video lleva música y subtítulos."}
              {!mime && " Este navegador no puede grabar video: usa Chrome o Edge."}
            </p>
          </>
        )}

        {phase === "rendering" && (
          <div>
            <div className="bar" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="muted small" style={{ marginTop: 8 }}>
              {Math.round(progress * 100)}% · {formatTime(progress * total)} de {formatTime(total)}
            </p>
          </div>
        )}

        {phase === "done" && result && (
          <p className="done-line">
            <Check size={18} strokeWidth={3} /> Guardado como {result.filename} · {(result.blob.size / 1e6).toFixed(1)} MB
          </p>
        )}
        {phase === "error" && <p className="error-text">{error}</p>}
      </div>

      <div className="modal-foot">
        {phase === "setup" && (
          <>
            <button className="btn ghost" onClick={close}>
              Ahora no
            </button>
            <button className="btn toma md" onClick={start} disabled={!mime}>
              <Download size={18} strokeWidth={2.6} /> Grabar y descargar
            </button>
          </>
        )}
        {phase === "rendering" && (
          <button className="btn ghost" onClick={() => abortRef.current?.abort()}>
            Cancelar
          </button>
        )}
        {phase === "done" && result && (
          <>
            <button className="btn soft" onClick={() => download(result.url, result.filename)}>
              <Download size={17} /> Descargar otra vez
            </button>
            <button className="btn ink" onClick={close}>
              Listo
            </button>
          </>
        )}
        {phase === "error" && (
          <button className="btn ink" onClick={() => setPhase("setup")}>
            Reintentar
          </button>
        )}
      </div>
    </Modal>
  );
}
