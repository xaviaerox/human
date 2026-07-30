import Link from 'next/link';
import { type ReactNode } from 'react';
import { MiraLogo } from '@/components/ui/MiraLogo';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Mira brand logo */}
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <MiraLogo size="lg" showText />
          <p className="mt-2 text-stone-500 text-sm">un espacio de calma para crecer juntos</p>
        </div>
        {children}
        <div className="mt-8 text-center">
          <Link
            href="/brandbook"
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Brand Book Definitivo — Solutech · MIRATEA
          </Link>
        </div>
      </div>
    </div>
  );
}
