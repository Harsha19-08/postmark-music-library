/** One <audio> element, plus an optional Web Audio graph that is only created when an effect needs it. */
export interface Fx { preset: string; eq: number[]; bass: number; rev: number; tone: number; w8: number; speed: number; link: boolean }
export const FX_OFF: Fx = { preset: 'orig', eq: [0, 0, 0, 0, 0], bass: 0, rev: 0, tone: 20000, w8: 0, speed: 1, link: true };
export const PRESETS: { id: string; name: string; note: string; fx: Omit<Fx, 'preset'> }[] = [
  { id: 'orig', name: 'Original', note: 'No effects', fx: { ...FX_OFF } },
  { id: 'slow', name: 'Slowed + Reverb', note: 'Late-night drift', fx: { eq: [2, 0, -1, 0, -1], bass: 3, rev: 0.5, tone: 9500, w8: 0, speed: 0.85, link: true } },
  { id: 'night', name: 'Nightcore', note: 'Faster, brighter', fx: { eq: [-1, 0, 0, 2, 3], bass: 0, rev: 0.05, tone: 20000, w8: 0, speed: 1.24, link: true } },
  { id: 'bass', name: 'Bass Boost', note: 'Low end up', fx: { eq: [5, 2, -1, 0, 1], bass: 9, rev: 0, tone: 20000, w8: 0, speed: 1, link: true } },
  { id: '8d', name: '8D Audio', note: 'Circles your head', fx: { eq: [0, 0, 0, 0, 1], bass: 1, rev: 0.22, tone: 20000, w8: 1, speed: 1, link: true } },
  { id: 'lofi', name: 'Lo-fi', note: 'Warm and dusty', fx: { eq: [2, 1, 0, -3, -6], bass: 2, rev: 0.15, tone: 3600, w8: 0, speed: 0.97, link: true } },
  { id: 'hall', name: 'Concert Hall', note: 'Big room reverb', fx: { eq: [0, 0, 0, 1, 1], bass: 0, rev: 0.75, tone: 20000, w8: 0, speed: 1, link: false } },
  { id: 'vocal', name: 'Vocal Focus', note: 'Voice forward', fx: { eq: [-3, -1, 3, 4, 1], bass: -2, rev: 0, tone: 20000, w8: 0, speed: 1, link: false } },
];

let audio: HTMLAudioElement | null = null;
export function getAudio(): HTMLAudioElement {
  if (!audio) { audio = new Audio(); audio.preload = 'auto'; (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true; }
  return audio;
}

interface Graph { ctx: AudioContext; eq: BiquadFilterNode[]; bass: BiquadFilterNode; tone: BiquadFilterNode; dry: GainNode; wet: GainNode; pan: StereoPannerNode; lfoG: GainNode; an: AnalyserNode; out: GainNode }
let g: Graph | null = null;
export const hasGraph = () => g !== null;
export const getAnalyser = () => g?.an ?? null;
export const fxNeedsGraph = (f: Fx) => f.eq.some(v => v !== 0) || f.bass !== 0 || f.rev > 0 || f.tone < 20000 || f.w8 > 0;

function impulse(ctx: AudioContext, sec: number, decay: number) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
  return b;
}
export function initGraph(): boolean {
  if (g) return true;
  try {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new C(), el = getAudio(), src = ctx.createMediaElementSource(el);
    const eq = [60, 230, 910, 3600, 14000].map((f, i) => { const b = ctx.createBiquadFilter(); b.type = i === 0 ? 'lowshelf' : i === 4 ? 'highshelf' : 'peaking'; b.frequency.value = f; b.Q.value = 1; return b; });
    const bass = ctx.createBiquadFilter(); bass.type = 'lowshelf'; bass.frequency.value = 95;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.Q.value = 0.5; tone.frequency.value = 20000;
    const dry = ctx.createGain(), wet = ctx.createGain(), conv = ctx.createConvolver(); conv.buffer = impulse(ctx, 2.8, 2.4);
    const pan = ctx.createStereoPanner(), lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.14; lfo.connect(lfoG); lfoG.connect(pan.pan); lfo.start();
    const an = ctx.createAnalyser(); an.fftSize = 128; an.smoothingTimeConstant = 0.82;
    const out = ctx.createGain();
    let n: AudioNode = src; for (const x of [...eq, bass, tone]) { n.connect(x); n = x; }
    n.connect(dry); n.connect(conv); conv.connect(wet); dry.connect(pan); wet.connect(pan); pan.connect(an); an.connect(out); out.connect(ctx.destination);
    el.volume = 1; el.muted = false;
    g = { ctx, eq, bass, tone, dry, wet, pan, lfoG, an, out };
    return true;
  } catch { g = null; return false; }
}
export function resumeCtx() { if (g && g.ctx.state === 'suspended') void g.ctx.resume(); }

export function applyFx(f: Fx, vol: number, muted: boolean) {
  const el = getAudio();
  el.playbackRate = f.speed;
  const keep = !f.link;
  const e = el as HTMLAudioElement & { mozPreservesPitch?: boolean; webkitPreservesPitch?: boolean };
  el.preservesPitch = keep; e.mozPreservesPitch = keep; e.webkitPreservesPitch = keep;
  if (!g) { el.volume = vol; el.muted = muted; return; }
  const t = g.ctx.currentTime;
  g.eq.forEach((b, i) => b.gain.setTargetAtTime(f.eq[i], t, 0.05));
  g.bass.gain.setTargetAtTime(f.bass, t, 0.05); g.tone.frequency.setTargetAtTime(f.tone, t, 0.05);
  g.wet.gain.setTargetAtTime(f.rev * 1.1, t, 0.05); g.dry.gain.setTargetAtTime(1 - f.rev * 0.45, t, 0.05);
  g.lfoG.gain.setTargetAtTime(f.w8, t, 0.1); if (!f.w8) g.pan.pan.setTargetAtTime(0, t, 0.1);
  g.out.gain.setTargetAtTime(muted ? 0 : vol, t, 0.03);
}
