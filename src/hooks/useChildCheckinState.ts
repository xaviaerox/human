'use client';

import { useState, useMemo, useEffect } from 'react';
import { getSuggestedWords } from '@/lib/emotional/EmotionModel';
import type { DialogueLine, DialogueTrigger, EmotionState, ContextType, CheckinPromptSource, CompanionInteractionType } from '@/types';

interface CompanionDisplay {
  name: string;
}

export function useChildCheckinState(
  activeTab: string,
  display: CompanionDisplay | null,
  getDialogue: (trigger: DialogueTrigger, emotion?: EmotionState) => DialogueLine,
  submitCheckin: (
    emotion: EmotionState,
    context_type?: ContextType,
    context_id?: string,
    note?: string,
    prompted_by?: CheckinPromptSource
  ) => Promise<unknown>,
  interact: (type: CompanionInteractionType, data?: Record<string, unknown>) => Promise<unknown>,
  lastCheckin: { occurred_at: string } | null
) {
  const [checkinStep, setCheckinStep] = useState<'energy' | 'valence' | 'word' | 'note' | 'done'>('energy');
  const [checkinEnergy, setCheckinEnergy] = useState<number | null>(null);
  const [checkinValence, setCheckinValence] = useState<number | null>(null);
  const [checkinWord, setCheckinWord] = useState('');
  const [checkinCustomWord, setCheckinCustomWord] = useState('');
  const [checkinNote, setCheckinNote] = useState('');
  const [checkinDialogue, setCheckinDialogue] = useState<DialogueLine | undefined>(undefined);

  const checkinSuggestedWords = useMemo(() => {
    return checkinEnergy !== null && checkinValence !== null
      ? getSuggestedWords({
          energy_level: checkinEnergy as 1 | 2 | 3 | 4 | 5,
          valence: checkinValence as 1 | 2 | 3 | 4 | 5,
        })
      : [];
  }, [checkinEnergy, checkinValence]);

  const lastCheckinTime = lastCheckin ? new Date(lastCheckin.occurred_at).getTime() : 0;
  const [now] = useState(() => Date.now());
  const isCooldown = now - lastCheckinTime < 8 * 60 * 60 * 1000;

  useEffect(() => {
    if (activeTab === 'checkin') {
      queueMicrotask(() => {
        setCheckinStep('energy');
        setCheckinEnergy(null);
        setCheckinValence(null);
        setCheckinWord('');
        setCheckinCustomWord('');
        setCheckinNote('');
        if (display) {
          setCheckinDialogue(getDialogue('checkin_prompt'));
        }
      });
    }
  }, [activeTab, display, getDialogue]);

  async function handleCompleteCheckin() {
    if (checkinEnergy === null || checkinValence === null) return;

    const emotion = {
      energy_level: checkinEnergy,
      valence: checkinValence,
      emotion_word: checkinWord || checkinCustomWord || undefined,
    };

    await submitCheckin(emotion as EmotionState, 'free', undefined, checkinNote || undefined, 'child');
    await interact('emotional_checkin', { energy: checkinEnergy, valence: checkinValence, word: emotion.emotion_word });

    if (display) {
      setCheckinDialogue(getDialogue('checkin_response', emotion as EmotionState));
    }

    setCheckinStep('done');
  }

  return {
    checkinStep,
    setCheckinStep,
    checkinEnergy,
    setCheckinEnergy,
    checkinValence,
    setCheckinValence,
    checkinWord,
    setCheckinWord,
    checkinCustomWord,
    setCheckinCustomWord,
    checkinNote,
    setCheckinNote,
    checkinDialogue,
    setCheckinDialogue,
    checkinSuggestedWords,
    isCooldown,
    handleCompleteCheckin,
    handleCheckinSubmit: handleCompleteCheckin,
  };
}
