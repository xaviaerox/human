// ============================================================
// MIRA — CompanionProvider
// ============================================================

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type { ICompanionAdapter } from './adapters/ICompanionAdapter';
import type { Companion, CompanionInteractionType, DialogueContext, DialogueLine } from '@/types';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  toDisplayState,
  shouldCompanionAppear,
  resolveTimeOfDay,
  type CompanionDisplayState,
  type AppearanceContext,
} from './CompanionEngine';
import { selectDialogue } from './dialogue/DialogueBank';

interface CompanionContextValue {
  companion: Companion | null;
  display: CompanionDisplayState | null;
  loading: boolean;
  isVisible: boolean;

  /** Create companion at onboarding */
  createCompanion: (name: string) => Promise<boolean>;

  /** Record an interaction (bonding update) */
  interact: (type: CompanionInteractionType, context?: Record<string, unknown>) => Promise<void>;

  /** Get a dialogue line for the current context */
  getDialogue: (trigger: DialogueContext['triggerType'], emotion?: DialogueContext['childEmotion']) => DialogueLine;

  /** Control companion visibility */
  setAppearanceContext: (ctx: AppearanceContext) => void;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

interface CompanionProviderProps {
  adapter: ICompanionAdapter;
  children: ReactNode;
}

export function CompanionProvider({ adapter, children }: CompanionProviderProps) {
  const { profile } = useAuth();
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [loading, setLoading] = useState(true);
  const [appearanceCtx, setAppearanceCtx] = useState<AppearanceContext>('home');
  const previousStageRef = useRef<Companion['stage'] | undefined>(undefined);

  const isChild = profile?.role === 'child';
  const childId = isChild ? profile?.id : undefined;

  // Load companion
  useEffect(() => {
    if (!childId) { setLoading(false); return; }

    adapter.getCompanion(childId).then(result => {
      if (result.ok) setCompanion(result.data);
      setLoading(false);
    });

    const unsubscribe = adapter.subscribeToCompanion(childId, updated => {
      setCompanion(prev => {
        if (prev) previousStageRef.current = prev.stage;
        return updated;
      });
    });

    return unsubscribe;
  }, [adapter, childId]);

  const createCompanion = useCallback(async (name: string): Promise<boolean> => {
    if (!childId) return false;
    const result = await adapter.createCompanion(childId, name);
    if (result.ok) setCompanion(result.data);
    return result.ok;
  }, [adapter, childId]);

  const interact = useCallback(async (
    type: CompanionInteractionType,
    context: Record<string, unknown> = {}
  ) => {
    if (!companion || !childId) return;
    await adapter.recordInteraction(companion.id, childId, type, context);
  }, [adapter, companion, childId]);

  const getDialogue = useCallback((
    trigger: DialogueContext['triggerType'],
    emotion?: DialogueContext['childEmotion']
  ): DialogueLine => {
    if (!companion) return { text: '~', durationMs: 2000 };

    return selectDialogue({
      stage: companion.stage,
      childEmotion: emotion,
      triggerType: trigger,
      timeOfDay: resolveTimeOfDay(),
      companionName: companion.name,
    });
  }, [companion]);

  const display = useMemo(
    () => companion ? toDisplayState(companion, previousStageRef.current) : null,
    [companion]
  );

  const isVisible = useMemo(
    () => isChild && shouldCompanionAppear(appearanceCtx),
    [isChild, appearanceCtx]
  );

  const value = useMemo<CompanionContextValue>(() => ({
    companion,
    display,
    loading,
    isVisible,
    createCompanion,
    interact,
    getDialogue,
    setAppearanceContext: setAppearanceCtx,
  }), [companion, display, loading, isVisible, createCompanion, interact, getDialogue]);

  return (
    <CompanionContext.Provider value={value}>
      {children}
    </CompanionContext.Provider>
  );
}

export function useCompanion(): CompanionContextValue {
  const ctx = useContext(CompanionContext);
  if (!ctx) throw new Error('[Mira] useCompanion must be used within <CompanionProvider>');
  return ctx;
}
