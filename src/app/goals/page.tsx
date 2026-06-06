'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { getGoalsAdapter } from '@/lib/adapters';
import { getNextMicrotask } from '@/lib/goals/MicrotaskEngine';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { cn } from '@/lib/utils';
import type { GoalWithMicrotasks, GoalMicrotask } from '@/types';

const goalsAdapter = getGoalsAdapter();

const EFFORT_LABELS: Record<string, string> = { easy: 'fácil', medium: 'normal', stretch: 'esfuerzo' };

export default function GoalsPage() {
  const { profile } = useAuth();
  const { interact } = useCompanion();
  const [goals, setGoals] = useState<GoalWithMicrotasks[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<GoalWithMicrotasks | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    goalsAdapter.getGoals(profile.id).then(result => {
      if (result.ok) {
        setGoals(result.data);
        const active = result.data.find(g => g.status === 'active');
        if (active) setSelectedGoal(active);
      }
      setLoading(false);
    });
  }, [profile?.id]);

  async function handleCompleteTask(task: GoalMicrotask) {
    if (!profile?.id || completing) return;
    setCompleting(task.id);

    const result = await goalsAdapter.completeMicrotask(task.id, profile.id);
    if (result.ok) {
      // Refresh goal
      const refreshed = await goalsAdapter.getGoals(profile.id);
      if (refreshed.ok) {
        setGoals(refreshed.data);
        const updated = refreshed.data.find(g => g.id === selectedGoal?.id);
        if (updated) setSelectedGoal(updated);
      }
      await interact('goal_step_complete', { goal_id: selectedGoal?.id, microtask_id: task.id });
    }
    setCompleting(null);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="w-6 h-6 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
    </div>
  );

  if (goals.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center gap-4">
      <p className="font-display text-xl text-stone-600">Aún no hay objetivos</p>
      <p className="text-stone-400 text-sm">Habla con un adulto para crear tu primer objetivo</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="px-5 pt-8 pb-4">
        <h1 className="font-display text-2xl text-stone-800">Mi objetivo</h1>
      </header>

      <main className="flex-1 px-4 pb-8 flex flex-col gap-4 max-w-lg mx-auto w-full">

        {/* Goal selector if multiple */}
        {goals.filter(g => g.status === 'active').length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {goals.filter(g => g.status === 'active').map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGoal(g)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-sm border transition-all',
                  selectedGoal?.id === g.id
                    ? 'bg-lavender-50 border-lavender-300 text-lavender-700'
                    : 'bg-white border-stone-200 text-stone-500'
                )}
              >
                {g.title}
              </button>
            ))}
          </div>
        )}

        {selectedGoal && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Goal header */}
            <Card variant="warm">
              <h2 className="font-display text-lg text-stone-800">{selectedGoal.title}</h2>
              {selectedGoal.why && (
                <p className="text-sm text-stone-500 mt-1 italic">"{selectedGoal.why}"</p>
              )}
              <div className="mt-4">
                <ProgressBar value={selectedGoal.progress} color="lavender" />
                <p className="text-xs text-stone-400 mt-1 text-right">
                  {selectedGoal.microtasks.filter(t => t.status === 'complete').length} de {selectedGoal.microtasks.length} pasos
                </p>
              </div>
            </Card>

            {/* Microtasks */}
            <div className="flex flex-col gap-3">
              {selectedGoal.microtasks.map(task => {
                const done = task.status === 'complete';
                const isNext = !done && getNextMicrotask(selectedGoal.microtasks)?.id === task.id;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      'rounded-3xl p-4 border transition-all duration-300',
                      done      ? 'bg-moss-50 border-moss-200 opacity-60' :
                      isNext    ? 'bg-white border-lavender-300 shadow-soft' :
                                  'bg-stone-50 border-stone-200 opacity-70'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center',
                        done ? 'bg-moss-400 border-moss-400' : isNext ? 'border-lavender-400' : 'border-stone-300'
                      )}>
                        {done && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium',
                          done ? 'text-moss-700 line-through' : 'text-stone-700'
                        )}>
                          {task.title}
                        </p>
                        {task.effort_level && !done && (
                          <span className="text-xs text-stone-400 mt-0.5 block">
                            {EFFORT_LABELS[task.effort_level]}
                          </span>
                        )}
                      </div>
                      <SparkBadge count={task.spark_value} size="sm" />
                    </div>

                    {isNext && (
                      <Button
                        size="md"
                        onClick={() => handleCompleteTask(task)}
                        loading={completing === task.id}
                        className="w-full mt-3"
                      >
                        Lo he hecho ✓
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedGoal.status === 'completed' && (
              <Card className="text-center py-6 animate-bloom">
                <p className="font-display text-xl text-moss-700">¡Lo conseguiste! ✦</p>
                <p className="text-stone-500 text-sm mt-1">Objetivo completado</p>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
