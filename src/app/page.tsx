'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function RootPage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) { router.replace('/login'); return; }
    const { profile } = session;
    if (!profile.onboarding_complete && profile.role === 'child') {
      router.replace('/onboarding/companion');
    } else if (profile.role === 'parent') {
      router.replace('/dashboard');
    } else {
      router.replace('/home');
    }
  }, [session, loading, router]);

  return (
    <div className="min-h-dvh bg-stone-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
    </div>
  );
}
