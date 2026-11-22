// Configuración de cada persona: sus claves y preferencias.
// Las claves se guardan en la carpeta de datos de Toma, cifradas con el almacén seguro del sistema
// cuando la app de escritorio lo ofrece, y nunca se devuelven enteras a la interfaz.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface Settings {
  anthropicKey?: string;
  elevenLabsKey?: string;
  elevenLabsVoiceId?: string;
}

const SECRET: (keyof Settings)[] = ["anthropicKey", "elevenLabsKey"];
const file = () => path.join(path.resolve(process.env.TOMA_DATA_DIR ?? ".", process.env.TOMA_DATA_DIR ? "." : ".toma-browser"), "settings.json");

interface Crypt {
  enc(s: string): string;
  dec(s: string): string;
}
const crypt = () => (globalThis as { __tomaCrypt?: Crypt }).__tomaCrypt;

let cache: Settings | null = null;
// La clave que venía del entorno (.env) antes de que Toma aplique la de la configuración
const envAnthropic = process.env.ANTHROPIC_API_KEY;

export function loadSettings(): Settings {
  if (cache) return cache;
  cache = {};
  try {
    const raw = JSON.parse(readFileSync(file(), "utf8")) as Record<string, string>;
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v !== "string" || !v) continue;
      const key = k as keyof Settings;
      if (v.startsWith("enc:")) {
        const c = crypt();
        if (c) cache[key] = c.dec(v.slice(4));
      } else cache[key] = v;
    }
  } catch {
    /* sin configuración todavía */
  }
  apply();
  return cache;
}

/** null borra un valor; undefined lo deja como está */
export function saveSettings(patch: { [K in keyof Settings]?: string | null }) {
  const s = { ...loadSettings() };
  for (const [k, v] of Object.entries(patch)) {
    const key = k as keyof Settings;
    if (v === null || v === "") delete s[key];
    else if (typeof v === "string") s[key] = v.trim();
  }
  cache = s;
  const c = crypt();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(s)) out[k] = c && SECRET.includes(k as keyof Settings) ? `enc:${c.enc(v)}` : v;
  const f = file();
  if (!existsSync(path.dirname(f))) mkdirSync(path.dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(out, null, 2), { mode: 0o600 });
  apply();
}

/** La clave de Claude de la configuración manda sobre la del entorno */
function apply() {
  const key = cache?.anthropicKey ?? envAnthropic;
  if (key) process.env.ANTHROPIC_API_KEY = key;
  else delete process.env.ANTHROPIC_API_KEY;
}

const hint = (v?: string) => (v ? `····${v.slice(-4)}` : null);

/** Lo que la interfaz puede saber: si hay clave y sus últimos 4 caracteres, nunca la clave */
export function publicSettings() {
  const s = loadSettings();
  return {
    anthropic: { set: !!s.anthropicKey, hint: hint(s.anthropicKey), fromEnv: !s.anthropicKey && !!envAnthropic },
    elevenlabs: { set: !!s.elevenLabsKey, hint: hint(s.elevenLabsKey), voiceId: s.elevenLabsVoiceId ?? null },
    encrypted: !!crypt(),
  };
}

// ---------- ElevenLabs ----------

const EL = "https://api.elevenlabs.io/v1";

function elKey() {
  const k = loadSettings().elevenLabsKey;
  if (!k) throw new Error("Falta tu clave de ElevenLabs. Ponla en Configuración.");
  return k;
}

async function elError(res: Response) {
  const body = (await res.json().catch(() => null)) as { detail?: { message?: string } | string } | null;
  const msg = typeof body?.detail === "string" ? body.detail : body?.detail?.message;
  if (res.status === 401) return "ElevenLabs rechazó la clave. Revísala en Configuración.";
  return `ElevenLabs: ${msg ?? `error ${res.status}`}`;
}

export async function elevenVoices(): Promise<{ id: string; name: string; labels: string }[]> {
  const res = await fetch(`${EL}/voices`, { headers: { "xi-api-key": elKey() } });
  if (!res.ok) throw new Error(await elError(res));
  const data = (await res.json()) as { voices?: { voice_id: string; name: string; labels?: Record<string, string> }[] };
  return (data.voices ?? []).map((v) => ({ id: v.voice_id, name: v.name, labels: [v.labels?.gender, v.labels?.accent, v.labels?.language].filter(Boolean).join(" · ") }));
}

export async function elevenSpeak(text: string, voiceId?: string): Promise<Buffer> {
  const voice = voiceId || loadSettings().elevenLabsVoiceId || (await elevenVoices())[0]?.id;
  if (!voice) throw new Error("No encontré ninguna voz en tu cuenta de ElevenLabs.");
  const res = await fetch(`${EL}/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": elKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
  });
  if (!res.ok) throw new Error(await elError(res));
  return Buffer.from(await res.arrayBuffer());
}
