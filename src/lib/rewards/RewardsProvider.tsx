'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { getRewardsAdapter } from '@/lib/adapters';
import type { Reward, RewardRequest, Result } from '@/types';

interface RewardsContextValue {
  rewards: Reward[];
  requests: RewardRequest[];
  loading: boolean;
  createReward(reward: Omit<Reward, 'id' | 'family_id' | 'created_at' | 'updated_at'>): Promise<Result<Reward>>;
  updateReward(rewardId: string, updates: Partial<Omit<Reward, 'id' | 'family_id' | 'created_at' | 'updated_at'>>): Promise<Result<Reward>>;
  deleteReward(rewardId: string): Promise<Result<void>>;
  requestReward(title: string, emoji: string, cost?: number): Promise<Result<RewardRequest>>;
  updateRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<Result<RewardRequest>>;
  refreshRewards(): Promise<void>;
  refreshRequests(): Promise<void>;
}

const RewardsContext = createContext<RewardsContextValue | null>(null);

export function RewardsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const familyId = session?.family?.id;
  const childId = session?.profile?.role === 'child' ? session.profile.id : undefined;

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [requests, setRequests] = useState<RewardRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const adapter = useMemo(() => getRewardsAdapter(), []);

  const fetchRewards = useCallback(async (fId: string) => {
    const res = await adapter.getRewards(fId);
    if (res.ok) setRewards(res.data);
  }, [adapter]);

  const fetchRequests = useCallback(async (fId: string) => {
    const res = await adapter.getRewardRequests(fId);
    if (res.ok) setRequests(res.data);
  }, [adapter]);

  useEffect(() => {
    let isMounted = true;
    if (!familyId) {
      const timer = setTimeout(() => {
        if (isMounted) setLoading(false);
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    setLoading(true);
    Promise.all([fetchRewards(familyId), fetchRequests(familyId)]).finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [familyId, fetchRewards, fetchRequests]);

  const createReward = useCallback(
    async (reward: Omit<Reward, 'id' | 'family_id' | 'created_at' | 'updated_at'>): Promise<Result<Reward>> => {
      if (!familyId) return { ok: false, error: { code: 'not_authenticated', message: 'No family active' } };
      const res = await adapter.createReward(familyId, reward);
      if (res.ok) await fetchRewards(familyId);
      return res;
    },
    [familyId, adapter, fetchRewards]
  );

  const updateReward = useCallback(
    async (rewardId: string, updates: Partial<Omit<Reward, 'id' | 'family_id' | 'created_at' | 'updated_at'>>): Promise<Result<Reward>> => {
      const res = await adapter.updateReward(rewardId, updates);
      if (res.ok && familyId) await fetchRewards(familyId);
      return res;
    },
    [familyId, adapter, fetchRewards]
  );

  const deleteReward = useCallback(
    async (rewardId: string): Promise<Result<void>> => {
      const res = await adapter.deleteReward(rewardId);
      if (res.ok && familyId) await fetchRewards(familyId);
      return res;
    },
    [familyId, adapter, fetchRewards]
  );

  const requestReward = useCallback(
    async (title: string, emoji: string, cost?: number): Promise<Result<RewardRequest>> => {
      if (!familyId || !childId) {
        return { ok: false, error: { code: 'not_authenticated', message: 'No active child session' } };
      }
      const res = await adapter.createRewardRequest(familyId, childId, { title, emoji, cost });
      if (res.ok) await fetchRequests(familyId);
      return res;
    },
    [familyId, childId, adapter, fetchRequests]
  );

  const updateRequestStatus = useCallback(
    async (requestId: string, status: 'approved' | 'rejected'): Promise<Result<RewardRequest>> => {
      const res = await adapter.updateRewardRequestStatus(requestId, status);
      if (res.ok && familyId) await fetchRequests(familyId);
      return res;
    },
    [familyId, adapter, fetchRequests]
  );

  const refreshRewards = useCallback(async () => {
    if (familyId) await fetchRewards(familyId);
  }, [familyId, fetchRewards]);

  const refreshRequests = useCallback(async () => {
    if (familyId) await fetchRequests(familyId);
  }, [familyId, fetchRequests]);

  const value = useMemo<RewardsContextValue>(
    () => ({
      rewards,
      requests,
      loading,
      createReward,
      updateReward,
      deleteReward,
      requestReward,
      updateRequestStatus,
      refreshRewards,
      refreshRequests,
    }),
    [rewards, requests, loading, createReward, updateReward, deleteReward, requestReward, updateRequestStatus, refreshRewards, refreshRequests]
  );

  return <RewardsContext.Provider value={value}>{children}</RewardsContext.Provider>;
}

export function useRewards(): RewardsContextValue {
  const ctx = useContext(RewardsContext);
  if (!ctx) {
    throw new Error('[Mira] useRewards must be used within <RewardsProvider>');
  }
  return ctx;
}
