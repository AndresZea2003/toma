import { ArrowDownToLine, Check, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface Update {
  desktop: boolean;
  state?: "idle" | "checking" | "none" | "downloading" | "ready" | "error";
  version?: string;
  next?: string;
  percent?: number;
  error?: string;
}

const call = (path = "", method = "GET") =>
  fetch(`/api/update${path}`, { method })
    .then((r) => r.json() as Promise<Update>)
    .catch(() => ({ desktop: false }) as Update);

/** Botón de actualización de la app de escritorio */
export function UpdateChip() {
  const [u, setU] = useState<Update>({ desktop: false });
  const busy = u.state === "checking" || u.state === "downloading";

  useEffect(() => {
    void call().then(setU);
  }, []);
  useEffect(() => {
    // Mientras busca o descarga, seguir el progreso; en reposo, mirar de vez en cuando
    const t = setInterval(() => void call().then(setU), busy ? 1500 : 60_000);
    return () => clearInterval(t);
  }, [busy]);

  if (!u.desktop) return null;

  if (u.state === "ready")
    return (
      <button className="btn toma md" onClick={() => void call("/install", "POST")} title={`Instalar la versión ${u.next} y reiniciar Toma`}>
        <ArrowDownToLine size={17} strokeWidth={2.6} /> Actualizar a {u.next}
      </button>
    );

  const label =
    u.state === "checking"
      ? "Buscando…"
      : u.state === "downloading"
        ? `Descargando ${u.next ?? ""} ${u.percent ?? 0}%`
        : u.state === "none"
          ? "Al día"
          : u.state === "error"
            ? "No pude actualizar"
            : "Buscar actualización";
  return (
    <button
      className="chip ai-chip"
      disabled={busy}
      onClick={() => void call("/check", "POST").then(setU)}
      title={u.state === "error" ? u.error : `Toma ${u.version}. Pulsa para buscar una versión nueva.`}
    >
      {u.state === "none" ? <Check size={15} /> : <RefreshCw size={15} className={busy ? "spin" : undefined} />}
      <b>v{u.version}</b>
      <span>{label}</span>
    </button>
  );
}
