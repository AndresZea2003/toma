import Anthropic from "@anthropic-ai/sdk";
import {
  ACTOR_SIZES,
  BACKGROUNDS,
  CAMERAS,
  MOTIONS,
  MUSIC,
  TEXT_STYLES,
  THEMES,
  TRANSITIONS,
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

function storyPrompt(r: StoryRequest) {
  return `Idea: ${r.idea}
Formato: ${r.format} (${r.format === "9:16" ? "vertical, historia" : r.format === "1:1" ? "cuadrado, feed" : "horizontal, YouTube"})
Tono: ${r.tone}
Duración total aproximada: ${r.seconds} segundos
Idioma: ${r.language}
${r.theme ? `Estilo visual preferido: ${r.theme}` : ""}

Crea el guion gráfico completo.`;
}

// ---------- Llamada común ----------

async function callJson<T>(prompt: string, schema: Record<string, unknown>, effort: "low" | "medium") {
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await getClient().beta.messages.create({
      model: MODEL(),
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      // Si un clasificador de seguridad rechaza la petición, la API la reintenta
      // en el modelo de respaldo recomendado.
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
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

export async function generateStory(r: StoryRequest): Promise<StoryDraft> {
  return callJson<StoryDraft>(storyPrompt(r), storySchema, "medium");
}

export async function editScene(r: SceneEditRequest): Promise<StoryDraft["scenes"][number]> {
  const prompt = `Proyecto: "${r.projectTitle}" — idea original: ${r.idea}
Idioma: ${r.language}
Guía de estilo: ${r.styleGuide}

Escena actual (JSON):
${JSON.stringify(r.scene, null, 2)}

Cambio pedido por el usuario: ${r.instruction}

Devuelve la escena completa con el cambio aplicado. Mantén lo que no se pidió cambiar.`;
  return callJson(prompt, sceneSchema, "low");
}
