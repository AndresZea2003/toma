// Biblioteca de estilos: cada estilo animado es una «skill» (SKILL.md) que enseña al modelo
// a guionizar y animar en ese estilo. Las de fábrica viven en /styles; las propias, en los datos del usuario.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface StyleSkill {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
  body: string;
}

const builtinDir = () => process.env.TOMA_STYLES_DIR || path.resolve("styles");
const userDir = () => path.resolve(process.env.TOMA_DATA_DIR ?? ".", process.env.TOMA_DATA_DIR ? "styles" : ".toma-browser/styles");

function parse(id: string, text: string, builtin: boolean): StyleSkill {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const head = m?.[1] ?? "";
  const field = (k: string) => head.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1].trim() ?? "";
  return { id, name: field("name") || id, description: field("description"), builtin, body: (m?.[2] ?? text).trim() };
}

function scan(dir: string, builtin: boolean): StyleSkill[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(dir, d.name, "SKILL.md")))
    .map((d) => parse(d.name, readFileSync(path.join(dir, d.name, "SKILL.md"), "utf8"), builtin));
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

export function saveStyle(name: string, description: string, body: string): StyleSkill {
  let id = slug(name);
  const taken = new Set(listStyles().map((s) => s.id));
  for (let n = 2; taken.has(id); n++) id = `${slug(name)}-${n}`;
  const dir = path.join(userDir(), id);
  mkdirSync(dir, { recursive: true });
  const clean = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
  writeFileSync(path.join(dir, "SKILL.md"), `---\nname: ${clean(name)}\ndescription: ${clean(description)}\n---\n\n${body.trim()}\n`);
  return getStyle(id)!;
}

export function deleteStyle(id: string) {
  const style = getStyle(id);
  if (!style || style.builtin) return false;
  rmSync(path.join(userDir(), id), { recursive: true, force: true });
  return true;
}
