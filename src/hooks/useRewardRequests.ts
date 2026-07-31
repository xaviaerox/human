'use client';

import { useState } from 'react';
import { getRewardsAdapter } from '@/lib/adapters';

const rewardsAdapter = getRewardsAdapter();

export function useRewardRequests(familyId?: string, childId?: string, onSubmitted?: () => void) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestEmoji, setRequestEmoji] = useState('☆');
  const [requestSuggestedCost, setRequestSuggestedCost] = useState<number | ''>('');
  const [requestError, setRequestError] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  const handleCreateRewardRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTitle.trim()) {
      setRequestError('Escribe un título para tu premio.');
      return;
    }
    if (!childId || !familyId) {
      setRequestError('Error de autenticación.');
      return;
    }

    setRequestSubmitting(true);
    setRequestError('');

    const costNum = typeof requestSuggestedCost === 'number' && requestSuggestedCost > 0 ? requestSuggestedCost : 0;

    const res = await rewardsAdapter.createRewardRequest(familyId, childId, {
      title: requestTitle.trim(),
      emoji: requestEmoji,
      cost: costNum,
    });

    setRequestSubmitting(false);

    if (!res.ok) {
      setRequestError(res.error.message || 'No se pudo enviar la solicitud.');
      return;
    }

    setIsRequesting(false);
    setRequestTitle('');
    setRequestSuggestedCost('');
    onSubmitted?.();
  };

  return {
    isRequesting,
    setIsRequesting,
    requestTitle,
    setRequestTitle,
    requestEmoji,
    setRequestEmoji,
    requestSuggestedCost,
    setRequestSuggestedCost,
    requestError,
    setRequestError,
    requestSubmitting,
    handleCreateRewardRequest,
  };
}
