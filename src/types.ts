// Tipos compartidos entre la app y el servidor de IA.

export const BACKGROUNDS = [
  "sky",
  "sunset",
  "night",
  "ocean",
  "forest",
  "city",
  "space",
  "aurora",
  "paper",
] as const;
export type Background = (typeof BACKGROUNDS)[number];

export const MOTIONS = [
  "float",
  "bounce",
  "enter-left",
  "enter-right",
  "rise",
  "pulse",
  "orbit",
  "sway",
] as const;
export type Motion = (typeof MOTIONS)[number];

export const CAMERAS = ["zoom-in", "zoom-out", "pan-left", "pan-right", "still"] as const;
export type Camera = (typeof CAMERAS)[number];

export const TRANSITIONS = ["fade", "slide", "zoom", "wipe"] as const;
export type Transition = (typeof TRANSITIONS)[number];

export const TEXT_STYLES = ["title", "caption", "quote"] as const;
export type TextStyle = (typeof TEXT_STYLES)[number];

export const ACTOR_SIZES = ["s", "m", "l"] as const;
export type ActorSize = (typeof ACTOR_SIZES)[number];

export const THEMES = ["suave", "vibrante", "editorial", "noche", "tierra"] as const;
export type Theme = (typeof THEMES)[number];

export const MUSIC = ["calma", "alegre", "sueño", "epica", "ninguna"] as const;
export type Music = (typeof MUSIC)[number];

export const FORMATS = ["9:16", "1:1", "16:9"] as const;
export type Format = (typeof FORMATS)[number];

export interface Actor {
  emoji: string;
  motion: Motion;
  size: ActorSize;
  /** Posición horizontal 0..1 */
  x: number;
  /** Posición vertical 0..1 */
  y: number;
}

/** Imagen o clip importado (guardado en IndexedDB) */
export interface MediaRef {
  id: string;
  kind: "image" | "video" | "audio";
  name: string;
}

export interface Scene {
  id: string;
  headline: string;
  narration: string;
  duration: number;
  background: Background;
  actors: Actor[];
  camera: Camera;
  transition: Transition;
  textStyle: TextStyle;
  /** Descripción del plano para generadores externos (Flow, ChatGPT…), en inglés */
  visualPrompt: string;
  /** Material importado: reemplaza el fondo ilustrado */
  media?: MediaRef;
  /** Animación escrita por la IA (cuerpo de función de dibujo) para estilos animados */
  code?: string;
  /** Si hay material, ocultar los personajes emoji */
  hideActors?: boolean;
  /** Voz en off de la escena (audio importado, generado o grabado) */
  voiceOver?: MediaRef;
  /** Usar el sonido del clip importado (los de Flow traen audio) */
  clipAudio?: boolean;
}

export interface Project {
  id: string;
  title: string;
  idea: string;
  language: string;
  tone: string;
  format: Format;
  theme: Theme;
  music: Music;
  captions: boolean;
  voice: boolean;
  voiceName?: string;
  scenes: Scene[];
  /** Estilo de la biblioteca: vacío = ilustrado clásico; si no, id de una skill animada por IA */
  styleId?: string;
  /** Estilo visual y personaje recurrente, en inglés, para todos los prompts */
  styleGuide: string;
  /** Hoja de personaje/estilo importada que sirve de referencia a los prompts */
  reference?: MediaRef;
  /** Pista de música propia (p. ej. de Flow Music); sustituye a la música generada */
  soundtrack?: MediaRef;
  /** Volumen de la música, 0..1 */
  musicVolume?: number;
  createdAt: number;
  updatedAt: number;
  /** true si se generó sin IA (modo demo) */
  demo?: boolean;
}

/** Con qué se escriben los guiones */
export type AiProvider = "api" | "claude-code" | "codex";
export interface AiSettings {
  provider: AiProvider;
  /** vacío = el modelo por defecto de esa herramienta */
  model: string;
  /** vacío = el esfuerzo por defecto */
  effort: string;
}

/** Lo que pide el usuario al crear */
export interface StoryRequest {
  idea: string;
  format: Format;
  tone: string;
  seconds: number;
  language: string;
  theme?: Theme;
  /** Skill de estilo animado por IA (vacío = ilustrado clásico) */
  styleId?: string;
}

/** Lo que devuelve la IA (sin ids) */
export interface StoryDraft {
  title: string;
  theme: Theme;
  music: Music;
  styleGuide: string;
  scenes: Omit<Scene, "id">[];
}

export interface SceneEditRequest {
  projectTitle: string;
  idea: string;
  styleGuide: string;
  scene: Omit<Scene, "id" | "media" | "hideActors">;
  instruction: string;
  language: string;
}
