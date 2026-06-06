'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { getRoutineAdapter } from '@/lib/adapters';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SparkBadge, SparkDelta } from '@/components/ui/SparkBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import type { RoutineWithSteps } from '@/types';

const routineAdapter = getRoutineAdapter();

export default function RoutinesPage() {
  const { profile, family } = useAuth();
  const { interact, getDialogue, setAppearanceContext } = useCompanion();
  const [routines, setRoutines] = useState<RoutineWithSteps[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeRoutine, setActiveRoutine] = useState<string | null>(null);
  const [stepsDone, setStepsDone] = useState<Set<number>>(new Set());
  const [showDelta, setShowDelta] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (c.ok) setCompletedIds(new Set(c.data.map(x => x.routine_id)));
      setLoading(false);
    });
  }, [family?.id, profile?.id]);

  function openRoutine(id: string) {
    setActiveRoutine(id);
    setStepsDone(new Set());
    setAppearanceContext('routine_active');
  }

  function toggleStep(pos: number) {
    setStepsDone(prev => {
      const next = new Set(prev);
      next.has(pos) ? next.delete(pos) : next.add(pos);
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
      setActiveRoutine(null);
      setShowDelta(routine.id);
      await interact('routine_complete', { routine_id: routine.id });
      setAppearanceContext('routine_complete');
      setTimeout(() => { setShowDelta(null); setAppearanceContext('home'); }, 2500);
    }
  }

  const active = activeRoutine ? routines.find(r => r.id === activeRoutine) : null;

  if (loading) return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="w-6 h-6 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
    </div>
  );

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
                    : 'bg-white border-stone-200 hover:border-stone-300'
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

            <Button
              size="xl"
              onClick={() => finishRoutine(active)}
              disabled={active.steps.length > 0 && stepsDone.size === 0}
              className="w-full mt-2"
            >
              Rutina completada ✦
            </Button>
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
              onClick={() => !done && openRoutine(routine.id)}
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
                <div className="flex items-center gap-2">
                  {showDelta === routine.id && <SparkDelta delta={routine.spark_value} />}
                  <SparkBadge count={routine.spark_value} size="sm" />
                  {done && (
                    <div className="w-5 h-5 rounded-full bg-moss-400 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
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
