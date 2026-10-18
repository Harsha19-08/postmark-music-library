'use client';
import { Collection } from '@/components/Collection';
import { textCover } from '@/lib/cover';
import { useLib } from '@/lib/store';

export default function Liked() {
  const likes = useLib(s => s.likes);
  return <Collection kind="Collection" title="Liked" ids={[...likes]} cover={textCover('Liked')} />;
}
