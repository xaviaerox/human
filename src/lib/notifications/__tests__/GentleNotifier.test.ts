import { describe, it, expect } from 'vitest';
import { getGentlePrompt } from '../GentleNotifier';

describe('GentleNotifier', () => {
  it('should return a non-empty gentle notification prompt for routine category', () => {
    const prompt = getGentlePrompt('routine');
    expect(prompt).toBeDefined();
    expect(prompt.title).toBeDefined();
    expect(prompt.body).toBeDefined();
    expect(prompt.category).toBe('routine');
  });

  it('should return a non-empty gentle notification prompt for emotional category', () => {
    const prompt = getGentlePrompt('emotional');
    expect(prompt).toBeDefined();
    expect(prompt.category).toBe('emotional');
  });
});
