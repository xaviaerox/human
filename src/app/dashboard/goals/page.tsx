'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useFamily } from '@/lib/family/FamilyProvider';
import { getGoalsAdapter } from '@/lib/adapters';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SparkBadge } from '@/components/ui/SparkBadge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { GoalWithMicrotasks } from '@/types';

const goalsAdapter = getGoalsAdapter();

const STATUS_LABELS: Record<string, string> = {
  active: 'En curso',
  completed: 'Completado',
  paused: 'En pausa',
  archived: 'Archivado',
};

export default function GoalsPage() {
  const { profile } = useAuth();
  const { children } = useFamily();
  const [selectedChildId, setSelectedChildId] = useState<string>(children[0]?.id ?? '');
  const [goals, setGoals] = useState<GoalWithMicrotasks[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = selectedChildId || children[0]?.id;
    if (!id) { setLoading(false); return; }
    setLoading(true);
    goalsAdapter.getGoals(id).then(result => {
      if (result.ok) setGoals(result.data);
      setLoading(false);
    });
  }, [selectedChildId, children]);

  const active    = goals.filter(g => g.status === 'active');
  const completed = goals.filter(g => g.status === 'completed');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-stone-800">Objetivos</h1>
        <Link href="/dashboard/goals/new">
          <Button variant="primary" size="sm">+ Nuevo</Button>
        </Link>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-2">
          {children.map(child => (
            <button
              key={child.id}
              onClick={() => setSelectedChildId(child.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium border transition-all',
                selectedChildId === child.id
                  ? 'bg-bloom-50 border-bloom-300 text-bloom-700'
                  : 'bg-white border-stone-200 text-stone-500'
              )}
            >
              {child.display_name}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-stone-400 text-sm text-center py-8">Cargando...</p>}

      {!loading && goals.length === 0 && (
        <Card variant="warm" className="text-center py-10">
          <p className="text-stone-500 mb-4">Aún no hay objetivos.</p>
          <Link href="/dashboard/goals/new">
            <Button variant="calm">Crear primer objetivo</Button>
          </Link>
        </Card>
      )}

      {active.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs text-stone-400 uppercase tracking-widest">En curso</h2>
          {active.map(goal => <GoalCard key={goal.id} goal={goal} />)}
        </div>
      )}

      {completed.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs text-stone-400 uppercase tracking-widest">Completados</h2>
          {completed.map(goal => <GoalCard key={goal.id} goal={goal} />)}
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal }: { goal: GoalWithMicrotasks }) {
  const [expanded, setExpanded] = useState(false);
  const done = goal.microtasks.filter(t => t.status === 'complete').length;
  const total = goal.microtasks.length;

  return (
    <Card variant="bordered" className="p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex items-center gap-2">
            <p className="font-medium text-stone-700 text-sm truncate">{goal.title}</p>
            {goal.co_created && (
              <span className="text-xs text-lavender-500 bg-lavender-50 px-1.5 py-0.5 rounded-full border border-lavender-200 flex-shrink-0">
                co-creado
              </span>
            )}
          </div>
          {goal.why && (
            <p className="text-xs text-stone-400 mt-0.5 truncate">"{goal.why}"</p>
          )}
          <div className="mt-2 flex items-center gap-3">
            <ProgressBar value={goal.progress} color="lavender" className="flex-1" />
            <span className="text-xs text-stone-400 flex-shrink-0">{done}/{total}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <SparkBadge count={goal.total_sparks} size="sm" />
          <Link href={`/dashboard/goals/edit?id=${goal.id}`}>
            <button
              className="text-xs text-stone-300 hover:text-bloom-500 transition-colors"
              aria-label={`Editar ${goal.title}`}
            >
              ✏️
            </button>
          </Link>
          <span
            onClick={() => setExpanded(e => !e)}
            className={cn(
              'text-stone-400 transition-transform text-xs cursor-pointer px-1',
              expanded && 'rotate-180'
            )}
            aria-hidden="true"
          >▼</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 flex flex-col gap-2 border-t border-stone-100 pt-4 animate-slide-up">
          {goal.microtasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 text-xs">
              <div className={cn(
                'w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center',
                task.status === 'complete' ? 'bg-moss-400 border-moss-400' : 'border-stone-300'
              )}>
                {task.status === 'complete' && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={cn(
                task.status === 'complete' ? 'text-stone-400 line-through' : 'text-stone-600'
              )}>
                {task.title}
              </span>
              {task.ai_generated && (
                <span className="text-stone-300 ml-auto">IA</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
