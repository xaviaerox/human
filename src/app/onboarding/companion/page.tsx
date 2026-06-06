'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { useAuth } from '@/lib/auth/AuthProvider';
import { CompanionBlob } from '@/components/companion/CompanionBlob';
import { Button } from '@/components/ui/Button';

type Step = 'intro' | 'pulse' | 'naming' | 'reveal';

export default function CompanionOnboardingPage() {
  const router = useRouter();
  const { companion, loading: companionLoading, createCompanion } = useCompanion();
  const { session, loading: authLoading, updateProfile } = useAuth();

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login');
    }
  }, [session, authLoading, router]);
  const [step, setStep] = useState<Step>('intro');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to home if companion already exists
  useEffect(() => {
    if (!companionLoading && companion) {
      updateProfile({ onboarding_complete: true }).then(() => {
        router.replace('/home');
      });
    }
  }, [companion, companionLoading, router, updateProfile]);

  // Progress through intro steps automatically
  useEffect(() => {
    if (step === 'intro') {
      const t = setTimeout(() => setStep('pulse'), 2200);
      return () => clearTimeout(t);
    }
    if (step === 'pulse') {
      const t = setTimeout(() => setStep('naming'), 2800);
      return () => clearTimeout(t);
    }
  }, [step]);

  async function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setLoading(true);

    const ok = await createCompanion(name.trim());
    if (!ok) {
      setError('Algo salió mal. Inténtalo de nuevo.');
      setLoading(false);
      return;
    }

    setStep('reveal');
    setLoading(false);
  }

  async function handleContinue() {
    setLoading(true);
    await updateProfile({ onboarding_complete: true });
    router.replace('/home');
  }

  if (authLoading) return (
    <div className="min-h-dvh bg-stone-50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
    </div>
  );

  if (!session) return null;

  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col items-center justify-center px-6 py-12">

      {/* INTRO */}
      {step === 'intro' && (
        <div className="text-center animate-fade-in">
          <p className="font-display text-2xl text-stone-700">
            Hay alguien aquí...
          </p>
        </div>
      )}

      {/* PULSE — egg appears */}
      {step === 'pulse' && (
        <div className="flex flex-col items-center gap-8 animate-bloom">
          <CompanionBlob stage="egg" size="xl" />
          <p className="font-display text-xl text-stone-600 text-center max-w-xs leading-relaxed">
            Está esperando que le pongas nombre
          </p>
        </div>
      )}

      {/* NAMING */}
      {step === 'naming' && (
        <div className="flex flex-col items-center gap-8 w-full max-w-sm animate-slide-up">
          <CompanionBlob stage="egg" size="xl" />

          <form onSubmit={handleNameSubmit} className="w-full flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-center">
              <span className="font-display text-lg text-stone-700">
                ¿Cómo se llamará?
              </span>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Escribe un nombre..."
                maxLength={20}
                autoFocus
                className="
                  w-full text-center text-2xl font-display text-stone-800
                  bg-transparent border-0 border-b-2 border-stone-300
                  focus:outline-none focus:border-bloom-400
                  placeholder:text-stone-300 transition-colors pb-2
                "
                aria-label="Nombre del companion"
              />
            </label>

            {error && (
              <p className="text-sm text-red-500 text-center" role="alert">{error}</p>
            )}

            <Button
              type="submit"
              size="xl"
              loading={loading}
              disabled={!name.trim()}
              className="w-full mt-2"
            >
              Este es su nombre
            </Button>
          </form>
        </div>
      )}

      {/* REVEAL */}
      {step === 'reveal' && (
        <div className="flex flex-col items-center gap-8 text-center animate-bloom">
          <CompanionBlob stage="egg" size="xl" />

          {/* Dialogue bubble */}
          <div className="bg-white rounded-3xl rounded-bl-sm px-5 py-3 shadow-soft border border-stone-100 max-w-xs">
            <p className="text-stone-700 font-body leading-relaxed">
              ✦ ✦ ✦
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="font-display text-2xl text-stone-800">
              Hola, <span className="text-bloom-600">{name}</span>
            </p>
            <p className="text-stone-500 text-sm max-w-xs">
              Tu companion ha nacido. Creceréis juntos.
            </p>
          </div>

          <Button
            size="xl"
            onClick={handleContinue}
            loading={loading}
            className="mt-4"
          >
            Empezar
          </Button>
        </div>
      )}
    </div>
  );
}
