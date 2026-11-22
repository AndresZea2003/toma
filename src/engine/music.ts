// Música ambiental generativa con Web Audio: sin archivos ni licencias.
import type { Music } from "../types";

interface Style {
  bpm: number;
  root: number; // MIDI
  chords: number[][]; // intervalos desde la raíz
  arp: "none" | "slow" | "fast";
  bells: boolean;
  pulse: boolean;
  pad: OscillatorType;
}

const STYLES: Record<Exclude<Music, "ninguna">, Style> = {
  calma: { bpm: 72, root: 57, chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [5, 9, 12, 16], [7, 11, 14, 17]], arp: "slow", bells: false, pulse: false, pad: "sine" },
  alegre: { bpm: 112, root: 60, chords: [[0, 4, 7], [7, 11, 14], [-3, 0, 4], [5, 9, 12]], arp: "fast", bells: false, pulse: true, pad: "triangle" },
  "sueño": { bpm: 64, root: 62, chords: [[0, 7, 14, 16], [-2, 5, 12, 14], [-5, 2, 9, 11], [-7, 0, 7, 9]], arp: "none", bells: true, pulse: false, pad: "sine" },
  epica: { bpm: 90, root: 50, chords: [[0, 7, 12, 15], [-4, 3, 8, 12], [-2, 5, 10, 14], [-5, 2, 7, 10]], arp: "fast", bells: false, pulse: true, pad: "sawtooth" },
};

const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class MusicPlayer {
  private nodes: AudioScheduledSourceNode[] = [];
  private master: GainNode | null = null;

  constructor(private ctx: AudioContext) {}

  /** Programa la música desde `offset` hasta `total` segundos del video. */
  start(dest: AudioNode, kind: Music, offset: number, total: number, volume = 0.5) {
    this.stop();
    if (kind === "ninguna" || total - offset <= 0.05) return;
    const st = STYLES[kind];
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.05 - offset;
    const master = ctx.createGain();
    master.gain.value = 0;
    const start = ctx.currentTime + 0.05;
    master.gain.setValueAtTime(0, start);
    master.gain.linearRampToValueAtTime(volume, start + Math.min(1.2, total - offset));
    const end = t0 + total;
    master.gain.setValueAtTime(volume, Math.max(start, end - 1.5));
    master.gain.linearRampToValueAtTime(0, Math.max(start + 0.1, end));

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = st.pad === "sawtooth" ? 1400 : 2400;
    const delay = ctx.createDelay();
    delay.delayTime.value = (60 / st.bpm) * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    delay.connect(fb).connect(delay);
    lp.connect(master);
    delay.connect(master);
    master.connect(dest);
    this.master = master;

    const beat = 60 / st.bpm;
    const bar = beat * 4;
    const chordLen = bar * 2;
    const tone = (midi: number, at: number, dur: number, type: OscillatorType, gain: number, attack: number, toDelay = false) => {
      if (at + dur < ctx.currentTime || at > end) return;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq(midi);
      const g = ctx.createGain();
      const a = Math.max(at, ctx.currentTime);
      g.gain.setValueAtTime(0, a);
      g.gain.linearRampToValueAtTime(gain, a + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, a + dur);
      o.connect(g).connect(lp);
      if (toDelay) g.connect(delay);
      o.start(a);
      o.stop(a + dur + 0.05);
      this.nodes.push(o);
    };

    const firstChord = Math.max(0, Math.floor(offset / chordLen));
    for (let c = firstChord; c * chordLen < total; c++) {
      const at = t0 + c * chordLen;
      const chord = st.chords[c % st.chords.length];
      // Pad
      for (const n of chord) tone(st.root + n, at, chordLen + 0.6, st.pad, st.pad === "sawtooth" ? 0.035 : 0.06, 0.9);
      tone(st.root + chord[0] - 12, at, chordLen, "sine", 0.09, 0.3);
      // Arpegio
      if (st.arp !== "none") {
        const step = st.arp === "fast" ? beat / 2 : beat;
        const notes = [...chord, chord[1] + 12, chord[0] + 12];
        for (let k = 0; k * step < chordLen; k++) {
          tone(st.root + 12 + notes[k % notes.length], at + k * step, step * 2.5, "triangle", 0.05, 0.01, true);
        }
      }
      // Campanitas
      if (st.bells) {
        for (let k = 0; k < 3; k++) {
          const n = chord[(c * 7 + k * 3) % chord.length] + 24;
          tone(st.root + n, at + beat * (1 + k * 2.5), beat * 4, "sine", 0.045, 0.005, true);
        }
      }
      // Pulso suave en cada tiempo
      if (st.pulse) {
        for (let k = 0; k < 8; k++) {
          const bt = at + k * beat;
          if (bt + 0.3 < ctx.currentTime || bt > end) continue;
          const o = ctx.createOscillator();
          o.type = "sine";
          const g = ctx.createGain();
          const a = Math.max(bt, ctx.currentTime);
          o.frequency.setValueAtTime(120, a);
          o.frequency.exponentialRampToValueAtTime(45, a + 0.18);
          g.gain.setValueAtTime(0.18, a);
          g.gain.exponentialRampToValueAtTime(0.0001, a + 0.25);
          o.connect(g).connect(master);
          o.start(a);
          o.stop(a + 0.3);
          this.nodes.push(o);
        }
      }
    }
  }

  stop() {
    for (const n of this.nodes) {
      try {
        n.stop();
      } catch {
        /* ya detenido */
      }
    }
    this.nodes = [];
    this.master?.disconnect();
    this.master = null;
  }
}

let shared: AudioContext | null = null;
export function sharedAudio() {
  shared ??= new AudioContext();
  if (shared.state === "suspended") void shared.resume();
  return shared;
}
