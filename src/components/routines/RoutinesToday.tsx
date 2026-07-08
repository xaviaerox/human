'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getRoutineAdapter } from '@/lib/adapters';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { cn } from '@/lib/utils';
import type { RoutineWithSteps } from '@/types';

const routineAdapter = getRoutineAdapter();

interface RoutinesTodayProps {
  onComplete?: (routine: RoutineWithSteps, sparksEarned: number) => void;
}

export function RoutinesToday({ onComplete }: RoutinesTodayProps) {
  const { profile, family } = useAuth();
  const { interact } = useCompanion();
  const [routines, setRoutines] = useState<RoutineWithSteps[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [completionsMap, setCompletionsMap] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [stepsDone, setStepsDone] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!family?.id || !profile?.id) return;

    routineAdapter.getRoutines(family.id, profile.id).then(result => {
      if (result.ok) setRoutines(result.data);
      setLoading(false);
    });

    // Check which are already done today
    routineAdapter.getCompletions(
      profile.id,
      new Date().toISOString().split('T')[0]!,
      new Date().toISOString().split('T')[0]!
    ).then(result => {
      if (result.ok) {
        setCompletedIds(new Set(result.data.map(c => c.routine_id)));
        const map: Record<string, number[]> = {};
        result.data.forEach(c => {
          map[c.routine_id] = c.steps_completed || [];
        });
        setCompletionsMap(map);
      }
    });
  }, [family?.id, profile?.id]);

  async function handleComplete(routine: RoutineWithSteps) {
    if (!profile?.id || completedIds.has(routine.id)) return;

    const result = await routineAdapter.completeRoutine({
      routine_id: routine.id,
      child_id: profile.id,
      steps_completed: routine.steps.map(s => s.position),
    });

    if (result.ok) {
      setCompletedIds(prev => new Set([...prev, routine.id]));
      setCompletionsMap(prev => ({
        ...prev,
        [routine.id]: routine.steps.map(s => s.position)
      }));
      await interact('routine_complete', { routine_id: routine.id });
      onComplete?.(routine, routine.spark_value);
    }
  }

  async function handleUncomplete(routine: RoutineWithSteps) {
    if (!profile?.id || !completedIds.has(routine.id)) return;

    const result = await routineAdapter.uncompleteRoutine(
      routine.id,
      profile.id
    );

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
      onComplete?.(routine, 0);
    }
  }

  async function handleFinishActive() {
    if (!profile?.id || !activeRoutineId) return;
    const activeRoutine = routines.find(r => r.id === activeRoutineId);
    if (!activeRoutine) return;

    const result = await routineAdapter.completeRoutine({
      routine_id: activeRoutine.id,
      child_id: profile.id,
      steps_completed: [...stepsDone],
    });

    if (result.ok) {
      setCompletedIds(prev => new Set([...prev, activeRoutine.id]));
      setCompletionsMap(prev => ({
        ...prev,
        [activeRoutine.id]: [...stepsDone]
      }));
      await interact('routine_complete', { routine_id: activeRoutine.id });
      onComplete?.(activeRoutine, activeRoutine.spark_value);
      setActiveRoutineId(null);
      setStepsDone(new Set());
    }
  }

  if (loading) return null;
  if (routines.length === 0) return null;

  const todayRoutines = routines.filter(r => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    if (r.schedule_type === 'weekdays') {
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    } else if (r.schedule_type === 'weekends') {
      if (dayOfWeek >= 1 && dayOfWeek <= 5) return false;
    } else if (r.schedule_type === 'custom' && r.schedule_days) {
      if (!r.schedule_days.includes(dayOfWeek)) return false;
    }
    
    return true;
  });

  const sortedRoutines = [...todayRoutines].sort((a, b) => {
    const order: Record<string, number> = { morning: 1, midday: 2, evening: 3, anytime: 4 };
    const valA = order[a.time_of_day ?? 'anytime'] ?? 4;
    const valB = order[b.time_of_day ?? 'anytime'] ?? 4;
    return valA - valB;
  });

  if (sortedRoutines.length === 0) return null;

  // Render checklist view if activeRoutineId is set
  if (activeRoutineId) {
    const activeRoutine = routines.find(r => r.id === activeRoutineId);
    if (activeRoutine) {
      const isActiveCompleted = completedIds.has(activeRoutine.id);
      const totalSteps = activeRoutine.steps.length;
      const doneStepsCount = stepsDone.size;
      const progressPercent = totalSteps > 0 ? (doneStepsCount / totalSteps) * 100 : 0;

      return (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <button
              onClick={() => {
                setActiveRoutineId(null);
                setStepsDone(new Set());
              }}
              className="text-stone-400 hover:text-stone-600 font-semibold text-lg p-1 cursor-pointer"
              aria-label="Volver"
            >
              ←
            </button>
            <CardTitle className="text-stone-850">{activeRoutine.title}</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-3 px-6 pb-6">
            {/* Progress bar */}
            <div className="px-1 flex flex-col gap-1">
              <div className="flex justify-between text-xs text-stone-400 font-medium">
                <span>Progreso</span>
                <span>{doneStepsCount} de {totalSteps} pasos</span>
              </div>
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-moss-400 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Steps checklist */}
            <div className="flex flex-col gap-2 mt-2">
              {activeRoutine.steps.map(step => {
                const stepDone = stepsDone.has(step.position);
                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      if (isActiveCompleted) return; // Disable toggling if completed
                      setStepsDone(prev => {
                        const next = new Set(prev);
                        if (next.has(step.position)) {
                          next.delete(step.position);
                        } else {
                          next.add(step.position);
                        }
                        return next;
                      });
                    }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 text-left w-full cursor-pointer',
                      stepDone
                        ? 'bg-moss-50 border-moss-200'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                      stepDone ? 'bg-moss-400 border-moss-400 text-white' : 'border-stone-300'
                    )}>
                      {stepDone && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-xs font-medium truncate',
                        stepDone ? 'text-moss-700 line-through opacity-60' : 'text-stone-750'
                      )}>
                        {step.title}
                      </p>
                      {step.duration_minutes && (
                        <p className="text-[10px] text-stone-400 mt-0.5">{step.duration_minutes} min</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Actions button */}
            {isActiveCompleted ? (
              <Button
                variant="secondary"
                size="lg"
                onClick={async () => {
                  await handleUncomplete(activeRoutine);
                  setActiveRoutineId(null);
                  setStepsDone(new Set());
                }}
                className="w-full mt-2 bg-transparent border-red-200 text-red-650 hover:bg-red-50 hover:border-red-350 transition-all cursor-pointer"
              >
                Desmarcar rutina ✕
              </Button>
            ) : (
              <Button
                variant="calm"
                size="lg"
                disabled={totalSteps > 0 && doneStepsCount < totalSteps}
                onClick={handleFinishActive}
                className={cn(
                  "w-full mt-2 transition-all duration-300",
                  totalSteps > 0 && doneStepsCount === totalSteps && "ring-4 ring-moss-250 animate-pulse bg-moss-300 text-moss-900 border-moss-300 font-bold"
                )}
              >
                Completar rutina (+{activeRoutine.spark_value} Sparks) ✦ ✨
              </Button>
            )}
          </div>
        </Card>
      );
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rutinas de hoy</CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-3">
        {sortedRoutines.map(routine => {
          const done = completedIds.has(routine.id);
          return (
            <div
              key={routine.id}
              onClick={() => {
                setActiveRoutineId(routine.id);
                if (done) {
                  setStepsDone(new Set(completionsMap[routine.id] || []));
                } else {
                  setStepsDone(new Set());
                }
              }}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300',
                done
                  ? 'bg-moss-50 border border-moss-200 cursor-pointer hover:bg-moss-100/50'
                  : 'bg-stone-50 border border-stone-200 cursor-pointer hover:bg-stone-100/80 active:scale-[0.99]'
              )}
            >
              {/* Status indicator button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  done ? handleUncomplete(routine) : handleComplete(routine);
                }}
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2',
                  done
                    ? 'bg-moss-400 border-moss-400 text-white hover:bg-moss-500 hover:border-moss-500 focus:ring-moss-400'
                    : 'border-stone-300 hover:border-stone-400 focus:ring-stone-400'
                )}
                aria-label={done ? `Desmarcar ${routine.title}` : `Completar ${routine.title}`}
              >
                {done && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className={cn(
                  'font-body text-sm font-medium truncate',
                  done ? 'text-moss-700 line-through opacity-70' : 'text-stone-700'
                )}>
                  {routine.title}
                </p>
                {routine.steps.length > 0 && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    {routine.steps.length} pasos
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {done ? (
                  <button
                    onClick={() => handleUncomplete(routine)}
                    className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-medium border border-stone-200 hover:border-stone-300 rounded-xl px-2.5 py-1 bg-white cursor-pointer"
                    aria-label={`Desmarcar ${routine.title}`}
                  >
                    Desmarcar
                  </button>
                ) : (
                  <>
                    <SparkBadge count={routine.spark_value} size="sm" />
                    <Button
                      variant="calm"
                      size="sm"
                      onClick={() => handleComplete(routine)}
                      aria-label={`Completar ${routine.title}`}
                    >
                      Hecho
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
