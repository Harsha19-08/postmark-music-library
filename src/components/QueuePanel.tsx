'use client';
import { useRef } from 'react';
import { coverOf } from '@/lib/cover';
import { usePlayer } from '@/lib/player';
import { useLib } from '@/lib/store';
import { Icon } from './Icon';

export function QueuePanel() {
  const queue = usePlayer(s => s.queue), index = usePlayer(s => s.index), byId = useLib(s => s.byId);
  const jump = usePlayer(s => s.jump), removeAt = usePlayer(s => s.removeAt), move = usePlayer(s => s.move), clear = usePlayer(s => s.clear);
  const drag = useRef<number | null>(null);
  if (!queue.length) return <div className="empty"><h3>Queue is empty</h3><p>Play a song, or use ••• then “Add to queue”.</p></div>;
  return (
    <div className="queue">
      <div className="queue-head"><h3>Up next <span className="mono">{queue.length - index - 1} after this</span></h3><button className="chip" onClick={clear}>Clear</button></div>
      <ol>
        {queue.map((id, i) => {
          const s = byId[id]; if (!s) return null;
          return (
            <li key={id + i} className={`qrow${i === index ? ' is-current' : ''}`} draggable onDragStart={() => { drag.current = i; }} onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (drag.current !== null && drag.current !== i) move(drag.current, i); drag.current = null; }}>
              <button className="qrow-main" onClick={() => jump(i)} aria-label={`Play ${s.title}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverOf(s)} alt="" loading="lazy" /><span><b>{s.title}</b><i>{s.artist}</i></span>
              </button>
              <span className="qrow-acts">
                {i > 0 && <button className="ib" aria-label="Move up" onClick={() => move(i, i - 1)}><Icon name="down" size={18} className="flip" /></button>}
                <button className="ib" aria-label="Remove from queue" onClick={() => removeAt(i)}><Icon name="close" size={18} /></button>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
