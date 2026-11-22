import { Image as ImageIcon, Plus, Sparkles, Type, Wand2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { drawBackground } from "../engine/backgrounds";
import { aiEditScene, ApiError } from "../lib/api";
import { BACKGROUND_LABELS, CAMERA_LABELS, MOTION_LABELS, TEXT_STYLE_LABELS, TRANSITION_LABELS } from "../lib/presets";
import { useStore } from "../store";
import { ACTOR_SIZES, BACKGROUNDS, CAMERAS, MOTIONS, TEXT_STYLES, TRANSITIONS, type Actor, type Background, type Project, type Scene } from "../types";
import { VoiceOver } from "./Audio";
import { MaterialTab } from "./Material";
import { SceneAnimation } from "./Styles";
import { Field, Seg } from "./ui";

export type InspectorTab = "texto" | "visual" | "material";

const bgPreviews = new Map<Background, string>();
function bgPreview(bg: Background) {
  let url = bgPreviews.get(bg);
  if (!url) {
    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 90;
    drawBackground(c.getContext("2d")!, bg, 120, 90, 1.5, 7);
    url = c.toDataURL();
    bgPreviews.set(bg, url);
  }
  return url;
}

const EMOJI_PICKS = ["🦊", "🐱", "🐶", "🦉", "🐳", "🦋", "🌙", "⭐", "☀️", "🌸", "🌲", "🚀", "🪐", "☕", "📚", "💡", "❤️", "🎉", "🎁", "🛍️", "💪", "🧠", "✈️", "🏠"];
const SUGGESTIONS = ["Más emotiva", "Más corta y directa", "Que pase de noche", "Añade un personaje"];

function AskAI({ project, scene }: { project: Project; scene: Scene }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const { updateScene, toast } = useStore.getState();

  const run = async (instruction: string) => {
    if (!instruction.trim() || busy) return;
    setBusy(true);
    try {
      const { media: _m, hideActors: _h, id: _id, ...rest } = scene;
      const next = await aiEditScene({ projectTitle: project.title, idea: project.idea, styleGuide: project.styleGuide, scene: rest, instruction, language: project.language });
      updateScene(project.id, scene.id, next);
      setText("");
      toast("¡Escena reescrita!", "success");
    } catch (e) {
      toast(
        e instanceof ApiError && e.code === "no_key"
          ? "Para pedir cambios a la IA, añade tu ANTHROPIC_API_KEY en .env y reinicia."
          : e instanceof Error
            ? e.message
            : "No se pudo cambiar la escena",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ask">
      <div className="ask-head">
        <Wand2 size={16} /> Pídele un cambio
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(text);
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej.: que el zorro mire la luna" disabled={busy} aria-label="Cambio que quieres" />
        <button className="go" type="submit" disabled={!text.trim() || busy} aria-label="Aplicar cambio">
          {busy ? <span className="spinner" /> : <Sparkles size={17} />}
        </button>
      </form>
      <div className="ask-sugs">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => void run(s)} disabled={busy}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActorRow({ actor, onChange, onRemove }: { actor: Actor; onChange: (a: Actor) => void; onRemove: () => void }) {
  const [picker, setPicker] = useState(false);
  return (
    <div className="actor">
      <div className="actor-top">
        <button className="emoji-btn" onClick={() => setPicker((v) => !v)} aria-label="Cambiar personaje" aria-expanded={picker}>
          {actor.emoji}
        </button>
        <select className="select sm" value={actor.motion} onChange={(e) => onChange({ ...actor, motion: e.target.value as Actor["motion"] })} aria-label="Movimiento">
          {MOTIONS.map((m) => (
            <option key={m} value={m}>
              {MOTION_LABELS[m]}
            </option>
          ))}
        </select>
        <Seg size="sm" label="Tamaño" value={actor.size} onChange={(v) => onChange({ ...actor, size: v })} options={ACTOR_SIZES.map((s) => ({ value: s, label: s.toUpperCase() }))} />
        <button className="icon-btn sm danger" onClick={onRemove} aria-label="Quitar personaje">
          <X size={15} />
        </button>
      </div>
      {picker && (
        <div className="emoji-picker">
          {EMOJI_PICKS.map((e) => (
            <button
              key={e}
              onClick={() => {
                onChange({ ...actor, emoji: e });
                setPicker(false);
              }}
            >
              {e}
            </button>
          ))}
          <input
            className="emoji-custom"
            placeholder="Pega otro emoji y pulsa Enter"
            maxLength={4}
            onKeyDown={(ev) => {
              const v = (ev.target as HTMLInputElement).value.trim();
              if (ev.key === "Enter" && v) {
                onChange({ ...actor, emoji: v });
                setPicker(false);
              }
            }}
            aria-label="Otro emoji"
          />
        </div>
      )}
      <div className="actor-pos">
        <label>
          Horizontal
          <input type="range" min={0.05} max={0.95} step={0.01} value={actor.x} onChange={(e) => onChange({ ...actor, x: +e.target.value })} />
        </label>
        <label>
          Vertical
          <input type="range" min={0.05} max={0.95} step={0.01} value={actor.y} onChange={(e) => onChange({ ...actor, y: +e.target.value })} />
        </label>
      </div>
    </div>
  );
}

export function Inspector({ project, scene, tab, onTab }: { project: Project; scene: Scene; tab: InspectorTab; onTab: (t: InspectorTab) => void }) {
  const { updateScene } = useStore.getState();
  const set = (patch: Partial<Scene>) => updateScene(project.id, scene.id, patch);
  const index = project.scenes.findIndex((s) => s.id === scene.id);
  const words = scene.narration.trim() ? scene.narration.trim().split(/\s+/).length : 0;
  const readSecs = words / 2.6;

  const tabs: { id: InspectorTab; label: string; icon: ReactNode }[] = [
    { id: "texto", label: "Texto", icon: <Type size={16} /> },
    { id: "visual", label: "Visual", icon: <ImageIcon size={16} /> },
    { id: "material", label: "Material", icon: <Sparkles size={16} /> },
  ];

  return (
    <aside className="sheet inspector" aria-label={`Escena ${index + 1}`}>
      <div className="insp-tabs" role="tablist" aria-label="Qué retocar">
        {tabs.map((t) => (
          <button key={t.id} role="tab" className="insp-tab" aria-selected={tab === t.id} onClick={() => onTab(t.id)}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
      <div className="insp-body" role="tabpanel">
        {tab === "texto" && (
          <>
            <AskAI project={project} scene={scene} />
            <Field label="Texto en pantalla">
              <textarea className="text-input" rows={2} value={scene.headline} onChange={(e) => set({ headline: e.target.value })} />
            </Field>
            <Seg label="Estilo del texto" value={scene.textStyle} onChange={(v) => set({ textStyle: v })} options={TEXT_STYLES.map((t) => ({ value: t, label: TEXT_STYLE_LABELS[t] }))} />
            <Field label="Narración y subtítulos" hint={readSecs > scene.duration ? <span className="warn">≈{readSecs.toFixed(1)} s de lectura</span> : `${words} palabras`}>
              <textarea className="text-input" rows={3} value={scene.narration} onChange={(e) => set({ narration: e.target.value })} />
            </Field>
            <VoiceOver project={project} scene={scene} />
            <Field label="Duración" hint={`${scene.duration.toFixed(1)} s`}>
              <input type="range" min={1.5} max={12} step={0.5} value={scene.duration} onChange={(e) => set({ duration: +e.target.value })} aria-label="Duración en segundos" />
            </Field>
          </>
        )}

        {tab === "visual" && (
          <>
            <SceneAnimation project={project} scene={scene} />
            <Field label={scene.media ? "Fondo ilustrado (tienes material importado encima)" : "Fondo"}>
              <div className="bg-grid">
                {BACKGROUNDS.map((b) => (
                  <button key={b} className="bg-opt" aria-pressed={!scene.media && scene.background === b} onClick={() => set({ background: b })}>
                    <img src={bgPreview(b)} alt="" />
                    <span>{BACKGROUND_LABELS[b]}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Personajes" hint={`${scene.actors.length}/4`}>
              <div className="actors">
                {scene.actors.map((a, i) => (
                  <ActorRow
                    key={i}
                    actor={a}
                    onChange={(na) => set({ actors: scene.actors.map((x, j) => (j === i ? na : x)) })}
                    onRemove={() => set({ actors: scene.actors.filter((_, j) => j !== i) })}
                  />
                ))}
              </div>
            </Field>
            {scene.actors.length < 4 && (
              <button className="btn soft sm" style={{ alignSelf: "flex-start" }} onClick={() => set({ actors: [...scene.actors, { emoji: "✨", motion: "float", size: "m", x: 0.3 + scene.actors.length * 0.15, y: 0.7 }] })}>
                <Plus size={16} /> Añadir personaje
              </button>
            )}
            <div className="two">
              <Field label="Cámara">
                <select className="select" value={scene.camera} onChange={(e) => set({ camera: e.target.value as Scene["camera"] })}>
                  {CAMERAS.map((c) => (
                    <option key={c} value={c}>
                      {CAMERA_LABELS[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Entrada">
                <select className="select" value={scene.transition} onChange={(e) => set({ transition: e.target.value as Scene["transition"] })} disabled={index === 0}>
                  {TRANSITIONS.map((t) => (
                    <option key={t} value={t}>
                      {TRANSITION_LABELS[t]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </>
        )}

        {tab === "material" && <MaterialTab project={project} scene={scene} />}
      </div>
    </aside>
  );
}
