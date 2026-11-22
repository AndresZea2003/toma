import { ChevronDown, Play, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ensureFonts, loadSceneMedia, renderThumb } from "../engine/render";
import { onCodeFrame } from "../engine/sandbox";
import { onMediaFrame } from "../lib/media";
import { AiPicker } from "./AiPicker";
import { PilotChip } from "./PilotChip";
import { UpdateChip } from "./UpdateChip";
import { FORMAT_INFO } from "../lib/presets";
import { useStore, type View } from "../store";
import type { Project } from "../types";

export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button className="logo" onClick={onClick} aria-label="Toma, ir al inicio">
      <span className="logo-mark" aria-hidden>
        <Play size={15} fill="currentColor" strokeWidth={0} />
      </span>
      Toma
    </button>
  );
}

export function TopBar({ active, children }: { active?: View["name"]; children?: ReactNode }) {
  const go = useStore((s) => s.go);
  return (
    <header className="topbar">
      <Logo onClick={() => go({ name: "home" })} />
      {active && (
        <nav className="tabs" aria-label="Secciones">
          <button className={active === "home" ? "tab on" : "tab"} onClick={() => go({ name: "home" })}>
            Crear
          </button>
          <button className={active === "batch" ? "tab on" : "tab"} onClick={() => go({ name: "batch" })}>
            En lote
          </button>
        </nav>
      )}
      <span className="grow" />
      <UpdateChip />
      <PilotChip />
      <AiPicker />
      {children}
    </header>
  );
}

export function Seg<T extends string | number>({
  value,
  options,
  onChange,
  label,
  size,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  size?: "sm";
}) {
  return (
    <div className={size ? `seg ${size}` : "seg"} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field-head">
        <span className="label">{label}</span>
        {hint && <span className="hint-r">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden>
        <span className="toggle-thumb" />
      </span>
      {label}
    </label>
  );
}

/** Cierra un popover al hacer clic fuera o pulsar Escape */
export function useDismiss<T extends HTMLElement>(open: boolean, close: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

/** Chip que muestra un valor por defecto y lo cambia con un toque */
export function ChipSelect<T extends string | number | undefined>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode; note?: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss<HTMLDivElement>(open, () => setOpen(false));
  const current = options.find((o) => o.value === value);
  return (
    <div className="chipsel" ref={ref}>
      <button className="chip" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)} disabled={disabled}>
        {label} <b>{current?.label}</b>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="menu" role="listbox" aria-label={label}>
          {options.map((o) => (
            <button
              key={String(o.value)}
              role="option"
              aria-selected={o.value === value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.label}
              {o.note && <small>{o.note}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismiss);
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone ?? "info"}`}>
          <span>{t.text}</span>
          <button className="icon-btn sm" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso">
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function Modal({ children, onClose, width = 540 }: { children: ReactNode; onClose?: () => void; width?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

/** Miniatura dibujada con el motor real */
export function Thumb({ project, index = 0, width = 240, className }: { project: Project; index?: number; width?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const info = FORMAT_INFO[project.format];
  const height = Math.round((width * info.h) / info.w);
  useEffect(() => {
    let alive = true;
    const draw = () => alive && ref.current && renderThumb(ref.current, project, index);
    void Promise.all([ensureFonts(), loadSceneMedia(project)]).then(draw);
    const offMedia = onMediaFrame(draw);
    const offCode = onCodeFrame(draw);
    const off = () => (offMedia(), offCode());
    return () => {
      alive = false;
      off();
    };
  }, [project, index, width]);
  return <canvas ref={ref} width={width * 2} height={height * 2} className={className} style={{ aspectRatio: `${info.w} / ${info.h}` }} />;
}

/** Copiar al portapapeles con confirmación visible */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
  };
  return { copied, copy };
}
