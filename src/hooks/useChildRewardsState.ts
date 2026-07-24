'use client';

import { useState, useEffect } from 'react';
import { getRewardsAdapter } from '@/lib/adapters';
import type { Reward, RewardRequest } from '@/types';

const rewardsAdapter = getRewardsAdapter();

export function useChildRewardsState(
  familyId?: string | null,
  childId?: string | null,
  sparkBalance: number = 0
) {
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [lastRedemptions] = useState<Record<string, string>>({});
  const [rewardRequests, setRewardRequests] = useState<RewardRequest[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (familyId && childId) {
      rewardsAdapter.getRewards(familyId).then(res => {
        if (res.ok) setRewards(res.data);
      });
      rewardsAdapter.getRewardRequests(familyId).then(res => {
        if (res.ok && childId) {
          const pending = res.data.filter(r => r.status === 'pending' && r.child_id === childId);
          setRewardRequests(pending);
        }
      });
    }
  }, [familyId, childId]);

  async function handleRedeem(rewardId: string, rewardTitle: string, cost: number, emoji: string) {
    if (sparkBalance < cost || !childId || !familyId) return;
    setRedeemingId(rewardId);

    const res = await rewardsAdapter.createRewardRequest(familyId, childId, {
      title: rewardTitle,
      emoji: emoji || '🎁',
      cost: cost,
    });

    setRedeemingId(null);
    if (res.ok) {
      setToastMessage(`¡Propuesta enviada con éxito! Dile a papá/mamá que apruebe: "${rewardTitle}"`);
    } else {
      setToastMessage(`Error al proponer: ${res.error.message}`);
    }
  }

  return {
    redeemingId,
    setRedeemingId,
    rewards,
    lastRedemptions,
    rewardRequests,
    setRewardRequests,
    handleRedeem,
    toastMessage,
    clearToast: () => setToastMessage(null),
  };
}
