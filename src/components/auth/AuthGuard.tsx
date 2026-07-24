'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

interface AuthGuardProps {
  children: React.ReactNode;
  requireRole?: 'parent' | 'child';
}

export function AuthGuard({ children, requireRole }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { loading, isAuthenticated, isParent, isChild } = useAuth();

  useEffect(() => {
    if (loading) return;

    // In static demo mode, if session is null, allow fallback browsing or redirect to login
    const isStatic = process.env.NEXT_PUBLIC_DATA_SOURCE === 'static';

    if (!isAuthenticated && !isStatic) {
      router.push('/login');
      return;
    }

    if (requireRole === 'parent' && !isParent && !isStatic) {
      router.push('/home');
      return;
    }

    if (requireRole === 'child' && !isChild && !isStatic) {
      router.push('/dashboard');
      return;
    }
  }, [loading, isAuthenticated, isParent, isChild, requireRole, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent"></div>
          <p className="text-sm font-medium text-amber-200/80">Cargando espacio seguro MIRA...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
