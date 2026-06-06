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

export default function HomePage() {
  const { profile } = useAuth();
  const { display, getDialogue, setAppearanceContext, isVisible } = useCompanion();
  const { shouldPrompt } = useEmotional();
  const [dialogue, setDialogue] = useState(() =>
    display ? getDialogue('greeting') : undefined
  );
  const [sparkBalance] = useState(12); // TODO: wire SparkProvider

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

  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col">

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
        <SparkBadge count={sparkBalance} size="md" />
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
    </div>
  );
}
