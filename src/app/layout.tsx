import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { PwaUpdater } from '@/components/PwaUpdater';

export const metadata: Metadata = {
  title: 'MIRA 🌟 — Autonomía y Autorregulación para Familias Neurodivergentes',
  description: 'Un espacio seguro, amable y libre de juicios para crecer juntos a través de la autorregulación emocional y el refuerzo positivo.',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'MIRA' },
  openGraph: {
    title: 'MIRA 🌟 — Crecimiento y Autorregulación Familiar',
    description: 'Plataforma inteligente y amable para apoyar la autonomía de niños neurodivergentes.',
    images: [{ url: '/mira-banner.jpg', width: 1200, height: 630, alt: 'MIRA Hero Banner' }],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#faf9f7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased font-body bg-background text-text-primary">
        <Providers>
          {children}
        </Providers>
        <PwaUpdater />
      </body>
    </html>
  );
}
