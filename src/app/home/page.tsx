'use client';

import { useState } from 'react';
import { CompanionWidget } from '@/components/companion/CompanionWidget';
import { RoutinesToday } from '@/components/routines/RoutinesToday';
import { ActiveGoalStep } from '@/components/goals/ActiveGoalStep';
import { SparkBadge } from '@/components/ui/SparkBadge';
import { CheckinPromptCard } from '@/components/emotional/CheckinPromptCard';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { ChildAvatar } from '@/components/ui/ChildAvatar';
import { Button } from '@/components/ui/Button';

const CustomizationModal = dynamic(
  () => import('@/components/companion/CustomizationModal').then((mod) => mod.CustomizationModal),
  { ssr: false }
);

const CompanionChatModal = dynamic(
  () => import('@/components/companion/CompanionChatModal').then((mod) => mod.CompanionChatModal),
  { ssr: false }
);

const CalmModeModal = dynamic(
  () => import('@/components/emotional/CalmModeModal').then((mod) => mod.CalmModeModal),
  { ssr: false }
);

const SparkCelebrationOverlay = dynamic(
  () => import('@/components/ui/SparkCelebrationOverlay').then((mod) => mod.SparkCelebrationOverlay),
  { ssr: false }
);

const BadgeCelebrationOverlay = dynamic(
  () => import('@/components/ui/BadgeCelebrationOverlay').then((mod) => mod.BadgeCelebrationOverlay),
  { ssr: false }
);

const ChildFeedbackModal = dynamic(
  () => import('@/components/feedback/ChildFeedbackModal').then((mod) => mod.ChildFeedbackModal),
  { ssr: false }
);

const StoryReaderModal = dynamic(
  () => import('@/components/companion/StoryReaderModal').then((mod) => mod.StoryReaderModal),
  { ssr: false }
);

const GoalProposalModal = dynamic(
  () => import('@/components/goals/GoalProposalModal').then((mod) => mod.GoalProposalModal),
  { ssr: false }
);

import { generateMicroStory, type MicroStory } from '@/lib/stories/StoryGenerator';
import { cn } from '@/lib/utils';
import { useHomeState } from '@/hooks/useHomeState';
import type { Reward } from '@/types';
import { WORLD_THEMES } from '@/components/worlds/worldThemes';
import { WorldAmbientVisuals } from '@/components/worlds/WorldAmbientVisuals';


const ENERGY_OPTIONS = [
  { value: 1, emoji: '😴', label: 'Muy bajo' },
  { value: 2, emoji: '😌', label: 'Bajo' },
  { value: 3, emoji: '🙂', label: 'Normal' },
  { value: 4, emoji: '😊', label: 'Alto' },
  { value: 5, emoji: '⚡', label: 'Muy alto' },
];

const VALENCE_OPTIONS = [
  { value: 1, emoji: '😢', label: 'Muy mal' },
  { value: 2, emoji: '😕', label: 'Mal' },
  { value: 3, emoji: '😐', label: 'Regular' },
  { value: 4, emoji: '😊', label: 'Bien' },
  { value: 5, emoji: '😄', label: 'Muy bien' },
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
  if (score >= 100) return { phase: 'bloom', label: 'Esplendor', icon: '✿' };
  if (score >= 31) return { phase: 'sprout', label: 'Brote', icon: '✣' };
  return { phase: 'seed', label: 'Semilla', icon: '○' };
}

function getWorldProgress(score: number): { percent: number; nextLabel: string } {
  if (score >= 100) {
    return { percent: 100, nextLabel: 'Esplendor máximo' };
  }
  if (score >= 31) {
    const percent = Math.round(((score - 31) / 69) * 100);
    return { percent, nextLabel: 'para Esplendor' };
  }
  const percent = Math.round((score / 30) * 100);
  return { percent, nextLabel: 'para Brote' };
}



export default function HomePage() {
  const {
    router,
    session,
    authLoading,
    signOut,
    profile,
    display,
    getDialogue,
    isVisible,
    memories,
    interact,
    scores,
    badges,
    sparkBalance,
    recentCheckins,
    dialogue,
    setDialogue,
    activeTab,
    setActiveTab,
    selectedWorld,
    setSelectedWorld,
    showRewards,
    setShowRewards,
    showCustomization,
    setShowCustomization,
    showMemoriesModal,
    setShowMemoriesModal,
    showChatModal,
    setShowChatModal,
    showWorldsModal,
    setShowWorldsModal,
    showCalmModal,
    setShowCalmModal,
    silentMode,
    toggleSilentMode,
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
    isProposingGoal,
    setIsProposingGoal,
    goalPropTitle,
    setGoalPropTitle,
    goalPropWhy,
    setGoalPropWhy,
    goalPropStep1,
    setGoalPropStep1,
    goalPropStep2,
    setGoalPropStep2,
    goalPropStep3,
    setGoalPropStep3,
    goalPropSubmitting,
    goalPropError,
    setGoalPropError,
    isGeneratingAIDecompose,
    handleAIDecomposeInModal,
    handleProposeGoalSubmit,
    handleCompanionTap,
    checkinStep,
    setCheckinStep,
    setCheckinEnergy,
    setCheckinValence,
    setCheckinWord,
    checkinCustomWord,
    setCheckinCustomWord,
    checkinNote,
    setCheckinNote,
    checkinDialogue,
    setCheckinDialogue,
    checkinSuggestedWords,
    isCooldown,
    handleCheckinSubmit,
    redeemingId,
    rewards,
    lastRedemptions,
    rewardRequests,
    isRequesting,
    setIsRequesting,
    requestTitle,
    setRequestTitle,
    requestEmoji,
    setRequestEmoji,
    requestError,
    setRequestError,
    requestSubmitting,
    handleCreateRewardRequest,
    activeWorldScore,
    activeWorldPhase,
    hasCompletedGoalToday,
    showCheckinPrompt,
    greeting,
    handleRedeem,
  } = useHomeState();

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [activeStory, setActiveStory] = useState<MicroStory | null>(null);

  const handleOpenStory = () => {
    const story = generateMicroStory({
      childName: profile?.display_name || 'amigo',
      companionName: display?.name || 'Lumi',
      worldName: selectedWorld.name,
      recentEmotion: recentCheckins[0]?.emotion_word || 'tranquilo',
      valueDimensionLabel: 'Constancia',
    });
    setActiveStory(story);
    setShowStoryModal(true);
  };

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
        <div className="flex flex-wrap items-center gap-1.5 justify-end max-w-md">
          <button
            onClick={handleOpenStory}
            className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-200/70 hover:bg-amber-500/20 transition-all shadow-soft cursor-pointer flex items-center gap-1"
          >
            📖 Cuento
          </button>
          <button
            onClick={() => setShowCalmModal(true)}
            className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200/60 hover:bg-teal-500/20 transition-all shadow-soft cursor-pointer flex items-center gap-1"
          >
            🌸 Respira
          </button>
          <button
            onClick={() => setIsProposingGoal(true)}
            className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-300/80 hover:bg-amber-500/25 transition-all shadow-soft cursor-pointer flex items-center gap-1"
          >
            💡 Sugerir Meta
          </button>
          <button
            onClick={() => setShowCustomization(true)}
            className="text-xs font-semibold px-2 py-1 rounded-full bg-white/90 border border-stone-200 text-stone-700 hover:bg-white transition-colors shadow-soft cursor-pointer"
            title="Armario"
          >
            🎨 Armario
          </button>
          <button
            onClick={() => setShowRewards(true)}
            className="text-xs font-semibold px-2 py-1 rounded-full bg-white/90 border border-stone-200 text-stone-700 hover:bg-white transition-colors shadow-soft cursor-pointer"
            title="Canjear Recompensas"
          >
            🎁 Canjear
          </button>
          <button
            onClick={toggleSilentMode}
            className={`p-1.5 rounded-full border transition-all shadow-soft cursor-pointer ${
              silentMode
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white/90 text-stone-600 border-stone-200 hover:bg-white'
            }`}
            title={silentMode ? 'Animaciones desactivadas (modo calma)' : 'Activar modo menos animaciones'}
          >
            {silentMode ? '🌙' : '✨'}
          </button>
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="p-1.5 rounded-full bg-rose-500/10 text-rose-700 border border-rose-200 hover:bg-rose-500/20 transition-colors shadow-soft cursor-pointer"
            title="Sugerencia o Ticket"
          >
            💬
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

              {/* World indicator (button to change world) */}
              <button
                onClick={() => setShowWorldsModal(true)}
                className={`px-4 py-2 rounded-full border text-xs font-semibold shadow-soft ${selectedWorld.accentBg} ${selectedWorld.textColor} flex items-center gap-2 mb-2 hover:scale-[1.03] active:scale-95 transition-all cursor-pointer`}
              >
                <span>{selectedWorld.emoji}</span>
                <span>Mundo: {selectedWorld.name} ({activeWorldPhase.label} {activeWorldPhase.icon}) ▾</span>
              </button>

              {/* World Progress Bar */}
              {(() => {
                const { percent, nextLabel } = getWorldProgress(activeWorldScore);
                return (
                  <div className="w-full max-w-xs px-4 py-2 bg-white/60 dark:bg-stone-900/40 rounded-2xl border border-stone-200/50 mb-2 flex flex-col gap-1.5 shadow-sm">
                    <div className="flex justify-between text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                      <span>Crecimiento del Mundo</span>
                      <span>{percent}% {nextLabel}</span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 dark:bg-stone-850 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 dark:bg-emerald-500 rounded-full transition-all duration-1000"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* All Done / Todo Listo Message */}
              {!showCheckinPrompt && allRoutinesDone && hasCompletedGoalToday && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-xs px-5 py-4 bg-emerald-50/75 dark:bg-emerald-950/20 border border-emerald-250/30 rounded-[28px] text-center shadow-soft mb-2"
                >
                  <p className="text-xl mb-1">🌟</p>
                  <h4 className="font-display text-xs font-bold text-emerald-850 dark:text-emerald-300">¡Todo listo por hoy!</h4>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 font-body mt-1 leading-relaxed">
                    Has hecho un trabajo increíble hoy. Relájate, disfruta de tu mundo y platica libremente con {display?.name}.
                  </p>
                </motion.div>
              )}

              {/* Ambient visual state description */}
              <p className="text-stone-400 text-center text-xs italic font-body max-w-xs mb-2">
                {activeWorldPhase.phase === 'seed' && 'El entorno se encuentra en calma, cuidando de una semilla.'}
                {activeWorldPhase.phase === 'sprout' && 'Pequeños brotes de naturaleza comienzan a asomar en los rincones.'}
                {activeWorldPhase.phase === 'bloom' && '¡El entorno irradia flores y una luz vibrante debido a tu crecimiento!'}
              </p>

              {/* Viewport container representing the magical terrarium/world */}
              <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center my-4 rounded-[40px] border border-stone-250/20 bg-white/45 dark:bg-stone-900/10 backdrop-blur-md shadow-card transition-all duration-700">
                {/* Background wrapper (clipping landscapes inside rounded border) */}
                <div className="absolute inset-0 overflow-hidden rounded-[40px] z-0">
                  <WorldAmbientVisuals worldId={selectedWorld.id} phase={activeWorldPhase.phase} silentMode={silentMode} />
                </div>

                {/* Companion widget (Foreground, allows overflow pop-out) */}
                {isVisible && display && (
                  <div className="z-10 scale-[1.08] relative">
                    <CompanionWidget
                      display={display}
                      dialogue={dialogue}
                      size="lg"
                      onTap={handleCompanionTap}
                      worldId={selectedWorld.id}
                      silentMode={silentMode}
                    />
                  </div>
                )}
              </div>

              {/* Actions row */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowMemoriesModal(true)}
                  className="text-xs font-semibold px-4 py-2.5 rounded-full bg-white/80 border border-stone-205 hover:bg-white text-stone-600 transition-colors shadow-soft flex items-center gap-1.5 cursor-pointer"
                >
                  📖 Recuerdos e Insignias
                </button>
                <button
                  onClick={() => setShowChatModal(true)}
                  className="text-xs font-semibold px-4 py-2.5 rounded-full bg-bloom-50 hover:bg-bloom-100 border border-bloom-200 text-bloom-600 transition-all shadow-soft flex items-center gap-1.5 cursor-pointer hover:scale-[1.03]"
                >
                  💬 Hablar con {display?.name ?? 'Compañero'}
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 2: RUTINAS */}
          {activeTab === 'routines' && (
            <motion.div
              key="routines"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 py-4 w-full"
            >
              <div className="text-center mb-1">
                <h2 className="text-xl font-display text-stone-850">Mis Rutinas</h2>
                <p className="text-xs text-stone-400 font-body mt-1">
                  Pasos diarios para cultivar hábitos positivos
                </p>
              </div>

              {/* Today's routines */}
              <RoutinesToday
                onComplete={(routine, sparks) => {
                  checkRoutinesStatus();
                  if (display) setDialogue(getDialogue('routine_complete'));
                  if (sparks && sparks > 0) {
                    setCurrentCelebration({
                      id: Math.random().toString(),
                      delta: sparks,
                      note: `¡Completaste la rutina: ${routine.title}! ✨`
                    });
                  }
                }}
              />
            </motion.div>
          )}

          {/* TAB 3: OBJETIVO (AVENTURAS) */}
          {activeTab === 'goals' && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 py-4 w-full"
            >
              <div className="text-center mb-1">
                <h2 className="text-xl font-display text-stone-850">Aventuras</h2>
                <p className="text-xs text-stone-400 font-body mt-1">
                  Pasos significativos acompañados de tu compañero
                </p>
              </div>

              {activeGoals.length > 0 ? (
                <div className="flex flex-col gap-4 w-full">
                  {activeGoals.map(g => (
                    <ActiveGoalStep
                      key={g.id}
                      goal={g}
                      onComplete={(task, sparks) => {
                        fetchActiveGoal();
                        if (display) setDialogue(getDialogue('goal_step_complete'));
                        if (sparks && sparks > 0) {
                          setCurrentCelebration({
                            id: Math.random().toString(),
                            delta: sparks,
                            note: `¡Completaste el capítulo: ${task.title}! ✦`
                          });
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-6 border border-stone-150 shadow-soft text-center flex flex-col gap-4 max-w-sm mx-auto w-full mt-2">
                  <span className="text-3xl">🗺️</span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-display font-semibold text-stone-700 text-base">¿Tienes una aventura en mente?</h3>
                    <p className="text-xs text-stone-450 font-body leading-relaxed">
                      Propón una nueva aventura a tus papás para que la aprueben y podáis crear los capítulos juntos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProposingGoal(true);
                      setGoalPropTitle('');
                      setGoalPropWhy('');
                      setGoalPropStep1('');
                      setGoalPropStep2('');
                      setGoalPropStep3('');
                      setGoalPropError('');
                    }}
                    className="w-full text-xs font-bold py-2.5 rounded-2xl bg-bloom-50 text-bloom-600 border border-bloom-100 hover:bg-bloom-100 transition-colors shadow-soft flex items-center justify-center gap-1.5 cursor-pointer font-body"
                  >
                    <span>◈</span> Proponer una aventura
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: CÓMO ESTOY (CHECK-IN) */}
          {activeTab === 'checkin' && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4 py-4 w-full"
            >
              <div className="text-center mb-1">
                <h2 className="text-xl font-display text-stone-850">¿Cómo estoy?</h2>
                <p className="text-xs text-stone-400 font-body mt-1">
                  Reflexiona sobre tus sentimientos y compártelo con tu compañero
                </p>
              </div>

              {/* Cooldown Warning */}
              {checkinStep !== 'done' && isCooldown && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-3xl flex items-start gap-2.5 text-xs text-amber-800 font-medium leading-relaxed animate-fade-in shadow-soft">
                  <span className="text-sm">✨</span>
                  <p>
                    Puedes registrar cómo te sientes en cualquier momento, pero solo ganarás estrellas y afecto con tu compañero una vez cada 8 horas.
                  </p>
                </div>
              )}

              {/* Progress bar */}
              {checkinStep !== 'done' && (
                <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-lavender-400 rounded-full transition-all duration-500"
                    style={{ width: `${(['energy', 'valence', 'word', 'note', 'done'].indexOf(checkinStep) / 4) * 100}%` }}
                  />
                </div>
              )}

              {/* Companion Widget (inside check-in) */}
              {display && checkinStep !== 'done' && (
                <div className="flex justify-center my-4 animate-fade-in">
                  <CompanionWidget
                    display={display}
                    dialogue={checkinStep === 'energy' ? checkinDialogue : undefined}
                    size="md"
                    worldId={selectedWorld.id}
                    silentMode={silentMode}
                  />
                </div>
              )}

              {/* Steps container with page transitions */}
              <div className="relative w-full min-h-[220px]">
                <AnimatePresence mode="wait">
                  {/* Step 1: Energy */}
                  {checkinStep === 'energy' && (
                    <motion.div
                      key="step-energy"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-4 w-full"
                    >
                      <p className="font-display text-sm font-bold text-stone-500 uppercase tracking-wider text-center">
                        Paso 1 de 4: Tu Energía
                      </p>
                      <p className="font-display text-lg text-stone-700 text-center font-bold">
                        ¿Cuánta energía tienes ahora?
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {ENERGY_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setCheckinEnergy(opt.value);
                              setCheckinStep('valence');
                              if (display) {
                                if (opt.value <= 2) {
                                  setCheckinDialogue({
                                    text: `Entiendo, a veces tenemos las pilas bajas... 🔋 ¿Cómo te sientes por dentro?`,
                                    durationMs: 5000,
                                    animationCue: 'breathe'
                                  });
                                } else {
                                  setCheckinDialogue({
                                    text: `¡Se nota esa energía! ⚡ ¿Cómo te sientes por dentro?`,
                                    durationMs: 5000,
                                    animationCue: 'bounce'
                                  });
                                }
                              }
                            }}
                            className={cn(
                              'flex flex-col items-center gap-1 py-4 rounded-2xl border cursor-pointer',
                              'bg-white border-stone-200 transition-all duration-200',
                              'hover:border-lavender-300 hover:bg-lavender-50',
                              'active:scale-95'
                            )}
                            aria-label={opt.label}
                          >
                            <span className="text-xl">{opt.emoji}</span>
                            <span className="text-[9px] text-stone-400 font-body text-center">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Valence */}
                  {checkinStep === 'valence' && (
                    <motion.div
                      key="step-valence"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-4 w-full"
                    >
                      <p className="font-display text-sm font-bold text-stone-500 uppercase tracking-wider text-center">
                        Paso 2 de 4: Tu Estado de Ánimo
                      </p>
                      <p className="font-display text-lg text-stone-700 text-center font-bold">
                        ¿Cómo te sientes por dentro?
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {VALENCE_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setCheckinValence(opt.value);
                              setCheckinStep('word');
                              if (display) {
                                if (opt.value >= 4) {
                                  setCheckinDialogue({
                                    text: `¡Qué alegría sentir eso! 🌈 ¿Hay alguna palabra que lo describa?`,
                                    durationMs: 5000,
                                    animationCue: 'jump'
                                  });
                                } else if (opt.value <= 2) {
                                  setCheckinDialogue({
                                    text: `Aquí estoy para escucharte y acompañarte. 💖 ¿Hay alguna palabra para lo que sientes?`,
                                    durationMs: 5000,
                                    animationCue: 'wiggle'
                                  });
                                } else {
                                  setCheckinDialogue({
                                    text: `Ya veo. ☯ ¿Hay alguna palabra que describa este momento?`,
                                    durationMs: 5000,
                                    animationCue: 'idle'
                                  });
                                }
                              }
                            }}
                            className={cn(
                              'flex flex-col items-center gap-1 py-4 rounded-2xl border cursor-pointer',
                              'bg-white border-stone-200 transition-all duration-200',
                              'hover:border-lavender-300 hover:bg-lavender-50',
                              'active:scale-95'
                            )}
                            aria-label={opt.label}
                          >
                            <span className="text-xl">{opt.emoji}</span>
                            <span className="text-[9px] text-stone-400 font-body text-center">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Word */}
                  {checkinStep === 'word' && (
                    <motion.div
                      key="step-word"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-4 w-full"
                    >
                      <p className="font-display text-sm font-bold text-stone-500 uppercase tracking-wider text-center">
                        Paso 3 de 4: Poner una Palabra
                      </p>
                      <p className="font-display text-lg text-stone-700 text-center font-bold">
                        ¿Hay una palabra que lo describa?
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center max-h-[140px] overflow-y-auto py-1">
                        {checkinSuggestedWords.map(w => (
                          <button
                            key={w}
                            onClick={() => {
                              setCheckinWord(w);
                              setCheckinStep('note');
                              if (display) {
                                setCheckinDialogue({
                                  text: `"${w}", entiendo perfectamente. ¿Quieres escribirme algo más sobre eso? 📝`,
                                  durationMs: 5000,
                                  animationCue: 'idle'
                                });
                              }
                            }}
                            className={cn(
                              'px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer',
                              'bg-white border-stone-200 text-stone-700 hover:scale-[1.03]',
                              'hover:bg-lavender-50 hover:border-lavender-300 hover:text-lavender-700'
                            )}
                          >
                            {w}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2 mt-2">
                        <input
                          value={checkinCustomWord}
                          onChange={e => setCheckinCustomWord(e.target.value)}
                          placeholder="O escribe tu propia palabra..."
                          className="flex-1 px-4 py-2 rounded-2xl border border-stone-200 text-xs text-stone-750 bg-white focus:outline-none focus:ring-2 focus:ring-lavender-200"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && checkinCustomWord.trim()) {
                              const w = checkinCustomWord.trim();
                              setCheckinWord(w);
                              setCheckinStep('note');
                              if (display) {
                                setCheckinDialogue({
                                  text: `"${w}", entiendo. ¿Quieres contarme un poquito más sobre eso? 📝`,
                                  durationMs: 5000,
                                  animationCue: 'idle'
                                });
                              }
                            }
                          }}
                        />
                        {checkinCustomWord.trim() && (
                          <Button variant="secondary" size="sm" onClick={() => {
                            const w = checkinCustomWord.trim();
                            setCheckinWord(w);
                            setCheckinStep('note');
                            if (display) {
                              setCheckinDialogue({
                                text: `"${w}", entiendo. ¿Quieres contarme un poquito más sobre eso? 📝`,
                                durationMs: 5000,
                                animationCue: 'idle'
                              });
                            }
                          }}>
                            OK
                          </Button>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setCheckinWord('');
                          setCheckinStep('note');
                          if (display) {
                            setCheckinDialogue({
                              text: `¡Está bien! ¿Quieres contarme algo más en una nota? 📝`,
                              durationMs: 5000,
                              animationCue: 'idle'
                            });
                          }
                        }}
                        className="text-xs text-stone-400 hover:text-stone-600 text-center cursor-pointer mt-1"
                      >
                        Saltar esta pregunta
                      </button>
                    </motion.div>
                  )}

                  {/* Step 4: Note */}
                  {checkinStep === 'note' && (
                    <motion.div
                      key="step-note"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-4 w-full"
                    >
                      <p className="font-display text-sm font-bold text-stone-500 uppercase tracking-wider text-center">
                        Paso 4 de 4: Nota opcional
                      </p>
                      <p className="font-display text-lg text-stone-700 text-center font-bold">
                        ¿Quieres contar algo más hoy?
                      </p>
                      <textarea
                        value={checkinNote}
                        onChange={e => setCheckinNote(e.target.value)}
                        placeholder="Lo que quieras... o nada, también está bien."
                        rows={3}
                        className={cn(
                          'w-full px-4 py-2.5 rounded-2xl border border-stone-200 bg-white',
                          'text-stone-700 text-xs leading-relaxed resize-none',
                          'focus:outline-none focus:ring-2 focus:ring-lavender-200',
                          'placeholder:text-stone-300'
                        )}
                      />
                      <Button size="lg" onClick={handleCheckinSubmit} className="w-full">
                        Listo
                      </Button>
                      <button
                        onClick={handleCheckinSubmit}
                        className="text-xs text-stone-400 hover:text-stone-600 text-center cursor-pointer"
                      >
                        Sin nota, guardar así
                      </button>
                    </motion.div>
                  )}

                  {/* Step 5: Done */}
                  {checkinStep === 'done' && (
                    <motion.div
                      key="step-done"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center gap-4 text-center py-4 w-full"
                    >
                      {display && (
                        <CompanionWidget
                          display={display}
                          dialogue={checkinDialogue}
                          size="lg"
                          worldId={selectedWorld.id}
                          silentMode={silentMode}
                        />
                      )}
                      <div className="flex flex-col gap-1.5 mt-2">
                        <p className="font-display text-xl text-stone-850 font-bold">
                          ¡Gracias por contármelo!
                        </p>
                        <p className="text-stone-500 text-xs font-body max-w-xs mx-auto leading-relaxed">
                          Conocerte mejor me ayuda a estar más cerca de ti y acompañarte en tu día.
                        </p>
                      </div>

                      <Button variant="secondary" size="md" className="mt-2" onClick={() => setActiveTab('hogar')}>
                        Volver a Inicio
                      </Button>

                      {/* Recent check-ins */}
                      {recentCheckins.length > 1 && (
                        <div className="flex gap-1.5 flex-wrap justify-center mt-3 max-w-xs mx-auto">
                          {recentCheckins.slice(1, 4).map(c => (
                            <span
                              key={c.id}
                              className="px-2.5 py-0.5 bg-stone-50 rounded-full text-[10px] text-stone-500 border border-stone-150 font-body"
                            >
                              {c.emotion_word ?? `${c.valence}/5`}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 px-4 py-2 z-30"
        aria-label="Navegación"
      >
        <div className="flex justify-around max-w-md mx-auto">
          {[
            { tab: 'hogar', label: 'Inicio', icon: '⌂' },
            { tab: 'routines', label: 'Rutinas', icon: '◎' },
            { tab: 'goals', label: 'Objetivo', icon: '◈' },
            { tab: 'checkin', label: 'Cómo estoy', icon: '♡' }
          ].map(item => {
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setActiveTab(item.tab as 'hogar' | 'routines' | 'goals' | 'checkin')}
                className={`
                  flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-all cursor-pointer
                  ${isActive
                    ? 'text-bloom-600 bg-bloom-50'
                    : 'text-stone-400 hover:text-stone-600'
                  }
                `}
              >
                <span className="text-lg" aria-hidden="true">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
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
                  <div className="flex flex-col gap-2.5">
                    <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      Insignias de Valores ({badges.length})
                    </h4>
                    
                    <div className="flex flex-col gap-2">
                      {badges.map(badge => {
                        const dim = WORLD_THEMES.find(w => w.dimension === badge.dimension_id);
                        const tierColor =
                          badge.badge_tier === 'gold' ? 'bg-yellow-50 border-yellow-200 text-yellow-600' :
                          badge.badge_tier === 'silver' ? 'bg-slate-50 border-slate-200 text-slate-500' :
                          'bg-amber-50 border-amber-200 text-amber-600';
                        return (
                          <div
                            key={badge.id}
                            className={`p-3 rounded-2xl border flex items-center gap-3 shadow-soft ${tierColor}`}
                          >
                            <span className="text-2xl">{dim?.emoji || '🎖️'}</span>
                            <div className="flex-1 text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold capitalize">
                                  {dim?.name.replace('Valle de los ', '').replace('Lago de la ', '').replace('Bosque de la ', '').replace('Montañas del ', '').replace('Reino de la ', '') || 'Insignia'}
                                </span>
                                <span className="text-[9px] uppercase tracking-widest opacity-70">
                                  {badge.badge_tier}
                                </span>
                              </div>
                              {badge.parent_note ? (
                                <p className="text-[11px] text-stone-600 font-medium italic mt-1 font-body leading-relaxed">
                                  &quot;{badge.parent_note}&quot;
                                </p>
                              ) : (
                                <p className="text-[10px] text-stone-400 italic mt-0.5">
                                  Otorgada con cariño por tus papás
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {badges.length === 0 && (
                        <p className="text-stone-400 text-center py-4 text-xs italic">
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
                          <span className="text-[10px] text-stone-400 leading-none font-body">
                            {new Date(mem.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </span>
                          
                          <div className="font-semibold text-stone-700 mt-0.5">
                            {mem.memory_type === 'routine_streak_milestone' && `Completada rutina de ${mem.metadata.routine_title}`}
                            {mem.memory_type === 'difficult_checkin' && `Superaste un momento difícil`}
                            {mem.memory_type === 'adventure_complete' && `Completada aventura: ${mem.metadata.adventure_title}`}
                            {mem.memory_type === 'parent_badge_award' && (
                              <>
                                <span>Recibiste insignia de {mem.metadata.badge_name}</span>
                                {mem.metadata.parent_note && (
                                  <p className="text-stone-500 font-medium italic mt-1 font-body text-[10px] pl-1.5 border-l-2 border-amber-200">
                                    &quot;{mem.metadata.parent_note}&quot;
                                  </p>
                                )}
                              </>
                            )}
                          </div>

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
                  onSubmit={handleCreateRewardRequest}
                  className="flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-xl text-stone-800 flex items-center gap-2">
                      <span>☆</span> Pedir Premio
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
                        Elige un icono
                      </span>
                      <div className="flex gap-2">
                        <span className="w-12 h-12 flex items-center justify-center text-2xl bg-stone-100 border border-stone-200 rounded-2xl">
                          {requestEmoji}
                        </span>
                        <div className="flex-1 flex flex-wrap gap-1 items-center bg-stone-50 p-2 rounded-2xl border border-stone-100 max-h-[80px] overflow-y-auto">
                          {['☆', '✧', '✦', '♡', '☼', '☾', '⚡', '☕', '⚙', '✈', '☘', '⚓', '♫', '✎', '✉'].map(item => (
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
                            onClick={() => handleRedeem(reward.id, reward.title, reward.cost, reward.emoji)}
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
                      setRequestEmoji('☆');
                      setRequestError('');
                    }}
                    className="w-full text-xs font-bold py-2.5 rounded-2xl bg-bloom-50 text-bloom-600 border border-bloom-100 hover:bg-bloom-100 transition-colors shadow-soft mt-1.5 flex items-center justify-center gap-1.5 cursor-pointer font-body"
                  >
                    <span>☆</span> Proponer un premio
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
 
      {/* PROPOSE GOAL MODAL */}
      <AnimatePresence>
        {isProposingGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProposingGoal(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />

            {/* Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative bg-white rounded-3xl p-6 shadow-card border border-stone-100 max-w-sm w-full flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
            >
              <form
                onSubmit={handleProposeGoalSubmit}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl text-stone-850 flex items-center gap-2">
                    <span>◈</span> Proponer Aventura
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsProposingGoal(false)}
                    className="text-stone-400 hover:text-stone-600 text-lg leading-none cursor-pointer"
                  >
                    ×
                  </button>
                </div>

                <p className="text-xs text-stone-500 font-body">
                  Escribe qué aventura te gustaría realizar y los pasos para lograrla.
                </p>

                {goalPropError && (
                  <div className="text-xs text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-100 font-body">
                    {goalPropError}
                  </div>
                )}

                <div className="flex flex-col gap-3 font-body">
                  <label className="flex flex-col gap-1 text-left">
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-body">
                      Nombre de la aventura *
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Aprender a ir en bici sin rueditas"
                      value={goalPropTitle}
                      onChange={e => setGoalPropTitle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-bloom-300 text-xs font-body text-stone-750"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-left">
                    <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-body">
                      ¿Por qué quieres lograr esto?
                    </span>
                    <textarea
                      placeholder="Ej. Para ir al parque pedaleando con mis amigos"
                      value={goalPropWhy}
                      onChange={e => setGoalPropWhy(e.target.value)}
                      rows={2}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-bloom-300 text-xs font-body resize-none text-stone-750"
                    />
                  </label>

                  <div className="flex flex-col gap-1.5 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider font-body">
                        Pasos sugeridos (Capítulos)
                      </span>
                      <button
                        type="button"
                        onClick={handleAIDecomposeInModal}
                        disabled={!goalPropTitle.trim() || isGeneratingAIDecompose}
                        className="text-[11px] text-teal-600 font-semibold hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        {isGeneratingAIDecompose ? 'Pensando pasos...' : '✨ Sugerir con Lumi'}
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Paso 1: Practicar equilibrio sentado (Fácil)"
                      value={goalPropStep1}
                      onChange={e => setGoalPropStep1(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-bloom-300 text-xs font-body text-stone-750"
                    />
                    <input
                      type="text"
                      placeholder="Paso 2: Pedalear con ayuda de un adulto (Medio)"
                      value={goalPropStep2}
                      onChange={e => setGoalPropStep2(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-bloom-300 text-xs font-body text-stone-750"
                    />
                    <input
                      type="text"
                      placeholder="Paso 3: Pedalear solo en línea recta (Desafío)"
                      value={goalPropStep3}
                      onChange={e => setGoalPropStep3(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-bloom-300 text-xs font-body text-stone-750"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 mt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsProposingGoal(false)}
                    className="flex-1 text-xs font-bold"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={goalPropSubmitting}
                    className="flex-1 text-xs font-bold bg-bloom-500 hover:bg-bloom-600 text-white shadow-soft"
                  >
                    Enviar Propuesta
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WORLDS MODAL */}
      <AnimatePresence>
        {showWorldsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWorldsModal(false)}
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
                  <span>🗺️</span> Mundos Emocionales
                </h3>
                <button
                  onClick={() => setShowWorldsModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-lg leading-none cursor-pointer"
                >
                  ×
                </button>
              </div>

              <p className="text-xs text-stone-500 font-body">
                Tu evolución real hace crecer y florecer cada zona. Elige qué mundo quieres visitar hoy:
              </p>

              <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                {WORLD_THEMES.map(world => {
                  const score = scores[world.dimension] ?? 0;
                  const phase = getWorldPhase(score);
                  const isSelected = selectedWorld.id === world.id;

                  return (
                    <button
                      key={world.id}
                      onClick={() => {
                        setSelectedWorld(world);
                        setShowWorldsModal(false);
                      }}
                      className={`
                        w-full text-left p-4 rounded-3xl border transition-all duration-300 shadow-sm flex items-center justify-between gap-4 cursor-pointer
                        ${isSelected
                          ? 'bg-stone-50 border-stone-300 ring-2 ring-stone-200 scale-[1.01]'
                          : 'bg-white border-stone-150 hover:bg-stone-50/55 hover:scale-[1.005]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-stone-200/50 shadow-inner flex-shrink-0">
                          <div className={`absolute inset-0 bg-gradient-to-b ${world.bgGradient}`} />
                          <div className="absolute inset-0 scale-[0.55] origin-bottom overflow-hidden">
                            <WorldAmbientVisuals worldId={world.id} phase={phase.phase} silentMode={silentMode} />
                          </div>
                          <span className="absolute bottom-0.5 right-0.5 text-xs bg-white/70 dark:bg-stone-900/70 rounded-full w-5 h-5 flex items-center justify-center shadow-soft">
                            {world.emoji}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-stone-700">{world.name}</span>
                          <span className="text-xs text-stone-400 mt-0.5 max-w-[180px] leading-relaxed">
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
          </div>
        )}
      </AnimatePresence>

      <CalmModeModal
        isOpen={showCalmModal}
        onClose={() => setShowCalmModal(false)}
        companionName={display?.name}
      />

      <CustomizationModal
        isOpen={showCustomization}
        onClose={() => setShowCustomization(false)}
        sparkBalance={sparkBalance}
        onPurchaseSuccess={() => {}} // SparkProvider automatically syncs spark balances in realtime
      />
      {/* COMPANION CHAT MODAL */}
      {display && (
        <CompanionChatModal
          isOpen={showChatModal}
          onClose={(lastReply) => {
            setShowChatModal(false);
            if (lastReply) {
              setDialogue({
                text: lastReply,
                animationCue: 'idle',
                durationMs: 4000
              });
            }
          }}
          display={display}
          childId={profile?.id}
          childName={profile?.display_name || 'amigo'}
          childScores={scores}
          activeGoal={activeGoal}
          activeGoals={activeGoals}
          nextTask={nextTask}
          recentMemories={memories}
          recentCheckins={recentCheckins}
          selectedWorldName={selectedWorld.name}
          activeWorldPhaseLabel={activeWorldPhase.label}
          onInteract={() => interact('free_interaction')}
        />
      )}

      {/* SPARK CELEBRATION OVERLAY */}
      {currentCelebration && (
        <SparkCelebrationOverlay
          delta={currentCelebration.delta}
          note={currentCelebration.note}
          onClose={() => setCurrentCelebration(null)}
        />
      )}

      {/* BADGE CELEBRATION OVERLAY */}
      {currentBadgeCelebration && (
        <BadgeCelebrationOverlay
          dimensionId={currentBadgeCelebration.dimensionId}
          tier={currentBadgeCelebration.tier}
          parentNote={currentBadgeCelebration.parentNote}
          companionName={display?.name}
          onClose={() => setCurrentBadgeCelebration(null)}
        />
      )}

      {/* CHILD FEEDBACK TICKET MODAL */}
      <ChildFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        childId={profile?.id}
        childName={profile?.display_name || 'amigo'}
      />

      {/* STORY READER MODAL */}
      <StoryReaderModal
        isOpen={showStoryModal}
        onClose={() => setShowStoryModal(false)}
        story={activeStory}
      />
      {/* Goal Proposal Modal */}
      <GoalProposalModal
        isOpen={isProposingGoal}
        onClose={() => setIsProposingGoal(false)}
        title={goalPropTitle}
        setTitle={setGoalPropTitle}
        why={goalPropWhy}
        setWhy={setGoalPropWhy}
        step1={goalPropStep1}
        setStep1={setGoalPropStep1}
        step2={goalPropStep2}
        setStep2={setGoalPropStep2}
        step3={goalPropStep3}
        setStep3={setGoalPropStep3}
        submitting={goalPropSubmitting}
        error={goalPropError}
        isGeneratingAI={isGeneratingAIDecompose}
        onAIDecompose={handleAIDecomposeInModal}
        onSubmit={handleProposeGoalSubmit}
      />
    </div>
  );
}
