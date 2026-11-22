import { BrainCircuit } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "../store";
import type { AiProvider } from "../types";
import { Field, Seg, useDismiss } from "./ui";

const NAMES: Record<AiProvider, string> = { api: "API de Claude", "claude-code": "Claude Code", codex: "Codex" };

const CLAUDE_MODELS = [
  { id: "claude-fable-5-2", label: "Fable 5.2 · el más capaz" },
  { id: "claude-opus-5-5", label: "Opus 5.5" },
  { id: "claude-sonnet-5-5", label: "Sonnet 5.5 · rápido" },
  { id: "claude-haiku-5-5", label: "Haiku 5.5 · el más rápido" },
];
const EFFORTS: Record<AiProvider, string[]> = {
  api: ["low", "medium", "high", "xhigh", "max"],
  "claude-code": ["low", "medium", "high", "xhigh", "max"],
  codex: ["low", "medium", "high"],
};
const EFFORT_LABEL: Record<string, string> = { "": "Auto", low: "Bajo", medium: "Medio", high: "Alto", xhigh: "Muy alto", max: "Máx." };

type Availability = Record<AiProvider, string | boolean | null>;

/** Con qué IA escribe Toma los guiones: proveedor, modelo y esfuerzo */
export function AiPicker() {
  const ai = useStore((s) => s.ai);
  const setAi = useStore((s) => s.setAi);
  const [open, setOpen] = useState(false);
  const [avail, setAvail] = useState<Availability | null>(null);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    fetch("/api/ai/providers")
      .then((r) => r.json())
      .then(setAvail)
      .catch(() => setAvail(null));
  }, [open]);

  const status = (p: AiProvider) => {
    if (!avail) return "";
    if (p === "api") return avail.api ? "Clave configurada." : "Sin clave: Toma usará el modo demo. Ponla en el archivo .env.";
    return avail[p] ? `Instalado (${avail[p]}). Usa tu sesión, sin clave.` : `No encontré ${NAMES[p]} instalado en este equipo.`;
  };
  const short = ai.model ? ai.model.replace(/^claude-/, "") : "";

  return (
    <div className="rel" ref={ref}>
      <button className="chip ai-chip" aria-expanded={open} onClick={() => setOpen((v) => !v)} title="Con qué IA se escriben los guiones">
        <BrainCircuit size={16} />
        <b>{NAMES[ai.provider]}</b>
        {short && <span>{short}</span>}
        {ai.effort && <span>{EFFORT_LABEL[ai.effort] ?? ai.effort}</span>}
      </button>
      {open && (
        <div className="settings" role="dialog" aria-label="IA para los guiones">
          <Field label="Quién escribe los guiones">
            <Seg
              label="Proveedor"
              value={ai.provider}
              onChange={(p) => setAi({ provider: p, model: "", effort: "" })}
              options={(Object.keys(NAMES) as AiProvider[]).map((p) => ({ value: p, label: NAMES[p] }))}
            />
            <span className={avail && !avail[ai.provider] ? "small warn" : "small muted"} aria-live="polite">
              {status(ai.provider) || "Comprobando…"}
            </span>
          </Field>

          <Field label="Modelo" hint={ai.model ? undefined : "el predeterminado"}>
            {ai.provider === "codex" ? (
              <input className="text-input" value={ai.model} onChange={(e) => setAi({ model: e.target.value.trim() })} placeholder="Predeterminado de Codex (o escribe un modelo)" aria-label="Modelo de Codex" />
            ) : (
              <select className="select" value={ai.model} onChange={(e) => setAi({ model: e.target.value })} aria-label="Modelo">
                <option value="">Predeterminado</option>
                {CLAUDE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Esfuerzo" hint="más esfuerzo = mejor guion, más lento">
            <Seg size="sm" label="Esfuerzo" value={ai.effort} onChange={(e) => setAi({ effort: e })} options={["", ...EFFORTS[ai.provider]].map((e) => ({ value: e, label: EFFORT_LABEL[e] ?? e }))} />
          </Field>
        </div>
      )}
    </div>
  );
}
