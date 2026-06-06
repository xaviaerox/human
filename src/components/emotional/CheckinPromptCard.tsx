'use client';

import { useState } from 'react';
import { useEmotional } from '@/lib/emotional/EmotionalProvider';
import { classifyEmotion, getSuggestedWords } from '@/lib/emotional/EmotionModel';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { EmotionState } from '@/types';

type CheckinStep = 'energy' | 'valence' | 'word' | 'done';

const ENERGY_LABELS = ['Muy bajo', 'Bajo', 'Normal', 'Alto', 'Muy alto'];
const VALENCE_LABELS = ['Muy mal', 'Mal', 'Regular', 'Bien', 'Muy bien'];

interface CheckinPromptCardProps {
  onComplete?: () => void;
}

export function CheckinPromptCard({ onComplete }: CheckinPromptCardProps) {
  const { submitCheckin } = useEmotional();
  const [step, setStep] = useState<CheckinStep>('energy');
  const [energy, setEnergy] = useState<number | null>(null);
  const [valence, setValence] = useState<number | null>(null);
  const [word, setWord] = useState('');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  async function handleWordSelect(w: string) {
    setWord(w);
    if (energy === null || valence === null) return;

    const emotion: EmotionState = {
      energy_level: energy as 1 | 2 | 3 | 4 | 5,
      valence: valence as 1 | 2 | 3 | 4 | 5,
      emotion_word: w,
    };

    await submitCheckin(emotion, 'morning', undefined, undefined, 'app');
    setStep('done');
    setTimeout(() => {
      setDismissed(true);
      onComplete?.();
    }, 1800);
  }

  const suggestedWords =
    energy !== null && valence !== null
      ? getSuggestedWords({ energy_level: energy as any, valence: valence as any })
      : [];

  return (
    <Card variant="warm" className="animate-slide-up">
      {step !== 'done' && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {step === 'energy' && '¿Cómo tienes la energía?'}
              {step === 'valence' && '¿Cómo te sientes por dentro?'}
              {step === 'word' && '¿Hay una palabra que lo describa?'}
            </CardTitle>
            <button
              onClick={() => setDismissed(true)}
              className="text-stone-400 hover:text-stone-600 text-sm"
              aria-label="Ahora no"
            >
              Ahora no
            </button>
          </div>
        </CardHeader>
      )}

      {/* Energy step */}
      {step === 'energy' && (
        <div className="flex gap-2" role="group" aria-label="Nivel de energía">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => { setEnergy(n); setStep('valence'); }}
              className={cn(
                'flex-1 rounded-2xl py-3 text-lg transition-all duration-200',
                'hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-bloom-300',
                'bg-white border border-stone-200 hover:border-bloom-300'
              )}
              aria-label={ENERGY_LABELS[n - 1]}
              title={ENERGY_LABELS[n - 1]}
            >
              {n === 1 ? '😴' : n === 2 ? '😌' : n === 3 ? '🙂' : n === 4 ? '😊' : '⚡'}
            </button>
          ))}
        </div>
      )}

      {/* Valence step */}
      {step === 'valence' && (
        <div className="flex gap-2" role="group" aria-label="Estado emocional">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => { setValence(n); setStep('word'); }}
              className={cn(
                'flex-1 rounded-2xl py-3 text-lg transition-all duration-200',
                'hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-bloom-300',
                'bg-white border border-stone-200 hover:border-bloom-300'
              )}
              aria-label={VALENCE_LABELS[n - 1]}
              title={VALENCE_LABELS[n - 1]}
            >
              {n === 1 ? '😢' : n === 2 ? '😕' : n === 3 ? '😐' : n === 4 ? '😊' : '😄'}
            </button>
          ))}
        </div>
      )}

      {/* Word step */}
      {step === 'word' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {suggestedWords.map(w => (
              <button
                key={w}
                onClick={() => handleWordSelect(w)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium border transition-all',
                  'bg-white border-stone-200 text-stone-700',
                  'hover:bg-bloom-50 hover:border-bloom-300 hover:text-bloom-700',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-bloom-300'
                )}
              >
                {w}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleWordSelect('')}
            className="text-xs text-stone-400 hover:text-stone-600 text-left"
          >
            Saltar esta pregunta
          </button>
        </div>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="text-center py-2 animate-fade-in">
          <p className="text-stone-600 font-body">
            Gracias por contármelo ✦
          </p>
        </div>
      )}
    </Card>
  );
}
