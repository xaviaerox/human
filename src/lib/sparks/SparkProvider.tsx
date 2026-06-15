'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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

  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<SparkLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const adapter = useMemo(() => getSparkAdapter(), []);

  const fetchBalance = async (id: string) => {
    const res = await adapter.getBalance(id);
    if (res.ok) setBalance(res.data);
  };

  const fetchHistory = async (id: string) => {
    const res = await adapter.getHistory(id);
    if (res.ok) setHistory(res.data);
  };

  useEffect(() => {
    if (!childId || profile?.role !== 'child') {
      setBalance(0);
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([fetchBalance(childId), fetchHistory(childId)]).finally(() => {
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
            fetchBalance(childId);
            fetchHistory(childId);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [childId, profile?.role]);

  const value = useMemo<SparkContextValue>(() => ({
    balance,
    history,
    loading,
    awardBonus: async (delta, note) => {
      if (!childId || !familyId) {
        return { ok: false, error: { code: 'not_authenticated', message: 'No child active' } };
      }
      // Logged in user must be parent
      if (session?.profile?.role !== 'parent') {
        return { ok: false, error: { code: 'unauthorized', message: 'Solo los padres pueden otorgar bonus' } };
      }

      const res = await adapter.awardBonus(
        childId,
        familyId,
        delta,
        note,
        session.profile.id
      );

      if (res.ok) {
        await Promise.all([fetchBalance(childId), fetchHistory(childId)]);
      }
      return res;
    },
    refreshBalance: async () => {
      if (childId) await fetchBalance(childId);
    },
    refreshHistory: async () => {
      if (childId) await fetchHistory(childId);
    },
  }), [balance, history, loading, childId, familyId, session?.profile?.id, session?.profile?.role, adapter]);

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
