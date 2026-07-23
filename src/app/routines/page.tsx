'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { getRoutineAdapter } from '@/lib/adapters';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SparkBadge, SparkDelta } from '@/components/ui/SparkBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import type { RoutineWithSteps } from '@/types';

import { useRouter } from 'next/navigation';

const routineAdapter = getRoutineAdapter();

export default function RoutinesPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const profile = session?.profile ?? null;
  const family = session?.family ?? null;

  const { interact, setAppearanceContext } = useCompanion();
  const [routines, setRoutines] = useState<RoutineWithSteps[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [completionsMap, setCompletionsMap] = useState<Record<string, number[]>>({});
  const [activeRoutine, setActiveRoutine] = useState<string | null>(null);
  const [stepsDone, setStepsDone] = useState<Set<number>>(new Set());
  const [showDelta, setShowDelta] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login');
    }
  }, [session, authLoading, router]);

  useEffect(() => {
    setAppearanceContext('routine_active');
    return () => setAppearanceContext('home');
  }, [setAppearanceContext]);

  useEffect(() => {
    if (!family?.id || !profile?.id) return;
    Promise.all([
      routineAdapter.getRoutines(family.id, profile.id),
      routineAdapter.getCompletions(
        profile.id,
        new Date().toISOString().split('T')[0]!,
        new Date().toISOString().split('T')[0]!
      ),
    ]).then(([r, c]) => {
      if (r.ok) setRoutines(r.data);
      if (c.ok) {
        setCompletedIds(new Set(c.data.map(x => x.routine_id)));
        const map: Record<string, number[]> = {};
        c.data.forEach(x => {
          map[x.routine_id] = x.steps_completed || [];
        });
        setCompletionsMap(map);
      }
      setLoading(false);
    });
  }, [family?.id, profile?.id]);

  function openRoutine(id: string, done: boolean) {
    setActiveRoutine(id);
    if (done) {
      setStepsDone(new Set(completionsMap[id] || []));
    } else {
      setStepsDone(new Set());
    }
    setAppearanceContext('routine_active');
  }

  function toggleStep(pos: number) {
    const active = activeRoutine ? routines.find(r => r.id === activeRoutine) : null;
    if (active && completedIds.has(active.id)) return; // Disable toggling if completed
    setStepsDone(prev => {
      const next = new Set(prev);
      if (next.has(pos)) {
        next.delete(pos);
      } else {
        next.add(pos);
      }
      return next;
    });
  }

  async function finishRoutine(routine: RoutineWithSteps) {
    if (!profile?.id) return;
    const result = await routineAdapter.completeRoutine({
      routine_id:      routine.id,
      child_id:        profile.id,
      steps_completed: [...stepsDone],
    });
    if (result.ok) {
      setCompletedIds(prev => new Set([...prev, routine.id]));
      setCompletionsMap(prev => ({
        ...prev,
        [routine.id]: [...stepsDone],
      }));
      setActiveRoutine(null);
      setShowDelta(routine.id);
      await interact('routine_complete', { routine_id: routine.id });
      setAppearanceContext('routine_complete');
      setTimeout(() => { setShowDelta(null); setAppearanceContext('home'); }, 2500);
    }
  }

  async function handleUncomplete(routine: RoutineWithSteps) {
    if (!profile?.id) return;
    const result = await routineAdapter.uncompleteRoutine(routine.id, profile.id);
    if (result.ok) {
      setCompletedIds(prev => {
        const next = new Set(prev);
        next.delete(routine.id);
        return next;
      });
      setCompletionsMap(prev => {
        const next = { ...prev };
        delete next[routine.id];
        return next;
      });
    }
  }

  const active = activeRoutine ? routines.find(r => r.id === activeRoutine) : null;
  const isActiveCompleted = active ? completedIds.has(active.id) : false;

  if (authLoading || loading) return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="w-6 h-6 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
    </div>
  );

  if (!session) return null;

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="px-5 pt-8 pb-4">
        {active && (
          <button
            onClick={() => { setActiveRoutine(null); setAppearanceContext('home'); }}
            className="text-stone-400 text-lg mb-2"
          >←</button>
        )}
        <h1 className="font-display text-2xl text-stone-800">
          {active ? active.title : 'Mis rutinas'}
        </h1>
      </header>

      <main className="flex-1 px-4 pb-8 flex flex-col gap-4 max-w-lg mx-auto w-full">

        {/* Active routine — step-by-step */}
        {active && (
          <div className="flex flex-col gap-4 animate-slide-up">
            <ProgressBar
              value={(stepsDone.size / Math.max(active.steps.length, 1)) * 100}
              color="moss"
            />
            {active.steps.map(step => (
              <button
                key={step.id}
                onClick={() => toggleStep(step.position)}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-3xl border transition-all duration-200 text-left w-full',
                  stepsDone.has(step.position)
                    ? 'bg-moss-50 border-moss-200'
                    : 'bg-white border-stone-200 hover:border-stone-300',
                  isActiveCompleted ? 'cursor-default' : 'cursor-pointer'
                )}
                aria-pressed={stepsDone.has(step.position)}
              >
                <div className={cn(
                  'w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  stepsDone.has(step.position)
                    ? 'bg-moss-400 border-moss-400'
                    : 'border-stone-300'
                )}>
                  {stepsDone.has(step.position) && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className={cn(
                    'font-medium text-sm',
                    stepsDone.has(step.position) ? 'text-moss-700 line-through opacity-60' : 'text-stone-700'
                  )}>
                    {step.title}
                  </p>
                  {step.duration_minutes && (
                    <p className="text-xs text-stone-400 mt-0.5">{step.duration_minutes} minutos</p>
                  )}
                </div>
              </button>
            ))}

            {isActiveCompleted ? (
              <Button
                variant="secondary"
                size="xl"
                onClick={async () => {
                  await handleUncomplete(active);
                  setActiveRoutine(null);
                  setStepsDone(new Set());
                }}
                className="w-full mt-2 bg-transparent border-red-200 text-red-650 hover:bg-red-50 hover:border-red-350 transition-all cursor-pointer"
              >
                Desmarcar rutina ✕
              </Button>
            ) : (
              <Button
                size="xl"
                onClick={() => finishRoutine(active)}
                disabled={active.steps.length > 0 && stepsDone.size < active.steps.length}
                className="w-full mt-2"
              >
                Completar rutina (+{active.spark_value} Sparks) ✦
              </Button>
            )}
          </div>
        )}

        {/* Routine list */}
        {!active && routines.map(routine => {
          const done = completedIds.has(routine.id);
          return (
            <Card
              key={routine.id}
              variant={done ? 'warm' : 'default'}
              className="cursor-pointer hover:shadow-card transition-shadow"
              onClick={() => openRoutine(routine.id, done)}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0',
                  done ? 'bg-moss-100' : 'bg-stone-100'
                )}>
                  {routine.icon_key ?? (routine.time_of_day === 'morning' ? '🌅' : routine.time_of_day === 'evening' ? '🌙' : '✨')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'font-medium text-sm',
                    done ? 'text-moss-700 line-through opacity-70' : 'text-stone-700'
                  )}>
                    {routine.title}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {routine.steps.length} pasos
                  </p>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {showDelta === routine.id && <SparkDelta delta={routine.spark_value} />}
                  <SparkBadge count={routine.spark_value} size="sm" />
                  {done ? (
                    <button
                      onClick={() => handleUncomplete(routine)}
                      className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-medium border border-stone-200 hover:border-stone-300 rounded-xl px-2.5 py-1 bg-white ml-2 cursor-pointer"
                      aria-label={`Desmarcar ${routine.title}`}
                    >
                      Desmarcar
                    </button>
                  ) : (
                    <span className="text-stone-300 text-lg ml-2">→</span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {!active && routines.length === 0 && (
          <div className="text-center py-16">
            <p className="text-stone-400">Aún no hay rutinas. Pídele a un adulto que cree alguna.</p>
          </div>
        )}
      </main>
    </div>
  );
}
