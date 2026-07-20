import { describe, it, expect } from 'vitest';
import {
  stageFromScore,
  advanceStage,
  stageProgress,
  toDisplayState,
  shouldCompanionAppear,
} from '../CompanionEngine';
import type { Companion } from '@/types';

describe('CompanionEngine (Phase 3)', () => {
  const mockCompanion: Companion = {
    id: 'comp-1',
    child_id: 'static-child-1',
    name: 'Lumi',
    stage: 'sprout',
    bonding_score: 30,
    emotional_responsiveness: 50,
    personality_traits: ['curious'],
    stage_unlocked_at: { sprout: new Date().toISOString() },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe('stageFromScore', () => {
    it('returns egg for 0 score', () => {
      expect(stageFromScore(0)).toBe('egg');
    });

    it('returns sprout for 25 score', () => {
      expect(stageFromScore(25)).toBe('sprout');
    });

    it('returns bloom for 75 score', () => {
      expect(stageFromScore(75)).toBe('bloom');
    });

    it('returns radiant for 350+ score', () => {
      expect(stageFromScore(400)).toBe('radiant');
    });
  });

  describe('advanceStage', () => {
    it('never regresses companion stage', () => {
      const stage = advanceStage(mockCompanion, 10);
      expect(stage).toBe('sprout'); // Stays sprout even if score drops below threshold
    });

    it('advances stage when score hits next threshold', () => {
      const stage = advanceStage(mockCompanion, 80);
      expect(stage).toBe('bloom');
    });
  });

  describe('stageProgress', () => {
    it('returns valid progress float 0-1', () => {
      const progress = stageProgress(mockCompanion);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });
  });

  describe('toDisplayState', () => {
    it('hides raw bonding score from child UI', () => {
      const state = toDisplayState(mockCompanion);
      expect(state.name).toBe('Lumi');
      expect((state as unknown as Record<string, unknown>).bonding_score).toBeUndefined();
    });
  });

  describe('shouldCompanionAppear', () => {
    it('hides companion on parent dashboard', () => {
      expect(shouldCompanionAppear('parent_dashboard')).toBe(false);
    });

    it('shows companion on home screen', () => {
      expect(shouldCompanionAppear('home')).toBe(true);
    });
  });
});
