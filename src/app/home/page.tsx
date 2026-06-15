'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useCompanion } from '@/lib/companion/CompanionProvider';
import { useProgression } from '@/lib/progression/ProgressionProvider';
import { useSparks } from '@/lib/sparks/SparkProvider';
import { CompanionWidget } from '@/components/companion/CompanionWidget';
import { RoutinesToday } from '@/components/routines/RoutinesToday';
import { ActiveGoalStep } from '@/components/goals/ActiveGoalStep';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { CheckinPromptCard } from '@/components/emotional/CheckinPromptCard';
import { useEmotional } from '@/lib/emotional/EmotionalProvider';
import { getRewardsAdapter } from '@/lib/adapters';
import { motion, AnimatePresence } from 'framer-motion';
import { SparkCelebrationOverlay } from '@/components/ui/SparkCelebrationOverlay';
import { ChildAvatar } from '@/components/ui/ChildAvatar';
import { CustomizationModal } from '@/components/companion/CustomizationModal';

import { useRouter } from 'next/navigation';
import type { Reward, RewardRequest, ValueDimensionId, ChildBadge, CompanionMemory } from '@/types';

const rewardsAdapter = getRewardsAdapter();

interface WorldTheme {
  id: string;
  name: string;
  dimension: ValueDimensionId;
  bgGradient: string;
  textColor: string;
  accentBg: string;
  emoji: string;
  description: string;
}

const WORLD_THEMES: WorldTheme[] = [
  {
    id: 'lago_calma',
    name: 'Lago de la Calma',
    dimension: 'regulation',
    bgGradient: 'from-sky-50 to-sky-150 dark:from-sky-900/40 dark:to-sky-950/60',
    textColor: 'text-sky-700 dark:text-sky-300',
    accentBg: 'bg-sky-100 border-sky-200 dark:bg-sky-900/50 dark:border-sky-850',
    emoji: '💧',
    description: 'Aprende a regular tus emociones y respirar hondo.',
  },
  {
    id: 'valle_habitos',
    name: 'Valle de los Hábitos',
    dimension: 'connection', // Constancia
    bgGradient: 'from-moss-50 to-moss-150 dark:from-moss-900/40 dark:to-moss-950/60',
    textColor: 'text-moss-700 dark:text-moss-300',
    accentBg: 'bg-moss-100 border-moss-200 dark:bg-moss-900/50 dark:border-moss-850',
    emoji: '🍃',
    description: 'La constancia en tus rutinas hace que este valle florezca.',
  },
  {
    id: 'bosque_autonomia',
    name: 'Bosque de la Autonomía',
    dimension: 'autonomy',
    bgGradient: 'from-emerald-50 to-moss-100 dark:from-emerald-950/30 dark:to-moss-950/50',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    accentBg: 'bg-emerald-100 border-emerald-200 dark:bg-emerald-900/50 dark:border-emerald-850',
    emoji: '🌲',
    description: 'Haz las cosas por ti mismo y ayuda a crecer a los árboles.',
  },
  {
    id: 'montana_esfuerzo',
    name: 'Montañas del Esfuerzo',
    dimension: 'courage', // Valentía
    bgGradient: 'from-amber-50 to-bloom-100 dark:from-amber-950/30 dark:to-bloom-950/50',
    textColor: 'text-bloom-700 dark:text-bloom-300',
    accentBg: 'bg-bloom-100 border-bloom-200 dark:bg-bloom-900/50 dark:border-bloom-850',
    emoji: '⛰️',
    description: 'Supera tus miedos y sube las cumbres del esfuerzo.',
  },
  {
    id: 'reino_social',
    name: 'Reino de la Vida Social',
    dimension: 'empathy',
    bgGradient: 'from-lavender-50 to-lavender-150 dark:from-lavender-900/40 dark:to-lavender-950/60',
    textColor: 'text-lavender-700 dark:text-lavender-300',
    accentBg: 'bg-lavender-100 border-lavender-200 dark:bg-lavender-900/50 dark:border-lavender-850',
    emoji: '🏰',
    description: 'Comparte con otros, empatiza y haz amigos.',
  },
];

function getCooldownStatus(reward: Reward, lastRedeemStr?: string): { isLocked: boolean; text?: string } {
  if (!reward.cooldown_hours || !lastRedeemStr) {
    return { isLocked: false };
  }

  const lastRedeem = new Date(lastRedeemStr);
  const cooldownMs = reward.cooldown_hours * 60 * 60 * 1000;
  const elapsedMs = Date.now() - lastRedeem.getTime();
  const remainingMs = cooldownMs - elapsedMs;

  if (remainingMs <= 0) {
    return { isLocked: false };
  }

  const remainingMinutesTotal = Math.ceil(remainingMs / (1000 * 60));
  const days = Math.floor(remainingMinutesTotal / (24 * 60));
  const hours = Math.floor((remainingMinutesTotal % (24 * 60)) / 60);
  const mins = remainingMinutesTotal % 60;

  let text = '';
  if (days > 0) {
    text = `Espera ${days}d ${hours}h`;
  } else if (hours > 0) {
    text = `Espera ${hours}h`;
  } else {
    text = `Espera ${mins}m`;
  }

  return { isLocked: true, text };
}

function getWorldPhase(score: number): { phase: 'seed' | 'sprout' | 'bloom'; label: string; icon: string } {
  if (score >= 100) return { phase: 'bloom', label: 'Esplendor', icon: '🌸' };
  if (score >= 31) return { phase: 'sprout', label: 'Brote', icon: '🌱' };
  return { phase: 'seed', label: 'Semilla', icon: '🌰' };
}

export default function HomePage() {
  const router = useRouter();
  const { session, loading: authLoading, signOut } = useAuth();
  const profile = session?.profile ?? null;
  
  const { display, getDialogue, setAppearanceContext, isVisible, memories } = useCompanion();
  const { scores, badges } = useProgression();
  const { balance: sparkBalance } = useSparks();
  const { shouldPrompt } = useEmotional();

  const [dialogue, setDialogue] = useState(() =>
    display ? getDialogue('greeting') : undefined
  );
  
  // Navigation tabs: 'hogar' | 'mundos' | 'adventuras'
  const [activeTab, setActiveTab] = useState<'hogar' | 'mundos' | 'adventuras'>('hogar');
  const [selectedWorld, setSelectedWorld] = useState<WorldTheme>(WORLD_THEMES[0]!);
  
  const [showRewards, setShowRewards] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showMemoriesModal, setShowMemoriesModal] = useState(false);

  const [currentCelebration, setCurrentCelebration] = useState<{ id: string; delta: number; note: string } | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [lastRedemptions, setLastRedemptions] = useState<Record<string, string>>({});
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

    rewardsAdapter.getRewards(session.family.id).then(res => {
      if (res.ok) setRewards(res.data);
    });

    rewardsAdapter.getRewardRequests(session.family.id).then(res => {
      if (res.ok && profile?.id) {
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

  useEffect(() => {
    setAppearanceContext(activeTab === 'hogar' ? 'home' : 'transition');
  }, [activeTab, setAppearanceContext]);

  const showCheckinPrompt = shouldPrompt('morning');
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Buenos días' :
    hour < 18 ? 'Buenas tardes' :
    'Buenas noches';

  async function handleRedeem(rewardId: string, rewardTitle: string, cost: number) {
    if (sparkBalance < cost || !profile?.id) return;
    setRedeemingId(rewardId);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rewardId);

    const res = await rewardsAdapter.createRewardRequest(session?.family?.id || '', profile.id, {
      title: rewardTitle,
      emoji: '🎁' // can use emoji from rewards catalog
    });

    setRedeemingId(null);
    if (res.ok) {
      alert(`¡Propuesta enviada con éxito! Dile a papá/mamá que apruebe: "${rewardTitle}"`);
      setShowRewards(false);
    } else {
      alert(`Error al proponer: ${res.error.message}`);
    }
  }

  // Find world parameters for the selected home world theme
  const activeWorldScore = useMemo(() => {
    const dim = selectedWorld.dimension;
    return scores[dim] ?? 0;
  }, [selectedWorld, scores]);

  const activeWorldPhase = useMemo(() => {
    return getWorldPhase(activeWorldScore);
  }, [activeWorldScore]);

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-dvh">
      <div className="w-6 h-6 border-2 border-stone-200 border-t-bloom-400 rounded-full animate-spin" />
    </div>
  );

  if (!session) return null;

  return (
    <div className={`min-h-dvh bg-gradient-to-b ${selectedWorld.bgGradient} transition-all duration-700 flex flex-col relative overflow-x-hidden pb-20`}>

      {/* Header */}
      <header className="px-5 pt-8 pb-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <ChildAvatar
            baseEmoji={profile?.avatar_base_emoji}
            accessory={profile?.avatar_accessory}
            size="md"
            className="shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
            onClick={() => setShowCustomization(true)}
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-widest font-body leading-none">
                {greeting}
              </p>
              <button
                onClick={async () => {
                  if (confirm('¿Quieres cerrar sesión?')) {
                    await signOut();
                    router.replace('/login');
                  }
                }}
                className="text-[10px] text-stone-400 hover:text-stone-600 bg-stone-100/80 hover:bg-stone-200/60 px-2 py-0.5 rounded-full transition-all cursor-pointer font-medium leading-none"
              >
                Salir
              </button>
            </div>
            <h1 className="font-display text-2xl text-stone-800 mt-1 flex items-center gap-1.5 leading-none">
              {profile?.display_name}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCustomization(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/95 border border-stone-100 hover:bg-white transition-colors shadow-soft cursor-pointer flex items-center gap-1"
          >
            🎨 Armario
          </button>
          <button
            onClick={() => setShowRewards(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/95 border border-stone-100 hover:bg-white transition-colors shadow-soft cursor-pointer flex items-center gap-1"
          >
            🎁 Canjear
          </button>
          <SparkBadge count={sparkBalance} size="md" />
        </div>
      </header>

      {/* Main View Port */}
      <main className="flex-1 px-4 max-w-lg mx-auto w-full flex flex-col z-10 justify-center">
        
        <AnimatePresence mode="wait">
          
          {/* TAB 1: HOGAR / SAFE SPACE */}
          {activeTab === 'hogar' && (
            <motion.div
              key="hogar"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-between flex-1 py-4"
            >
              {/* Checkin prompt if morning */}
              {showCheckinPrompt && (
                <div className="w-full mb-4">
                  <CheckinPromptCard
                    onComplete={() => {
                      if (display) setDialogue(getDialogue('checkin_response'));
                    }}
                  />
                </div>
              )}

              {/* World indicator */}
              <div className={`px-4 py-2 rounded-full border text-xs font-medium shadow-soft ${selectedWorld.accentBg} ${selectedWorld.textColor} flex items-center gap-2 mb-2 animate-fade-in`}>
                <span>{selectedWorld.emoji}</span>
                <span>{selectedWorld.name} ({activeWorldPhase.label} {activeWorldPhase.icon})</span>
              </div>

              {/* Ambient visual state description */}
              <p className="text-stone-400 text-center text-xs italic font-body max-w-xs mb-4">
                {activeWorldPhase.phase === 'seed' && 'El entorno se encuentra en calma, cuidando de una semilla.'}
                {activeWorldPhase.phase === 'sprout' && 'Pequeños brotes de naturaleza comienzan a asomar en los rincones.'}
                {activeWorldPhase.phase === 'bloom' && '¡El entorno irradia flores y una luz vibrante debido a tu crecimiento!'}
              </p>

              {/* Companion blob widget */}
              {isVisible && display && (
                <div className="my-6">
                  <CompanionWidget
                    display={display}
                    dialogue={dialogue}
                    size="xl"
                    onTap={() => setDialogue(getDialogue('free_interaction' as any))}
                  />
                </div>
              )}

              {/* Memory Scroll Button */}
              <button
                onClick={() => setShowMemoriesModal(true)}
                className="mt-6 text-xs font-semibold px-4 py-2.5 rounded-full bg-white/80 border border-stone-200 hover:bg-white text-stone-600 transition-colors shadow-soft flex items-center gap-1.5 cursor-pointer"
              >
                📖 Libro de Recuerdos e Insignias
              </button>
            </motion.div>
          )}

          {/* TAB 2: MUNDOS */}
          {activeTab === 'mundos' && (
            <motion.div
              key="mundos"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 py-4 w-full"
            >
              <div className="text-center mb-2">
                <h2 className="text-xl font-display text-stone-850">Mundos Emocionales</h2>
                <p className="text-xs text-stone-400 font-body mt-1">
                  Tu evolución real hace crecer y florecer cada zona
                </p>
              </div>

              <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                {WORLD_THEMES.map(world => {
                  const score = scores[world.dimension] ?? 0;
                  const phase = getWorldPhase(score);
                  const isSelected = selectedWorld.id === world.id;

                  return (
                    <button
                      key={world.id}
                      onClick={() => setSelectedWorld(world)}
                      className={`
                        w-full text-left p-4 rounded-3xl border transition-all duration-300 shadow-sm flex items-center justify-between gap-4 cursor-pointer
                        ${isSelected
                          ? 'bg-white border-stone-300 ring-2 ring-stone-200 scale-[1.01]'
                          : 'bg-white/60 border-stone-150 hover:bg-white/90 hover:scale-[1.005]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{world.emoji}</span>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-stone-700">{world.name}</span>
                          <span className="text-xs text-stone-400 mt-0.5 max-w-[240px] leading-relaxed">
                            {world.description}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-[10px] text-stone-400 uppercase tracking-widest leading-none">
                          Estado
                        </span>
                        <span className="text-xs font-semibold text-stone-600 mt-1 flex items-center gap-1">
                          {phase.label} {phase.icon}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* TAB 3: AVENTURAS Y RUTINAS */}
          {activeTab === 'adventuras' && (
            <motion.div
              key="adventuras"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 py-4 w-full"
            >
              <div className="text-center mb-1">
                <h2 className="text-xl font-display text-stone-850">Aventuras y Rutinas</h2>
                <p className="text-xs text-stone-400 font-body mt-1">
                  Pasos significativos acompañados de tu compañero
                </p>
              </div>

              {/* Active adventure step */}
              <ActiveGoalStep
                onComplete={() => {
                  if (display) setDialogue(getDialogue('goal_step_complete'));
                }}
              />

              {/* Today's routines */}
              <RoutinesToday
                onComplete={() => {
                  if (display) setDialogue(getDialogue('routine_complete'));
                }}
              />
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Floating Bottom Nav */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-3 py-2 rounded-full border border-stone-200/80 shadow-card flex gap-1 z-30 max-w-sm w-[90%] justify-around">
        {[
          { tab: 'hogar', label: 'Hogar', icon: '🏠' },
          { tab: 'mundos', label: 'Mundos', icon: '🗺️' },
          { tab: 'adventuras', label: 'Aventuras', icon: '🎒' }
        ].map(item => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab as any)}
              className={`
                px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer
                ${isActive
                  ? 'bg-stone-850 text-white shadow-soft scale-105'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                }
              `}
            >
              <span>{item.icon}</span>
              <span className={isActive ? 'inline' : 'hidden md:inline'}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* MEMORY & BADGES MODAL */}
      <AnimatePresence>
        {showMemoriesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMemoriesModal(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-white rounded-3xl p-6 shadow-card border border-stone-100 max-w-md w-full flex flex-col gap-4 max-h-[85dvh] overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-display text-xl text-stone-800 flex items-center gap-2">
                  <span>📖</span> Libro de Recuerdos
                </h3>
                <button
                  onClick={() => setShowMemoriesModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-lg leading-none cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Inner Tabs: 'recuerdos' | 'insignias' */}
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex flex-col gap-4 overflow-y-auto pr-1 flex-1">
                  
                  {/* Badges Gallery Section */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      Insignias de Valores ({badges.length})
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-2.5">
                      {badges.map(badge => {
                        const dim = WORLD_THEMES.find(w => w.dimension === badge.dimension_id);
                        const tierColor =
                          badge.badge_tier === 'gold' ? 'bg-yellow-50 border-yellow-200 text-yellow-600' :
                          badge.badge_tier === 'silver' ? 'bg-slate-50 border-slate-200 text-slate-500' :
                          'bg-amber-50 border-amber-200 text-amber-600';
                        return (
                          <div
                            key={badge.id}
                            className={`p-2.5 rounded-2xl border flex flex-col items-center text-center shadow-soft group relative cursor-help ${tierColor}`}
                            title={badge.parent_note || 'Otorgada por mamá/papá'}
                          >
                            <span className="text-xl">{dim?.emoji || '🎖️'}</span>
                            <span className="text-[10px] font-bold mt-1 leading-tight">
                              {dim?.name.replace('Valle de los ', '').replace('Lago de la ', '').replace('Bosque de la ', '').replace('Montañas del ', '').replace('Reino de la ', '') || 'Badge'}
                            </span>
                            <span className="text-[9px] uppercase tracking-widest opacity-70 mt-0.5">
                              {badge.badge_tier}
                            </span>
                          </div>
                        );
                      })}

                      {badges.length === 0 && (
                        <p className="col-span-3 text-stone-400 text-center py-4 text-xs italic">
                          Aún no tienes insignias. ¡Esfuérzate para que tus padres te otorguen una!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Memories Timeline Section */}
                  <div className="flex flex-col gap-2 mt-4">
                    <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      Línea del Tiempo
                    </h4>

                    <div className="flex flex-col gap-3 border-l border-stone-150 ml-2 pl-4">
                      {memories.map(mem => (
                        <div key={mem.id} className="relative text-xs">
                          {/* Circle indicator */}
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-white" />
                          <span className="text-[10px] text-stone-400 leading-none">
                            {new Date(mem.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>
                          
                          <p className="font-semibold text-stone-700 mt-0.5">
                            {mem.memory_type === 'routine_streak_milestone' && `Completada rutina de ${mem.metadata.routine_title}`}
                            {mem.memory_type === 'difficult_checkin' && `Superaste un momento difícil`}
                            {mem.memory_type === 'adventure_complete' && `Completada aventura: ${mem.metadata.adventure_title}`}
                            {mem.memory_type === 'parent_badge_award' && `Recibiste insignia de ${mem.metadata.badge_name}`}
                          </p>

                          {mem.memory_type === 'difficult_checkin' && mem.metadata.emotion_word && (
                            <p className="text-stone-400 text-[10px] mt-0.5">
                              Identificaste el sentimiento de &quot;{mem.metadata.emotion_word}&quot;
                            </p>
                          )}
                        </div>
                      ))}

                      {memories.length === 0 && (
                        <p className="text-stone-400 text-left py-4 text-xs italic">
                          No hay recuerdos grabados aún. Completar rutinas y registrar emociones creará recuerdos.
                        </p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                      className="text-stone-400 hover:text-stone-600 text-lg leading-none cursor-pointer"
                    >
                      ×
                    </button>
                  </div>

                  <p className="text-xs text-stone-500 font-body">
                    Escribe qué premio te gustaría pedir a tus padres y elige un emoji.
                  </p>

                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-body">
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

                    <div className="flex flex-col gap-1.5 font-body">
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
                    <p className="text-xs text-red-500 text-center font-body">{requestError}</p>
                  )}

                  <div className="flex gap-2.5 mt-2 font-body">
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
                      className="text-stone-400 hover:text-stone-600 text-lg leading-none cursor-pointer"
                    >
                      ×
                    </button>
                  </div>

                  <p className="text-xs text-stone-500 font-body">
                    Usa tus sparks ✦ ganadas con esfuerzo para canjear recompensas.
                  </p>

                  <div className="flex flex-col gap-2.5 max-h-[200px] overflow-y-auto pr-1">
                    {rewards.map(reward => {
                      const canAfford = sparkBalance >= reward.cost;
                      const isRedeeming = redeemingId === reward.id;
                      const lastRedeemTime = lastRedemptions[reward.id];
                      const cooldown = getCooldownStatus(reward, lastRedeemTime);

                      return (
                        <div
                          key={reward.id}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-200 shadow-sm ${
                            cooldown.isLocked
                              ? 'bg-stone-100/50 border-stone-200/80 grayscale opacity-70'
                              : 'bg-stone-50 border-stone-200'
                          }`}
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
                            disabled={!canAfford || isRedeeming || cooldown.isLocked}
                            onClick={() => handleRedeem(reward.id, reward.title, reward.cost)}
                            className={`
                              text-xs font-bold px-3 py-2 rounded-xl transition-all duration-200
                              ${isRedeeming
                                ? 'bg-stone-200 text-stone-400 cursor-wait'
                                : cooldown.isLocked
                                ? 'bg-stone-100 text-stone-450 border border-stone-200 cursor-not-allowed'
                                : canAfford
                                ? 'bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.96] cursor-pointer shadow-soft'
                                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                              }
                            `}
                          >
                            {isRedeeming
                              ? 'Canjeando...'
                              : cooldown.isLocked
                              ? `⌛ ${cooldown.text}`
                              : canAfford
                              ? 'Canjear'
                              : 'Faltan sparks'}
                          </button>
                        </div>
                      );
                    })}

                    {rewards.length === 0 && (
                      <p className="text-stone-400 text-center py-8 text-sm italic font-body">
                        Habla con tus padres para añadir recompensas a tu catálogo.
                      </p>
                    )}
                  </div>

                  {/* PENDING REQUESTS */}
                  {rewardRequests.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-2 border-t border-stone-100 pt-3">
                      <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider font-body">
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
                    className="w-full text-xs font-bold py-2.5 rounded-2xl bg-bloom-50 text-bloom-600 border border-bloom-100 hover:bg-bloom-100 transition-colors shadow-soft mt-1.5 flex items-center justify-center gap-1.5 cursor-pointer font-body"
                  >
                    <span>💡</span> Proponer un premio
                  </button>

                  <div className="text-center mt-2 border-t border-stone-100 pt-2">
                    <span className="text-xs text-stone-400 font-body">
                      Tu saldo actual: <strong className="text-amber-500">{sparkBalance} Sparks ✦</strong>
                    </span>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CustomizationModal
        isOpen={showCustomization}
        onClose={() => setShowCustomization(false)}
        sparkBalance={sparkBalance}
        onPurchaseSuccess={() => {}} // SparkProvider automatically syncs spark balances in realtime
      />
    </div>
  );
}
