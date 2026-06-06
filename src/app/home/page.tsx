'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { CompanionWidget } from '@/components/companion/CompanionWidget';
import { RoutinesToday } from '@/components/routines/RoutinesToday';
import { ActiveGoalStep } from '@/components/goals/ActiveGoalStep';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { CheckinPromptCard } from '@/components/emotional/CheckinPromptCard';
import { useEmotional } from '@/lib/emotional/EmotionalProvider';
import { supabase } from '@/lib/supabase';
import { DATA_SOURCE, getRewardsAdapter } from '@/lib/adapters';
import { motion, AnimatePresence } from 'framer-motion';

import { useRouter } from 'next/navigation';
import type { Reward } from '@/types';

const rewardsAdapter = getRewardsAdapter();

export default function HomePage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const profile = session?.profile ?? null;
  
  const { display, getDialogue, setAppearanceContext, isVisible } = useCompanion();
  const { shouldPrompt } = useEmotional();
  const [dialogue, setDialogue] = useState(() =>
    display ? getDialogue('greeting') : undefined
  );
  const [sparkBalance, setSparkBalance] = useState(12);
  const [showRewards, setShowRewards] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);

  // Fetch rewards dynamically
  useEffect(() => {
    if (authLoading || !session?.family?.id) return;
    rewardsAdapter.getRewards(session.family.id).then(res => {
      if (res.ok) {
        setRewards(res.data);
      }
    });
  }, [session?.family?.id, authLoading, showRewards]);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login');
    }
  }, [session, authLoading, router]);

  // Fetch and subscribe to real-time spark balance
  useEffect(() => {
    if (authLoading || !profile?.id || profile.role !== 'child') return;

    const fetchBalance = async () => {
      const { data, error } = await supabase
        .from('spark_ledger')
        .select('delta')
        .eq('child_id', profile.id);

      if (!error && data) {
        const sum = data.reduce((acc, row) => acc + (row.delta || 0), 0);
        setSparkBalance(sum);
      }
    };

    fetchBalance();

    const channel = supabase
      .channel(`sparks:${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'spark_ledger', filter: `child_id=eq.${profile.id}` },
        () => {
          fetchBalance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role]);

  useEffect(() => {
    setAppearanceContext('home');
    if (display) {
      setDialogue(getDialogue('greeting'));
    }
  }, [display, getDialogue, setAppearanceContext]);

  const showCheckinPrompt = shouldPrompt('morning');
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Buenos días' :
    hour < 18 ? 'Buenas tardes' :
    'Buenas noches';

  async function handleRedeem(rewardTitle: string, cost: number) {
    if (sparkBalance < cost || !profile?.id) return;
    setRedeemingId(rewardTitle);

    const { error } = await supabase.rpc('award_sparks', {
      p_child_id: profile.id,
      p_delta: -cost,
      p_source_type: 'redemption',
      p_note: `Canjeado: ${rewardTitle}`
    });

    setRedeemingId(null);
    if (!error) {
      alert(`¡Canjeado con éxito! Dile a papá/mamá: "${rewardTitle}"`);
    } else {
      alert(`Error al canjear: ${error.message}`);
    }
  }

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="w-6 h-6 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
    </div>
  );

  if (!session) return null;

  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col relative">

      {/* Header */}
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-widest font-body">
            {greeting}
          </p>
          <h1 className="font-display text-2xl text-stone-800 mt-0.5">
            {profile?.display_name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRewards(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 transition-colors shadow-soft"
          >
            🎁 Recompensas
          </button>
          <SparkBadge count={sparkBalance} size="md" />
        </div>
      </header>

      {/* Companion */}
      {isVisible && display && (
        <section
          className="flex justify-center py-6 animate-fade-in"
          aria-label="Tu companion"
        >
          <CompanionWidget
            display={display}
            dialogue={dialogue}
            size="xl"
            onTap={() => setDialogue(getDialogue('free_interaction' as any))}
          />
        </section>
      )}

      {/* Main content */}
      <main className="flex-1 px-4 pb-8 flex flex-col gap-4 max-w-lg mx-auto w-full">

        {/* Check-in prompt if morning */}
        {showCheckinPrompt && (
          <CheckinPromptCard
            onComplete={() => {
              if (display) setDialogue(getDialogue('checkin_response'));
            }}
          />
        )}

        {/* Today's routines */}
        <RoutinesToday
          onComplete={() => {
            if (display) setDialogue(getDialogue('routine_complete'));
          }}
        />

        {/* Active goal step */}
        <ActiveGoalStep
          onComplete={() => {
            if (display) setDialogue(getDialogue('goal_step_complete'));
          }}
        />
      </main>

      {/* REWARDS MODAL */}
      <AnimatePresence>
        {showRewards && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRewards(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />

            {/* Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-white rounded-3xl p-6 shadow-card border border-stone-100 max-w-sm w-full flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl text-stone-800 flex items-center gap-2">
                  <span>🎁</span> Recompensas
                </h3>
                <button
                  onClick={() => setShowRewards(false)}
                  className="text-stone-400 hover:text-stone-600 text-lg leading-none"
                >
                  ×
                </button>
              </div>

              <p className="text-xs text-stone-500">
                Usa tus stars ✦ ganadas con esfuerzo para canjear recompensas.
              </p>

              <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {rewards.map(reward => {
                  const canAfford = sparkBalance >= reward.cost;
                  const isRedeeming = redeemingId === reward.title;

                  return (
                    <div
                      key={reward.id}
                      className="flex items-center justify-between p-3.5 bg-stone-50 rounded-2xl border border-stone-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{reward.emoji}</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-stone-700">
                            {reward.title}
                          </span>
                          <span className="text-xs font-bold text-amber-600 mt-0.5">
                            {reward.cost} Sparks ✦
                          </span>
                        </div>
                      </div>

                      <button
                        disabled={!canAfford || isRedeeming}
                        onClick={() => handleRedeem(reward.title, reward.cost)}
                        className={`
                          text-xs font-bold px-3 py-2 rounded-xl transition-all duration-200
                          ${canAfford
                            ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.96] cursor-pointer shadow-soft'
                            : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                          }
                        `}
                      >
                        {isRedeeming ? 'Canjeando...' : canAfford ? 'Canjear' : 'Faltan sparks'}
                      </button>
                    </div>
                  );
                })}

                {rewards.length === 0 && (
                  <p className="text-stone-400 text-center py-8 text-sm italic">
                    Habla con tus padres para añadir recompensas a tu catálogo.
                  </p>
                )}
              </div>

              <div className="text-center mt-2">
                <span className="text-xs text-stone-400">
                  Tu saldo actual: <strong className="text-amber-500">{sparkBalance} Sparks ✦</strong>
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
