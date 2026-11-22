import { ExternalLink, Minimize2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ChipSelect } from "./ui";

type Tool = "flow" | "aistudio" | "flowmusic" | "chatgpt";
const NAMES: Record<Tool, string> = { flow: "Flow", aistudio: "Gemini", flowmusic: "Flow Music", chatgpt: "ChatGPT" };

const post = (url: string, body: unknown = {}) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => undefined);

/**
 * Ver en vivo, dentro de Toma, lo que el piloto hace en cada web.
 * El trabajo ocurre en una ventana de Chrome minimizada; solo hay que abrirla para iniciar sesión.
 */
export function PilotChip() {
  const [tool, setTool] = useState<Tool | "">("");
  const [frame, setFrame] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (!tool) return;
    let alive = true;
    let last: string | null = null;
    setFrame(null);
    setEmpty(false);
    const tick = async () => {
      try {
        const r = await fetch(`/api/robot/preview/${tool}`);
        if (!alive) return;
        if (r.ok) {
          const url = URL.createObjectURL(await r.blob());
          if (!alive) return URL.revokeObjectURL(url);
          setFrame(url);
          setEmpty(false);
          if (last) URL.revokeObjectURL(last);
          last = url;
        } else setEmpty(true);
      } catch {
        /* se reintenta */
      }
      if (alive) timer = setTimeout(tick, 1500);
    };
    let timer = setTimeout(tick, 0);
    return () => {
      alive = false;
      clearTimeout(timer);
      if (last) URL.revokeObjectURL(last);
    };
  }, [tool]);

  return (
    <>
      <ChipSelect<Tool | "">
        label="Piloto"
        value={tool}
        onChange={setTool}
        options={[
          { value: "", label: "Oculto" },
          { value: "flow", label: "Flow", note: "clips e imágenes" },
          { value: "aistudio", label: "Gemini", note: "voces" },
          { value: "flowmusic", label: "Flow Music", note: "música" },
          { value: "chatgpt", label: "ChatGPT", note: "imágenes" },
        ]}
      />
      {tool && (
        <aside className="pilot-live sticker" aria-label={`Piloto en ${NAMES[tool]}`}>
          <header>
            <strong>{NAMES[tool]} en vivo</strong>
            <span className="grow" />
            <button className="icon-btn sm" onClick={() => setTool("")} aria-label="Cerrar vista del piloto">
              <X size={15} />
            </button>
          </header>
          <div className="pilot-screen">
            {frame && !empty ? <img src={frame} alt={`Lo que el piloto ve en ${NAMES[tool]}`} /> : <p>{empty ? `El piloto aún no ha abierto ${NAMES[tool]}.` : "Conectando…"}</p>}
          </div>
          <footer>
            <button className="btn soft sm" onClick={() => void post("/api/robot/open", { tool })}>
              <ExternalLink size={14} /> Abrir en Chrome
            </button>
            <button className="btn ghost sm" onClick={() => void post("/api/robot/hide")}>
              <Minimize2 size={14} /> Minimizar Chrome
            </button>
          </footer>
          <p className="small muted">Para iniciar sesión, abre Chrome; el resto lo ves aquí.</p>
        </aside>
      )}
    </>
  );
}
