'use client';
import { use } from 'react';
import { Collection } from '@/components/Collection';
import { textCover } from '@/lib/cover';
import { artists, useLib } from '@/lib/store';

export default function Artist({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent(use(params).name), songs = useLib(s => s.songs);
  const a = artists(songs).find(x => x.key === name);
  return <Collection kind="Artist" title={name} ids={a?.ids ?? []} cover={textCover('artist-' + name)} />;
}
