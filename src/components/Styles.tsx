import { Clapperboard, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { codeError } from "../engine/sandbox";
import { animateAll, animateScene, createStyle, deleteStyle, useAnim } from "../lib/animate";
import { useStore } from "../store";
import type { Project, Scene } from "../types";
import { ChipSelect, Field, Modal } from "./ui";

const NEW = "__nuevo";

/** Chip de la biblioteca de estilos: clásico, skills animadas por IA y «crear estilo» */
export function StyleChip({ value, onChange, disabled }: { value?: string; onChange: (id?: string) => void; disabled?: boolean }) {
  const styles = useAnim((s) => s.styles);
  const [creating, setCreating] = useState(false);
  return (
    <>
      <ChipSelect<string>
        label="Estilo"
        value={value ?? ""}
        disabled={disabled}
        onChange={(v) => (v === NEW ? setCreating(true) : onChange(v || undefined))}
        options={[
          { value: "", label: "Ilustrado", note: "fondos y emojis" },
          ...styles.map((s) => ({ value: s.id, label: s.name, note: s.builtin ? "animado por IA" : "tuyo · animado por IA" })),
          { value: NEW, label: "＋ Crear estilo…" },
        ]}
      />
      {creating && (
        <StyleModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            onChange(id);
          }}
        />
      )}
    </>
  );
}

function StyleModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const styles = useAnim((s) => s.styles);
  const { toast } = useStore.getState();
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const mine = styles.filter((s) => !s.builtin);

  const create = async () => {
    setBusy(true);
    try {
      const s = await createStyle(name.trim(), brief.trim());
      toast(`¡Toma! Estilo «${s.name}» añadido a tu biblioteca.`, "success");
      onCreated(s.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo crear el estilo", "error");
      setBusy(false);
    }
  };

  return (
    <Modal onClose={busy ? undefined : onClose} width={560}>
      <div className="modal-head">
        <h2>Crear un estilo</h2>
        <button className="icon-btn" onClick={onClose} disabled={busy} aria-label="Cerrar">
          <X size={19} />
        </button>
      </div>
      <div className="modal-body">
        <p className="muted small">Describe cómo quieres que se vean tus videos. La IA escribe la «skill» del estilo: sus reglas de guion, colores, trazos y movimiento. Después la usa en cada escena.</p>
        <Field label="Nombre">
          <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Cómic retro" maxLength={60} disabled={busy} />
        </Field>
        <Field label="Cómo se ve y se mueve">
          <textarea
            className="text-input"
            rows={5}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Ej.: viñetas de cómic de los 60, tramas de puntos, colores primarios, onomatopeyas que estallan, personajes de contorno grueso…"
            disabled={busy}
          />
        </Field>
        {mine.length > 0 && (
          <Field label="Tus estilos">
            <ul className="style-list">
              {mine.map((s) => (
                <li key={s.id}>
                  <span>
                    <strong>{s.name}</strong>
                    <small>{s.description}</small>
                  </span>
                  <button className="icon-btn sm danger" aria-label={`Borrar ${s.name}`} onClick={() => confirm(`¿Borrar el estilo «${s.name}»?`) && void deleteStyle(s.id)}>
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </Field>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose} disabled={busy}>
          Ahora no
        </button>
        <button className="btn toma md" onClick={create} disabled={busy || name.trim().length < 2 || brief.trim().length < 12}>
          {busy ? (
            <>
              <span className="spinner" /> Escribiendo la skill…
            </>
          ) : (
            <>
              <Sparkles size={17} /> Crear estilo
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}

/** Progreso de las animaciones del video (pantalla de resultado) */
export function AnimProgress({ project }: { project: Project }) {
  const working = useAnim((s) => s.working);
  const styles = useAnim((s) => s.styles);
  if (!project.styleId) return null;
  const done = project.scenes.filter((s) => s.code).length;
  const busy = project.scenes.filter((s) => working[s.id] === "working").length;
  const total = project.scenes.length;
  const name = styles.find((s) => s.id === project.styleId)?.name ?? "animado";
  if (done === total && !busy) return null;
  return (
    <section className="boost" aria-label="Animación del video">
      <h3>Estilo {name}</h3>
      {busy > 0 ? (
        <p className="robot-line" role="status">
          <span className="spinner dark" aria-hidden />
          <span>
            <strong>
              La IA está animando · {done}/{total} escenas listas
            </strong>
            <small>Cada escena aparece en el video en cuanto termina.</small>
          </span>
        </p>
      ) : (
        <>
          <p>
            {done}/{total} escenas animadas. Las que faltan se ven con el estilo ilustrado.
          </p>
          <button className="btn toma md" onClick={() => void animateAll(project.id)}>
            <Clapperboard size={17} strokeWidth={2.4} /> Animar las que faltan
          </button>
        </>
      )}
    </section>
  );
}

/** Animación de una escena: regenerar o pedir un cambio (pestaña Visual) */
export function SceneAnimation({ project, scene }: { project: Project; scene: Scene }) {
  const state = useAnim((s) => s.working[scene.id]);
  const [text, setText] = useState("");
  const { updateScene } = useStore.getState();
  if (!project.styleId) return null;
  const busy = state === "working";
  const error = scene.code ? codeError(scene.code) : undefined;
  return (
    <div className="ask anim">
      <div className="ask-head">
        <Clapperboard size={16} /> Animación por IA
      </div>
      {error && <p className="small warn">Esta animación falló al dibujarse: {error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void animateScene(project.id, scene.id, { instruction: text.trim() || undefined, error }).then((ok) => ok && setText(""));
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={scene.code ? "Ej.: que la cifra suba más despacio" : "Opcional: qué quieres ver"} disabled={busy} aria-label="Cambio en la animación" />
        <button className="go" type="submit" disabled={busy} aria-label={scene.code ? "Rehacer animación" : "Crear animación"} title={scene.code ? "Rehacer" : "Crear"}>
          {busy ? <span className="spinner" /> : <RefreshCw size={16} />}
        </button>
      </form>
      <div className="ask-sugs">
        <span className="small muted">{busy ? "La IA está escribiendo la animación…" : scene.code ? "Deja el campo vacío para otra versión." : "Esta escena aún no tiene animación."}</span>
        {scene.code && !busy && (
          <button onClick={() => updateScene(project.id, scene.id, { code: undefined })}>Quitar animación</button>
        )}
      </div>
    </div>
  );
}
