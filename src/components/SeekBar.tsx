'use client';
import { useState } from 'react';
import { usePlayer } from '@/lib/player';

export const fmt = (s: number) => { if (!Number.isFinite(s) || s < 0) s = 0; s = Math.floor(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function SeekBar({ compact = false }: { compact?: boolean }) {
  const time = usePlayer(s => s.time), dur = usePlayer(s => s.dur), seek = usePlayer(s => s.seek);
  const [drag, setDrag] = useState<number | null>(null);
  const v = drag ?? (dur ? Math.min(1000, (time / dur) * 1000) : 0);
  const commit = () => { if (drag !== null && dur) seek((drag / 1000) * dur); setDrag(null); };
  return (
    <div className={`seek${compact ? ' seek-compact' : ''}`}>
      <span className="mono seek-t">{fmt(drag !== null ? (drag / 1000) * dur : time)}</span>
      <input type="range" min={0} max={1000} step={1} value={v} style={{ ['--p' as string]: `${v / 10}%` }} aria-label="Seek" aria-valuetext={`${fmt(time)} of ${fmt(dur)}`}
        onChange={e => setDrag(Number(e.target.value))} onPointerUp={commit} onKeyUp={commit} onBlur={commit} />
      <span className="mono seek-t">{fmt(dur)}</span>
    </div>
  );
}
