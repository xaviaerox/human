'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getSparkAdapter, isSupabase } from '@/lib/adapters';
import { supabase } from '@/lib/supabase';
import type { SparkLedgerEntry, Result } from '@/types';

interface SparkContextValue {
  balance: number;
  history: SparkLedgerEntry[];
  loading: boolean;
  awardBonus(delta: number, note: string): Promise<Result<SparkLedgerEntry>>;
  refreshBalance(): Promise<void>;
  refreshHistory(): Promise<void>;
}

const SparkContext = createContext<SparkContextValue | null>(null);

export function SparkProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const profile = session?.profile ?? null;
  const childId = profile?.id;
  const familyId = session?.family?.id;
  const currentUserId = profile?.id;
  const currentUserRole = profile?.role;

  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<SparkLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const adapter = useMemo(() => getSparkAdapter(), []);

  const fetchBalance = useCallback(async (id: string) => {
    const res = await adapter.getBalance(id);
    if (res.ok) setBalance(res.data);
  }, [adapter]);

  const fetchHistory = useCallback(async (id: string) => {
    const res = await adapter.getHistory(id);
    if (res.ok) setHistory(res.data);
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

    Promise.all([adapter.getBalance(childId), adapter.getHistory(childId)]).then(([balRes, histRes]) => {
      if (!isMounted) return;
      if (balRes.ok) setBalance(balRes.data);
      if (histRes.ok) setHistory(histRes.data);
      setLoading(false);
    });

    // Realtime subscription for Supabase
    if (isSupabase) {
      const channel = supabase
        .channel(`sparks_provider:${childId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'spark_ledger', filter: `child_id=eq.${childId}` },
          () => {
            if (isMounted) {
              fetchBalance(childId);
              fetchHistory(childId);
            }
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [adapter, childId, profile?.role, fetchBalance, fetchHistory]);

  const awardBonus = useCallback(async (delta: number, note: string): Promise<Result<SparkLedgerEntry>> => {
    if (!childId || !familyId || !currentUserId) {
      return { ok: false, error: { code: 'not_authenticated', message: 'No child active' } };
    }
    if (currentUserRole !== 'parent') {
      return { ok: false, error: { code: 'unauthorized', message: 'Solo los padres pueden otorgar bonus' } };
    }

    const res = await adapter.awardBonus(
      childId,
      familyId,
      delta,
      note,
      currentUserId
    );

    if (res.ok) {
      await Promise.all([fetchBalance(childId), fetchHistory(childId)]);
    }
    return res;
  }, [childId, familyId, currentUserId, currentUserRole, adapter, fetchBalance, fetchHistory]);

  const refreshBalance = useCallback(async () => {
    if (childId) await fetchBalance(childId);
  }, [childId, fetchBalance]);

  const refreshHistory = useCallback(async () => {
    if (childId) await fetchHistory(childId);
  }, [childId, fetchHistory]);

  const value = useMemo<SparkContextValue>(() => ({
    balance,
    history,
    loading,
    awardBonus,
    refreshBalance,
    refreshHistory,
  }), [balance, history, loading, awardBonus, refreshBalance, refreshHistory]);

  return (
    <SparkContext.Provider value={value}>
      {children}
    </SparkContext.Provider>
  );
}

export function useSparks(): SparkContextValue {
  const ctx = useContext(SparkContext);
  if (!ctx) {
    throw new Error('[Mira] useSparks must be used within <SparkProvider>');
  }
  return ctx;
}
