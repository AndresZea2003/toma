import { DURATIONS, FORMAT_INFO, LANGUAGES, THEME_DEFS, TONES } from "../lib/presets";
import { FORMATS, THEMES, type Format, type StoryRequest, type Theme } from "../types";
import { StyleChip } from "./Styles";
import { ChipSelect } from "./ui";

export type Options = Omit<StoryRequest, "idea">;

export const DEFAULT_OPTIONS: Options = {
  format: "9:16",
  tone: "Inspirador",
  seconds: 30,
  language: "Español",
  theme: undefined,
};

function FormatIcon({ f }: { f: Format }) {
  const { w, h } = FORMAT_INFO[f];
  const k = 15 / Math.max(w, h);
  return <span className="fmt" style={{ width: w * k, height: h * k }} aria-hidden />;
}

/** Ajustes opcionales como chips: todos tienen un buen valor por defecto */
export function OptionChips({ value, onChange, disabled }: { value: Options; onChange: (v: Options) => void; disabled?: boolean }) {
  const set = <K extends keyof Options>(k: K, v: Options[K]) => onChange({ ...value, [k]: v });
  return (
    <>
      <ChipSelect
        label="Formato"
        value={value.format}
        disabled={disabled}
        onChange={(v) => set("format", v)}
        options={FORMATS.map((f) => ({
          value: f,
          label: (
            <>
              <FormatIcon f={f} /> {FORMAT_INFO[f].label} {f}
            </>
          ),
          note: FORMAT_INFO[f].hint,
        }))}
      />
      <ChipSelect label="Duración" value={value.seconds} disabled={disabled} onChange={(v) => set("seconds", v)} options={DURATIONS.map((d) => ({ value: d, label: `${d} s` }))} />
      <ChipSelect label="Tono" value={value.tone} disabled={disabled} onChange={(v) => set("tone", v)} options={TONES.map((t) => ({ value: t, label: t }))} />
      <StyleChip
        value={value.styleId}
        disabled={disabled}
        onChange={(id, style) => onChange({ ...value, styleId: id, tone: style?.tone ?? value.tone, seconds: style?.seconds ?? value.seconds })}
      />
      {!value.styleId && (
      <ChipSelect<Theme | undefined>
        label="Paleta"
        value={value.theme}
        disabled={disabled}
        onChange={(v) => set("theme", v)}
        options={[
          { value: undefined, label: "Automático", note: "lo elige la IA" },
          ...THEMES.map((t) => ({
            value: t,
            label: (
              <>
                <span className="swatch" aria-hidden>
                  {THEME_DEFS[t].swatch.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
                {THEME_DEFS[t].label}
              </>
            ),
          })),
        ]}
      />
      )}
      <ChipSelect label="Idioma" value={value.language} disabled={disabled} onChange={(v) => set("language", v)} options={LANGUAGES.map((l) => ({ value: l, label: l }))} />
    </>
  );
}
