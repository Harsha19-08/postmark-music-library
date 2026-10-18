'use client';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { Icon } from './Icon';

export interface StampProps {
  cover: string; title: string; sub?: string; tag?: string; playing?: boolean; ghost?: boolean; round?: boolean;
  progress?: number; onClick?: () => void; onMore?: (e: MouseEvent<HTMLElement>) => void; className?: string; badge?: ReactNode; label?: string;
}

/** A perforated collectible stamp. The perforation is a real alpha mask, so it works over any background. */
export function Stamp({ cover, title, sub, tag, playing, ghost, round, progress, onClick, onMore, className = '', badge, label }: StampProps) {
  const key = (e: KeyboardEvent) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } };
  return (
    <div className={`stamp-wrap ${className}`}>
      <div className={`stamp${playing ? ' is-playing' : ''}${ghost ? ' is-ghost' : ''}${round ? ' is-round' : ''}`} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}
        aria-label={label ?? `${title}${sub ? ', ' + sub : ''}`} onClick={onClick} onKeyDown={key} onContextMenu={onMore ? e => { e.preventDefault(); onMore(e); } : undefined}>
        <span className="stamp-art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" loading="lazy" decoding="async" draggable={false} />
          {tag && <span className="stamp-tag">{tag}</span>}
          {badge}
          {progress !== undefined && <span className="stamp-prog" style={{ transform: `scaleX(${progress})` }} />}
          {onClick && <span className="stamp-play"><Icon name="play" size={20} /></span>}
          {playing && (
            <span className="stamp-mark" aria-hidden="true">
              <svg viewBox="0 0 100 100"><defs><path id="pm-ring" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0" /></defs>
                <circle cx="50" cy="50" r="46" /><text><textPath href="#pm-ring">NOW PLAYING · POSTMARK · NOW PLAYING · </textPath></text></svg>
            </span>
          )}
        </span>
        <span className="stamp-title">{title}</span>
        {sub !== undefined && <span className="stamp-sub">{sub}</span>}
      </div>
      {onMore && <button className="stamp-more" aria-label={`More options for ${title}`} onClick={onMore}><Icon name="more" size={18} /></button>}
    </div>
  );
}
