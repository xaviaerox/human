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
  onComplete?: () => void;
}

export function RoutinesToday({ onComplete }: RoutinesTodayProps) {
  const { profile, family } = useAuth();
  const { interact } = useCompanion();
  const [routines, setRoutines] = useState<RoutineWithSteps[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

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
      await interact('routine_complete', { routine_id: routine.id });
      onComplete?.();
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
      onComplete?.();
    }
  }

  if (loading) return null;
  if (routines.length === 0) return null;

  const todayRoutines = routines.filter(r => {
    // Filter by day of the week to ensure we only show active routines for today
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    if (r.schedule_type === 'weekdays') {
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    } else if (r.schedule_type === 'weekends') {
      if (dayOfWeek >= 1 && dayOfWeek <= 5) return false;
    } else if (r.schedule_type === 'custom' && r.schedule_days) {
      if (!r.schedule_days.includes(dayOfWeek)) return false;
    }
    
    // Do not filter by hour of day (morning, midday, evening) so children can complete
    // routines that they missed during school/extracurricular activities.
    return true;
  });

  // Sort routines chronologically: morning -> midday -> evening -> anytime
  const sortedRoutines = [...todayRoutines].sort((a, b) => {
    const order: Record<string, number> = { morning: 1, midday: 2, evening: 3, anytime: 4 };
    const valA = order[a.time_of_day ?? 'anytime'] ?? 4;
    const valB = order[b.time_of_day ?? 'anytime'] ?? 4;
    return valA - valB;
  });

  if (sortedRoutines.length === 0) return null;

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
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300',
                done
                  ? 'bg-moss-50 border border-moss-200'
                  : 'bg-stone-50 border border-stone-200'
              )}
            >
              {/* Status indicator button */}
              <button
                type="button"
                onClick={() => done ? handleUncomplete(routine) : handleComplete(routine)}
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

              <div className="flex items-center gap-2">
                {done ? (
                  <button
                    onClick={() => handleUncomplete(routine)}
                    className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-medium border border-stone-200 hover:border-stone-300 rounded-xl px-2.5 py-1"
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
