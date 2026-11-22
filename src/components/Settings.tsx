import { Check, FolderOpen, KeyRound, Settings as Gear, X } from "lucide-react";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { openVideosFolder } from "../engine/export";
import { useStore } from "../store";
import { Field, Modal } from "./ui";

interface KeyState {
  set: boolean;
  hint: string | null;
  fromEnv?: boolean;
  voiceId?: string | null;
}
interface SettingsState {
  anthropic: KeyState;
  elevenlabs: KeyState;
  encrypted: boolean;
  load: () => Promise<void>;
}

/** Lo que la interfaz sabe de la configuración: si hay clave, nunca la clave */
export const useSettings = create<SettingsState>((set) => ({
  anthropic: { set: false, hint: null },
  elevenlabs: { set: false, hint: null },
  encrypted: false,
  load: async () => {
    try {
      set(await fetch("/api/settings").then((r) => r.json()));
    } catch {
      /* sin servidor */
    }
  },
}));

const save = async (patch: Record<string, string | null>) => {
  const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "No se pudo guardar");
  await useSettings.getState().load();
};

function KeyField({ label, help, link, state, field, placeholder }: { label: string; help: string; link: string; state: KeyState; field: string; placeholder: string }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useStore.getState();
  const run = async (v: string | null) => {
    setBusy(true);
    try {
      await save({ [field]: v });
      setValue("");
      toast(v ? "Clave guardada." : "Clave borrada.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No se pudo guardar", "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Field
      label={label}
      hint={
        state.set ? (
          <span className="key-ok">
            <Check size={13} strokeWidth={3} /> Guardada {state.hint}
          </span>
        ) : state.fromEnv ? (
          "Usando la del archivo .env"
        ) : (
          "Sin configurar"
        )
      }
    >
      <form
        className="key-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) void run(value.trim());
        }}
      >
        <input className="text-input" type="password" autoComplete="off" spellCheck={false} value={value} onChange={(e) => setValue(e.target.value)} placeholder={state.set ? "Pega otra clave para cambiarla" : placeholder} disabled={busy} aria-label={label} />
        <button className="btn ink" type="submit" disabled={busy || !value.trim()}>
          Guardar
        </button>
        {state.set && (
          <button className="btn ghost" type="button" disabled={busy} onClick={() => void run(null)}>
            Borrar
          </button>
        )}
      </form>
      <span className="small muted">
        {help}{" "}
        <a href={link} target="_blank" rel="noreferrer">
          Conseguir una clave
        </a>
      </span>
    </Field>
  );
}

function ElevenVoice() {
  const el = useSettings((s) => s.elevenlabs);
  const [voices, setVoices] = useState<{ id: string; name: string; labels: string }[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!el.set) return setVoices(null);
    setError("");
    fetch("/api/voices")
      .then(async (r) => (r.ok ? setVoices(await r.json()) : setError((await r.json()).error ?? "No pude cargar las voces")))
      .catch(() => setError("No pude cargar las voces"));
  }, [el.set, el.hint]);
  if (!el.set) return null;
  if (error) return <p className="small warn">{error}</p>;
  return (
    <Field label="Voz de ElevenLabs" hint={voices ? `${voices.length} voces en tu cuenta` : "Cargando…"}>
      <select className="select" value={el.voiceId ?? ""} onChange={(e) => void save({ elevenLabsVoiceId: e.target.value || null })} disabled={!voices}>
        <option value="">La primera de tu cuenta</option>
        {voices?.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
            {v.labels ? ` · ${v.labels}` : ""}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const s = useSettings();
  useEffect(() => {
    void useSettings.getState().load();
  }, []);
  return (
    <>
      <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Configuración" title="Configuración">
        <Gear size={19} />
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} width={620}>
          <div className="modal-head">
            <h2>Configuración</h2>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Cerrar">
              <X size={19} />
            </button>
          </div>
          <div className="modal-body">
            <p className="small muted key-note">
              <KeyRound size={14} /> Tus claves se guardan solo en este equipo{s.encrypted ? ", cifradas con el almacén seguro del sistema" : ""}. Toma nunca las muestra ni las envía a nadie más que al servicio de cada una.
            </p>
            <KeyField
              label="Clave de Claude (Anthropic)"
              field="anthropicKey"
              state={s.anthropic}
              placeholder="sk-ant-…"
              help="Para guiones y animaciones con la API de Claude. No hace falta si usas Claude Code o Codex."
              link="https://console.anthropic.com/settings/keys"
            />
            <KeyField
              label="Clave de ElevenLabs"
              field="elevenLabsKey"
              state={s.elevenlabs}
              placeholder="sk_…"
              help="Para que la narración la lean las voces de ElevenLabs en lugar de Gemini."
              link="https://elevenlabs.io/app/settings/api-keys"
            />
            <ElevenVoice />
            <Field label="Videos descargados">
              <button className="btn soft" style={{ alignSelf: "flex-start" }} onClick={() => void openVideosFolder()}>
                <FolderOpen size={17} /> Abrir la carpeta de videos
              </button>
            </Field>
          </div>
        </Modal>
      )}
    </>
  );
}
