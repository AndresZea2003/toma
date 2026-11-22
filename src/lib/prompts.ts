// Prompts listos para pegar en generadores externos (Google Flow, ChatGPT, etc.).
// Toma dirige; el creador usa los cupos de sus herramientas y trae el resultado de vuelta.
import type { Background, Camera, Format, Project, Scene } from "../types";

export type PromptTarget = "video" | "image";

export const TOOLS: Record<PromptTarget, { name: string; url: string; hint: string }> = {
  video: { name: "Google Flow", url: "https://labs.google/fx/tools/flow", hint: "Clip de 8 s" },
  image: { name: "ChatGPT", url: "https://chatgpt.com/", hint: "Imagen" },
};

const ASPECT: Record<Format, { video: string; image: string }> = {
  "9:16": { video: "Vertical 9:16 video", image: "Vertical 9:16 image (1024x1536)" },
  "1:1": { video: "Square-safe composition (subject centered, works cropped to 1:1)", image: "Square 1:1 image (1024x1024)" },
  "16:9": { video: "Horizontal 16:9 video", image: "Horizontal 16:9 image (1536x1024)" },
};

const CAMERA: Record<Camera, string> = {
  "zoom-in": "slow push-in",
  "zoom-out": "slow pull-back",
  "pan-left": "slow pan to the left",
  "pan-right": "slow pan to the right",
  still: "locked-off static shot with gentle ambient motion",
};

export const SETTING: Record<Background, string> = {
  sky: "a bright daytime sky with soft clouds over green hills",
  sunset: "a warm sunset over rolling hills",
  night: "a starry night with a glowing moon",
  ocean: "a calm ocean with gentle waves",
  forest: "a misty pine forest with fireflies",
  city: "a city skyline at dusk with lit windows",
  space: "outer space with a ringed planet and stars",
  aurora: "a dreamy abstract backdrop of soft flowing colors",
  paper: "a playful paper-craft world with confetti shapes",
};

const NO_TEXT = "No text, no letters, no captions, no logos, no watermarks.";
const HEADROOM = "Keep the upper third of the frame calm and uncluttered (a headline will be placed there).";

function shot(scene: Scene) {
  return scene.visualPrompt.trim() || `${SETTING[scene.background]}.`;
}

export function scenePrompt(project: Project, scene: Scene, target: PromptTarget) {
  const style = project.styleGuide.trim();
  const ref = project.reference;
  const lines: string[] = [];
  if (target === "video") {
    lines.push(`${ASPECT[project.format].video}, about 8 seconds, cinematic and smooth.`);
    if (style) lines.push(`Style: ${style}`);
    lines.push(`Shot: ${shot(scene)}`);
    lines.push(`Camera: ${CAMERA[scene.camera]}.`);
    if (ref) lines.push("Use the attached character/style reference image as an ingredient so the character looks identical.");
    lines.push(HEADROOM, `${NO_TEXT} No dialogue or voice.`);
  } else {
    lines.push(`${ASPECT[project.format].image}.`);
    if (style) lines.push(`Style: ${style}`);
    lines.push(`Scene: ${shot(scene)}`);
    if (ref) lines.push("Use the attached character/style reference image so the character and style look identical.");
    lines.push(HEADROOM, NO_TEXT);
  }
  return lines.join("\n");
}

export function referencePrompt(project: Project) {
  const style = project.styleGuide.trim() || "A friendly, colorful illustrated style.";
  return [
    "Character and style reference sheet on a plain light background.",
    `Style: ${style}`,
    "Show the main character from the front, side and back, plus three facial expressions (happy, surprised, determined).",
    "Add a small strip of 5 color swatches from the palette at the bottom.",
    "Consistent proportions across all views. No text labels.",
  ].join("\n");
}

/** Todos los prompts del proyecto en un solo texto, para trabajar en lote */
export function projectKit(project: Project) {
  const parts = [
    `TOMA · ${project.title}`,
    `Formato ${project.format} · ${project.scenes.length} escenas`,
    "",
    "── 0. Hoja de personaje y estilo (hazla primero y adjúntala en las demás) ──",
    referencePrompt(project),
  ];
  project.scenes.forEach((s, i) => {
    parts.push("", `── ${i + 1}. ${s.headline || "Escena"} (${s.duration.toFixed(1)} s) ──`, "[Video · Flow]", scenePrompt(project, s, "video"), "", "[Imagen · ChatGPT]", scenePrompt(project, s, "image"));
  });
  return parts.join("\n");
}
