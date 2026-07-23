'use client';

import { useState } from 'react';
import { getRewardsAdapter } from '@/lib/adapters';

const rewardsAdapter = getRewardsAdapter();

export function useRewardRequests(familyId?: string, childId?: string, onSubmitted?: () => void) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestEmoji, setRequestEmoji] = useState('☆');
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

    const res = await rewardsAdapter.createRewardRequest(familyId, childId, {
      title: requestTitle.trim(),
      emoji: requestEmoji,
    });

    setRequestSubmitting(false);

    if (!res.ok) {
      setRequestError(res.error.message || 'No se pudo enviar la solicitud.');
      return;
    }

    setIsRequesting(false);
    setRequestTitle('');
    onSubmitted?.();
  };

  return {
    isRequesting,
    setIsRequesting,
    requestTitle,
    setRequestTitle,
    requestEmoji,
    setRequestEmoji,
    requestError,
    setRequestError,
    requestSubmitting,
    handleCreateRewardRequest,
  };
}
