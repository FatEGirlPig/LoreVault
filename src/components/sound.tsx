"use client";
import { useEffect, useState } from "react";

/* Sci-fi UI sounds and a calm generative ambient pad, synthesized with Web Audio (no audio files, no licensing).
   Preferences live in localStorage per device; audio starts only after the visitor's first interaction (browser autoplay rules). */

export type SoundPrefs = { muted: boolean; music: number; sfx: number };
const KEY = "lv-sound";
const DEFAULTS: SoundPrefs = { muted: false, music: 0.35, sfx: 0.5 };
const EVENT = "lv-sound-change";

export function readPrefs(): SoundPrefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return DEFAULTS; }
}
export function writePrefs(p: SoundPrefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: p }));
}
export function useSoundPrefs(): [SoundPrefs, (p: Partial<SoundPrefs>) => void] {
  const [prefs, setPrefs] = useState(DEFAULTS);
  useEffect(() => {
    setPrefs(readPrefs());
    const on = (e: Event) => setPrefs((e as CustomEvent<SoundPrefs>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return [prefs, (p) => writePrefs({ ...readPrefs(), ...p })];
}

class Engine {
  ctx: AudioContext; master: GainNode; music: GainNode; sfx: GainNode;
  private chordTimer = 0; private voices: OscillatorNode[] = []; private lastHover = 0;

  constructor() {
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain(); this.music.gain.value = 0; this.music.connect(this.master);
    this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
    this.startAmbient();
  }

  apply(p: SoundPrefs) {
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(p.muted ? 0 : 1, t, 0.05);
    this.music.gain.setTargetAtTime(p.music * 0.18, t, 1.5); // fade gently
    this.sfx.gain.setTargetAtTime(p.sfx * 0.6, t, 0.02);
  }

  /** Short two-tone "confirm" blip. */
  click() {
    const t = this.ctx.currentTime;
    for (const [f0, f1, delay, type] of [[1200, 1800, 0, "sine"], [600, 300, 0.01, "triangle"]] as const) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t + delay); o.frequency.exponentialRampToValueAtTime(f1, t + delay + 0.07);
      g.gain.setValueAtTime(0.0001, t + delay); g.gain.exponentialRampToValueAtTime(0.25, t + delay + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.09);
      o.connect(g).connect(this.sfx); o.start(t + delay); o.stop(t + delay + 0.1);
    }
  }

  /** Very soft tick on hover. */
  hover() {
    const now = performance.now();
    if (now - this.lastHover < 60) return;
    this.lastHover = now;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sine"; o.frequency.value = 2400;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.05);
  }

  /** Slow evolving pad: detuned voices -> lowpass (LFO-swept) -> feedback delay for space. */
  private startAmbient() {
    const c = this.ctx;
    const filter = c.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 700; filter.Q.value = 0.7;
    const lfo = c.createOscillator(), lfoGain = c.createGain(); lfo.frequency.value = 0.04; lfoGain.gain.value = 350;
    lfo.connect(lfoGain).connect(filter.frequency); lfo.start();
    const delay = c.createDelay(2), fb = c.createGain(), wet = c.createGain();
    delay.delayTime.value = 0.9; fb.gain.value = 0.45; wet.gain.value = 0.5;
    filter.connect(this.music); filter.connect(delay); delay.connect(fb).connect(delay); delay.connect(wet).connect(this.music);

    // Am9 -> Fmaj7 -> Cmaj7 -> Em7 (root, fifth-ish and colour tones, low register)
    const chords = [[110, 164.81, 246.94, 329.63], [87.31, 130.81, 220, 329.63], [130.81, 196, 246.94, 329.63], [82.41, 123.47, 196, 293.66]];
    const pad = chords[0].map((f, i) => {
      const g = c.createGain(); g.gain.value = 0.22; g.connect(filter);
      return [-6, 6].map((detune) => {
        const o = c.createOscillator(); o.type = i === 0 ? "sine" : "triangle"; o.frequency.value = f; o.detune.value = detune;
        o.connect(g); o.start(); this.voices.push(o); return o;
      });
    });
    let idx = 0;
    const next = () => {
      idx = (idx + 1) % chords.length;
      const t = c.currentTime;
      pad.forEach((pair, i) => pair.forEach((o) => o.frequency.setTargetAtTime(chords[idx][i], t, 3)));
    };
    this.chordTimer = window.setInterval(next, 14000);
  }
}

let engine: Engine | null = null;
const INTERACTIVE = "button, a[href], [role=button], summary, select, input[type=checkbox], input[type=radio], label[for]";

/** Mount once in the root layout. Wires global click/hover sounds and renders a floating mute toggle. */
export function SoundSystem() {
  const [prefs, update] = useSoundPrefs();
  const [started, setStarted] = useState(false);

  useEffect(() => { engine?.apply(prefs); }, [prefs]);

  useEffect(() => {
    const start = () => {
      if (!engine) { try { engine = new Engine(); } catch { return; } }
      if (engine.ctx.state === "suspended") engine.ctx.resume();
      engine.apply(readPrefs());
      setStarted(true);
    };
    const onDown = (e: PointerEvent) => {
      start();
      if ((e.target as Element)?.closest?.(INTERACTIVE)) engine?.click();
    };
    const canHover = matchMedia("(hover: hover)").matches;
    const onOver = (e: PointerEvent) => {
      if (!engine || !canHover) return;
      const el = (e.target as Element)?.closest?.(INTERACTIVE);
      if (el && !el.contains(e.relatedTarget as Node)) engine.hover();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { start(); if ((e.target as Element)?.closest?.(INTERACTIVE)) engine?.click(); } };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerover", onOver, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerover", onOver, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, []);

  return (
    <button type="button" onClick={() => update({ muted: !prefs.muted })}
      aria-label={prefs.muted ? "Unmute sound" : "Mute sound"} title={started || prefs.muted ? (prefs.muted ? "Sound off" : "Sound on") : "Sound starts when you interact"}
      className="fixed bottom-4 right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-panel/90 text-ink backdrop-blur hover:border-cyan">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M11 5 6 9H2v6h4l5 4z" />
        {prefs.muted ? <path d="m23 9-6 6m0-6 6 6" /> : <><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M19 5a10 10 0 0 1 0 14" /></>}
      </svg>
    </button>
  );
}

/** Sliders for the settings page. */
export function SoundSettings() {
  const [prefs, update] = useSoundPrefs();
  const slider = (key: "music" | "sfx", label: string) => (
    <label className="block">
      <span className="label flex justify-between"><span>{label}</span><span>{Math.round(prefs[key] * 100)}%</span></span>
      <input type="range" min={0} max={1} step={0.05} value={prefs[key]} onChange={(e) => update({ [key]: Number(e.target.value) })}
        className="w-full accent-[var(--color-cyan)]" aria-label={`${label} volume`} />
    </label>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {slider("music", "Ambient music")}
      {slider("sfx", "Button sounds")}
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" checked={prefs.muted} onChange={(e) => update({ muted: e.target.checked })} /> Mute all sound
      </label>
      <p className="text-xs text-mute sm:col-span-2">Saved on this device. You can also use the speaker button in the bottom-right corner of any page.</p>
    </div>
  );
}
