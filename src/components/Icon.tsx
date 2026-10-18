const P: Record<string, { d: string; fill?: boolean }> = {
  home: { d: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
  search: { d: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4' },
  library: { d: 'M4 4v16M9 4v16M14.5 5.5l5 14.5M14.5 5.5l-1 .3' },
  add: { d: 'M12 16V4M7 9l5-5 5 5M4 20h16' },
  plus: { d: 'M12 5v14M5 12h14' },
  play: { d: 'M7 4.5v15l13-7.5z', fill: true },
  pause: { d: 'M6 4h4v16H6zM14 4h4v16h-4z', fill: true },
  next: { d: 'M16 5h2v14h-2zM4 5v14l10.5-7z', fill: true },
  prev: { d: 'M6 5h2v14H6zM20 5v14L9.5 12z', fill: true },
  shuffle: { d: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5' },
  repeat: { d: 'M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3' },
  heart: { d: 'M12 21s-8-5.3-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.7-8 11-8 11z' },
  heartFill: { d: 'M12 21s-8-5.3-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.7-8 11-8 11z', fill: true },
  more: { d: 'M5 12h.01M12 12h.01M19 12h.01' },
  down: { d: 'M6 9l6 6 6-6' },
  back: { d: 'M15 6l-6 6 6 6' },
  sliders: { d: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6' },
  queue: { d: 'M3 6h13M3 12h13M3 18h7M18 14v6l4-3z' },
  volume: { d: 'M11 5L6 9H2v6h4l5 4zM16 9a4 4 0 010 6M19 6a8 8 0 010 12' },
  mute: { d: 'M11 5L6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6' },
  download: { d: 'M12 4v12M7 11l5 5 5-5M4 20h16' },
  check: { d: 'M5 12.5l4.5 4.5L19 7.5' },
  close: { d: 'M6 6l12 12M18 6L6 18' },
  sun: { d: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' },
  moon: { d: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z' },
  gear: { d: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z' },
  link: { d: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1' },
  trash: { d: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3' },
  music: { d: 'M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z' },
  clock: { d: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2' },
  external: { d: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5' },
};
export type IconName = keyof typeof P;
export function Icon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  const p = P[name];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className} fill={p.fill ? 'currentColor' : 'none'} stroke={p.fill ? 'none' : 'currentColor'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={p.d} />
    </svg>
  );
}
