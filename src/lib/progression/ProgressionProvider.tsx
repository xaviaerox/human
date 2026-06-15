'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getProgressionAdapter } from '@/lib/adapters';
import type { ChildValueScore, ChildBadge, Result, ValueDimensionId } from '@/types';

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

  const fetchScores = async (id: string) => {
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
  };

  const fetchBadges = async (id: string) => {
    const res = await adapter.getBadges(id);
    if (res.ok) {
      setBadges(res.data);
    }
  };

  useEffect(() => {
    if (!childId || profile?.role !== 'child') {
      setScores(DEFAULT_SCORES);
      setBadges([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([fetchScores(childId), fetchBadges(childId)]).finally(() => {
      setLoading(false);
    });
  }, [childId, profile?.role]);

  const value = useMemo<ProgressionContextValue>(() => ({
    scores,
    badges,
    loading,
    awardBadge: async (dimensionId, tier, note) => {
      if (!childId || !familyId) {
        return { ok: false, error: { code: 'not_authenticated', message: 'No child active' } };
      }
      const res = await adapter.awardBadge(
        childId,
        familyId,
        dimensionId,
        tier,
        note,
        session.profile.id // Awarded by the logged-in parent
      );

      if (res.ok) {
        await Promise.all([fetchScores(childId), fetchBadges(childId)]);
      }
      return res;
    },
    refreshScores: async () => {
      if (childId) await fetchScores(childId);
    },
    refreshBadges: async () => {
      if (childId) await fetchBadges(childId);
    },
  }), [scores, badges, loading, childId, familyId, session?.profile?.id, adapter]);

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
