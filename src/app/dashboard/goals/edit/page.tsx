'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useFamily } from '@/lib/family/FamilyProvider';
import { getGoalsAdapter } from '@/lib/adapters';
import { buildDecompositionPrompt, parseDecompositionResponse, fallbackDecomposition } from '@/lib/goals/MicrotaskEngine';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { cn } from '@/lib/utils';
import type { GoalMicrotask, ParsedMicrotask } from '@/types';

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

function EditGoalClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const { profile } = useAuth();
  const { family, children } = useFamily();

  const [step, setStep]               = useState<'form' | 'decompose' | 'review'>('form');
  const [title, setTitle]             = useState('');
  const [why, setWhy]                 = useState('');
  const [childId, setChildId]         = useState('');
  const [coCreated, setCoCreated]     = useState(false);
  const [numTasks, setNumTasks]       = useState(21);
  const [sparkValue, setSparkValue]   = useState(1);
  const [onePerDay, setOnePerDay]     = useState(true);
  const [microtasks, setMicrotasks]   = useState<Omit<GoalMicrotask, 'id' | 'goal_id'>[]>([]);
  const [decomposing, setDecomposing] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [fetching, setFetching]       = useState(true);
  const [error, setError]             = useState('');

  const selectedChild = children.find(c => c.id === childId);
  const childAge = selectedChild?.birth_year
    ? new Date().getFullYear() - selectedChild.birth_year
    : undefined;

  useEffect(() => {
    if (!id) {
      queueMicrotask(() => {
        setError('ID de objetivo no proporcionado');
        setFetching(false);
      });
      return;
    }

    goalsAdapter.getGoal(id).then(result => {
      if (result.ok) {
        const goal = result.data;
        setTitle(goal.title);
        setWhy(goal.why ?? '');
        setChildId(goal.child_id);
        setCoCreated(goal.co_created ?? false);
        setOnePerDay(goal.one_per_day ?? true);
        setNumTasks(goal.microtasks.length);
        setSparkValue(goal.microtasks[0]?.spark_value ?? 1);
        setMicrotasks(goal.microtasks.map(t => ({
          position: t.position,
          title: t.title,
          description: t.description,
          effort_level: t.effort_level,
          spark_value: t.spark_value,
          value_dimensions: t.value_dimensions,
          status: t.status,
          ai_generated: t.ai_generated,
          completed_at: t.completed_at,
          completed_by: t.completed_by,
        })));
      } else {
        setError('No se pudo cargar el objetivo.');
      }
      setFetching(false);
    });
  }, [id]);

  function mapParsedToDrafts(tasks: ParsedMicrotask[]): Omit<GoalMicrotask, 'id' | 'goal_id'>[] {
    return tasks.map(t => ({
      position: t.position,
      title: t.title,
      description: t.description,
      effort_level: t.effort_level,
      spark_value: t.spark_value,
      value_dimensions: t.value_dimensions,
      status: 'pending',
      ai_generated: true,
    }));
  }

  function updateNumTasks(newNum: number) {
    setNumTasks(newNum);
    setMicrotasks(prev => {
      if (newNum > prev.length) {
        const diff = newNum - prev.length;
        const newTasks = [...prev];
        for (let i = 0; i < diff; i++) {
          newTasks.push({
            position: newTasks.length + 1,
            title: `Día ${newTasks.length + 1}: ${title}`,
            effort_level: 'medium',
            spark_value: sparkValue,
            value_dimensions: [],
            status: 'pending',
            ai_generated: false,
          });
        }
        return newTasks;
      } else if (newNum < prev.length) {
        return prev.slice(0, newNum);
      }
      return prev;
    });
  }

  function updateSparkValueAll(newVal: number) {
    setSparkValue(newVal);
    setMicrotasks(prev => prev.map(t => ({ ...t, spark_value: newVal })));
  }

  async function handleDecompose() {
    if (!title.trim()) return;
    setDecomposing(true);
    setStep('decompose');

    try {
      const prompt = buildDecompositionPrompt({ goalTitle: title, goalWhy: why, childAge, numTasks, sparkValue });
      let textResponse = '';
      let fetchSuccess = false;

      try {
        const res = await fetch('/human/api/decompose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        if (res.ok) {
          const data = await res.json();
          textResponse = data.text;
          fetchSuccess = true;
        }
      } catch (fetchErr) {
        console.warn('[edit/page] API route fetch failed, trying client fallback...', fetchErr);
      }

      if (!fetchSuccess) {
        const clientGroqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
        const clientGeminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (clientGroqKey) {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${clientGroqKey}`
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 1024,
              temperature: 0.3,
              response_format: { type: 'json_object' }
            }),
          });
          if (groqRes.ok) {
            const data = await groqRes.json();
            textResponse = data.choices?.[0]?.message?.content || '';
          }
        } else if (clientGeminiKey) {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${clientGeminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                  maxOutputTokens: 1024,
                  temperature: 0.3,
                  responseMimeType: 'application/json'
                }
              })
            }
          );
          if (geminiRes.ok) {
            const data = await geminiRes.json();
            textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
        }
      }

      if (textResponse) {
        const result = parseDecompositionResponse(textResponse, 'claude-sonnet-4-20250514');
        setMicrotasks(mapParsedToDrafts(result?.microtasks ?? fallbackDecomposition(title, numTasks, sparkValue)));
      } else {
        setMicrotasks(mapParsedToDrafts(fallbackDecomposition(title, numTasks, sparkValue)));
      }
    } catch (err) {
      console.error('[edit/page] Decomposition error:', err);
      setMicrotasks(mapParsedToDrafts(fallbackDecomposition(title, numTasks, sparkValue)));
    }

    setDecomposing(false);
    setStep('review');
  }

  function updateTaskTitle(idx: number, value: string) {
    setMicrotasks(prev => prev.map((t, i) => i === idx ? { ...t, title: value } : t));
  }

  function updateTaskSparkValue(idx: number, val: number) {
    setMicrotasks(prev => prev.map((t, i) => i === idx ? { ...t, spark_value: val } : t));
  }

  function removeTask(idx: number) {
    setMicrotasks(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!id || !family?.id || !profile?.id || !childId) return;
    setSaving(true);
    setError('');

    const result = await goalsAdapter.updateGoal(
      id,
      {
        child_id:   childId,
        title:      title.trim(),
        why:        why.trim() || undefined,
        co_created: coCreated,
        one_per_day: onePerDay,
      },
      microtasks as Omit<GoalMicrotask, 'id' | 'goal_id'>[]
    );

    setSaving(false);
    if (!result.ok) { setError(result.error.message); return; }
    router.push('/dashboard/goals');
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => step === 'form' ? router.back() : setStep('form')}
          className="text-stone-400 hover:text-stone-600 text-lg">←</button>
        <h1 className="font-display text-2xl text-stone-800">
          {step === 'form' ? 'Editar objetivo' :
           step === 'decompose' ? 'Pensando pasos...' :
           'Revisar pasos'}
        </h1>
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {!error && (
        <>
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

                  <div className="border-t border-stone-100 pt-4 mt-2 flex flex-col gap-4">
                    <div className="flex gap-4">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-stone-700">Número de hitos (pasos)</label>
                        <select
                          value={numTasks}
                          onChange={e => updateNumTasks(parseInt(e.target.value) || 21)}
                          className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-bloom-300 text-sm"
                        >
                          {[3, 5, 7, 10, 14, 21, 30].map(v => (
                            <option key={v} value={v}>{v} hitos</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-stone-700">Recompensa por hito</label>
                        <select
                          value={sparkValue}
                          onChange={e => updateSparkValueAll(parseInt(e.target.value) || 1)}
                          className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-bloom-300 text-sm"
                        >
                          {[1, 2, 3, 4, 5, 10].map(v => (
                            <option key={v} value={v}>✨ {v} {v === 1 ? 'Spark' : 'Sparks'}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onePerDay}
                        onChange={e => setOnePerDay(e.target.checked)}
                        className="w-4 h-4 rounded accent-bloom-500"
                      />
                      <span className="text-sm text-stone-600 font-medium">Limitar a completar un solo hito al día</span>
                    </label>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer mt-1">
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
                onClick={() => setStep('review')}
                disabled={!title.trim()}
                className="w-full"
              >
                Editar pasos directos →
              </Button>

              <button
                onClick={handleDecompose}
                disabled={decomposing || !title.trim()}
                className="text-sm text-bloom-500 hover:text-bloom-700 text-center mt-1"
              >
                Regenerar pasos con IA ✦
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
                        <div className="flex items-center gap-2 mt-1 w-full justify-between">
                          {task.effort_level && (
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full border font-medium',
                              EFFORT_COLORS[task.effort_level] ?? 'bg-stone-100 text-stone-500'
                            )}>
                              {EFFORT_LABELS[task.effort_level]}
                            </span>
                          )}
                          
                          <div className="ml-auto flex items-center gap-1.5">
                            <span className="text-[11px] text-stone-500 font-medium">Recompensa:</span>
                            <select
                              value={task.spark_value}
                              onChange={e => updateTaskSparkValue(idx, parseInt(e.target.value) || 1)}
                              className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                            >
                              {[1, 2, 3, 4, 5, 10].map(v => (
                                <option key={v} value={v}>
                                  ✨ {v} {v === 1 ? 'Spark' : 'Sparks'}
                                </option>
                              ))}
                            </select>
                          </div>
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
                      spark_value: sparkValue,
                      value_dimensions: [],
                      status: 'pending',
                      ai_generated: false,
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
        </>
      )}
    </div>
  );
}

export default function EditGoalPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" /></div>}>
      <EditGoalClient />
    </Suspense>
  );
}
