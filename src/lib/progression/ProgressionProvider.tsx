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
      const timer = setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    setLoading(true);
    Promise.all([fetchScores(childId), fetchBadges(childId)]).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [childId, profile?.role, fetchScores, fetchBadges]);

  const awardBadge = useCallback(async (
    dimensionId: string,
    tier: 'bronze' | 'silver' | 'gold',
    note?: string
  ): Promise<Result<ChildBadge>> => {
    if (!childId || !familyId || !session?.profile?.id) {
      return { ok: false, error: { code: 'not_authenticated', message: 'No child active' } };
    }
    const res = await adapter.awardBadge(
      childId,
      familyId,
      dimensionId,
      tier,
      note,
      session.profile.id
    );

    if (res.ok) {
      await Promise.all([fetchScores(childId), fetchBadges(childId)]);
    }
    return res;
  }, [childId, familyId, session, adapter, fetchScores, fetchBadges]);

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
