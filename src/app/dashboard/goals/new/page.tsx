'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useFamily } from '@/lib/family/FamilyProvider';
import { getGoalsAdapter } from '@/lib/adapters';
import { buildDecompositionPrompt, parseDecompositionResponse, fallbackDecomposition } from '@/lib/goals/MicrotaskEngine';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { cn } from '@/lib/utils';
import type { ValueDimensionId, ParsedMicrotask } from '@/types';

const goalsAdapter = getGoalsAdapter();

const EFFORT_LABELS: Record<string, string> = {
  easy: 'fácil',
  medium: 'normal',
  stretch: 'esfuerzo',
};

const EFFORT_COLORS: Record<string, string> = {
  easy:    'bg-moss-50 text-moss-600 border-moss-200',
  medium:  'bg-sky-50 text-sky-600 border-sky-200',
  stretch: 'bg-bloom-50 text-bloom-600 border-bloom-200',
};

export default function NewGoalPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { family, children } = useFamily();

  const [step, setStep]               = useState<'form' | 'decompose' | 'review'>('form');
  const [title, setTitle]             = useState('');
  const [why, setWhy]                 = useState('');
  const [childId, setChildId]         = useState(children[0]?.id ?? '');
  const [coCreated, setCoCreated]     = useState(false);
  const [microtasks, setMicrotasks]   = useState<ParsedMicrotask[]>([]);
  const [decomposing, setDecomposing] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const selectedChild = children.find(c => c.id === childId);
  const childAge = selectedChild?.birth_year
    ? new Date().getFullYear() - selectedChild.birth_year
    : undefined;

  async function handleDecompose() {
    if (!title.trim()) return;
    setDecomposing(true);
    setStep('decompose');

    try {
      const prompt = buildDecompositionPrompt({ goalTitle: title, goalWhy: why, childAge });
      const res = await fetch('/human/api/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (res.ok) {
        const { text } = await res.json();
        const result = parseDecompositionResponse(text, 'claude-sonnet-4-20250514');
        setMicrotasks(result?.microtasks ?? fallbackDecomposition(title));
      } else {
        setMicrotasks(fallbackDecomposition(title));
      }
    } catch {
      setMicrotasks(fallbackDecomposition(title));
    }

    setDecomposing(false);
    setStep('review');
  }

  function updateTaskTitle(idx: number, value: string) {
    setMicrotasks(prev => prev.map((t, i) => i === idx ? { ...t, title: value } : t));
  }

  function removeTask(idx: number) {
    setMicrotasks(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!family?.id || !profile?.id || !childId) return;
    setSaving(true);
    setError('');

    const result = await goalsAdapter.createGoal({
      family_id:  family.id,
      child_id:   childId,
      title:      title.trim(),
      why:        why.trim() || undefined,
      created_by: profile.id,
      co_created: coCreated,
      visibility: 'child_and_parent',
      microtasks,
    });

    setSaving(false);
    if (!result.ok) { setError(result.error.message); return; }
    router.push('/dashboard/goals');
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => step === 'form' ? router.back() : setStep('form')}
          className="text-stone-400 hover:text-stone-600 text-lg">←</button>
        <h1 className="font-display text-2xl text-stone-800">
          {step === 'form' ? 'Nuevo objetivo' :
           step === 'decompose' ? 'Pensando pasos...' :
           'Revisar pasos'}
        </h1>
      </div>

      {/* FORM STEP */}
      {step === 'form' && (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-col gap-4">
              {children.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-stone-700">Para quién</label>
                  <select
                    value={childId}
                    onChange={e => setChildId(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-bloom-300"
                  >
                    {children.map(c => (
                      <option key={c.id} value={c.id}>{c.display_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                label="¿Cuál es el objetivo?"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Aprender a atarme los zapatos"
                required
                autoFocus
              />
              <Input
                label="¿Por qué lo quiere conseguir? (opcional)"
                value={why}
                onChange={e => setWhy(e.target.value)}
                placeholder="Para poder hacerlo solo por las mañanas..."
                hint="Conectar con la motivación interna ayuda mucho"
              />

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={coCreated}
                  onChange={e => setCoCreated(e.target.checked)}
                  className="w-4 h-4 rounded accent-bloom-500"
                />
                <span className="text-sm text-stone-600">El niño participó en crear este objetivo</span>
              </label>
            </div>
          </Card>

          <Button
            size="xl"
            onClick={handleDecompose}
            disabled={!title.trim()}
            className="w-full"
          >
            Generar pasos con IA ✦
          </Button>

          <button
            onClick={() => { setMicrotasks(fallbackDecomposition(title)); setStep('review'); }}
            disabled={!title.trim()}
            className="text-sm text-stone-400 hover:text-stone-600 text-center"
          >
            Prefiero añadir los pasos manualmente
          </button>
        </div>
      )}

      {/* DECOMPOSE STEP — loading */}
      {step === 'decompose' && (
        <Card className="py-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-bloom-200 border-t-bloom-500 rounded-full animate-spin" />
            <p className="text-stone-500">Pensando en pequeños pasos...</p>
            <p className="text-xs text-stone-400 max-w-xs">
              La IA está descomponiendo "{title}" en pasos accesibles
            </p>
          </div>
        </Card>
      )}

      {/* REVIEW STEP */}
      {step === 'review' && (
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="font-display text-base text-stone-800 mb-4">
              Pasos para "{title}"
            </h2>
            <div className="flex flex-col gap-3">
              {microtasks.map((task, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                  <span className="text-stone-300 text-sm mt-0.5 flex-shrink-0">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <input
                      value={task.title}
                      onChange={e => updateTaskTitle(idx, e.target.value)}
                      className="w-full text-sm text-stone-700 bg-transparent focus:outline-none font-medium"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      {task.effort_level && (
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full border font-medium',
                          EFFORT_COLORS[task.effort_level] ?? 'bg-stone-100 text-stone-500'
                        )}>
                          {EFFORT_LABELS[task.effort_level]}
                        </span>
                      )}
                      <SparkBadge count={task.spark_value} size="sm" className="ml-auto" />
                    </div>
                  </div>
                  <button
                    onClick={() => removeTask(idx)}
                    className="text-stone-300 hover:text-red-400 text-lg leading-none flex-shrink-0"
                    aria-label="Eliminar paso"
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => setMicrotasks(prev => [...prev, {
                  position: prev.length + 1,
                  title: '',
                  effort_level: 'medium',
                  spark_value: 2,
                  value_dimensions: [],
                }])}
                className="text-sm text-bloom-500 hover:text-bloom-700 text-left mt-1"
              >
                + Añadir paso
              </button>
            </div>
          </Card>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <Button size="xl" onClick={handleSave} loading={saving} className="w-full">
            Guardar objetivo
          </Button>

          <button
            onClick={handleDecompose}
            disabled={decomposing}
            className="text-sm text-stone-400 hover:text-stone-600 text-center"
          >
            Regenerar pasos con IA
          </button>
        </div>
      )}
    </div>
  );
}
