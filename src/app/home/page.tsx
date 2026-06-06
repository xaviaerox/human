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
import type { Reward, RewardRequest } from '@/types';

const rewardsAdapter = getRewardsAdapter();

export default function HomePage() {
  const router = useRouter();
  const { session, loading: authLoading, signOut } = useAuth();
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
  const [rewardRequests, setRewardRequests] = useState<RewardRequest[]>([]);

  // State for proposing a new reward
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestEmoji, setRequestEmoji] = useState('🎁');
  const [requestError, setRequestError] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Fetch rewards and requests dynamically
  useEffect(() => {
    if (authLoading || !session?.family?.id) return;

    // Fetch rewards
    rewardsAdapter.getRewards(session.family.id).then(res => {
      if (res.ok) {
        setRewards(res.data);
      }
    });

    // Fetch requests
    rewardsAdapter.getRewardRequests(session.family.id).then(res => {
      if (res.ok && profile?.id) {
        // Only show pending requests created by this child
        const pending = res.data.filter(r => r.status === 'pending' && r.child_id === profile.id);
        setRewardRequests(pending);
      }
    });
  }, [session?.family?.id, authLoading, showRewards, profile?.id]);

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
          <div className="flex items-center gap-2">
            <p className="text-xs text-stone-400 uppercase tracking-widest font-body">
              {greeting}
            </p>
            <button
              onClick={async () => {
                if (confirm('¿Quieres cerrar sesión?')) {
                  await signOut();
                  router.replace('/login');
                }
              }}
              className="text-[10px] text-stone-400 hover:text-stone-600 bg-stone-100 hover:bg-stone-200/60 px-2 py-0.5 rounded-full transition-all cursor-pointer font-medium"
            >
              Salir
            </button>
          </div>
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
              onClick={() => {
                setShowRewards(false);
                setIsRequesting(false);
              }}
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
              {isRequesting ? (
                // PROPOSE A REWARD FORM
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!session?.family?.id || !profile?.id) return;
                    if (!requestTitle.trim()) {
                      setRequestError('Por favor, escribe un título.');
                      return;
                    }
                    setRequestSubmitting(true);
                    setRequestError('');

                    const res = await rewardsAdapter.createRewardRequest(session.family.id, profile.id, {
                      title: requestTitle.trim(),
                      emoji: requestEmoji
                    });

                    setRequestSubmitting(false);

                    if (res.ok) {
                      // Refresh requests list
                      const requestsRes = await rewardsAdapter.getRewardRequests(session.family.id);
                      if (requestsRes.ok) {
                        const pending = requestsRes.data.filter(r => r.status === 'pending' && r.child_id === profile.id);
                        setRewardRequests(pending);
                      }
                      setIsRequesting(false);
                    } else {
                      setRequestError('Error al enviar: ' + res.error.message);
                    }
                  }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl text-stone-800 flex items-center gap-2">
                      <span>💡</span> Pedir Premio
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsRequesting(false)}
                      className="text-stone-400 hover:text-stone-600 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>

                  <p className="text-xs text-stone-500">
                    Escribe qué premio te gustaría pedir a tus padres y elige un emoji.
                  </p>

                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        ¿Qué te gustaría pedir?
                      </span>
                      <input
                        type="text"
                        value={requestTitle}
                        onChange={e => setRequestTitle(e.target.value)}
                        placeholder="Ej: Tarde de cine, Ir a por helado..."
                        maxLength={40}
                        required
                        className="w-full px-4 py-2.5 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-bloom-200 text-sm text-stone-700 bg-stone-50/50"
                      />
                    </label>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        Elige un emoji
                      </span>
                      <div className="flex gap-2">
                        <span className="w-12 h-12 flex items-center justify-center text-2xl bg-stone-100 border border-stone-200 rounded-2xl">
                          {requestEmoji}
                        </span>
                        <div className="flex-1 flex flex-wrap gap-1 items-center bg-stone-50 p-2 rounded-2xl border border-stone-100 max-h-[80px] overflow-y-auto">
                          {['🍕', '🎮', '🛝', '🍿', '🧸', '🍦', '🚴', '🎁', '🎬', '📚', '🍩', '🎈', '🎠'].map(item => (
                            <button
                              key={item}
                              type="button"
                              onClick={() => setRequestEmoji(item)}
                              className={`
                                w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-stone-200 transition-all cursor-pointer
                                ${requestEmoji === item ? 'bg-bloom-100 border border-bloom-300' : ''}
                              `}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {requestError && (
                    <p className="text-xs text-red-500 text-center">{requestError}</p>
                  )}

                  <div className="flex gap-2.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setIsRequesting(false)}
                      className="flex-1 text-xs font-bold py-2.5 rounded-2xl border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors"
                    >
                      Volver
                    </button>
                    <button
                      type="submit"
                      disabled={requestSubmitting}
                      className="flex-1 text-xs font-bold py-2.5 rounded-2xl bg-bloom-500 hover:bg-bloom-600 text-white transition-colors shadow-soft"
                    >
                      {requestSubmitting ? 'Enviando...' : 'Enviar petición'}
                    </button>
                  </div>
                </form>
              ) : (
                // STANDARD REWARDS CATALOG
                <>
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

                  <div className="flex flex-col gap-2.5 max-h-[200px] overflow-y-auto pr-1">
                    {rewards.map(reward => {
                      const canAfford = sparkBalance >= reward.cost;
                      const isRedeeming = redeemingId === reward.title;

                      return (
                        <div
                          key={reward.id}
                          className="flex items-center justify-between p-3.5 bg-stone-50 rounded-2xl border border-stone-200 shadow-sm"
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

                  {/* PENDING REQUESTS */}
                  {rewardRequests.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-2 border-t border-stone-100 pt-3">
                      <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                        Tus propuestas pendientes
                      </h4>
                      <div className="flex flex-col gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                        {rewardRequests.map(req => (
                          <div
                            key={req.id}
                            className="flex items-center justify-between p-2.5 bg-amber-50/50 rounded-xl border border-amber-100 text-xs"
                          >
                            <span className="font-semibold text-stone-600 flex items-center gap-2">
                              <span className="text-base">{req.emoji}</span> {req.title}
                            </span>
                            <span className="text-amber-600 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                              ⏳ Pendiente
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PROPOSE BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRequesting(true);
                      setRequestTitle('');
                      setRequestEmoji('🎁');
                      setRequestError('');
                    }}
                    className="w-full text-xs font-bold py-2.5 rounded-2xl bg-bloom-50 text-bloom-600 border border-bloom-100 hover:bg-bloom-100 transition-colors shadow-soft mt-1.5 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>💡</span> Proponer un premio
                  </button>

                  <div className="text-center mt-2 border-t border-stone-100 pt-2">
                    <span className="text-xs text-stone-400">
                      Tu saldo actual: <strong className="text-amber-500">{sparkBalance} Sparks ✦</strong>
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
