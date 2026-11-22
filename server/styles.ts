// Biblioteca de estilos: cada estilo animado es una «skill» (SKILL.md) que enseña al modelo
// a guionizar y animar en ese estilo, y además funciona como preset: música, gancho, tono y duración.
// Las de fábrica viven en /styles; las propias, en los datos del usuario.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface StyleMeta {
  name: string;
  description: string;
  /** Música generada por Toma que mejor encaja: calma, alegre, sueño, epica o ninguna */
  music?: string;
  /** Descripción (en inglés) para pedir la banda sonora a Flow Music */
  musicPrompt?: string;
  /** Tipo de gancho con el que abren los videos de este estilo */
  hook?: string;
  tone?: string;
  seconds?: number;
}

export interface StyleSkill extends StyleMeta {
  id: string;
  builtin: boolean;
  body: string;
  /** Animación de muestra para la miniatura de la biblioteca */
  preview?: string;
}

const builtinDir = () => process.env.TOMA_STYLES_DIR || path.resolve("styles");
const userDir = () => path.resolve(process.env.TOMA_DATA_DIR ?? ".", process.env.TOMA_DATA_DIR ? "styles" : ".toma-browser/styles");

function parse(id: string, dir: string, builtin: boolean): StyleSkill {
  const text = readFileSync(path.join(dir, "SKILL.md"), "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const head = m?.[1] ?? "";
  const field = (k: string) => head.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1].trim() || undefined;
  const previewFile = path.join(dir, "preview.js");
  return {
    id,
    builtin,
    name: field("name") ?? id,
    description: field("description") ?? "",
    music: field("music"),
    musicPrompt: field("musicPrompt"),
    hook: field("hook"),
    tone: field("tone"),
    seconds: Number(field("seconds")) || undefined,
    body: (m?.[2] ?? text).trim(),
    preview: existsSync(previewFile) ? readFileSync(previewFile, "utf8") : undefined,
  };
}

function scan(dir: string, builtin: boolean): StyleSkill[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(dir, d.name, "SKILL.md")))
    .map((d) => parse(d.name, path.join(dir, d.name), builtin));
}

export function listStyles(): StyleSkill[] {
  const builtin = scan(builtinDir(), true);
  const ids = new Set(builtin.map((s) => s.id));
  return [...builtin, ...scan(userDir(), false).filter((s) => !ids.has(s.id))];
}

export const getStyle = (id: string) => listStyles().find((s) => s.id === id);

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "estilo";

export function saveStyle(meta: StyleMeta, body: string, preview?: string): StyleSkill {
  let id = slug(meta.name);
  const taken = new Set(listStyles().map((s) => s.id));
  for (let n = 2; taken.has(id); n++) id = `${slug(meta.name)}-${n}`;
  const dir = path.join(userDir(), id);
  mkdirSync(dir, { recursive: true });
  const clean = (s: unknown) => String(s).replace(/[\r\n]+/g, " ").trim();
  const head = (["name", "description", "music", "musicPrompt", "hook", "tone", "seconds"] as const)
    .filter((k) => meta[k] !== undefined && meta[k] !== "")
    .map((k) => `${k}: ${clean(meta[k])}`)
    .join("\n");
  writeFileSync(path.join(dir, "SKILL.md"), `---\n${head}\n---\n\n${body.trim()}\n`);
  if (preview) writeFileSync(path.join(dir, "preview.js"), preview);
  return getStyle(id)!;
}

export function deleteStyle(id: string) {
  const style = getStyle(id);
  if (!style || style.builtin) return false;
  rmSync(path.join(userDir(), id), { recursive: true, force: true });
  return true;
}
