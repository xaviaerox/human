import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

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
      <body className="h-full antialiased">
        <Providers>
          {children}
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/human/sw.js').then(
                    function(reg) {
                      console.log('SW registered with scope:', reg.scope);
                    },
                    function(err) {
                      console.error('SW registration failed:', err);
                    }
                  );
                });
              }
            `
          }}
        />
      </body>
    </html>
  );
}
