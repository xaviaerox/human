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

  if (loading) return null;
  if (routines.length === 0) return null;

  const todayRoutines = routines.filter(r => {
    const hour = new Date().getHours();
    if (r.time_of_day === 'morning') return hour < 12;
    if (r.time_of_day === 'evening') return hour >= 17;
    if (r.time_of_day === 'midday') return hour >= 11 && hour < 15;
    return true; // anytime
  });

  if (todayRoutines.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rutinas de hoy</CardTitle>
      </CardHeader>
      <div className="flex flex-col gap-3">
        {todayRoutines.map(routine => {
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
              {/* Status indicator */}
              <div
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  done
                    ? 'bg-moss-400 border-moss-400 text-white'
                    : 'border-stone-300'
                )}
                aria-hidden="true"
              >
                {done && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

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

              {!done && (
                <div className="flex items-center gap-2">
                  <SparkBadge count={routine.spark_value} size="sm" />
                  <Button
                    variant="calm"
                    size="sm"
                    onClick={() => handleComplete(routine)}
                    aria-label={`Completar ${routine.title}`}
                  >
                    Hecho
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
