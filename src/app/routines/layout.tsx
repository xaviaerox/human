'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/home',     label: 'Inicio',    emoji: '⌂' },
  { href: '/routines', label: 'Rutinas',   emoji: '◎' },
  { href: '/goals',    label: 'Objetivo',  emoji: '◈' },
  { href: '/checkin',  label: 'Cómo estoy', emoji: '♡' },
];

export default function HomeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col">
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 px-4 py-2 z-10"
        aria-label="Navegación"
      >
        <div className="flex justify-around max-w-md mx-auto">
          {NAV.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all',
                  active
                    ? 'text-bloom-600 bg-bloom-50'
                    : 'text-stone-400 hover:text-stone-600'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="text-lg" aria-hidden="true">{item.emoji}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
