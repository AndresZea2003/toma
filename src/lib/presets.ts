import type { Background, Camera, Format, Motion, Music, TextStyle, Theme, Transition } from "../types";

export const FORMAT_INFO: Record<Format, { label: string; hint: string; w: number; h: number }> = {
  "9:16": { label: "Historia", hint: "Vertical · Reels, TikTok", w: 1080, h: 1920 },
  "1:1": { label: "Cuadrado", hint: "Feed de Instagram", w: 1080, h: 1080 },
  "16:9": { label: "Horizontal", hint: "YouTube, presentaciones", w: 1920, h: 1080 },
};

export interface ThemeDef {
  label: string;
  /** Fuente de titulares */
  display: string;
  /** Fuente de texto */
  body: string;
  ink: string;
  inkSoft: string;
  accent: string;
  pill: string;
  /** Tinte que se mezcla sobre el fondo */
  tint: string;
  tintAlpha: number;
  swatch: [string, string, string];
}

export const THEME_DEFS: Record<Theme, ThemeDef> = {
  suave: {
    label: "Suave",
    display: "Fraunces",
    body: "Plus Jakarta Sans",
    ink: "#ffffff",
    inkSoft: "rgba(255,255,255,0.88)",
    accent: "#ffd6e0",
    pill: "rgba(30,24,48,0.42)",
    tint: "#f6c9ff",
    tintAlpha: 0.1,
    swatch: ["#f9d5e5", "#c7ceea", "#b5ead7"],
  },
  vibrante: {
    label: "Vibrante",
    display: "Plus Jakarta Sans",
    body: "Plus Jakarta Sans",
    ink: "#ffffff",
    inkSoft: "rgba(255,255,255,0.92)",
    accent: "#ffe45e",
    pill: "rgba(20,10,40,0.5)",
    tint: "#ff3d7f",
    tintAlpha: 0.08,
    swatch: ["#ff3d7f", "#ffe45e", "#3dd6ff"],
  },
  editorial: {
    label: "Editorial",
    display: "Fraunces",
    body: "Plus Jakarta Sans",
    ink: "#fffaf2",
    inkSoft: "rgba(255,250,242,0.88)",
    accent: "#f2c48d",
    pill: "rgba(15,15,15,0.5)",
    tint: "#1a1a1a",
    tintAlpha: 0.12,
    swatch: ["#1f1f1f", "#f2c48d", "#fffaf2"],
  },
  noche: {
    label: "Noche",
    display: "Plus Jakarta Sans",
    body: "Plus Jakarta Sans",
    ink: "#eef1ff",
    inkSoft: "rgba(238,241,255,0.85)",
    accent: "#9fb4ff",
    pill: "rgba(5,8,30,0.55)",
    tint: "#1b2a6b",
    tintAlpha: 0.18,
    swatch: ["#0f1640", "#3b4cca", "#9fb4ff"],
  },
  tierra: {
    label: "Tierra",
    display: "Fraunces",
    body: "Plus Jakarta Sans",
    ink: "#fff8ee",
    inkSoft: "rgba(255,248,238,0.9)",
    accent: "#ffc58a",
    pill: "rgba(50,28,12,0.45)",
    tint: "#c26a2e",
    tintAlpha: 0.1,
    swatch: ["#c26a2e", "#e9b872", "#5b7a4a"],
  },
};

export const BACKGROUND_LABELS: Record<Background, string> = {
  sky: "Cielo",
  sunset: "Atardecer",
  night: "Noche",
  ocean: "Océano",
  forest: "Bosque",
  city: "Ciudad",
  space: "Espacio",
  aurora: "Aurora",
  paper: "Papel",
};

export const MOTION_LABELS: Record<Motion, string> = {
  float: "Flotar",
  bounce: "Rebotar",
  "enter-left": "Entrar ←",
  "enter-right": "Entrar →",
  rise: "Subir",
  pulse: "Latir",
  orbit: "Orbitar",
  sway: "Balancear",
};

export const CAMERA_LABELS: Record<Camera, string> = {
  "zoom-in": "Acercar",
  "zoom-out": "Alejar",
  "pan-left": "Paneo ←",
  "pan-right": "Paneo →",
  still: "Fija",
};

export const TRANSITION_LABELS: Record<Transition, string> = {
  fade: "Fundido",
  slide: "Deslizar",
  zoom: "Zoom",
  wipe: "Barrido",
};

export const TEXT_STYLE_LABELS: Record<TextStyle, string> = {
  title: "Titular",
  caption: "Frase",
  quote: "Cita",
};

export const MUSIC_LABELS: Record<Music, string> = {
  calma: "Calma",
  alegre: "Alegre",
  "sueño": "Sueño",
  epica: "Épica",
  ninguna: "Sin música",
};

export const TONES = ["Inspirador", "Divertido", "Misterioso", "Educativo", "Emotivo", "Vendedor"];
export const DURATIONS = [15, 30, 45, 60];
export const LANGUAGES = ["Español", "English", "Português", "Français"];

export const IDEA_SAMPLES = [
  "Un zorro que aprende a ver las estrellas para encontrar el camino a casa",
  "5 hábitos para empezar la mañana con energía",
  "Lanzamiento de nuestra nueva cafetería de barrio",
  "Por qué el océano es azul, explicado para niños",
];
