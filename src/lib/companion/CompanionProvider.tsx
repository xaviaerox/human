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
import type { Companion, CompanionInteractionType, DialogueContext, DialogueLine, CompanionMemory } from '@/types';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  toDisplayState,
  shouldCompanionAppear,
  resolveTimeOfDay,
  type CompanionDisplayState,
  type AppearanceContext,
} from './CompanionEngine';
import { selectDialogue } from './dialogue/DialogueBank';
import { selectMemoryDialogue } from './MemoryEngine';

interface CompanionContextValue {
  companion: Companion | null;
  display: CompanionDisplayState | null;
  memories: CompanionMemory[];
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

  /** Update companion customization details */
  updateCompanionCustomization: (updates: Partial<Pick<Companion, 'equipped_accessory' | 'equipped_color_theme' | 'name'>>) => Promise<boolean>;

  /** Create a new memory dynamically */
  createMemory: (
    type: 'routine_streak_milestone' | 'difficult_checkin' | 'adventure_complete' | 'parent_badge_award',
    metadata: Record<string, any>
  ) => Promise<boolean>;

  /** Refresh memories list manually */
  refreshMemories: () => Promise<void>;
}

const CompanionContext = createContext<CompanionContextValue | null>(null);

interface CompanionProviderProps {
  adapter: ICompanionAdapter;
  children: ReactNode;
}

export function CompanionProvider({ adapter, children }: CompanionProviderProps) {
  const { profile } = useAuth();
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [memories, setMemories] = useState<CompanionMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [appearanceCtx, setAppearanceCtx] = useState<AppearanceContext>('home');
  const previousStageRef = useRef<Companion['stage'] | undefined>(undefined);

  const isChild = profile?.role === 'child';
  const childId = isChild ? profile?.id : undefined;

  const fetchMemories = useCallback(async (id: string) => {
    const result = await adapter.getMemories(id);
    if (result.ok) setMemories(result.data);
  }, [adapter]);

  // Load companion & memories
  useEffect(() => {
    if (!childId) { setLoading(false); return; }

    adapter.getCompanion(childId).then(result => {
      if (result.ok) setCompanion(result.data);
      setLoading(false);
    });

    fetchMemories(childId);

    const unsubscribe = adapter.subscribeToCompanion(childId, updated => {
      setCompanion(prev => {
        if (prev) previousStageRef.current = prev.stage;
        return updated;
      });
    });

    return unsubscribe;
  }, [adapter, childId, fetchMemories]);

  const createCompanion = useCallback(async (name: string): Promise<boolean> => {
    if (!childId) return false;
    const result = await adapter.createCompanion(childId, name);
    if (result.ok) setCompanion(result.data);
    return result.ok;
  }, [adapter, childId]);

  const updateCompanionCustomization = useCallback(async (updates: Partial<Pick<Companion, 'equipped_accessory' | 'equipped_color_theme' | 'name'>>): Promise<boolean> => {
    if (!companion) return false;
    const result = await adapter.updateCompanion(companion.id, updates);
    if (result.ok) setCompanion(result.data);
    return result.ok;
  }, [adapter, companion]);

  const interact = useCallback(async (
    type: CompanionInteractionType,
    context: Record<string, unknown> = {}
  ) => {
    if (!companion || !childId) return;
    await adapter.recordInteraction(companion.id, childId, type, context);
  }, [adapter, companion, childId]);

  const createMemory = useCallback(async (
    type: 'routine_streak_milestone' | 'difficult_checkin' | 'adventure_complete' | 'parent_badge_award',
    metadata: Record<string, any>
  ): Promise<boolean> => {
    if (!companion || !childId) return false;
    const result = await adapter.createMemory(childId, companion.id, type, metadata);
    if (result.ok) {
      await fetchMemories(childId);
    }
    return result.ok;
  }, [adapter, companion, childId, fetchMemories]);

  const getDialogue = useCallback((
    trigger: DialogueContext['triggerType'],
    emotion?: DialogueContext['childEmotion']
  ): DialogueLine => {
    if (!companion) return { text: '~', durationMs: 2000 };

    // Give 45% chance of selecting a memory-based custom dialogue line
    // when greeting or sitting idle with the companion
    if ((trigger === 'greeting' || trigger === 'idle_presence') && memories.length > 0) {
      const shouldMentionMemory = Math.random() < 0.45;
      if (shouldMentionMemory) {
        const memoryLine = selectMemoryDialogue(memories, companion.stage, companion.name);
        if (memoryLine) return memoryLine;
      }
    }

    // Default to the static DialogueBank
    return selectDialogue({
      stage: companion.stage,
      childEmotion: emotion,
      triggerType: trigger,
      timeOfDay: resolveTimeOfDay(),
      companionName: companion.name,
    });
  }, [companion, memories]);

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
    memories,
    loading,
    isVisible,
    createCompanion,
    interact,
    getDialogue,
    setAppearanceContext: setAppearanceCtx,
    updateCompanionCustomization,
    createMemory,
    refreshMemories: async () => {
      if (childId) await fetchMemories(childId);
    },
  }), [companion, display, memories, loading, isVisible, createCompanion, interact, getDialogue, updateCompanionCustomization, createMemory, childId, fetchMemories]);

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
