'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { useProgression } from '@/lib/progression/ProgressionProvider';
import { useSparks } from '@/lib/sparks/SparkProvider';
import { useEmotional } from '@/lib/emotional/EmotionalProvider';
import { getGoalsAdapter, getRoutineAdapter } from '@/lib/adapters';
import { getWorldPhase } from '@/components/worlds/worldThemes';
import { getNextMicrotask } from '@/lib/goals/MicrotaskEngine';
import type {
  DialogueLine,
  GoalWithMicrotasks,
  GoalMicrotask,
} from '@/types';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

import { useGoalProposals } from '@/hooks/useGoalProposals';
import { useRewardRequests } from '@/hooks/useRewardRequests';
import { useChildNavigation } from '@/hooks/useChildNavigation';
import { useChildModals } from '@/hooks/useChildModals';
import { useChildCheckinState } from '@/hooks/useChildCheckinState';
import { useChildRewardsState } from '@/hooks/useChildRewardsState';

const goalsAdapter = getGoalsAdapter();

function getRandomLoadingText(): string {
  const lines = [
    'Escuchando el susurro del viento...',
    'Observando las estrellas brillantes...',
    'Buscando una chispa de magia...',
    'Sintiendo la brisa del reino...',
  ];
  return lines[Math.floor(Math.random() * lines.length)] || lines[0]!;
}

export function useHomeState() {
  const router = useRouter();
  const { session, loading: authLoading, signOut } = useAuth();
  const profile = session?.profile ?? null;

  const { display, getDialogue, setAppearanceContext, isVisible, memories, interact } = useCompanion();
  const { scores, badges, refreshBadges, refreshScores } = useProgression();
  const { balance: sparkBalance } = useSparks();
  const { shouldPrompt, submitCheckin, recentCheckins, lastCheckin } = useEmotional();

  const navigation = useChildNavigation();
  const modals = useChildModals();

  const [dialogue, setDialogue] = useState<DialogueLine | undefined>(() =>
    display ? getDialogue('greeting') : undefined
  );

  // Routines status for 'Todo Listo' state
  const [allRoutinesDone, setAllRoutinesDone] = useState(false);

  // Active goal context for companion chat
  const [activeGoals, setActiveGoals] = useState<GoalWithMicrotasks[]>([]);
  const [activeGoal, setActiveGoal] = useState<GoalWithMicrotasks | null>(null);
  const [nextTask, setNextTask] = useState<GoalMicrotask | null>(null);

  const [currentCelebration, setCurrentCelebration] = useState<{ id: string; delta: number; note: string } | null>(null);
  const [currentBadgeCelebration, setCurrentBadgeCelebration] = useState<{
    id: string;
    dimensionId: string;
    tier: 'bronze' | 'silver' | 'gold';
    parentNote: string;
  } | null>(null);

  const fetchActiveGoal = useCallback(() => {
    if (!profile?.id) return;
    goalsAdapter.getGoals(profile.id).then(res => {
      if (res.ok) {
        const activeList = res.data.filter(g => g.status === 'active');
        setActiveGoals(activeList);

        const active = activeList[0] || null;
        if (active) {
          const isStuck = Date.now() - new Date(active.updated_at).getTime() > 48 * 60 * 60 * 1000;
          const task = getNextMicrotask(active.microtasks);
          if (task) {
            (task as GoalMicrotask & { isStuck?: boolean }).isStuck = isStuck;
          }
          setActiveGoal(active);
          setNextTask(task);
        } else {
          setActiveGoal(null);
          setNextTask(null);
        }
      }
    });
  }, [profile]);

  useEffect(() => {
    fetchActiveGoal();
  }, [fetchActiveGoal]);

  const goalProposalState = useGoalProposals(session?.family?.id, profile?.id, () => {
    fetchActiveGoal();
  });

  const rewardRequestState = useRewardRequests(session?.family?.id, profile?.id, () => {
    // Refresh rewards
  });

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login');
    }
  }, [session, authLoading, router]);

  // Set companion appearance context
  useEffect(() => {
    setAppearanceContext(navigation.activeTab === 'hogar' ? 'home' : 'transition');
  }, [navigation.activeTab, setAppearanceContext]);

  // States for companion tapping
  const [tapLoading, setTapLoading] = useState(false);

  // Check if routines are completed
  const checkRoutinesStatus = useCallback(() => {
    if (!profile?.id || !session?.family?.id) return;
    const routineAdapter = getRoutineAdapter();
    routineAdapter.getRoutines(session.family.id, profile.id).then(resR => {
      if (!resR.ok) return;
      const routines = resR.data;
      routineAdapter.getCompletions(
        profile.id,
        new Date().toISOString().split('T')[0]!,
        new Date().toISOString().split('T')[0]!
      ).then(resC => {
        if (!resC.ok) return;
        const completedIds = new Set(resC.data.map(c => c.routine_id));
        const pending = routines.filter(r => !completedIds.has(r.id));
        setAllRoutinesDone(pending.length === 0);
      });
    });
  }, [profile, session]);

  useEffect(() => {
    checkRoutinesStatus();
  }, [checkRoutinesStatus, navigation.activeTab]);

  // World first-visit greeting dialogue trigger
  useEffect(() => {
    if (!profile?.id || !display) return;
    const key = `mira_world_seen_${profile.id}_${navigation.selectedWorld.id}`;
    const alreadySeen = localStorage.getItem(key);
    if (!alreadySeen) {
      const worldWelcomes: Record<string, string> = {
        lago_calma: `¡Bienvenido al Lago de la Calma! ☯ Aquí podemos respirar hondo y buscar nuestra paz interior juntos.`,
        valle_habitos: `¡Te presento el Valle de los Hábitos! ♾ Tu constancia diaria hará que los árboles den deliciosas manzanas.`,
        bosque_autonomia: `¡Exploremos el Bosque de la Autonomía! ↟ Al hacer cosas por ti mismo, encenderás las linternas y hongos mágicos.`,
        montana_esfuerzo: `¡Llegamos a las Montañas del Esfuerzo! ▲ Cada hito que superes te ayudará a escalar las cumbres más altas.`,
        reino_social: `¡Este es el Reino de la Vida Social! ♡ Comparte amor y empatía para construir puentes de arcoíris.`,
      };
      const welcomeText = worldWelcomes[navigation.selectedWorld.id] || `¡Bienvenido a este nuevo rincón de nuestro mundo!`;
      queueMicrotask(() => setDialogue({ text: welcomeText, durationMs: 6000 }));
      localStorage.setItem(key, 'true');
    }
  }, [navigation.selectedWorld.id, profile?.id, display]);

  async function handleCompanionTap() {
    if (tapLoading || !display) return;

    const randomLoading = getRandomLoadingText();
    setDialogue({ text: randomLoading, durationMs: 4000 });

    setTapLoading(true);

    try {
      const activeWorldScore = scores[navigation.selectedWorld.dimension] || 0;
      const activeWorldPhase = getWorldPhase(activeWorldScore);

      const res = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '[TAP]',
          history: [],
          companionName: display.name,
          childName: profile?.display_name || 'amigo',
          stage: display.stage,
          worldName: navigation.selectedWorld.name,
          worldPhase: activeWorldPhase.label,
          childScores: scores,
          activeGoal: activeGoal ? {
            title: activeGoal.title,
            nextTask: nextTask ? { title: nextTask.title, spark_value: nextTask.spark_value, isStuck: (nextTask as GoalMicrotask & { isStuck?: boolean }).isStuck } : null,
            progress: activeGoal.progress
          } : null,
          recentMemories: (memories || []).slice(0, 3).map(m => ({
            type: m?.memory_type,
            metadata: m?.metadata,
            created_at: m?.created_at
          })),
          recentCheckins: (recentCheckins || []).slice(0, 2).map(c => ({
            emotion_word: c?.emotion_word,
            valence: c?.valence,
            energy_level: c?.energy_level,
            note: c?.note,
            occurred_at: c?.occurred_at
          })),
          stream: false
        })
      });

      if (res.ok) {
        const data = await res.json() as { text: string };
        setDialogue({
          text: data.text,
          durationMs: Math.min(8000, 3000 + data.text.length * 45),
          animationCue: 'breathe'
        });
      } else {
        throw new Error('API failed');
      }
    } catch {
      const fallback = getDialogue('free_interaction');
      setDialogue(fallback);
    } finally {
      setTapLoading(false);
    }
  }

  // Realtime subscription to celebrate new sparks and badges
  useEffect(() => {
    if (!profile?.id || profile.role !== 'child') return;

    const channel = supabase
      .channel(`sparks_celebration:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'spark_ledger',
          filter: `child_id=eq.${profile.id}`
        },
        (payload: RealtimePostgresInsertPayload<{ id: string; delta: number; note: string | null }>) => {
          const entry = payload.new;
          if (entry && entry.delta > 0) {
            setCurrentCelebration({
              id: entry.id,
              delta: entry.delta,
              note: entry.note || '¡Buen trabajo!'
            });
          }
        }
      )
      .subscribe();

    const badgeChannel = supabase
      .channel(`badge_celebration:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'child_badges',
          filter: `child_id=eq.${profile.id}`
        },
        (payload: RealtimePostgresInsertPayload<{ id: string; dimension_id: string; badge_tier: 'bronze' | 'silver' | 'gold'; parent_note: string | null }>) => {
          const entry = payload.new;
          if (entry) {
            refreshBadges();
            refreshScores();
            setCurrentBadgeCelebration({
              id: entry.id,
              dimensionId: entry.dimension_id,
              tier: entry.badge_tier,
              parentNote: entry.parent_note || ''
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(badgeChannel);
    };
  }, [profile?.id, profile?.role, refreshBadges, refreshScores]);

  const checkinState = useChildCheckinState(
    navigation.activeTab,
    display,
    getDialogue,
    submitCheckin,
    interact,
    lastCheckin
  );

  const rewardsState = useChildRewardsState(
    session?.family?.id,
    profile?.id,
    sparkBalance
  );

  const activeWorldScore = scores[navigation.selectedWorld.dimension] || 0;
  const activeWorldPhase = getWorldPhase(activeWorldScore);

  const hasCompletedGoalToday = useMemo(() => {
    if (activeGoals.length === 0) return true;
    return activeGoals.every(g => {
      if (!g.one_per_day) return true;
      return g.microtasks.some((t: GoalMicrotask) => {
        if (t.status !== 'complete' || !t.completed_at) return false;
        const compDate = new Date(t.completed_at).toLocaleDateString();
        const todayDate = new Date().toLocaleDateString();
        return compDate === todayDate;
      });
    });
  }, [activeGoals]);

  const showCheckinPrompt = shouldPrompt('morning');

  return {
    router,
    session,
    authLoading,
    signOut,
    profile,
    display,
    getDialogue,
    setAppearanceContext,
    isVisible,
    memories,
    interact,
    scores,
    badges,
    refreshBadges,
    refreshScores,
    sparkBalance,
    shouldPrompt,
    submitCheckin,
    recentCheckins,
    lastCheckin,
    dialogue,
    setDialogue,
    ...navigation,
    ...modals,
    allRoutinesDone,
    checkRoutinesStatus,
    activeGoals,
    activeGoal,
    nextTask,
    fetchActiveGoal,
    currentCelebration,
    setCurrentCelebration,
    currentBadgeCelebration,
    setCurrentBadgeCelebration,
    ...goalProposalState,
    tapLoading,
    handleCompanionTap,
    ...checkinState,
    ...rewardsState,
    ...rewardRequestState,
    activeWorldScore,
    activeWorldPhase,
    hasCompletedGoalToday,
    showCheckinPrompt,
  };
}
