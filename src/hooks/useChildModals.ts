'use client';

import { useState } from 'react';

export function useChildModals() {
  const [showRewards, setShowRewards] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [showMemoriesModal, setShowMemoriesModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showWorldsModal, setShowWorldsModal] = useState(false);
  const [showCalmModal, setShowCalmModal] = useState(false);

  return {
    showRewards,
    setShowRewards,
    showCustomization,
    setShowCustomization,
    showMemoriesModal,
    setShowMemoriesModal,
    showChatModal,
    setShowChatModal,
    showWorldsModal,
    setShowWorldsModal,
    showCalmModal,
    setShowCalmModal,
  };
}
