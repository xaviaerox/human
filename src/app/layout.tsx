import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { PwaUpdater } from '@/components/PwaUpdater';

export const metadata: Metadata = {
  title: 'Mira',
  description: 'Un espacio de calma para crecer juntos',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Mira' },
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
