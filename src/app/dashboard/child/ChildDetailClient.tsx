'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFamily } from '@/lib/family/FamilyProvider';
import { getEmotionalAdapter, getGoalsAdapter, getRoutineAdapter } from '@/lib/adapters';
import { analyseEmotionTrend } from '@/lib/emotional/EmotionModel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { cn } from '@/lib/utils';
import type { EmotionalWeeklySummary, GoalWithMicrotasks } from '@/types';

const emotionalAdapter = getEmotionalAdapter();
const goalsAdapter     = getGoalsAdapter();
const routineAdapter   = getRoutineAdapter();

const TREND_CONFIG = {
  improving:         { label: 'Mejorando',       color: 'text-moss-600',  bg: 'bg-moss-50',  border: 'border-moss-200' },
  stable:            { label: 'Estable',          color: 'text-sky-600',   bg: 'bg-sky-50',   border: 'border-sky-200' },
  declining:         { label: 'Semana difícil',   color: 'text-bloom-600', bg: 'bg-bloom-50', border: 'border-bloom-200' },
  insufficient_data: { label: 'Pocos datos aún', color: 'text-stone-400', bg: 'bg-stone-50', border: 'border-stone-200' },
};

export default function ChildDetailClient() {
  const router       = useRouter();
  const params       = useSearchParams();
  const { children } = useFamily();
  const childId      = params.get('id') ?? children[0]?.id ?? '';
  const child        = children.find(c => c.id === childId);

  const [summaries,    setSummaries]    = useState<EmotionalWeeklySummary[]>([]);
  const [goals,        setGoals]        = useState<GoalWithMicrotasks[]>([]);
  const [routineCount, setRoutineCount] = useState(0);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!childId) return;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    Promise.all([
      emotionalAdapter.getWeeklySummaries(childId, 8),
      goalsAdapter.getGoals(childId),
      routineAdapter.getCompletions(
        childId,
        weekStart.toISOString().split('T')[0]!,
        new Date().toISOString().split('T')[0]!
      ),
    ]).then(([s, g, r]) => {
      if (s.ok) setSummaries(s.data);
      if (g.ok) setGoals(g.data);
      if (r.ok) setRoutineCount(r.data.length);
      setLoading(false);
    });
  }, [childId]);

  const trend    = summaries.length >= 2 ? analyseEmotionTrend(summaries) : null;
  const trendCfg = trend ? TREND_CONFIG[trend.direction] : TREND_CONFIG.insufficient_data;
  const activeGoals = goals.filter(g => g.status === 'active');

  if (!child) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-stone-400 hover:text-stone-600 text-lg">←</button>
        <h1 className="font-display text-2xl text-stone-800">{child.display_name}</h1>
      </div>

      {loading && <p className="text-stone-400 text-center py-8">Cargando...</p>}

      {!loading && (
        <>
          <Card>
            <CardHeader><CardTitle>Estado emocional</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border w-fit',
                  trendCfg.bg, trendCfg.color, trendCfg.border
                )}>
                  {trendCfg.label}
                </div>
                {summaries.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {summaries.slice(-4).reverse().map(s => (
                      <WeekRow key={s.week_start} summary={s} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-400">Aún no hay check-ins registrados.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Esta semana</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-6">
                <div className="flex flex-col gap-1">
                  <p className="text-2xl font-display text-stone-800">{routineCount}</p>
                  <p className="text-xs text-stone-400">rutinas completadas</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-2xl font-display text-stone-800">
                    {summaries[summaries.length - 1]?.checkin_count ?? 0}
                  </p>
                  <p className="text-xs text-stone-400">registros</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {activeGoals.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Objetivos en curso</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {activeGoals.map(goal => (
                    <div key={goal.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-stone-700 truncate">{goal.title}</p>
                        <SparkBadge count={goal.total_sparks} size="sm" />
                      </div>
                      <ProgressBar value={goal.progress} color="lavender" />
                      <p className="text-xs text-stone-400">
                        {goal.microtasks.filter(t => t.status === 'complete').length} / {goal.microtasks.length} pasos
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function WeekRow({ summary }: { summary: EmotionalWeeklySummary }) {
  const label   = new Date(summary.week_start).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const valence = summary.avg_valence;
  const color   = valence >= 4 ? 'moss' : valence >= 3 ? 'sky' : 'bloom';
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-stone-400 w-16 flex-shrink-0">{label}</p>
      <div className="flex-1">
        <ProgressBar value={(valence / 5) * 100} color={color as any} />
      </div>
      <p className="text-xs text-stone-400 w-14 text-right flex-shrink-0">
        {summary.checkin_count} registro{summary.checkin_count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
