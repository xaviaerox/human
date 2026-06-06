'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function JoinPage() {
  const router = useRouter();
  const { signUpWithInvite } = useAuth();
  const [step, setStep] = useState<'code' | 'account'>('code');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 'code') { setStep('account'); return; }

    setError('');
    setLoading(true);

    const result = await signUpWithInvite({
      email,
      password,
      invite_code: inviteCode.toUpperCase(),
      display_name: displayName,
      birth_year: birthYear ? parseInt(birthYear) : undefined,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    const { profile } = result.data;
    if (profile.role === 'child' && !profile.onboarding_complete) {
      router.replace('/onboarding/companion');
    } else {
      router.replace('/home');
    }
  }

  return (
    <Card>
      <h2 className="font-display text-2xl text-stone-800 mb-2 text-center">
        Unirme a mi familia
      </h2>
      <p className="text-sm text-stone-500 text-center mb-6">
        {step === 'code'
          ? 'Introduce el código que te han dado'
          : 'Crea tu cuenta'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {step === 'code' ? (
          <Input
            label="Código de invitación"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            required
            placeholder="ABCD1234"
            maxLength={8}
            className="uppercase tracking-widest text-center text-lg font-mono"
            autoFocus
          />
        ) : (
          <>
            <Input
              label="Tu nombre"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              placeholder="¿Cómo te llamas?"
              autoFocus
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />
            <Input
              label="Año de nacimiento (opcional)"
              type="number"
              value={birthYear}
              onChange={e => setBirthYear(e.target.value)}
              placeholder="2015"
              min={2000}
              max={new Date().getFullYear()}
            />
          </>
        )}

        {error && (
          <p className="text-sm text-red-600 text-center" role="alert">{error}</p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          {step === 'code' ? 'Continuar' : 'Unirme'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link href="/login" className="text-sm text-stone-400 hover:text-stone-600">
          Ya tengo cuenta
        </Link>
      </div>
    </Card>
  );
}
