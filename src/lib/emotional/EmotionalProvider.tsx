// ============================================================
// MIRA — EmotionalProvider
// ============================================================

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type { IEmotionalAdapter, SubmitCheckinParams } from './adapters/IEmotionalAdapter';
import type {
  EmotionalCheckin,
  EmotionalWeeklySummary,
  EmotionState,
  ContextType,
  CheckinPromptSource,
} from '@/types';
import type { CheckinPrompt } from './EmotionModel';
import {
  shouldPromptCheckin,
  validateCheckin,
  analyseEmotionTrend,
  type EmotionTrend,
} from './EmotionModel';
import { useAuth } from '@/lib/auth/AuthProvider';

interface EmotionalContextValue {
  recentCheckins: EmotionalCheckin[];
  lastCheckin: EmotionalCheckin | null;
  weeklySummaries: EmotionalWeeklySummary[];
  trend: EmotionTrend | null;
  schedule: CheckinPrompt[];
  loading: boolean;

  /** Submit a new check-in */
  submitCheckin(
    emotion: EmotionState,
    context_type?: ContextType,
    context_id?: string,
    note?: string,
    prompted_by?: CheckinPromptSource
  ): Promise<EmotionalCheckin | null>;

  /** Should we prompt a check-in for this context right now? */
  shouldPrompt(context: ContextType): boolean;

  /** Update schedule (parent only) */
  updateSchedule(schedule: CheckinPrompt[]): Promise<void>;

  /** Reload data */
  refresh(): Promise<void>;
}

const EmotionalContext = createContext<EmotionalContextValue | null>(null);

interface EmotionalProviderProps {
  adapter: IEmotionalAdapter;
  children: ReactNode;
}

export function EmotionalProvider({ adapter, children }: EmotionalProviderProps) {
  const { profile } = useAuth();
  const [recentCheckins, setRecentCheckins] = useState<EmotionalCheckin[]>([]);
  const [lastCheckin, setLastCheckin] = useState<EmotionalCheckin | null>(null);
  const [weeklySummaries, setWeeklySummaries] = useState<EmotionalWeeklySummary[]>([]);
  const [schedule, setSchedule] = useState<CheckinPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  const childId = profile?.role === 'child' ? profile.id : undefined;
  // Parents can view a selected child — for now use first child (extended in parent dashboard)
  const targetChildId = childId;

  const load = useCallback(async () => {
    if (!targetChildId) { setLoading(false); return; }
    setLoading(true);

    const [recent, last, summaries, sched] = await Promise.all([
      adapter.getRecentCheckins(targetChildId, 10),
      adapter.getLastCheckin(targetChildId),
      adapter.getWeeklySummaries(targetChildId, 8),
      adapter.getCheckinSchedule(targetChildId),
    ]);

    if (recent.ok) setRecentCheckins(recent.data);
    if (last.ok) setLastCheckin(last.data);
    if (summaries.ok) setWeeklySummaries(summaries.data);
    if (sched.ok) setSchedule(sched.data);

    setLoading(false);
  }, [adapter, targetChildId]);

  useEffect(() => { load(); }, [load]);

  const submitCheckin = useCallback(async (
    emotion: EmotionState,
    context_type?: ContextType,
    context_id?: string,
    note?: string,
    prompted_by: CheckinPromptSource = 'child'
  ): Promise<EmotionalCheckin | null> => {
    if (!targetChildId) return null;

    const errors = validateCheckin(emotion);
    if (errors.length > 0) return null;

    const result = await adapter.submitCheckin({
      child_id: targetChildId,
      emotion,
      context_type,
      context_id,
      note,
      prompted_by,
    });

    if (!result.ok) return null;

    // Optimistic update
    setRecentCheckins(prev => [result.data, ...prev.slice(0, 9)]);
    setLastCheckin(result.data);

    return result.data;
  }, [adapter, targetChildId]);

  const shouldPrompt = useCallback((context: ContextType): boolean => {
    return shouldPromptCheckin(schedule, context, lastCheckin ? new Date(lastCheckin.occurred_at) : null);
  }, [schedule, lastCheckin]);

  const updateSchedule = useCallback(async (newSchedule: CheckinPrompt[]) => {
    if (!targetChildId) return;
    const result = await adapter.updateCheckinSchedule(targetChildId, newSchedule);
    if (result.ok) setSchedule(result.data);
  }, [adapter, targetChildId]);

  const trend = useMemo(
    () => weeklySummaries.length >= 2 ? analyseEmotionTrend(weeklySummaries) : null,
    [weeklySummaries]
  );

  const value = useMemo<EmotionalContextValue>(() => ({
    recentCheckins,
    lastCheckin,
    weeklySummaries,
    trend,
    schedule,
    loading,
    submitCheckin,
    shouldPrompt,
    updateSchedule,
    refresh: load,
  }), [recentCheckins, lastCheckin, weeklySummaries, trend, schedule, loading,
       submitCheckin, shouldPrompt, updateSchedule, load]);

  return (
    <EmotionalContext.Provider value={value}>
      {children}
    </EmotionalContext.Provider>
  );
}

export function useEmotional(): EmotionalContextValue {
  const ctx = useContext(EmotionalContext);
  if (!ctx) throw new Error('[Mira] useEmotional must be used within <EmotionalProvider>');
  return ctx;
}
