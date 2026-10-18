'use client';
import { use } from 'react';
import { Collection } from '@/components/Collection';
import { textCover } from '@/lib/cover';
import { useLib } from '@/lib/store';

export default function Language({ params }: { params: Promise<{ lang: string }> }) {
  const lang = decodeURIComponent(use(params).lang), songs = useLib(s => s.songs);
  return <Collection kind="Collection" title={lang === 'Other' ? 'My music' : lang} ids={songs.filter(s => s.lang === lang).map(s => s.id)} cover={textCover(lang)} />;
}
