import { describe, it, expect } from 'vitest';
import { generateEmotionalSummaryText } from '@/lib/pdf/emotionalReport';

describe('Emotional Report Generator', () => {
  it('debe generar texto de resumen terapeutico valido', () => {
    const data = {
      childName: 'Alex',
      periodStartDate: '2026-07-01',
      periodEndDate: '2026-07-24',
      totalCheckins: 12,
      averageValence: 4.2,
      averageEnergy: 3.5,
      dominantEmotions: ['Calma', 'Entusiasmo'],
      routinesCompleted: 18,
      valueScores: { Autonomía: 45, Calma: 60 },
    };

    const summary = generateEmotionalSummaryText(data);
    expect(summary).toContain('Alex');
    expect(summary).toContain('Check-ins realizados: 12');
    expect(summary).toContain('Valencia promedio: 4.2');
    expect(summary).toContain('Autonomía: 45 pts');
  });
});
