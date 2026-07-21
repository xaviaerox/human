'use client';

import { useState } from 'react';
import { useEmotional } from '@/lib/emotional/EmotionalProvider';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { getSuggestedWords } from '@/lib/emotional/EmotionModel';
import { CompanionWidget } from '@/components/companion/CompanionWidget';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { EmotionState } from '@/types';

type Step = 'energy' | 'valence' | 'word' | 'note' | 'done';

const ENERGY_OPTIONS = [
  { value: 1, emoji: '😴', label: 'Muy bajo' },
  { value: 2, emoji: '😌', label: 'Bajo' },
  { value: 3, emoji: '🙂', label: 'Normal' },
  { value: 4, emoji: '😊', label: 'Alto' },
  { value: 5, emoji: '⚡', label: 'Muy alto' },
];

const VALENCE_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Muy mal' },
  { value: 2, emoji: '😕', label: 'Mal' },
  { value: 3, emoji: '😐', label: 'Regular' },
  { value: 4, emoji: '😊', label: 'Bien' },
  { value: 5, emoji: '😄', label: 'Muy bien' },
];

export default function CheckinPage() {
  const { submitCheckin, recentCheckins, lastCheckin } = useEmotional();
  const { display, getDialogue, interact } = useCompanion();

  const [step, setStep] = useState<Step>('energy');
  const [energy, setEnergy] = useState<number | null>(null);
  const [valence, setValence] = useState<number | null>(null);
  const [word, setWord] = useState('');
  const [customWord, setCustomWord] = useState('');
  const [note, setNote] = useState('');
  const [dialogue, setDialogue] = useState(() =>
    display ? getDialogue('checkin_prompt') : undefined
  );

  const suggestedWords =
    energy !== null && valence !== null
      ? getSuggestedWords({
          energy_level: energy as EmotionState['energy_level'],
          valence: valence as EmotionState['valence'],
        })
      : [];

  function selectEnergy(v: number) {
    setEnergy(v);
    setStep('valence');
  }

  function selectValence(v: number) {
    setValence(v);
    setStep('word');
    if (display) setDialogue(getDialogue('checkin_prompt'));
  }

  function selectWord(w: string) {
    setWord(w);
    setStep('note');
  }

  async function handleSubmit() {
    if (energy === null || valence === null) return;

    const emotion: EmotionState = {
      energy_level: energy as EmotionState['energy_level'],
      valence: valence as EmotionState['valence'],
      emotion_word: word || customWord || undefined,
    };

    await submitCheckin(emotion, 'free', undefined, note || undefined, 'child');
    await interact('emotional_checkin', { energy, valence, word: emotion.emotion_word });

    if (display) {
      setDialogue(getDialogue('checkin_response', emotion));
    }

    setStep('done');
  }

  const stepIndex = ['energy', 'valence', 'word', 'note', 'done'].indexOf(step);
  const progress = (stepIndex / 4) * 100;

  const lastCheckinTime = lastCheckin ? new Date(lastCheckin.occurred_at).getTime() : 0;
  const [now] = useState(() => Date.now());
  const isCooldown = now - lastCheckinTime < 8 * 60 * 60 * 1000;

  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col">
      <header className="px-5 pt-8 pb-4">
        <h1 className="font-display text-2xl text-stone-800">¿Cómo estoy?</h1>
      </header>

      {/* Friendly Cooldown Notice */}
      {step !== 'done' && isCooldown && (
        <div className="mx-5 mb-4 p-4 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-2.5 text-xs text-amber-800 font-medium leading-relaxed animate-fade-in shadow-soft">
          <span className="text-sm">✨</span>
          <p>
            Puedes registrar cómo te sientes en cualquier momento, pero solo ganarás estrellas y afecto con tu compañero una vez cada 8 horas.
          </p>
        </div>
      )}

      {/* Progress bar */}
      {step !== 'done' && (
        <div className="px-5 mb-6">
          <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-lavender-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <main className="flex-1 px-5 pb-8 flex flex-col gap-8 max-w-md mx-auto w-full">

        {/* Companion */}
        {display && step !== 'done' && (
          <div className="flex justify-center animate-fade-in">
            <CompanionWidget
              display={display}
              dialogue={step === 'energy' ? dialogue : undefined}
              size="md"
            />
          </div>
        )}

        {/* ENERGY */}
        {step === 'energy' && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <p className="font-display text-xl text-stone-700 text-center">
              ¿Cuánta energía tienes ahora?
            </p>
            <div className="flex gap-2">
              {ENERGY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => selectEnergy(opt.value)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 py-4 rounded-3xl border',
                    'bg-white border-stone-200 transition-all duration-200',
                    'hover:border-lavender-300 hover:bg-lavender-50',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300',
                    'active:scale-95'
                  )}
                  aria-label={opt.label}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-xs text-stone-400">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VALENCE */}
        {step === 'valence' && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <p className="font-display text-xl text-stone-700 text-center">
              ¿Cómo te sientes por dentro?
            </p>
            <div className="flex gap-2">
              {VALENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => selectValence(opt.value)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 py-4 rounded-3xl border',
                    'bg-white border-stone-200 transition-all duration-200',
                    'hover:border-lavender-300 hover:bg-lavender-50',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300',
                    'active:scale-95'
                  )}
                  aria-label={opt.label}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-xs text-stone-400">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* WORD */}
        {step === 'word' && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <p className="font-display text-xl text-stone-700 text-center">
              ¿Hay una palabra que lo describa?
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestedWords.map(w => (
                <button
                  key={w}
                  onClick={() => selectWord(w)}
                  className={cn(
                    'px-4 py-2 rounded-full border text-sm font-medium transition-all',
                    'bg-white border-stone-200 text-stone-700',
                    'hover:bg-lavender-50 hover:border-lavender-300 hover:text-lavender-700',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender-300'
                  )}
                >
                  {w}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <input
                value={customWord}
                onChange={e => setCustomWord(e.target.value)}
                placeholder="O escribe tu propia palabra..."
                className="flex-1 px-4 py-2.5 rounded-2xl border border-stone-200 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-lavender-200"
                onKeyDown={e => e.key === 'Enter' && customWord.trim() && selectWord(customWord.trim())}
              />
              {customWord.trim() && (
                <Button variant="secondary" size="sm" onClick={() => selectWord(customWord.trim())}>
                  OK
                </Button>
              )}
            </div>

            <button
              onClick={() => selectWord('')}
              className="text-sm text-stone-400 hover:text-stone-600 text-center"
            >
              Saltar esta pregunta
            </button>
          </div>
        )}

        {/* NOTE */}
        {step === 'note' && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <p className="font-display text-xl text-stone-700 text-center">
              ¿Quieres contar algo más?
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Lo que quieras... o nada, también está bien."
              rows={4}
              className={cn(
                'w-full px-4 py-3 rounded-3xl border border-stone-200 bg-white',
                'text-stone-700 text-sm leading-relaxed resize-none',
                'focus:outline-none focus:ring-2 focus:ring-lavender-200',
                'placeholder:text-stone-300'
              )}
            />
            <Button size="xl" onClick={handleSubmit} className="w-full">
              Listo
            </Button>
            <button
              onClick={handleSubmit}
              className="text-sm text-stone-400 hover:text-stone-600 text-center"
            >
              Sin nota, guardar así
            </button>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-6 animate-bloom text-center">
            {display && (
              <CompanionWidget
                display={display}
                dialogue={dialogue}
                size="xl"
              />
            )}
            <div className="flex flex-col gap-2">
              <p className="font-display text-2xl text-stone-800">
                Gracias por contármelo
              </p>
              <p className="text-stone-500 text-sm">
                Conocerte mejor me ayuda a estar más cerca de ti.
              </p>
            </div>

            {/* Recent check-ins — tiny history */}
            {recentCheckins.length > 1 && (
              <div className="flex gap-2 flex-wrap justify-center mt-2">
                {recentCheckins.slice(1, 6).map(c => (
                  <span
                    key={c.id}
                    className="px-3 py-1 bg-stone-100 rounded-full text-xs text-stone-500 border border-stone-200"
                  >
                    {c.emotion_word ?? `${c.valence}/5`}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
