import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import Script from 'next/script';
import { AppShell } from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Postmark', template: '%s · Postmark' },
  description: 'Your own music library. Upload once, listen anywhere, offline.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Postmark', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#09090d' }, { media: '(prefers-color-scheme: light)', color: '#f1f2f8' }],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head><Script id="theme-init" strategy="beforeInteractive">{`try{var t=localStorage.getItem('pm-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`}</Script></head>
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
