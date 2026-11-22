// Guiones con las herramientas que el creador ya tiene instaladas (Claude Code, Codex),
// usando su propia sesión: sin clave de API.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export type CliProvider = "claude-code" | "codex";

const SAFE = /^[\w.:\-\[\]]{1,80}$/; // modelo y esfuerzo van a la línea de comandos: solo caracteres seguros

function run(cmd: string, args: string[], input: string, cwd: string, timeoutMs = 6 * 60_000): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve, reject) => {
    // shell: en Windows los comandos instalados con npm son .cmd
    const child = spawn(cmd, args, { cwd, shell: process.platform === "win32", windowsHide: true });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("La herramienta tardó demasiado en responder."));
    }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, out, err });
    });
    child.stdin.end(input);
  });
}

const versions = new Map<CliProvider, { at: number; version: string | null }>();

/** ¿Está instalada la herramienta? (se recuerda un minuto) */
export async function cliVersion(p: CliProvider): Promise<string | null> {
  const hit = versions.get(p);
  if (hit && Date.now() - hit.at < 60_000) return hit.version;
  let version: string | null = null;
  try {
    const r = await run(p === "codex" ? "codex" : "claude", ["--version"], "", os.tmpdir(), 15_000);
    if (r.code === 0) version = r.out.trim().split("\n")[0].slice(0, 60);
  } catch {
    version = null;
  }
  versions.set(p, { at: Date.now(), version });
  return version;
}

function extractJson(text: string): unknown {
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("La herramienta no devolvió un guion válido.");
  return JSON.parse(text.slice(a, b + 1));
}

/** Ejecuta la herramienta y devuelve su respuesta como texto. Con `schema`, Codex valida la forma del JSON. */
async function cliRun(provider: CliProvider, input: string, model?: string, effort?: string, schema?: Record<string, unknown>): Promise<string> {
  const m = model && SAFE.test(model) ? model : undefined;
  const e = effort && SAFE.test(effort) ? effort : undefined;
  // Carpeta vacía: la herramienta no lee ningún proyecto ni sus instrucciones
  const dir = mkdtempSync(path.join(os.tmpdir(), "toma-ia-"));
  try {
    if (provider === "claude-code") {
      const args = ["-p", "--output-format", "json", "--tools", '""'];
      if (m) args.push("--model", m);
      if (e) args.push("--effort", e);
      const r = await run("claude", args, input, dir);
      try {
        const parsed = JSON.parse(r.out);
        if (parsed.is_error) throw new Error(String(parsed.result || "Claude Code devolvió un error.").slice(0, 300));
        return String(parsed.result ?? "");
      } catch (err) {
        if (r.code !== 0) throw new Error((r.err || r.out || String(err)).trim().split("\n").slice(-2).join(" ").slice(0, 300) || "Claude Code falló.");
        if (err instanceof Error && !(err instanceof SyntaxError)) throw err;
        return r.out;
      }
    }
    const outFile = path.join(dir, "out.txt");
    const args = ["exec", "--skip-git-repo-check", "--ephemeral", "-s", "read-only", "-o", outFile];
    if (schema) {
      const schemaFile = path.join(dir, "schema.json");
      writeFileSync(schemaFile, JSON.stringify(schema));
      args.push("--output-schema", schemaFile);
    }
    if (m) args.push("-m", m);
    if (e) args.push("-c", `model_reasoning_effort=${e}`);
    args.push("-");
    const r = await run("codex", args, input, dir);
    let text = "";
    try {
      text = readFileSync(outFile, "utf8");
    } catch {
      /* sin archivo de salida */
    }
    if (!text.trim()) throw new Error((r.err || r.out).trim().split("\n").slice(-2).join(" ").slice(0, 300) || "Codex no devolvió respuesta.");
    return text;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Respuesta en texto libre (código, Markdown): evita los fallos de escapar código dentro de JSON */
export function cliText(provider: CliProvider, system: string, prompt: string, model?: string, effort?: string) {
  return cliRun(provider, `${system}\n\n${prompt}`, model, effort);
}

export async function cliJson(provider: CliProvider, system: string, prompt: string, schema: Record<string, unknown>, model?: string, effort?: string): Promise<unknown> {
  const full = `${system}\n\n${prompt}\n\nResponde SOLO con un objeto JSON válido que cumpla este JSON Schema, sin explicaciones ni bloques de código. Dentro de los textos no uses comillas dobles: usa comillas angulares « » o simples.\n${JSON.stringify(schema)}`;
  let lastError: unknown;
  // El JSON escrito a mano puede llegar mal formado: un segundo intento suele bastar
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return extractJson(await cliRun(provider, full, model, effort, schema));
    } catch (err) {
      lastError = err;
      if (!(err instanceof SyntaxError)) throw err;
    }
  }
  throw new Error(`la respuesta llegó mal formada dos veces (${lastError instanceof Error ? lastError.message.slice(0, 80) : "JSON inválido"}).`);
}
