// Voz en off con la síntesis de voz del navegador (solo en la vista previa).

const LANG_CODES: Record<string, string> = {
  Español: "es",
  English: "en",
  Português: "pt",
  Français: "fr",
};

export const speechAvailable = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function listVoices(): SpeechSynthesisVoice[] {
  if (!speechAvailable()) return [];
  return speechSynthesis.getVoices();
}

export function guessLang(text: string) {
  if (/[áéíóúñ¿¡]/i.test(text)) return "es";
  if (/[ãõç]/i.test(text)) return "pt";
  if (/\b(the|and|you|is)\b/i.test(text)) return "en";
  return "es";
}

export function speak(text: string, voiceName?: string, language?: string) {
  if (!speechAvailable() || !text.trim()) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const lang = (language && LANG_CODES[language]) || guessLang(text);
  const voice = voices.find((v) => v.name === voiceName) ?? voices.find((v) => v.lang.startsWith(lang));
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? lang;
  u.rate = 1;
  u.pitch = 1;
  speechSynthesis.speak(u);
}

export function stopSpeech() {
  if (speechAvailable()) speechSynthesis.cancel();
}
