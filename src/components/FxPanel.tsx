'use client';
import { PRESETS } from '@/lib/engine';
import { usePlayer } from '@/lib/player';

const BANDS = ['60', '230', '910', '3.6k', '14k'];
const KNOBS: { k: 'speed' | 'bass' | 'rev' | 'tone' | 'w8'; name: string; min: number; max: number; step: number; show: (v: number) => string }[] = [
  { k: 'speed', name: 'Speed', min: 0.5, max: 1.5, step: 0.01, show: v => `${v.toFixed(2)}×` },
  { k: 'bass', name: 'Bass', min: -6, max: 14, step: 1, show: v => `${v > 0 ? '+' : ''}${v} dB` },
  { k: 'rev', name: 'Reverb', min: 0, max: 1, step: 0.01, show: v => `${Math.round(v * 100)}%` },
  { k: 'tone', name: 'Tone', min: 800, max: 20000, step: 100, show: v => (v >= 19900 ? 'Open' : `${(v / 1000).toFixed(1)} kHz`) },
  { k: 'w8', name: '8D motion', min: 0, max: 1, step: 0.01, show: v => `${Math.round(v * 100)}%` },
];

export function FxPanel() {
  const fx = usePlayer(s => s.fx), setPreset = usePlayer(s => s.setPreset), setFx = usePlayer(s => s.setFx);
  return (
    <div className="fx">
      <h3 className="mono">Remix presets</h3>
      <div className="presets">
        {PRESETS.map(p => (
          <button key={p.id} className="preset" aria-pressed={fx.preset === p.id} onClick={() => setPreset(p.id)}><b>{p.name}</b><span>{p.note}</span></button>
        ))}
      </div>
      <h3 className="mono">Equaliser</h3>
      <div className="eq">
        {BANDS.map((b, i) => (
          <label key={b}><input type="range" min={-12} max={12} step={1} value={fx.eq[i]} aria-label={`${b} Hz`} onChange={e => { const eq = fx.eq.slice(); eq[i] = Number(e.target.value); setFx({ eq }); }} /><span className="mono">{b}</span></label>
        ))}
      </div>
      <div className="knobs">
        {KNOBS.map(k => (
          <label key={k.k} className="knob"><span className="knob-top"><span>{k.name}</span><output>{k.show(fx[k.k])}</output></span>
            <input type="range" min={k.min} max={k.max} step={k.step} value={fx[k.k]} style={{ ['--p' as string]: `${((fx[k.k] - k.min) / (k.max - k.min)) * 100}%` }} onChange={e => setFx({ [k.k]: Number(e.target.value) })} /></label>
        ))}
        <label className="knob knob-check"><input type="checkbox" checked={fx.link} onChange={e => setFx({ link: e.target.checked })} /><span>Pitch follows speed<small>Turn on for slowed and nightcore</small></span></label>
      </div>
    </div>
  );
}
