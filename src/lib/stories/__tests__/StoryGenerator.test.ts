import { describe, it, expect } from 'vitest';
import { generateMicroStory } from '../StoryGenerator';

describe('StoryGenerator Engine', () => {
  it('generates a 3-chapter micro-story with personalized child name and companion', () => {
    const story = generateMicroStory({
      childName: 'Leo',
      companionName: 'Lumi',
      worldName: 'Bosque de la Autonomía',
      recentEmotion: 'contento',
      valueDimensionLabel: 'Autonomía',
    });

    expect(story.id).toMatch(/^story_\d+/);
    expect(story.title).toContain('Bosque de la Autonomía');
    expect(story.chapters).toHaveLength(3);
    expect(story.chapters[0]?.content).toContain('Leo');
    expect(story.chapters[0]?.content).toContain('Lumi');
    expect(story.chapters[1]?.content).toContain('Autonomía');
  });

  it('provides safe fallbacks when options are omitted', () => {
    const story = generateMicroStory({ childName: '' });

    expect(story.chapters).toHaveLength(3);
    expect(story.moral).toContain('Alex');
  });
});
