// Generador local sin IA: produce un guion razonable a partir de la idea
// para que la herramienta funcione aunque no haya clave configurada.
import type { Background, Music, StoryDraft, StoryRequest, Theme } from "../types";
import { SETTING } from "./prompts";
import { normalizeDraft } from "./util";

const EMOJI_HINTS: [RegExp, string[]][] = [
  [/zorro|fox/i, ["🦊"]],
  [/gato|cat/i, ["🐱"]],
  [/perro|dog/i, ["🐶"]],
  [/estrella|star|cielo/i, ["⭐", "✨"]],
  [/luna|moon|noche/i, ["🌙"]],
  [/sol|sun|mañana|morning/i, ["☀️"]],
  [/caf[eé]|coffee/i, ["☕", "🥐"]],
  [/oc[eé]ano|mar|sea|ocean|agua/i, ["🐳", "🐟"]],
  [/bosque|[aá]rbol|forest|tree/i, ["🌲", "🦉"]],
  [/ciudad|city/i, ["🏙️", "🚕"]],
  [/espacio|planeta|space|cohete/i, ["🚀", "🪐"]],
  [/h[aá]bito|energ[ií]a|salud|ejercicio/i, ["💪", "🧘", "💧"]],
  [/negocio|venta|lanzamiento|tienda|marca/i, ["🚀", "🎉", "🛍️"]],
  [/amor|coraz[oó]n|love/i, ["❤️"]],
  [/ni[nñ]os|kids|aprender|explica/i, ["🧠", "📚"]],
  [/m[uú]sica|music/i, ["🎵", "🎧"]],
  [/comida|receta|food/i, ["🍝", "🍓"]],
  [/viaje|travel/i, ["✈️", "🧳"]],
];

const TONE_STYLE: Record<string, { theme: Theme; music: Music; bgs: Background[] }> = {
  Inspirador: { theme: "suave", music: "sueño", bgs: ["sunset", "sky", "aurora", "night", "sunset"] },
  Divertido: { theme: "vibrante", music: "alegre", bgs: ["paper", "sky", "aurora", "city", "paper"] },
  Misterioso: { theme: "noche", music: "sueño", bgs: ["night", "forest", "space", "ocean", "night"] },
  Educativo: { theme: "editorial", music: "calma", bgs: ["paper", "aurora", "sky", "paper", "aurora"] },
  Emotivo: { theme: "tierra", music: "calma", bgs: ["sunset", "forest", "night", "sky", "sunset"] },
  Vendedor: { theme: "vibrante", music: "epica", bgs: ["aurora", "city", "paper", "aurora", "city"] },
};

const EMOJI_EN: Record<string, string> = {
  "🦊": "a small red fox", "🐱": "a curious cat", "🐶": "a happy dog", "⭐": "a glowing star", "✨": "floating sparkles",
  "🌙": "a crescent moon", "☀️": "a warm sun", "☕": "a steaming cup of coffee", "🥐": "a fresh croissant",
  "🐳": "a friendly whale", "🐟": "a small fish", "🌲": "tall pine trees", "🦉": "a wise owl", "🏙️": "a city skyline",
  "🚕": "a yellow taxi", "🚀": "a little rocket", "🪐": "a ringed planet", "💪": "a person stretching with energy",
  "🧘": "a person meditating", "💧": "a glass of water", "🎉": "colorful confetti", "🛍️": "shopping bags",
  "❤️": "a red heart", "🧠": "a cartoon brain", "📚": "a stack of books", "🎵": "musical notes", "🎧": "headphones",
  "🍝": "a plate of pasta", "🍓": "fresh strawberries", "✈️": "a small airplane", "🧳": "a travel suitcase",
  "💡": "a glowing light bulb", "🌟": "a shining star",
};

const STYLE_EN: Record<Theme, string> = {
  suave: "Soft pastel 2D illustration, gentle gradients, rounded shapes, warm dreamy light.",
  vibrante: "Bold flat vector illustration, saturated pop colors, clean shapes, high energy.",
  editorial: "Elegant editorial illustration, muted tones with one warm accent, subtle paper texture.",
  noche: "Moody nocturnal illustration, deep blues and violets, soft glowing highlights.",
  tierra: "Warm earthy storybook illustration, terracotta and olive tones, golden light.",
};

function pickEmojis(idea: string) {
  const found: string[] = [];
  for (const [re, emojis] of EMOJI_HINTS) if (re.test(idea)) found.push(...emojis);
  return found.length ? found : ["✨", "💡", "🌟"];
}

function titleCase(s: string) {
  const t = s.trim().replace(/[.!?]+$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const DANGLING = /^(de|del|la|el|los|las|un|una|y|o|para|por|en|con|a|al|que|sobre|su|sus|tu|tus|nuestra|nuestro|nuestras|nuestros)$/i;

/** Titular corto que termina en una frase entera, nunca en «de» ni en coma */
function shortTitle(idea: string, max = 7) {
  const clause = idea.trim().split(/[,;:.]/)[0];
  const words = clause.split(/\s+/).filter(Boolean);
  let cut = words.slice(0, max);
  while (cut.length > 2 && DANGLING.test(cut[cut.length - 1])) cut = cut.slice(0, -1);
  return titleCase(cut.join(" "));
}

export function demoStory(r: StoryRequest): StoryDraft {
  const style = TONE_STYLE[r.tone] ?? TONE_STYLE.Inspirador;
  const emojis = pickEmojis(r.idea);
  const e = (i: number) => emojis[i % emojis.length];
  const short = shortTitle(r.idea);
  const lower = r.idea.trim().replace(/[.!?]+$/, "");
  const ideaText = lower.charAt(0).toLowerCase() + lower.slice(1);
  const count = r.seconds <= 15 ? 4 : r.seconds <= 30 ? 5 : r.seconds <= 45 ? 7 : 8;
  const per = r.seconds / count;

  const beats = [
    { headline: short, narration: `Hoy va de esto: ${ideaText}.`, textStyle: "title" },
    { headline: "Todo empezó así", narration: "Al principio, nada parecía fuera de lo común.", textStyle: "caption" },
    { headline: "Y entonces…", narration: "Hasta que algo cambió por completo.", textStyle: "caption" },
    { headline: "El gran reto", narration: "Había que intentarlo, aunque diera miedo.", textStyle: "quote" },
    { headline: "Paso a paso", narration: "Con paciencia, cada pequeño paso sumaba.", textStyle: "caption" },
    { headline: "Lo descubrimos", narration: "Y al final, todo cobró sentido.", textStyle: "caption" },
    { headline: "La lección", narration: "A veces lo más simple es lo más poderoso.", textStyle: "quote" },
    { headline: "¿Y tú?", narration: "Cuéntanos tu historia en los comentarios.", textStyle: "title" },
  ] as const;

  const chosen = [...beats.slice(0, count - 1), beats[beats.length - 1]];
  const cams = ["zoom-in", "pan-right", "zoom-out", "pan-left", "still"] as const;
  const trans = ["fade", "slide", "zoom", "wipe"] as const;
  const motions = ["float", "bounce", "enter-left", "rise", "sway", "pulse", "enter-right", "orbit"] as const;

  const theme = r.theme ?? style.theme;
  const hero = EMOJI_EN[emojis[0]] ?? "a small friendly character";
  return normalizeDraft({
    title: short,
    theme,
    music: style.music,
    styleGuide: `${STYLE_EN[theme]} Recurring character: ${hero}, same look and colors in every shot.`,
    scenes: chosen.map((b, i) => ({
      visualPrompt: `${EMOJI_EN[e(i)] ?? hero} in ${SETTING[style.bgs[i % style.bgs.length]]}, ${["establishing wide shot", "medium shot", "close-up", "wide shot", "low-angle shot"][i % 5]}.`,
      headline: b.headline,
      narration: b.narration,
      textStyle: b.textStyle,
      duration: Math.round(per * 10) / 10,
      background: style.bgs[i % style.bgs.length],
      camera: cams[i % cams.length],
      transition: trans[i % trans.length],
      actors: [
        { emoji: e(i), motion: motions[i % motions.length], size: "l", x: 0.5, y: 0.68 },
        ...(i % 2 === 0 ? [{ emoji: e(i + 1), motion: "float" as const, size: "s" as const, x: 0.2, y: 0.78 }] : []),
      ],
    })),
  });
}
