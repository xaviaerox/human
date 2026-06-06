'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function SignupPage() {
  const router = useRouter();
  const { signUpParent } = useAuth();
  const [step, setStep] = useState<'account' | 'family'>('account');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 'account') { setStep('family'); return; }

    setError('');
    setLoading(true);

    const result = await signUpParent({ email, password, display_name: displayName, family_name: familyName });
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    router.replace('/dashboard');
  }

  return (
    <Card>
      <h2 className="font-display text-2xl text-stone-800 mb-2 text-center">
        {step === 'account' ? 'Crear cuenta' : 'Tu familia'}
      </h2>
      <p className="text-sm text-stone-500 text-center mb-6">
        {step === 'account'
          ? 'Empieza como padre o madre'
          : 'Ponle nombre a vuestra familia'}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {step === 'account' ? (
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
              autoComplete="email"
              required
              placeholder="tu@email.com"
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              placeholder="Mínimo 8 caracteres"
              minLength={8}
            />
          </>
        ) : (
          <Input
            label="Nombre de vuestra familia"
            value={familyName}
            onChange={e => setFamilyName(e.target.value)}
            required
            placeholder="Los García, La familia Martínez..."
            hint="Este nombre lo verá toda la familia"
            autoFocus
          />
        )}

        {error && (
          <p className="text-sm text-red-600 text-center" role="alert">{error}</p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          {step === 'account' ? 'Continuar' : 'Crear familia'}
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
