'use client';
import { useEffect, useRef } from 'react';

export interface ReelItem { key: string; cover: string; title: string; sub: string; ghost?: boolean; onSelect: () => void }

/** Curved 3D shelf. Drag or swipe sideways; tap the centre card to play, tap a side card to bring it forward. */
export function Reel({ items }: { items: ReelItem[] }) {
  const root = useRef<HTMLDivElement>(null), cards = useRef<(HTMLDivElement | null)[]>([]);
  const st = useRef({ pos: 0, target: 0, drag: false, moved: 0, idle: 0, raf: 0 });
  const n = items.length;

  useEffect(() => {
    const el = root.current; if (!el || !n) return;
    const s = st.current, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    s.idle = performance.now();
    const frame = () => {
      s.pos += (s.target - s.pos) * 0.09;
      if (!s.drag && !reduce && performance.now() - s.idle > 3000) s.target += 0.005;
      const W = el.clientWidth, R = Math.min(W * 0.64, 620), step = W < 560 ? 0.36 : 0.3;
      cards.current.forEach((c, i) => {
        if (!c) return;
        let o = (((i - s.pos) % n) + n) % n; if (o > n / 2) o -= n;
        const th = Math.max(-1.2, Math.min(1.2, o * step));
        c.style.transform = `translate3d(${R * Math.sin(th)}px,0,${R * (1 - Math.cos(th))}px) rotateY(${-th}rad)`;
        c.style.zIndex = String(50 - Math.round(Math.abs(o) * 4));
        c.style.filter = `brightness(${Math.max(0.35, 1 - Math.abs(o) * 0.13)})`;
        c.style.setProperty('--cap', String(Math.max(0, 1 - Math.abs(o) * 1.6)));
        c.style.opacity = Math.abs(o) > 4.3 ? '0' : '1';
        c.style.pointerEvents = Math.abs(o) > 4.3 ? 'none' : 'auto';
      });
      s.raf = requestAnimationFrame(frame);
    };
    s.raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(s.raf);
  }, [n]);

  const down = (e: React.PointerEvent) => {
    const s = st.current, sx = e.clientX, t0 = s.target, el = root.current!; s.drag = true; s.moved = 0; s.idle = performance.now();
    const mv = (ev: PointerEvent) => { s.moved = Math.max(s.moved, Math.abs(ev.clientX - sx)); s.target = t0 - (ev.clientX - sx) / (el.clientWidth * (el.clientWidth < 560 ? 0.2 : 0.15)); s.idle = performance.now(); };
    const up = () => { s.drag = false; s.target = Math.round(s.target); s.idle = performance.now(); removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  };
  const click = (i: number) => {
    const s = st.current; if (s.moved > 8) return;
    let o = (((i - s.target) % n) + n) % n; if (o > n / 2) o -= n;
    if (Math.abs(o) < 0.6) items[i].onSelect(); else s.target += o;
    s.idle = performance.now();
  };
  const wheel = (e: React.WheelEvent) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { st.current.target += e.deltaX / 260; st.current.idle = performance.now(); } };

  if (!n) return null;
  return (
    <div className="reel" ref={root} onPointerDown={down} onWheel={wheel} role="list" aria-label="Featured songs">
      <div className="reel-in">
        {items.map((it, i) => (
          <div key={it.key} className={`reel-card${it.ghost ? ' is-ghost' : ''}`} ref={el => { cards.current[i] = el; }} role="listitem">
            <button onClick={() => click(i)} aria-label={`${it.title}, ${it.sub}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.cover} alt="" draggable={false} />
              <span className="reel-cap"><b>{it.title}</b><i>{it.sub}</i></span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
