'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFamily } from '@/lib/family/FamilyProvider';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  getEmotionalAdapter,
  getGoalsAdapter,
  getRoutineAdapter,
  getRewardsAdapter,
  getProgressionAdapter,
  DATA_SOURCE
} from '@/lib/adapters';
import { analyseEmotionTrend } from '@/lib/emotional/EmotionModel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { cn } from '@/lib/utils';
import type { EmotionalWeeklySummary, GoalWithMicrotasks, Reward, RewardRequest, ChildBadge, ChildValueScore, ValueDimensionId } from '@/types';
import { supabase } from '@/lib/supabase';

const emotionalAdapter = getEmotionalAdapter();
const goalsAdapter     = getGoalsAdapter();
const routineAdapter   = getRoutineAdapter();
const rewardsAdapter   = getRewardsAdapter();
const progressionAdapter = getProgressionAdapter();

const TREND_CONFIG = {
  improving:         { label: 'Mejorando',       color: 'text-moss-600',  bg: 'bg-moss-50',  border: 'border-moss-200' },
  stable:            { label: 'Estable',          color: 'text-sky-600',   bg: 'bg-sky-50',   border: 'border-sky-200' },
  declining:         { label: 'Semana difícil',   color: 'text-bloom-600', bg: 'bg-bloom-50', border: 'border-bloom-200' },
  insufficient_data: { label: 'Pocos datos aún', color: 'text-stone-400', bg: 'bg-stone-50', border: 'border-stone-200' },
};

const VALUE_LABELS: Record<ValueDimensionId, string> = {
  autonomy: 'Autonomía',
  empathy: 'Empatía',
  regulation: 'Regulación Emocional',
  connection: 'Constancia',
  courage: 'Valentía',
  curiosity: 'Creatividad',
};

const VALUE_COLORS: Record<ValueDimensionId, 'moss' | 'empathy' | 'sky' | 'lavender' | 'bloom' | 'courage' | any> = {
  autonomy: 'moss',
  empathy: 'empathy',
  regulation: 'sky',
  connection: 'courage',
  courage: 'bloom',
  curiosity: 'lavender',
};

function getWorldPhase(score: number): { phase: 'seed' | 'sprout' | 'bloom'; label: string; icon: string } {
  if (score >= 100) return { phase: 'bloom', label: 'Esplendor', icon: '🌸' };
  if (score >= 31) return { phase: 'sprout', label: 'Brote', icon: '🌱' };
  return { phase: 'seed', label: 'Semilla', icon: '🌰' };
}

export default function ChildDetailClient() {
  const router       = useRouter();
  const params       = useSearchParams();
  const { family, children } = useFamily();
  const { profile: parentProfile } = useAuth();
  const childId      = params.get('id') ?? children[0]?.id ?? '';
  const child        = children.find(c => c.id === childId);

  const [summaries,    setSummaries]    = useState<EmotionalWeeklySummary[]>([]);
  const [goals,        setGoals]        = useState<GoalWithMicrotasks[]>([]);
  const [routineCount, setRoutineCount] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [sparkBalance, setSparkBalance] = useState(0);
  const [activities,   setActivities]   = useState<any[]>([]);

  // Sparks award / custom rewards
  const [awardAmount,     setAwardAmount]     = useState(2);
  const [awardNote,       setAwardNote]       = useState('');
  const [showAwardForm,   setShowAwardForm]   = useState(false);
  const [showRedeemForm,  setShowRedeemForm]  = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [rewards,         setRewards]         = useState<Reward[]>([]);
  const [pendingRequests, setPendingRequests] = useState<RewardRequest[]>([]);

  // Evolved Progression State (Child value scores and badges)
  const [valueScores,     setValueScores]     = useState<Record<ValueDimensionId, number>>({
    autonomy: 0, empathy: 0, regulation: 0, connection: 0, courage: 0, curiosity: 0
  });
  const [badges,          setBadges]          = useState<ChildBadge[]>([]);
  const [showBadgeForm,   setShowBadgeForm]   = useState(false);
  const [badgeDimension,  setBadgeDimension]  = useState<ValueDimensionId>('autonomy');
  const [badgeTier,       setBadgeTier]       = useState<'bronze' | 'silver' | 'gold'>('bronze');
  const [badgeNote,       setBadgeNote]       = useState('');
  const [submittingBadge, setSubmittingBadge] = useState(false);

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

  const fetchPendingRequests = async () => {
    if (!family?.id || !childId) return;
    const res = await rewardsAdapter.getRewardRequests(family.id);
    if (res.ok) {
      const pending = res.data.filter(r => r.status === 'pending' && r.child_id === childId);
      setPendingRequests(pending);
    }
  };

  const fetchProgressionData = async () => {
    if (!childId) return;
    const scoresRes = await progressionAdapter.getScores(childId);
    if (scoresRes.ok) {
      const scoreMap = {
        autonomy: 0, empathy: 0, regulation: 0, connection: 0, courage: 0, curiosity: 0
      };
      scoresRes.data.forEach(s => {
        if (s.dimension_id in scoreMap) {
          scoreMap[s.dimension_id] = s.score;
        }
      });
      setValueScores(scoreMap);
    }

    const badgesRes = await progressionAdapter.getBadges(childId);
    if (badgesRes.ok) {
      setBadges(badgesRes.data);
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
      fetchPendingRequests(),
      fetchProgressionData(),
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
            fetchPendingRequests();
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

  async function handleRedeemReward(rewardId: string, rewardTitle: string, cost: number) {
    if (!childId) return;
    if (sparkBalance < cost) {
      alert('El niño no tiene suficientes estrellas');
      return;
    }
    
    setSubmittingAction(true);
    if (DATA_SOURCE === 'supabase') {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rewardId);
      const { error } = await supabase.rpc('award_sparks', {
        p_child_id: childId,
        p_delta: -cost,
        p_source_type: 'redemption',
        p_source_id: isUuid ? rewardId : null,
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

  async function handleRequestStatus(requestId: string, status: 'approved' | 'rejected', cost = 10, title = '') {
    setSubmittingAction(true);
    
    if (status === 'approved') {
      // Deduct sparks for approved requests
      if (sparkBalance < cost) {
        alert('El niño no tiene suficientes Sparks para este premio. Puedes otorgarle estrellas primero.');
        setSubmittingAction(false);
        return;
      }

      if (DATA_SOURCE === 'supabase') {
        // Log redemption transaction in spark ledger
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);
        await supabase.rpc('award_sparks', {
          p_child_id: childId,
          p_delta: -cost,
          p_source_type: 'redemption',
          p_source_id: isUuid ? requestId : null,
          p_note: `Aprobado: ${title}`
        });
      }
    }

    const res = await rewardsAdapter.updateRewardRequestStatus(requestId, status);
    if (res.ok) {
      alert(status === 'approved' ? '¡Propuesta aprobada y cobrada con éxito!' : 'Propuesta rechazada.');
      fetchBalanceAndLedger();
      fetchPendingRequests();
    } else {
      alert('Error al actualizar propuesta: ' + res.error.message);
    }
    setSubmittingAction(false);
  }

  async function handleAwardBadge() {
    if (!childId || !family?.id) return;
    setSubmittingBadge(true);

    const res = await progressionAdapter.awardBadge(
      childId,
      family.id,
      badgeDimension,
      badgeTier,
      badgeNote.trim() || undefined,
      parentProfile?.id
    );

    setSubmittingBadge(false);

    if (res.ok) {
      alert(`¡Insignia de ${VALUE_LABELS[badgeDimension]} otorgada con éxito!`);
      setBadgeNote('');
      setShowBadgeForm(false);
      fetchProgressionData();
      fetchBalanceAndLedger(); // Score increases balance/sparks logs
    } else {
      alert('Error al otorgar insignia: ' + res.error.message);
    }
  }

  const [approvingGoalId, setApprovingGoalId] = useState<string | null>(null);

  async function handleGoalApproval(goalId: string, action: 'approve' | 'reject') {
    setApprovingGoalId(goalId);
    if (action === 'approve') {
      const res = await goalsAdapter.updateGoal(goalId, { status: 'active' });
      if (res.ok) {
        alert('¡Objetivo aprobado y activado con éxito!');
        const refreshed = await goalsAdapter.getGoals(childId);
        if (refreshed.ok) setGoals(refreshed.data);
      } else {
        alert('Error al aprobar objetivo: ' + res.error.message);
      }
    } else {
      const res = await goalsAdapter.updateGoal(goalId, { status: 'archived' });
      if (res.ok) {
        alert('Objetivo rechazado.');
        const refreshed = await goalsAdapter.getGoals(childId);
        if (refreshed.ok) setGoals(refreshed.data);
      } else {
        alert('Error al rechazar objetivo: ' + res.error.message);
      }
    }
    setApprovingGoalId(null);
  }

  const trend    = summaries.length >= 2 ? analyseEmotionTrend(summaries) : null;
  const trendCfg = trend ? TREND_CONFIG[trend.direction] : TREND_CONFIG.insufficient_data;
  const activeGoals = goals.filter(g => g.status === 'active');
  const proposedGoals = goals.filter(g => g.status === 'paused' && g.co_created);

  if (!child) return null;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full pb-16">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-stone-400 hover:text-stone-600 text-lg cursor-pointer">←</button>
          <h1 className="font-display text-2xl text-stone-800">{child.display_name}</h1>
        </div>
        <SparkBadge count={sparkBalance} size="md" />
      </div>

      {loading && <p className="text-stone-400 text-center py-8">Cargando...</p>}

      {!loading && (
        <>
          {/* PENDING REWARD REQUESTS SECTION */}
          {pendingRequests.length > 0 && (
            <Card variant="warm" className="border-amber-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <span>✧</span> Propuestas de Premios Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {pendingRequests.map(req => {
                  // Standard local costs for approvals
                  const cost = 10;
                  const canAfford = sparkBalance >= cost;
                  return (
                    <div key={req.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-white rounded-2xl border border-amber-100 gap-3 text-xs shadow-soft">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{req.emoji}</span>
                        <div className="flex flex-col">
                          <span className="font-bold text-stone-700">{req.title}</span>
                          <span className="text-[10px] text-stone-400">Solicitado: {new Date(req.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <span className="font-bold text-amber-600 mr-2">{cost} Sparks ✦</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={submittingAction}
                          onClick={() => handleRequestStatus(req.id, 'rejected', cost, req.title)}
                          className="text-stone-400 hover:text-red-500 font-bold"
                        >
                          Rechazar
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={submittingAction || !canAfford}
                          onClick={() => handleRequestStatus(req.id, 'approved', cost, req.title)}
                          className="bg-amber-500 hover:bg-amber-600 font-bold text-white shadow-soft"
                        >
                          {canAfford ? 'Aprobar y Cobrar' : 'Faltan Sparks'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* PROPOSED GOALS SECTION */}
          {proposedGoals.length > 0 && (
            <Card variant="warm" className="border-indigo-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <span>🗺️</span> Propuestas de Aventuras (Objetivos)
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {proposedGoals.map(goal => (
                  <div key={goal.id} className="flex flex-col p-4 bg-white rounded-2xl border border-indigo-100 gap-3 text-xs shadow-soft">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-700 text-sm">{goal.title}</span>
                        <SparkBadge count={goal.total_sparks} size="sm" />
                      </div>
                      {goal.why && (
                        <p className="text-stone-500 font-body">
                          <strong className="text-stone-600">¿Por qué?:</strong> {goal.why}
                        </p>
                      )}
                      {goal.description && (
                        <p className="text-stone-400 font-body">
                          {goal.description}
                        </p>
                      )}
                      {goal.microtasks && goal.microtasks.length > 0 && (
                        <div className="mt-2 pl-2 border-l-2 border-indigo-200 flex flex-col gap-1">
                          <span className="font-semibold text-stone-500 text-[10px] uppercase">Pasos sugeridos:</span>
                          {goal.microtasks.map((task, idx) => (
                            <div key={task.id || idx} className="flex items-center gap-1.5 text-stone-600">
                              <span className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 font-bold text-[9px] flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span>{task.title}</span>
                              <span className="text-[10px] text-stone-400">({task.spark_value} Sparks)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 justify-end mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={approvingGoalId !== null}
                        onClick={() => handleGoalApproval(goal.id, 'reject')}
                        className="text-stone-400 hover:text-red-500 font-bold"
                      >
                        Rechazar
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={approvingGoalId !== null}
                        onClick={() => handleGoalApproval(goal.id, 'approve')}
                        className="bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-soft"
                      >
                        Aprobar y Activar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* DOUBLE PROGRESSION VALUES DASHBOARD */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🌱</span> Nivel de Valores del Niño
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(valueScores) as ValueDimensionId[]).map(dim => {
                const score = valueScores[dim];
                const phase = getWorldPhase(score);
                const color = VALUE_COLORS[dim];

                return (
                  <div key={dim} className="flex flex-col gap-1.5 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-700 text-sm">{VALUE_LABELS[dim]}</span>
                      <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
                        {score} pts ({phase.label} {phase.icon})
                      </span>
                    </div>
                    <ProgressBar value={Math.min(100, (score / 120) * 100)} color={color} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* BADGE AWARD PANEL (AFFECTIONATE AFFIRMATION) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🎖️</span> Insignias de Valores Otorgadas
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Badges display list */}
              <div className="flex flex-wrap gap-2.5">
                {badges.map(b => {
                  const label = VALUE_LABELS[b.dimension_id] || b.dimension_id;
                  const tierColor =
                    b.badge_tier === 'gold' ? 'bg-yellow-50 border-yellow-200 text-yellow-600' :
                    b.badge_tier === 'silver' ? 'bg-slate-50 border-slate-200 text-slate-500' :
                    'bg-amber-50 border-amber-200 text-amber-600';
                  
                  return (
                    <div
                      key={b.id}
                      className={cn(
                        'px-3.5 py-2 rounded-2xl border text-xs font-bold flex flex-col gap-0.5 shadow-soft max-w-xs',
                        tierColor
                      )}
                    >
                      <span className="capitalize">{label} ({b.badge_tier})</span>
                      {b.parent_note && (
                        <p className="text-[10px] text-stone-400 font-medium font-body mt-1 italic">
                          &quot;{b.parent_note}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}

                {badges.length === 0 && (
                  <p className="text-xs text-stone-400 italic">No hay insignias de valores otorgadas todavía.</p>
                )}
              </div>

              <div className="border-t border-stone-100 pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowBadgeForm(!showBadgeForm)}
                  className="w-full text-xs font-bold"
                >
                  {showBadgeForm ? 'Cerrar Formulario' : '🎖️ Otorgar Nueva Insignia (Afirmación)'}
                </Button>
              </div>

              {showBadgeForm && (
                <div className="flex flex-col gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200 animate-slide-up">
                  <h4 className="text-xs font-bold text-stone-700">Otorgar una insignia de valores</h4>
                  
                  <div className="flex flex-col md:flex-row gap-3">
                    {/* Dimension Select */}
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Valor</label>
                      <select
                        value={badgeDimension}
                        onChange={e => setBadgeDimension(e.target.value as ValueDimensionId)}
                        className="px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-bloom-200 cursor-pointer"
                      >
                        {(Object.keys(VALUE_LABELS) as ValueDimensionId[]).map(k => (
                          <option key={k} value={k}>{VALUE_LABELS[k]}</option>
                        ))}
                      </select>
                    </div>

                    {/* Tier Select */}
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Nivel</label>
                      <select
                        value={badgeTier}
                        onChange={e => setBadgeTier(e.target.value as any)}
                        className="px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-bloom-200 cursor-pointer"
                      >
                        <option value="bronze">Bronce</option>
                        <option value="silver">Plata</option>
                        <option value="gold">Oro</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Mensaje de Afirmación (Afectivo)</label>
                    <textarea
                      value={badgeNote}
                      onChange={e => setBadgeNote(e.target.value)}
                      placeholder="Escribe un mensaje recordándole al niño por qué demostró este valor hoy en el mundo real..."
                      maxLength={180}
                      rows={2}
                      className="px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-bloom-200 font-body resize-none"
                    />
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    loading={submittingBadge}
                    onClick={handleAwardBadge}
                    className="w-full font-bold text-xs"
                  >
                    Confirmar y Otorgar Insignia 🎖️
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>

          {/* SPARKS & REWARDS CONTEXT */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🎁</span> Otorgar Estrellas Adicionales
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
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
                  🎁 Canjear Premio de la Casa
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
                            onClick={() => handleRedeemReward(reward.id, reward.title, reward.cost)}
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

          {/* SPARKS HISTORY */}
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

          {/* EMOTIONAL TRENDS */}
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

          {/* WEEKLY ACTIVITY */}
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

          {/* GOALS */}
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
