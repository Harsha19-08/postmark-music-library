'use client';
import { use } from 'react';
import { Collection } from '@/components/Collection';
import { albums, useLib } from '@/lib/store';

export default function Album({ params }: { params: Promise<{ name: string }> }) {
  const name = decodeURIComponent(use(params).name), songs = useLib(s => s.songs);
  const a = albums(songs).find(x => x.key === name);
  return <Collection kind="Album" title={name} sub={a?.sub} ids={a?.ids ?? []} />;
}
