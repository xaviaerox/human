'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn({ email, password });
    setLoading(false);

    if (!result.ok) {
      setError('Email o contraseña incorrectos. Inténtalo de nuevo.');
      return;
    }

    const { profile } = result.data;

    // Route based on role and onboarding state
    if (!profile.onboarding_complete && profile.role === 'child') {
      router.replace('/onboarding/companion');
    } else if (profile.role === 'parent') {
      router.replace('/dashboard');
    } else {
      router.replace('/home');
    }
  }

  return (
    <Card>
      <h2 className="font-display text-2xl text-stone-800 mb-6 text-center">
        Bienvenido de nuevo
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          autoComplete="email"
          required
          placeholder="tu@email.com"
        />
        <Input
          label="Contraseña"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />

        {error && (
          <p className="text-sm text-red-600 text-center animate-fade-in" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          loading={loading}
          className="mt-2 w-full"
        >
          Entrar
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-stone-500 flex flex-col gap-3">
        <Link href="/signup" className="text-bloom-600 hover:text-bloom-700 font-medium">
          Crear familia nueva
        </Link>
        <Link href="/join" className="text-stone-400 hover:text-stone-600">
          Unirme con un código de invitación
        </Link>

        <div className="pt-2 border-t border-stone-100">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.setItem('mira_demo_mode', 'true');
              }
              router.push('/home');
            }}
            className="w-full text-teal-600 hover:text-teal-700 hover:bg-teal-50 font-medium"
          >
            ✨ Explorar Modo Demo al Instante (Sin Registro)
          </Button>
        </div>
      </div>
    </Card>
  );
}
