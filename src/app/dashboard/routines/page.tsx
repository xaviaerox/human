'use client';

import { useEffect, useState } from 'react';
import { useFamily } from '@/lib/family/FamilyProvider';
import { getRoutineAdapter } from '@/lib/adapters';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SparkBadge } from '@/components/ui/SparkBadge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { RoutineWithSteps } from '@/types';

const routineAdapter = getRoutineAdapter();

const TIME_LABELS: Record<string, string> = {
  morning: 'Mañana',
  midday: 'Mediodía',
  evening: 'Tarde/Noche',
  anytime: 'Cualquier momento',
};

export default function RoutinesPage() {
  const { family } = useFamily();
  const [routines, setRoutines] = useState<RoutineWithSteps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!family?.id) return;
    routineAdapter.getRoutines(family.id).then(result => {
      if (result.ok) setRoutines(result.data);
      setLoading(false);
    });
  }, [family?.id]);

  async function handleArchive(id: string) {
    await routineAdapter.archiveRoutine(id);
    setRoutines(prev => prev.filter(r => r.id !== id));
  }

  const grouped = {
    morning: routines.filter(r => r.time_of_day === 'morning'),
    midday:  routines.filter(r => r.time_of_day === 'midday'),
    evening: routines.filter(r => r.time_of_day === 'evening'),
    anytime: routines.filter(r => r.time_of_day === 'anytime' || !r.time_of_day),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-stone-800">Rutinas</h1>
        <Link href="/dashboard/routines/new">
          <Button variant="primary" size="sm">+ Nueva</Button>
        </Link>
      </div>

      {loading && (
        <p className="text-stone-400 text-sm text-center py-8">Cargando...</p>
      )}

      {!loading && routines.length === 0 && (
        <Card variant="warm" className="text-center py-10">
          <p className="text-stone-500 mb-4">Aún no hay rutinas.</p>
          <Link href="/dashboard/routines/new">
            <Button variant="calm">Crear primera rutina</Button>
          </Link>
        </Card>
      )}

      {(Object.entries(grouped) as [string, RoutineWithSteps[]][]).map(([timeKey, group]) => {
        if (group.length === 0) return null;
        return (
          <div key={timeKey} className="flex flex-col gap-3">
            <h2 className="text-xs text-stone-400 uppercase tracking-widest font-medium px-1">
              {TIME_LABELS[timeKey]}
            </h2>
            {group.map(routine => (
              <RoutineRow
                key={routine.id}
                routine={routine}
                onArchive={() => handleArchive(routine.id)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function RoutineRow({
  routine,
  onArchive,
}: {
  routine: RoutineWithSteps;
  onArchive: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card variant="bordered" className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <button
            className="flex items-center gap-2 w-full text-left"
            onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded}
          >
            <span className="font-medium text-stone-700 text-sm">{routine.title}</span>
            <span className="text-stone-400 text-xs ml-auto">
              {routine.steps.length} paso{routine.steps.length !== 1 ? 's' : ''}
            </span>
            <span className={cn(
              'text-stone-400 transition-transform text-xs',
              expanded && 'rotate-180'
            )} aria-hidden="true">▼</span>
          </button>

          {expanded && (
            <div className="mt-3 flex flex-col gap-2 animate-slide-up">
              {routine.steps.map(step => (
                <div key={step.id} className="flex gap-2 text-xs text-stone-500">
                  <span className="text-stone-300 flex-shrink-0">{step.position}.</span>
                  <span>{step.title}</span>
                  {step.duration_minutes && (
                    <span className="ml-auto text-stone-300">{step.duration_minutes}min</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <SparkBadge count={routine.spark_value} size="sm" />
          <Link href={`/dashboard/routines/edit?id=${routine.id}`}>
            <button
              className="text-xs text-stone-300 hover:text-bloom-500 transition-colors"
              aria-label={`Editar ${routine.title}`}
            >
              ✎
            </button>
          </Link>
          <button
            onClick={onArchive}
            className="text-xs text-stone-300 hover:text-red-400 transition-colors"
            aria-label={`Archivar ${routine.title}`}
          >
            ×
          </button>
        </div>
      </div>
    </Card>
  );
}
