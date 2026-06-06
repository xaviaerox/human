'use client';

import { type ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard',          label: 'Inicio',    icon: '⌂' },
  { href: '/dashboard/routines', label: 'Rutinas',   icon: '◎' },
  { href: '/dashboard/goals',    label: 'Objetivos', icon: '◈' },
  { href: '/dashboard/child',    label: 'Mi hijo',   icon: '♡' },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, loading, signOut } = useAuth();
  const profile = session?.profile ?? null;

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/login');
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-stone-100 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl text-stone-800">mira</span>
          <span className="text-stone-300">·</span>
          <span className="text-sm text-stone-500">{profile?.display_name}</span>
        </div>
        <button
          onClick={async () => {
            await signOut();
            router.replace('/login');
          }}
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
        >
          Salir
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Bottom nav */}
      <nav
        className="bg-white border-t border-stone-100 px-4 py-2 sticky bottom-0"
        aria-label="Navegación principal"
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
                <span className="text-lg" aria-hidden="true">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
