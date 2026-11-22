import Anthropic from "@anthropic-ai/sdk";
import { cliJson, cliText, cliVersion } from "./cli";
import { getStyle, saveStyle, type StyleSkill } from "./styles";
import {
  ACTOR_SIZES,
  BACKGROUNDS,
  CAMERAS,
  MOTIONS,
  MUSIC,
  TEXT_STYLES,
  THEMES,
  TRANSITIONS,
  type AiSettings,
  type SceneEditRequest,
  type StoryDraft,
  type StoryRequest,
} from "../src/types";

const MODEL = () => process.env.CLAUDE_MODEL || "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient() {
  // Resuelve credenciales de ANTHROPIC_API_KEY o de un perfil `ant auth login`.
  client ??= new Anthropic();
  return client;
}

export class AiError extends Error {
  constructor(
    public code: "no_key" | "refusal" | "rate_limit" | "bad_output" | "api",
    message: string,
  ) {
    super(message);
  }
}

// ---------- Esquemas JSON para salidas estructuradas ----------

const actorSchema = {
  type: "object",
  additionalProperties: false,
  required: ["emoji", "motion", "size", "x", "y"],
  properties: {
    emoji: { type: "string", description: "Un solo emoji que actúa como personaje u objeto" },
    motion: { type: "string", enum: [...MOTIONS] },
    size: { type: "string", enum: [...ACTOR_SIZES] },
    x: { type: "number", description: "Posición horizontal entre 0 y 1" },
    y: { type: "number", description: "Posición vertical entre 0 y 1 (0 arriba)" },
  },
};

const sceneSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "headline",
    "narration",
    "duration",
    "background",
    "actors",
    "camera",
    "transition",
    "textStyle",
    "visualPrompt",
  ],
  properties: {
    visualPrompt: {
      type: "string",
      description:
        "In English: one shot description for an external image/video generator (subject, action, setting, framing, light, camera move). No on-screen text. Do not restate the style guide.",
    },
    headline: { type: "string", description: "Texto grande en pantalla, máximo 7 palabras" },
    narration: { type: "string", description: "Narración / subtítulo de la escena, 1-2 frases" },
    duration: { type: "number", description: "Segundos que dura la escena (2.5 a 8)" },
    background: { type: "string", enum: [...BACKGROUNDS] },
    actors: { type: "array", items: actorSchema, description: "De 1 a 3 actores" },
    camera: { type: "string", enum: [...CAMERAS] },
    transition: { type: "string", enum: [...TRANSITIONS] },
    textStyle: { type: "string", enum: [...TEXT_STYLES] },
  },
};

const storySchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "theme", "music", "styleGuide", "scenes"],
  properties: {
    title: { type: "string" },
    styleGuide: {
      type: "string",
      description:
        "In English, 2-4 sentences: the visual style shared by every shot (medium, palette, lighting, mood) and a precise description of any recurring character so external generators keep it consistent.",
    },
    theme: { type: "string", enum: [...THEMES] },
    music: { type: "string", enum: [...MUSIC] },
    scenes: { type: "array", items: sceneSchema },
  },
};

// ---------- Prompts ----------

const SYSTEM = `Eres el director creativo de Lienzo, un estudio que convierte ideas en videos cortos animados (historias de Instagram/TikTok, reels, explicadores).

Cada video es una secuencia de escenas. El motor de animación dibuja cada escena con:
- background: un fondo ilustrado animado. Opciones: sky (cielo de día con nubes), sunset (atardecer con colinas), night (noche estrellada con luna), ocean (olas), forest (bosque de pinos), city (ciudad al anochecer), space (espacio con planeta), aurora (manchas de color abstractas, ideal para ideas, emociones, negocios), paper (papel cálido con confeti, ideal para listas, consejos, educativo).
- actors: 1 a 3 emojis animados que hacen de personajes u objetos. Colócalos con x,y entre 0 y 1 sin tapar el texto: el texto principal ocupa la franja central-alta (y 0.25-0.45), así que pon los actores sobre todo en y 0.55-0.8. Movimientos: float (flotar), bounce (rebotar), enter-left/enter-right (entrar desde un lado), rise (subir desde abajo), pulse (latir), orbit (girar en círculo), sway (balancearse).
- camera: zoom-in, zoom-out, pan-left, pan-right o still.
- transition: cómo entra la escena: fade, slide, zoom o wipe.
- textStyle: title (titular grande), caption (frase mediana), quote (cita en cursiva).

Reglas creativas:
- La primera escena es un gancho potente que detiene el scroll.
- headline: corto y visual (máximo 7 palabras). narration: la voz en off, natural y emotiva, 1-2 frases que se puedan leer en la duración de la escena (~2.5 palabras por segundo).
- Varía fondos, cámaras y transiciones para dar ritmo, pero mantén coherencia visual.
- La última escena cierra la historia o invita a actuar.
- La suma de duraciones debe aproximarse a la duración pedida.
- Elige theme (suave, vibrante, editorial, noche, tierra) y music (calma, alegre, sueño, epica, ninguna) según el tono.
- Escribe todo el texto en el idioma pedido, excepto styleGuide y visualPrompt.

Generadores externos: el creador puede llevar cada escena a herramientas como Google Flow (clips de video) o la generación de imágenes de ChatGPT, y traer el resultado de vuelta. Por eso:
- styleGuide (en inglés) fija el estilo visual común y describe con precisión al personaje recurrente (especie/aspecto, ropa, colores, rasgos) para que todas las escenas sean coherentes.
- visualPrompt (en inglés) describe el plano de cada escena: sujeto, acción, lugar, encuadre, luz y movimiento de cámara, sin texto en pantalla y dejando espacio libre arriba para el titular.`;

/** Si el video usa un estilo animado por IA, el guion sigue la skill de ese estilo */
function skillNote(styleId?: string) {
  const skill = styleId ? getStyle(styleId) : undefined;
  if (!skill) return "";
  return `
IMPORTANTE: este video NO usa los fondos ni los emojis descritos arriba. Cada escena la animará después un programador siguiendo la skill de estilo «${skill.name}». Escribe el guion según esa skill: respeta su sección de guion (estructura, longitud de headline, tono) y usa visualPrompt para describir con precisión la animación de la escena en ese estilo (en el idioma del video). Rellena background, actors, camera y transition con valores cualesquiera válidos.

<skill>
${skill.body}
</skill>
`;
}

function storyPrompt(r: StoryRequest) {
  return `Idea: ${r.idea}
Formato: ${r.format} (${r.format === "9:16" ? "vertical, historia" : r.format === "1:1" ? "cuadrado, feed" : "horizontal, YouTube"})
Tono: ${r.tone}
Duración total aproximada: ${r.seconds} segundos
Idioma: ${r.language}
${r.theme ? `Estilo visual preferido: ${r.theme}` : ""}
${skillNote(r.styleId)}
Crea el guion gráfico completo.`;
}

// ---------- Llamada común ----------

const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORTS)[number];

async function callJson<T>(prompt: string, schema: Record<string, unknown>, defaultEffort: Effort, ai?: Partial<AiSettings>, system = SYSTEM): Promise<T> {
  // Claude Code o Codex: la herramienta instalada, con la sesión del creador
  if (ai?.provider === "claude-code" || ai?.provider === "codex") {
    const name = ai.provider === "codex" ? "Codex" : "Claude Code";
    if (!(await cliVersion(ai.provider))) throw new AiError("api", `No encontré ${name} instalado en este equipo.`);
    try {
      return (await cliJson(ai.provider, system, prompt, schema, ai.model, ai.effort)) as T;
    } catch (e) {
      throw new AiError("api", `${name}: ${e instanceof Error ? e.message : "no pudo escribir el guion"}`);
    }
  }
  const effort: Effort = EFFORTS.includes(ai?.effort as Effort) ? (ai!.effort as Effort) : defaultEffort;
  const model = ai?.model && /^claude-[\w.-]{3,60}$/.test(ai.model) ? ai.model : MODEL();
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await getClient().beta.messages.create({
      model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      // Si un clasificador de seguridad rechaza la petición, la API la reintenta
      // en el modelo de respaldo recomendado.
      fallbacks: "default",
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      output_config: { effort, format: { type: "json_schema", schema } },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      throw new AiError("no_key", "La clave de la API no es válida o no tiene permisos.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AiError("rate_limit", "Demasiadas peticiones; espera unos segundos.");
    }
    if (error instanceof Anthropic.APIError) {
      throw new AiError("api", `Error de la API (${error.status ?? "?"}): ${error.message}`);
    }
    if (error instanceof Error && /api key|apiKey|authentication|credentials/i.test(error.message)) {
      // El constructor del SDK lanza un Error normal si no encuentra credenciales.
      throw new AiError("no_key", "No hay clave de la API configurada.");
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    throw new AiError("refusal", "La IA no pudo crear esta historia. Prueba a reformular la idea.");
  }
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiError("bad_output", "La respuesta de la IA llegó incompleta. Inténtalo de nuevo.");
  }
}

export async function generateStory(r: StoryRequest & { ai?: Partial<AiSettings> }): Promise<StoryDraft> {
  return callJson<StoryDraft>(storyPrompt(r), storySchema, "medium", r.ai);
}

export async function editScene(r: SceneEditRequest & { ai?: Partial<AiSettings> }): Promise<StoryDraft["scenes"][number]> {
  const prompt = `Proyecto: "${r.projectTitle}" — idea original: ${r.idea}
Idioma: ${r.language}
Guía de estilo: ${r.styleGuide}

Escena actual (JSON):
${JSON.stringify(r.scene, null, 2)}

Cambio pedido por el usuario: ${r.instruction}

Devuelve la escena completa con el cambio aplicado. Mantén lo que no se pidió cambiar.`;
  return callJson(prompt, sceneSchema, "low", r.ai);
}

// ---------- Animaciones escritas por la IA ----------

/** Contrato técnico común a todas las skills de estilo */
const CODE_CONTRACT = `Escribes el CUERPO de una función JavaScript que dibuja UN fotograma de la escena en un canvas 2D:

  function draw(ctx, t, W, H, D, h) { /* tu código */ }

- ctx: CanvasRenderingContext2D de un lienzo de W x H píxeles. Pinta tú el fondo completo en cada fotograma.
- t: segundos desde el inicio de la escena. D: duración de la escena. La escena puede seguir visible hasta t = D + 0.7 durante la transición: mantén el estado final, no lo borres.
- El dibujo debe ser una función pura de t: sin estado entre fotogramas, sin Date ni Math.random (usa h.rand(semilla), que devuelve siempre lo mismo para la misma semilla).
- Ayudas en h: clamp(v,a,b), lerp(a,b,k), prog(t, inicio, duracion) -> 0..1, ease(x) (salida suave), easeInOut(x), easeOutBack(x) (con rebote), rand(semilla).
- Usa medidas relativas: const u = Math.min(W, H) / 100. Nunca píxeles fijos: el mismo código se dibuja a varios tamaños y en formato vertical, cuadrado u horizontal (compara W y H).
- Solo canvas 2D estándar (incluye roundRect, Path2D, setLineDash, letterSpacing). Sin DOM, sin red, sin imágenes, sin cargar fuentes: usa fuentes del sistema.
- En vertical (H > W) deja libre la franja inferior desde el 78 % de la altura: ahí va el subtítulo. En horizontal, desde el 80 %.
- El texto en pantalla va en el idioma del video y debe leerse en un móvil: nada por debajo de u * 1.5.
- Todo entra animado y escalonado; al terminar las entradas algo sigue vivo hasta el final.
- La variable u ya existe. Las funciones de la sección «Piezas» de la skill NO existen: copia dentro de tu código las que uses (person, pill, font, etc.).
- Máximo ~140 líneas. Código completo y ejecutable: declara todo lo que uses. No escribas la firma de la función ni bloques de markdown.`;

const codeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["code"],
  properties: { code: { type: "string", description: "Cuerpo de la función draw, JavaScript puro" } },
};

export interface SceneCodeRequest {
  styleId: string;
  title: string;
  idea: string;
  language: string;
  format: string;
  styleGuide: string;
  index: number;
  total: number;
  scene: { headline: string; narration: string; visualPrompt: string; duration: number };
  previous?: string;
  /** Para regenerar: código actual, error al ejecutarlo o cambio pedido */
  currentCode?: string;
  error?: string;
  instruction?: string;
  ai?: Partial<AiSettings>;
}

/** Pide código: con Claude Code o Codex en texto plano (sin JSON que escapar); con la API, salida estructurada */
async function callCode(prompt: string, system: string, ai?: Partial<AiSettings>): Promise<string> {
  if (ai?.provider === "claude-code" || ai?.provider === "codex") {
    const name = ai.provider === "codex" ? "Codex" : "Claude Code";
    if (!(await cliVersion(ai.provider))) throw new AiError("api", `No encontré ${name} instalado en este equipo.`);
    try {
      return await cliText(ai.provider, system, `${prompt}\n\nResponde SOLO con el código JavaScript del cuerpo de la función, sin explicaciones y sin bloques de markdown.`, ai.model, ai.effort);
    } catch (e) {
      throw new AiError("api", `${name}: ${e instanceof Error ? e.message : "no pudo escribir la animación"}`);
    }
  }
  return (await callJson<{ code: string }>(prompt, codeSchema, "medium", ai, system)).code;
}

export async function generateSceneCode(r: SceneCodeRequest): Promise<{ code: string }> {
  const skill = getStyle(r.styleId);
  if (!skill) throw new AiError("api", "No encontré ese estilo en la biblioteca.");
  const system = `Eres un animador experto en motion graphics con canvas 2D. Animas escenas de videos cortos siguiendo al pie de la letra una skill de estilo.

${CODE_CONTRACT}

<skill nombre="${skill.name}">
${skill.body}
</skill>`;
  const prompt = `Video: "${r.title}" — ${r.idea}
Idioma: ${r.language}. Formato: ${r.format}.
Personaje y continuidad: ${r.styleGuide || "el mismo personaje y los mismos objetos en todas las escenas"}
${r.previous ? `Escena anterior (para dar continuidad): ${r.previous}` : ""}

Escena ${r.index + 1} de ${r.total} (dura ${r.scene.duration} s):
- Etiqueta o texto clave: ${r.scene.headline}
- Narración (se oye y sale como subtítulo, no la escribas entera en pantalla): ${r.scene.narration}
- Qué se ve: ${r.scene.visualPrompt}
${r.currentCode ? `\nCódigo actual de esta escena:\n${r.currentCode}\n` : ""}${r.error ? `\nEse código falló al ejecutarse con este error, corrígelo: ${r.error}\n` : ""}${r.instruction ? `\nCambio pedido por el creador: ${r.instruction}\n` : ""}
Escribe el cuerpo de draw para esta escena, sincronizando las entradas con el orden de la narración.`;
  const out = await callCode(prompt, system, r.ai);
  const code = String(out ?? "")
    .trim()
    .replace(/^```[a-z]*\r?\n?/i, "")
    .replace(/```\s*$/, "")
    .replace(/^function\s+draw\s*\([^)]*\)\s*\{([\s\S]*)\}\s*$/, "$1")
    .trim();
  if (code.length < 40) throw new AiError("bad_output", "La IA no devolvió una animación. Inténtalo de nuevo.");
  return { code };
}

// ---------- Crear la skill de un estilo nuevo ----------

const skillSchema = {
  type: "object",
  additionalProperties: false,
  required: ["description", "skill"],
  properties: {
    description: { type: "string", description: "Una frase en español que describe el estilo, para la biblioteca" },
    skill: { type: "string", description: "El documento de la skill en Markdown, sin frontmatter" },
  },
};

export async function createStyleSkill(r: { name: string; brief: string; ai?: Partial<AiSettings> }): Promise<StyleSkill> {
  const example = getStyle("diagrama");
  const system = `Escribes «skills de estilo» para Toma, una app que crea videos cortos animados. Una skill es un documento en Markdown que le enseña a otro modelo a guionizar y a animar con canvas 2D en un estilo visual concreto, de forma que todas las escenas de todos los videos salgan coherentes.

Las animaciones se programan bajo este contrato técnico (la skill no lo repite, pero todo lo que proponga debe ser posible con él):

${CODE_CONTRACT}

Una buena skill tiene estas secciones, en este orden: una frase de qué es y para qué sirve; «Guion» (estructura de escenas y reglas de headline, narration y visualPrompt); «Lenguaje visual» (fondo, colores exactos en hex, trazo, tipografía de sistema, personajes u objetos recurrentes, composición); «Movimiento» (cómo entra cada cosa, tiempos, qué sigue vivo); «Piezas» (un bloque de código JavaScript con 3 a 6 funciones reutilizables que cumplan el contrato); y «Evita». Sé concreto: valores, proporciones respecto a u, tiempos en segundos. Escribe en español.
${example ? `\nEjemplo de una skill bien hecha (otro estilo, solo como referencia de nivel de detalle):\n\n${example.body}` : ""}`;
  const ask = `Nombre del estilo: ${r.name}\n\nCómo lo describe el creador:\n${r.brief}\n\nEscribe la skill completa de este estilo.`;
  let out: { description: string; skill: string };
  if (r.ai?.provider === "claude-code" || r.ai?.provider === "codex") {
    // Markdown con código: en texto plano, con la descripción en la primera línea
    const text = await cliText(r.ai.provider, system, `${ask}\n\nFormato de la respuesta: la primera línea es «DESCRIPCION: » seguida de una frase que describe el estilo; a partir de la segunda línea, el documento Markdown de la skill. Nada más.`, r.ai.model, r.ai.effort).catch((e) => {
      throw new AiError("api", e instanceof Error ? e.message : "No se pudo escribir la skill");
    });
    const m = text.match(/^\s*DESCRIPCI[OÓ]N:\s*(.+)\r?\n([\s\S]*)$/i);
    out = { description: m?.[1].trim() ?? "", skill: (m?.[2] ?? text).trim() };
  } else out = await callJson<{ description: string; skill: string }>(ask, skillSchema, "high", r.ai, system);
  if (!out.skill || out.skill.length < 300) throw new AiError("bad_output", "La IA no devolvió una skill completa. Inténtalo de nuevo.");
  return saveStyle(r.name, out.description || r.brief.slice(0, 140), out.skill.replace(/^---[\s\S]*?---\s*/, ""));
}
