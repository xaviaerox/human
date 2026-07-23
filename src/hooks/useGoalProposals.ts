'use client';

import { useState } from 'react';
import { decomposeGoalWithAI } from '@/lib/goals/decomposeAI';
import { getGoalsAdapter } from '@/lib/adapters';

const goalsAdapter = getGoalsAdapter();

export function useGoalProposals(familyId?: string, childId?: string, onSubmitted?: () => void) {
  const [isProposingGoal, setIsProposingGoal] = useState(false);
  const [goalPropTitle, setGoalPropTitle] = useState('');
  const [goalPropWhy, setGoalPropWhy] = useState('');
  const [goalPropStep1, setGoalPropStep1] = useState('');
  const [goalPropStep2, setGoalPropStep2] = useState('');
  const [goalPropStep3, setGoalPropStep3] = useState('');
  const [goalPropSubmitting, setGoalPropSubmitting] = useState(false);
  const [goalPropError, setGoalPropError] = useState('');
  const [isGeneratingAIDecompose, setIsGeneratingAIDecompose] = useState(false);

  const handleAIDecomposeInModal = async () => {
    if (!goalPropTitle.trim()) return;
    setIsGeneratingAIDecompose(true);
    const result = await decomposeGoalWithAI(goalPropTitle);
    setIsGeneratingAIDecompose(false);
    if (result.microtasks.length >= 1 && result.microtasks[0]) setGoalPropStep1(result.microtasks[0].title);
    if (result.microtasks.length >= 2 && result.microtasks[1]) setGoalPropStep2(result.microtasks[1].title);
    if (result.microtasks.length >= 3 && result.microtasks[2]) setGoalPropStep3(result.microtasks[2].title);
  };

  const handleProposeGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalPropTitle.trim()) {
      setGoalPropError('Ingresa un título para tu aventura.');
      return;
    }
    if (!childId || !familyId) {
      setGoalPropError('Error de autenticación.');
      return;
    }

    setGoalPropSubmitting(true);
    setGoalPropError('');

    const rawSteps = [goalPropStep1, goalPropStep2, goalPropStep3].map((s) => s.trim()).filter(Boolean);
    const stepsToUse =
      rawSteps.length > 0
        ? rawSteps
        : [
            'Paso 1: Empezar a explorar',
            'Paso 2: Practicar con paciencia',
            'Paso 3: Celebrar el logro',
          ];

    const result = await goalsAdapter.createGoal({
      family_id: familyId,
      child_id: childId,
      created_by: childId,
      title: goalPropTitle.trim(),
      why: goalPropWhy.trim() || undefined,
      one_per_day: true,
      microtasks: stepsToUse.map((t, idx) => ({
        title: t,
        position: idx + 1,
        spark_value: (idx + 1) * 2,
        value_dimensions: ['autonomy'],
        effort_level: idx === 0 ? 'easy' : idx === 1 ? 'medium' : 'stretch',
      })),
    });

    setGoalPropSubmitting(false);

    if (!result.ok) {
      setGoalPropError(result.error.message || 'No se pudo enviar la propuesta.');
      return;
    }

    setIsProposingGoal(false);
    onSubmitted?.();
  };

  return {
    isProposingGoal,
    setIsProposingGoal,
    goalPropTitle,
    setGoalPropTitle,
    goalPropWhy,
    setGoalPropWhy,
    goalPropStep1,
    setGoalPropStep1,
    goalPropStep2,
    setGoalPropStep2,
    goalPropStep3,
    setGoalPropStep3,
    goalPropSubmitting,
    setGoalPropSubmitting,
    goalPropError,
    setGoalPropError,
    isGeneratingAIDecompose,
    handleAIDecomposeInModal,
    handleProposeGoalSubmit,
  };
}
