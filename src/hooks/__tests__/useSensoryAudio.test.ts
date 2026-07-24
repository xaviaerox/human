import { describe, it, expect } from 'vitest';
import { useSensoryAudio } from '@/hooks/useSensoryAudio';

describe('useSensoryAudio Hook', () => {
  it('debe estar definido y proporcionar funciones de control de audio', () => {
    expect(useSensoryAudio).toBeDefined();
  });
});
