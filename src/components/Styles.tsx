import { ChevronDown, Clapperboard, Music2, Plus, RefreshCw, Sparkles, Timer, Trash2, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { drawBackground } from "../engine/backgrounds";
import { codeError, codeFrame } from "../engine/sandbox";
import { animateAll, animateScene, createStyle, deleteStyle, useAnim, type StyleInfo } from "../lib/animate";
import { MUSIC_LABELS } from "../lib/presets";
import { useStore } from "../store";
import type { Music, Project, Scene } from "../types";
import { Field, Modal } from "./ui";

/** Miniatura viva de un estilo: su animación de muestra en bucle (o el ilustrado clásico) */
function StylePreview({ style }: { style?: StyleInfo }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = c.width,
      H = c.height;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = ((now - t0) / 1000) % 5.5;
      if (!style) {
        // Ilustrado: un fondo de Toma con su personaje
        drawBackground(ctx, "sunset", W, H, t, 7);
        ctx.font = `${W * 0.3}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("🦊", W / 2, H * 0.72 + Math.sin(t * 1.6) * H * 0.012);
      } else if (style.preview) {
        const bmp = codeFrame(`preview-${style.id}`, style.preview, Math.min(t, 5), W, H, 5, false);
        if (bmp) ctx.drawImage(bmp, 0, 0, W, H);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [style]);
  return <canvas ref={ref} width={216} height={384} className="style-thumb" aria-hidden />;
}

const CLASSIC = { name: "Ilustrado", description: "Fondos ilustrados y emojis animados. No necesita IA: sale al instante." };

/** Chip que abre la biblioteca de estilos */
export function StyleChip({ value, onChange, disabled }: { value?: string; onChange: (id: string | undefined, style?: StyleInfo) => void; disabled?: boolean }) {
  const styles = useAnim((s) => s.styles);
  const [open, setOpen] = useState(false);
  const current = styles.find((s) => s.id === value);
  return (
    <>
      <button className="chip" onClick={() => setOpen(true)} disabled={disabled} aria-haspopup="dialog">
        Estilo <b>{current?.name ?? CLASSIC.name}</b>
        <ChevronDown size={15} />
      </button>
      {open && (
        <StyleLibrary
          value={value}
          onClose={() => setOpen(false)}
          onPick={(id, style) => {
            onChange(id, style);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function StyleLibrary({ value, onClose, onPick }: { value?: string; onClose: () => void; onPick: (id: string | undefined, style?: StyleInfo) => void }) {
  const styles = useAnim((s) => s.styles);
  const [creating, setCreating] = useState(false);
  return (
    <Modal onClose={onClose} width={980}>
      <div className="modal-head">
        <h2>{creating ? "Crear un estilo" : "Biblioteca de estilos"}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
          <X size={19} />
        </button>
      </div>
      {creating ? (
        <StyleForm onBack={() => setCreating(false)} onCreated={(s) => onPick(s.id, s)} />
      ) : (
        <div className="modal-body">
          <p className="muted small">Cada estilo es un preset completo: cómo se ve y se mueve, con qué gancho abre, qué música lleva y cuánto dura.</p>
          <div className="style-grid">
            <StyleCard name={CLASSIC.name} description={CLASSIC.description} selected={!value} onPick={() => onPick(undefined)} />
            {styles.map((s) => (
              <StyleCard key={s.id} style={s} name={s.name} description={s.description} selected={value === s.id} onPick={() => onPick(s.id, s)} />
            ))}
            <button className="style-card new" onClick={() => setCreating(true)}>
              <span className="style-new">
                <Plus size={30} />
              </span>
              <strong>Crear estilo</strong>
              <small>Descríbelo y la IA escribe su skill, su preset y su miniatura.</small>
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function StyleCard({ style, name, description, selected, onPick }: { style?: StyleInfo; name: string; description: string; selected: boolean; onPick: () => void }) {
  return (
    <div className={selected ? "style-card on" : "style-card"}>
      <button className="style-pick" onClick={onPick} aria-pressed={selected} aria-label={`Usar el estilo ${name}`}>
        <StylePreview style={style} />
        <strong>{name}</strong>
        <small>{description}</small>
        {style && (
          <span className="style-tags">
            {style.hook && (
              <span title={`Gancho: ${style.hook}`}>
                <Zap size={12} /> {style.hook.split(/[.:]/)[0]}
              </span>
            )}
            {style.music && (
              <span title={style.musicPrompt}>
                <Music2 size={12} /> {MUSIC_LABELS[style.music as Music] ?? style.music}
              </span>
            )}
            {style.seconds && (
              <span>
                <Timer size={12} /> {style.seconds} s
              </span>
            )}
          </span>
        )}
      </button>
      {style && !style.builtin && (
        <button className="vid-del" style={{ opacity: 1 }} aria-label={`Borrar ${name}`} title="Borrar estilo" onClick={() => confirm(`¿Borrar el estilo «${name}»?`) && void deleteStyle(style.id)}>
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

function StyleForm({ onBack, onCreated }: { onBack: () => void; onCreated: (s: StyleInfo) => void }) {
  const { toast } = useStore.getState();
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    try {
      const s = await createStyle(name.trim(), brief.trim());
      toast(`¡Toma! Estilo «${s.name}» añadido a tu biblioteca.`, "success");
      onCreated(s);
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo crear el estilo", "error");
      setBusy(false);
    }
  };

  return (
    <>
      <div className="modal-body">
        <p className="muted small">Describe cómo quieres que se vean y suenen tus videos. La IA escribe la skill del estilo (reglas de guion, colores, trazos y movimiento), elige su gancho y su música, y dibuja la miniatura. Tarda uno o dos minutos.</p>
        <Field label="Nombre">
          <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej.: Cómic retro" maxLength={60} disabled={busy} />
        </Field>
        <Field label="Cómo se ve, se mueve y suena">
          <textarea
            className="text-input"
            rows={6}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Ej.: viñetas de cómic de los 60, tramas de puntos, colores primarios, onomatopeyas que estallan. Abre con una exclamación. Música surf rock."
            disabled={busy}
          />
        </Field>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={onBack} disabled={busy}>
          Volver a la biblioteca
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
    </>
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
