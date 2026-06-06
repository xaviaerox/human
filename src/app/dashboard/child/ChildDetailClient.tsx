'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFamily } from '@/lib/family/FamilyProvider';
import { getEmotionalAdapter, getGoalsAdapter, getRoutineAdapter, getRewardsAdapter, DATA_SOURCE } from '@/lib/adapters';
import { analyseEmotionTrend } from '@/lib/emotional/EmotionModel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { cn } from '@/lib/utils';
import type { EmotionalWeeklySummary, GoalWithMicrotasks, Reward } from '@/types';
import { supabase } from '@/lib/supabase';

const emotionalAdapter = getEmotionalAdapter();
const goalsAdapter     = getGoalsAdapter();
const routineAdapter   = getRoutineAdapter();
const rewardsAdapter   = getRewardsAdapter();

const TREND_CONFIG = {
  improving:         { label: 'Mejorando',       color: 'text-moss-600',  bg: 'bg-moss-50',  border: 'border-moss-200' },
  stable:            { label: 'Estable',          color: 'text-sky-600',   bg: 'bg-sky-50',   border: 'border-sky-200' },
  declining:         { label: 'Semana difícil',   color: 'text-bloom-600', bg: 'bg-bloom-50', border: 'border-bloom-200' },
  insufficient_data: { label: 'Pocos datos aún', color: 'text-stone-400', bg: 'bg-stone-50', border: 'border-stone-200' },
};

export default function ChildDetailClient() {
  const router       = useRouter();
  const params       = useSearchParams();
  const { family, children } = useFamily();
  const childId      = params.get('id') ?? children[0]?.id ?? '';
  const child        = children.find(c => c.id === childId);

  const [summaries,    setSummaries]    = useState<EmotionalWeeklySummary[]>([]);
  const [goals,        setGoals]        = useState<GoalWithMicrotasks[]>([]);
  const [routineCount, setRoutineCount] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [sparkBalance, setSparkBalance] = useState(0);
  const [activities,   setActivities]   = useState<any[]>([]);

  const [awardAmount,     setAwardAmount]     = useState(2);
  const [awardNote,       setAwardNote]       = useState('');
  const [showAwardForm,   setShowAwardForm]   = useState(false);
  const [showRedeemForm,  setShowRedeemForm]  = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [rewards,         setRewards]         = useState<Reward[]>([]);

  useEffect(() => {
    if (!family?.id) return;
    rewardsAdapter.getRewards(family.id).then(res => {
      if (res.ok) setRewards(res.data);
    });
  }, [family?.id, showRedeemForm]);

  const fetchBalanceAndLedger = async () => {
    if (!childId) return;
    if (DATA_SOURCE === 'supabase') {
      const { data, error } = await supabase
        .from('spark_ledger')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setActivities(data);
        const sum = data.reduce((acc, row) => acc + (row.delta || 0), 0);
        setSparkBalance(sum);
      }
    } else {
      setSparkBalance(19);
      setActivities([
        { id: '1', delta: 5, source_type: 'routine_complete', note: 'Routine: Noche', created_at: new Date().toISOString() },
        { id: '2', delta: 5, source_type: 'routine_complete', note: 'Routine: Rutina de la mañana', created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString() },
        { id: '3', delta: -10, source_type: 'redemption', note: 'Canjeado: 30 min de pantalla extra', created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString() },
      ]);
    }
  };

  useEffect(() => {
    if (!childId) return;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    setLoading(true);
    Promise.all([
      emotionalAdapter.getWeeklySummaries(childId, 8),
      goalsAdapter.getGoals(childId),
      routineAdapter.getCompletions(
        childId,
        weekStart.toISOString().split('T')[0]!,
        new Date().toISOString().split('T')[0]!
      ),
      fetchBalanceAndLedger(),
    ]).then(([s, g, r]) => {
      if (s.ok) setSummaries(s.data);
      if (g.ok) setGoals(g.data);
      if (r.ok) setRoutineCount(r.data.length);
      setLoading(false);
    });

    if (DATA_SOURCE === 'supabase') {
      const channel = supabase
        .channel(`child_detail_sparks:${childId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'spark_ledger', filter: `child_id=eq.${childId}` },
          () => {
            fetchBalanceAndLedger();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [childId]);

  async function handleAwardSparks() {
    if (!childId) return;
    setSubmittingAction(true);
    
    if (DATA_SOURCE === 'supabase') {
      const { error } = await supabase.rpc('award_sparks', {
        p_child_id: childId,
        p_delta: awardAmount,
        p_source_type: 'parent_bonus',
        p_note: awardNote.trim() || 'Premio de papá/mamá'
      });
      if (error) {
        alert('Error al otorgar estrellas: ' + error.message);
      } else {
        setAwardNote('');
        setShowAwardForm(false);
        fetchBalanceAndLedger();
      }
    } else {
      alert(`¡Éxito! Has otorgado ${awardAmount} estrellas a ${child?.display_name}`);
      setShowAwardForm(false);
    }
    setSubmittingAction(false);
  }

  async function handleRedeemReward(rewardTitle: string, cost: number) {
    if (!childId) return;
    if (sparkBalance < cost) {
      alert('El niño no tiene suficientes estrellas');
      return;
    }
    
    setSubmittingAction(true);
    if (DATA_SOURCE === 'supabase') {
      const { error } = await supabase.rpc('award_sparks', {
        p_child_id: childId,
        p_delta: -cost,
        p_source_type: 'redemption',
        p_note: `Canjeado: ${rewardTitle}`
      });
      if (error) {
        alert('Error al canjear recompensa: ' + error.message);
      } else {
        fetchBalanceAndLedger();
      }
    } else {
      alert(`¡Éxito! Has canjeado "${rewardTitle}" para ${child?.display_name}`);
    }
    setSubmittingAction(false);
  }

  const trend    = summaries.length >= 2 ? analyseEmotionTrend(summaries) : null;
  const trendCfg = trend ? TREND_CONFIG[trend.direction] : TREND_CONFIG.insufficient_data;
  const activeGoals = goals.filter(g => g.status === 'active');

  if (!child) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-stone-400 hover:text-stone-600 text-lg">←</button>
          <h1 className="font-display text-2xl text-stone-800">{child.display_name}</h1>
        </div>
        <SparkBadge count={sparkBalance} size="md" />
      </div>

      {loading && <p className="text-stone-400 text-center py-8">Cargando...</p>}

      {!loading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🎁</span> Gestión de Estrellas y Recompensas
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
                <span className="text-sm text-stone-600 font-medium">Saldo disponible</span>
                <span className="text-base font-bold text-amber-600 flex items-center gap-1">
                  {sparkBalance} Sparks ✦
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={showAwardForm ? 'primary' : 'secondary'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => { setShowAwardForm(!showAwardForm); setShowRedeemForm(false); }}
                >
                  ➕ Otorgar Estrellas
                </Button>
                <Button
                  variant={showRedeemForm ? 'primary' : 'secondary'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => { setShowRedeemForm(!showRedeemForm); setShowAwardForm(false); }}
                >
                  🎁 Canjear Premio
                </Button>
              </div>

              {showAwardForm && (
                <div className="flex flex-col gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200 animate-slide-up">
                  <h4 className="text-xs font-bold text-stone-700">Otorgar estrellas adicionales</h4>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-stone-400 uppercase tracking-wider">Cantidad</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 5, 10].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAwardAmount(val)}
                          className={cn(
                            'flex-1 py-1.5 rounded-xl border text-xs font-bold transition-all',
                            awardAmount === val
                              ? 'bg-amber-100 border-amber-300 text-amber-700'
                              : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
                          )}
                        >
                          +{val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-stone-400 uppercase tracking-wider">Motivo / Nota</label>
                    <input
                      type="text"
                      value={awardNote}
                      onChange={e => setAwardNote(e.target.value)}
                      placeholder="Ej: Ayudar a recoger, excelente actitud..."
                      className="px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-bloom-200"
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    loading={submittingAction}
                    onClick={handleAwardSparks}
                    className="w-full mt-1"
                  >
                    Confirmar y Otorgar ✦
                  </Button>
                </div>
              )}

              {showRedeemForm && (
                <div className="flex flex-col gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200 animate-slide-up">
                  <h4 className="text-xs font-bold text-stone-700">Canjear un premio del catálogo</h4>
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                    {rewards.map(reward => {
                      const canAfford = sparkBalance >= reward.cost;
                      return (
                        <div key={reward.id} className="flex items-center justify-between p-2 bg-white rounded-xl border border-stone-100 text-xs">
                          <span className="font-semibold text-stone-700">{reward.emoji} {reward.title}</span>
                          <button
                            disabled={!canAfford || submittingAction}
                            onClick={() => handleRedeemReward(reward.title, reward.cost)}
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg font-bold transition-all text-[11px] cursor-pointer',
                              canAfford
                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                            )}
                          >
                            -{reward.cost} Sparks
                          </button>
                        </div>
                      );
                    })}
                    {rewards.length === 0 && (
                      <p className="text-stone-400 text-center py-4 text-xs italic">
                        No hay recompensas configuradas. Ve al menú Recompensas para crearlas.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Estrellas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {activities.map(act => {
                  const isPositive = act.delta > 0;
                  const dateLabel = new Date(act.created_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <div key={act.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0 text-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-stone-700">
                          {act.note || (act.source_type === 'routine_complete' ? 'Rutina completada' : 'Ajuste de estrellas')}
                        </span>
                        <span className="text-[10px] text-stone-400">{dateLabel}</span>
                      </div>
                      <span className={cn(
                        'font-bold',
                        isPositive ? 'text-moss-600' : 'text-bloom-600'
                      )}>
                        {isPositive ? `+${act.delta}` : act.delta} Sparks ✦
                      </span>
                    </div>
                  );
                })}
                {activities.length === 0 && (
                  <p className="text-xs text-stone-400 text-center py-4">Aún no hay transacciones de estrellas registradas.</p>
                )}
              </div>
            </CardContent>
          </Card>

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
