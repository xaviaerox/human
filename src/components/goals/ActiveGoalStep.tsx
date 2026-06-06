'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getGoalsAdapter } from '@/lib/adapters';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { getNextMicrotask } from '@/lib/goals/MicrotaskEngine';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';
import type { GoalWithMicrotasks, GoalMicrotask } from '@/types';

const goalsAdapter = getGoalsAdapter();

const EFFORT_LABELS: Record<string, string> = {
  easy: 'fácil',
  medium: 'normal',
  stretch: 'esfuerzo',
};

const EFFORT_COLORS: Record<string, string> = {
  easy: 'text-moss-600 bg-moss-50',
  medium: 'text-sky-600 bg-sky-50',
  stretch: 'text-bloom-600 bg-bloom-50',
};

interface ActiveGoalStepProps {
  onComplete?: () => void;
}

export function ActiveGoalStep({ onComplete }: ActiveGoalStepProps) {
  const { profile } = useAuth();
  const { interact } = useCompanion();
  const [goal, setGoal] = useState<GoalWithMicrotasks | null>(null);
  const [nextTask, setNextTask] = useState<GoalMicrotask | null>(null);
  const [completing, setCompleting] = useState(false);
  const [justDone, setJustDone] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    goalsAdapter.getGoals(profile.id).then(result => {
      if (!result.ok) return;
      const active = result.data.find(g => g.status === 'active');
      if (active) {
        setGoal(active);
        setNextTask(getNextMicrotask(active.microtasks));
      }
    });
  }, [profile?.id]);

  async function handleComplete() {
    if (!nextTask || !profile?.id || completing) return;
    setCompleting(true);

    const result = await goalsAdapter.completeMicrotask(nextTask.id, profile.id);
    if (result.ok) {
      setJustDone(true);
      await interact('goal_step_complete', { goal_id: goal?.id, microtask_id: nextTask.id });
      onComplete?.();

      // Refresh goal
      setTimeout(async () => {
        const refreshed = await goalsAdapter.getGoals(profile.id);
        if (refreshed.ok) {
          const updated = refreshed.data.find(g => g.id === goal?.id);
          if (updated) {
            setGoal(updated);
            setNextTask(getNextMicrotask(updated.microtasks));
          }
        }
        setJustDone(false);
        setCompleting(false);
      }, 1500);
    } else {
      setCompleting(false);
    }
  }

  if (!goal || !nextTask) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tu objetivo</CardTitle>
      </CardHeader>

      <div className="flex flex-col gap-4">
        {/* Goal title + progress */}
        <div className="flex flex-col gap-2">
          <p className="text-sm text-stone-600 font-body">{goal.title}</p>
          <ProgressBar value={goal.progress} color="lavender" />
        </div>

        {/* Active microtask */}
        <div className={cn(
          'rounded-2xl p-4 border transition-all duration-500',
          justDone
            ? 'bg-moss-50 border-moss-200'
            : 'bg-stone-50 border-stone-200'
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              'w-6 h-6 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all',
              justDone ? 'bg-moss-400 border-moss-400' : 'border-lavender-300'
            )} aria-hidden="true">
              {justDone && (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium text-stone-700">{nextTask.title}</p>
              {nextTask.effort_level && (
                <span className={cn(
                  'inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium',
                  EFFORT_COLORS[nextTask.effort_level] ?? 'text-stone-500 bg-stone-100'
                )}>
                  {EFFORT_LABELS[nextTask.effort_level] ?? nextTask.effort_level}
                </span>
              )}
            </div>

            <SparkBadge count={nextTask.spark_value} size="sm" />
          </div>
        </div>

        {!justDone && (
          <Button
            variant="primary"
            size="md"
            onClick={handleComplete}
            loading={completing}
            className="w-full"
          >
            Lo he hecho ✓
          </Button>
        )}

        {justDone && (
          <p className="text-center text-sm text-moss-600 font-medium animate-fade-in">
            ¡Bien hecho! ✦
          </p>
        )}
      </div>
    </Card>
  );
}
