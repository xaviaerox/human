'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useFamily } from '@/lib/family/FamilyProvider';
import { getRoutineAdapter } from '@/lib/adapters';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { NEURODIVERGENT_ROUTINE_TEMPLATES, type RoutineTemplate } from '@/lib/routines/routineTemplates';
import type { TimeOfDay, ScheduleType, ValueDimensionId } from '@/types';

const routineAdapter = getRoutineAdapter();

const TIME_OPTIONS: { value: TimeOfDay; label: string; emoji: string }[] = [
  { value: 'morning', label: 'Mañana',         emoji: '🌅' },
  { value: 'midday',  label: 'Mediodía',        emoji: '☀️' },
  { value: 'evening', label: 'Tarde / Noche',   emoji: '🌙' },
  { value: 'anytime', label: 'Cualquier momento', emoji: '✨' },
];

const SCHEDULE_OPTIONS: { value: ScheduleType; label: string }[] = [
  { value: 'daily',    label: 'Todos los días' },
  { value: 'weekdays', label: 'Días de cole' },
  { value: 'weekends', label: 'Fin de semana' },
];

const VALUE_OPTIONS: { id: ValueDimensionId; label: string; color: string }[] = [
  { id: 'autonomy',   label: 'Autonomía',   color: 'bg-moss-100 text-moss-700 border-moss-200' },
  { id: 'regulation', label: 'Regulación',  color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { id: 'courage',    label: 'Valentía',    color: 'bg-bloom-100 text-bloom-700 border-bloom-200' },
  { id: 'empathy',    label: 'Empatía',     color: 'bg-stone-100 text-stone-700 border-stone-200' },
  { id: 'curiosity',  label: 'Curiosidad',  color: 'bg-lavender-100 text-lavender-700 border-lavender-200' },
  { id: 'connection', label: 'Conexión',    color: 'bg-bloom-100 text-bloom-700 border-bloom-200' },
];

type StepDraft = { title: string; duration_minutes?: number };

export default function NewRoutinePage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { family, children } = useFamily();

  const [title, setTitle]             = useState('');
  const [timeOfDay, setTimeOfDay]     = useState<TimeOfDay>('morning');
  const [schedule, setSchedule]       = useState<ScheduleType>('daily');
  const [sparkValue, setSparkValue]   = useState(2);
  const [dimensions, setDimensions]   = useState<ValueDimensionId[]>([]);
  const [steps, setSteps]             = useState<StepDraft[]>([{ title: '' }]);
  const [childId, setChildId]         = useState<string>(children[0]?.id ?? '');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  function toggleDimension(id: ValueDimensionId) {
    setDimensions(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  }

  function updateStep(idx: number, value: string) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, title: value } : s));
  }

  function addStep() {
    setSteps(prev => [...prev, { title: '' }]);
  }

  function removeStep(idx: number) {
    setSteps(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !family?.id || !profile?.id) return;
    setError('');
    setLoading(true);

    const validSteps = steps
      .filter(s => s.title.trim())
      .map((s, i) => ({ position: i + 1, title: s.title.trim() }));

    const result = await routineAdapter.createRoutine({
      family_id:        family.id,
      child_id:         childId || undefined,
      title:            title.trim(),
      schedule_type:    schedule,
      time_of_day:      timeOfDay,
      spark_value:      sparkValue,
      value_dimensions: dimensions.length > 0 ? dimensions : undefined,
      created_by:       profile.id,
      steps:            validSteps,
    });

    setLoading(false);
    if (!result.ok) { setError(result.error.message); return; }
    router.push('/dashboard/routines');
  }

  function applyTemplate(template: RoutineTemplate) {
    setTitle(template.title);
    setTimeOfDay(template.time_of_day);
    setSparkValue(template.spark_value);
    setDimensions(template.value_dimensions);
    setSteps(template.steps.map(s => ({ title: s.title, duration_minutes: s.duration_minutes })));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-stone-400 hover:text-stone-600 text-lg">←</button>
        <h1 className="font-display text-2xl text-stone-800">Nueva rutina</h1>
      </div>

      {/* Preset Templates */}
      <Card className="bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200/60 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-teal-900 flex items-center gap-1.5">
            <span>✨</span> Plantillas Neurodivergentes (1-Tap)
          </h2>
          <span className="text-[10px] bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded-full">Recomendado</span>
        </div>
        <p className="text-xs text-teal-700">Selecciona una estructura probada adaptada para TDAH y TEA:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {NEURODIVERGENT_ROUTINE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className="text-left p-3 rounded-xl bg-white border border-teal-200/80 hover:border-teal-400 hover:shadow-sm transition-all space-y-1 group"
            >
              <div className="font-semibold text-xs text-slate-800 group-hover:text-teal-700">{tpl.title}</div>
              <div className="text-[11px] text-slate-500 line-clamp-1">{tpl.description}</div>
            </button>
          ))}
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Card>
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre de la rutina"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Rutina de la mañana"
              required
              autoFocus
            />

            {/* For which child */}
            {children.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-stone-700">Para quién</label>
                <select
                  value={childId}
                  onChange={e => setChildId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-bloom-300"
                >
                  <option value="">Toda la familia</option>
                  {children.map(c => (
                    <option key={c.id} value={c.id}>{c.display_name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Time of day */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-stone-700">Momento del día</label>
              <div className="grid grid-cols-2 gap-2">
                {TIME_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTimeOfDay(opt.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-sm transition-all',
                      timeOfDay === opt.value
                        ? 'bg-bloom-50 border-bloom-300 text-bloom-700'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    )}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-stone-700">Frecuencia</label>
              <div className="flex gap-2">
                {SCHEDULE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSchedule(opt.value)}
                    className={cn(
                      'flex-1 py-2 rounded-2xl border text-xs font-medium transition-all',
                      schedule === opt.value
                        ? 'bg-bloom-50 border-bloom-300 text-bloom-700'
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Steps */}
        <Card>
          <h2 className="font-display text-base text-stone-800 mb-4">Pasos</h2>
          <div className="flex flex-col gap-2">
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <span className="text-stone-300 text-sm w-4 flex-shrink-0">{idx + 1}.</span>
                <input
                  value={step.title}
                  onChange={e => updateStep(idx, e.target.value)}
                  placeholder={`Paso ${idx + 1}...`}
                  className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-bloom-200 bg-white"
                />
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="text-stone-300 hover:text-red-400 text-lg leading-none"
                    aria-label="Eliminar paso"
                  >×</button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addStep}
              className="text-sm text-bloom-500 hover:text-bloom-700 text-left mt-1"
            >
              + Añadir paso
            </button>
          </div>
        </Card>

        {/* Sparks + values */}
        <Card>
          <h2 className="font-display text-base text-stone-800 mb-4">Recompensa y valores</h2>
          <div className="flex flex-col gap-4">
            {/* Spark value */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-stone-700">
                Sparks ✦ al completar
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSparkValue(n)}
                    className={cn(
                      'flex-1 py-2 rounded-xl border text-sm font-medium transition-all',
                      sparkValue === n
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Value dimensions */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-stone-700">
                Valores que refuerza (opcional)
              </label>
              <div className="flex flex-wrap gap-2">
                {VALUE_OPTIONS.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleDimension(v.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      dimensions.includes(v.id) ? v.color : 'bg-white border-stone-200 text-stone-500'
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <Button type="submit" size="xl" loading={loading} className="w-full">
          Crear rutina
        </Button>
      </form>
    </div>
  );
}
