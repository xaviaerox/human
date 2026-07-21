'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getProgressionAdapter } from '@/lib/adapters';
import type { ChildBadge, Result, ValueDimensionId } from '@/types';

interface ProgressionContextValue {
  scores: Record<ValueDimensionId, number>;
  badges: ChildBadge[];
  loading: boolean;
  awardBadge(
    dimensionId: string,
    tier: 'bronze' | 'silver' | 'gold',
    note?: string
  ): Promise<Result<ChildBadge>>;
  refreshScores(): Promise<void>;
  refreshBadges(): Promise<void>;
}

const ProgressionContext = createContext<ProgressionContextValue | null>(null);

const DEFAULT_SCORES: Record<ValueDimensionId, number> = {
  autonomy: 0,
  empathy: 0,
  regulation: 0,
  curiosity: 0,
  courage: 0,
  connection: 0,
};

export function ProgressionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const profile = session?.profile ?? null;
  const childId = profile?.id;
  const familyId = session?.family?.id;
  const currentUserId = profile?.id;

  const [scores, setScores] = useState<Record<ValueDimensionId, number>>(DEFAULT_SCORES);
  const [badges, setBadges] = useState<ChildBadge[]>([]);
  const [loading, setLoading] = useState(true);

  const adapter = useMemo(() => getProgressionAdapter(), []);

  const fetchScores = useCallback(async (id: string) => {
    const res = await adapter.getScores(id);
    if (res.ok) {
      const scoreMap = { ...DEFAULT_SCORES };
      res.data.forEach(s => {
        if (s.dimension_id in scoreMap) {
          scoreMap[s.dimension_id] = s.score;
        }
      });
      setScores(scoreMap);
    }
  }, [adapter]);

  const fetchBadges = useCallback(async (id: string) => {
    const res = await adapter.getBadges(id);
    if (res.ok) {
      setBadges(res.data);
    }
  }, [adapter]);

  useEffect(() => {
    let isMounted = true;

    if (!childId || profile?.role !== 'child') {
      queueMicrotask(() => {
        if (isMounted) setLoading(false);
      });
      return () => {
        isMounted = false;
      };
    }

    Promise.all([adapter.getScores(childId), adapter.getBadges(childId)]).then(([scoresRes, badgesRes]) => {
      if (!isMounted) return;
      if (scoresRes.ok) {
        const scoreMap = { ...DEFAULT_SCORES };
        scoresRes.data.forEach(s => {
          if (s.dimension_id in scoreMap) scoreMap[s.dimension_id] = s.score;
        });
        setScores(scoreMap);
      }
      if (badgesRes.ok) setBadges(badgesRes.data);
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [adapter, childId, profile?.role]);

  const awardBadge = useCallback(async (
    dimensionId: string,
    tier: 'bronze' | 'silver' | 'gold',
    note?: string
  ): Promise<Result<ChildBadge>> => {
    if (!childId || !familyId || !currentUserId) {
      return { ok: false, error: { code: 'not_authenticated', message: 'No child active' } };
    }
    const res = await adapter.awardBadge(
      childId,
      familyId,
      dimensionId,
      tier,
      note,
      currentUserId
    );

    if (res.ok) {
      await Promise.all([fetchScores(childId), fetchBadges(childId)]);
    }
    return res;
  }, [childId, familyId, currentUserId, adapter, fetchScores, fetchBadges]);

  const refreshScores = useCallback(async () => {
    if (childId) await fetchScores(childId);
  }, [childId, fetchScores]);

  const refreshBadges = useCallback(async () => {
    if (childId) await fetchBadges(childId);
  }, [childId, fetchBadges]);

  const value = useMemo<ProgressionContextValue>(() => ({
    scores,
    badges,
    loading,
    awardBadge,
    refreshScores,
    refreshBadges,
  }), [scores, badges, loading, awardBadge, refreshScores, refreshBadges]);

  return (
    <ProgressionContext.Provider value={value}>
      {children}
    </ProgressionContext.Provider>
  );
}

export function useProgression(): ProgressionContextValue {
  const ctx = useContext(ProgressionContext);
  if (!ctx) {
    throw new Error('[Mira] useProgression must be used within <ProgressionProvider>');
  }
  return ctx;
}
