import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Postmark', short_name: 'Postmark', description: 'Your own music library. Upload once, listen anywhere, offline.',
    start_url: '/', scope: '/', display: 'standalone', orientation: 'portrait', background_color: '#09090d', theme_color: '#09090d',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
