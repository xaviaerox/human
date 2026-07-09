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
  onComplete?: (task: GoalMicrotask, sparksEarned: number) => void;
  goal?: GoalWithMicrotasks;
}

export function ActiveGoalStep({ onComplete, goal: initialGoal }: ActiveGoalStepProps) {
  const { profile } = useAuth();
  const { interact } = useCompanion();
  const [goal, setGoal] = useState<GoalWithMicrotasks | null>(null);
  const [nextTask, setNextTask] = useState<GoalMicrotask | null>(null);
  const [completing, setCompleting] = useState(false);
  const [justDone, setJustDone] = useState(false);

  const hasCompletedToday = goal?.one_per_day && goal.microtasks.some(t => {
    if (t.status !== 'complete' || !t.completed_at) return false;
    const compDate = new Date(t.completed_at).toLocaleDateString();
    const todayDate = new Date().toLocaleDateString();
    return compDate === todayDate;
  });

  useEffect(() => {
    if (initialGoal && !completing && !justDone) {
      setGoal(initialGoal);
      setNextTask(getNextMicrotask(initialGoal.microtasks));
    }
  }, [initialGoal, completing, justDone]);

  useEffect(() => {
    if (initialGoal) return;
    if (!profile?.id) return;
    goalsAdapter.getGoals(profile.id).then(result => {
      if (!result.ok) return;
      const active = result.data.find(g => g.status === 'active');
      if (active) {
        setGoal(active);
        setNextTask(getNextMicrotask(active.microtasks));
      }
    });
  }, [profile?.id, initialGoal]);

  async function handleComplete() {
    if (!nextTask || !profile?.id || completing) return;
    setCompleting(true);

    const result = await goalsAdapter.completeMicrotask(nextTask.id, profile.id);
    if (result.ok) {
      setJustDone(true);
      await interact('goal_step_complete', { goal_id: goal?.id, microtask_id: nextTask.id });
      onComplete?.(nextTask, nextTask.spark_value);

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
      alert(result.error.message || 'No se pudo completar el hito.');
      setCompleting(false);
    }
  }

  if (!goal || !nextTask) return null;

  const nextTaskIndex = goal.microtasks.findIndex(t => t.id === nextTask.id);
  const chapterNumber = nextTaskIndex !== -1 ? nextTaskIndex + 1 : 1;
  const totalChapters = goal.microtasks.length;

  const DIMENSION_EMOJIS: Record<string, string> = {
    regulation: '🧘',
    autonomy: '🚀',
    courage: '🦁',
    empathy: '💖',
    connection: '🔗',
    curiosity: '🎨',
  };

  const goalEmoji = goal.value_dimensions && goal.value_dimensions.length > 0
    ? (DIMENSION_EMOJIS[goal.value_dimensions[0]] || '🗺️')
    : '🗺️';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-stone-700 dark:text-stone-300 flex items-center gap-2">
          <span>{goalEmoji}</span> Tu Aventura Activa
        </CardTitle>
      </CardHeader>

      <div className="flex flex-col gap-4">
        {/* Goal title + progress */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-baseline">
            <p className="text-sm font-semibold text-stone-850 font-display leading-tight">{goal.title}</p>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider flex-shrink-0">
              {Math.round(goal.progress)}%
            </span>
          </div>
          <ProgressBar value={goal.progress} color="lavender" />
        </div>

        {/* Active microtask */}
        <div className={cn(
          'rounded-3xl p-5 border transition-all duration-500 shadow-sm relative overflow-hidden',
          justDone
            ? 'bg-moss-50 border-moss-200'
            : 'bg-stone-50/50 border-stone-200/80 dark:bg-stone-900/10'
        )}>
          {/* Subtle decorative background shine */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/10 to-white/0 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-start gap-4">
            <div className={cn(
              'w-7 h-7 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all shadow-sm',
              justDone ? 'bg-moss-400 border-moss-400 text-white' : 'border-lavender-300 bg-white'
            )} aria-hidden="true">
              {justDone ? (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-[11px] font-bold text-lavender-500">{chapterNumber}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-widest text-lavender-600 dark:text-lavender-400 font-extrabold block mb-1">
                Capítulo {chapterNumber} de {totalChapters}
              </span>
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-350 leading-relaxed">
                {nextTask.title}
              </p>
              {nextTask.effort_level && (
                <span className={cn(
                  'inline-block mt-2 text.5 uppercase font-bold tracking-wider rounded-lg px-2 py-0.5 text-[9px]',
                  EFFORT_COLORS[nextTask.effort_level] ?? 'text-stone-500 bg-stone-100'
                )}>
                  Esfuerzo: {EFFORT_LABELS[nextTask.effort_level] ?? nextTask.effort_level}
                </span>
              )}
            </div>

            <div className="flex-shrink-0">
              <SparkBadge count={nextTask.spark_value} size="sm" />
            </div>
          </div>
        </div>

        {!justDone && !hasCompletedToday && (
          <Button
            variant="primary"
            size="md"
            onClick={handleComplete}
            loading={completing}
            className="w-full text-xs font-bold py-3 rounded-2xl shadow-soft hover:scale-[1.01]"
          >
            ¡He completado este capítulo! ✓ ✨
          </Button>
        )}

        {hasCompletedToday && !justDone && (
          <div className="bg-amber-50/75 dark:bg-stone-900/10 border border-amber-200/50 rounded-2xl p-3.5 text-center text-xs text-amber-850 dark:text-amber-300 font-semibold shadow-sm flex items-center justify-center gap-1.5">
            <span>🌟</span> ¡Gran esfuerzo por hoy! Siguiente capítulo disponible mañana.
          </div>
        )}

        {justDone && (
          <p className="text-center text-sm text-moss-600 font-semibold animate-fade-in flex items-center justify-center gap-1">
            <span>✦</span> ¡Buen trabajo! Capítulo completado
          </p>
        )}
      </div>
    </Card>
  );
}
