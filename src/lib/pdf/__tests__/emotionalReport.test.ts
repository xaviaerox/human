import { describe, it, expect } from 'vitest';
import { generateEmotionalSummaryText, type EmotionalReportData } from '../emotionalReport';

describe('Emotional Report Generator', () => {
  it('should generate formatted summary text', () => {
    const data: EmotionalReportData = {
      childName: 'Alex',
      periodStartDate: '2026-07-17',
      periodEndDate: '2026-07-24',
      totalCheckins: 5,
      averageValence: 4.2,
      averageEnergy: 3.0,
      dominantEmotions: ['tranquilo', 'alegre'],
      routinesCompleted: 12,
      valueScores: {
        autonomy: 15,
        empathy: 10,
      },
    };

    const text = generateEmotionalSummaryText(data);
    expect(text).toContain('MIRA — INFORME DE CRECIMIENTO Y REGULACIÓN EMOCIONAL');
    expect(text).toContain('Nombre del Niño/a: Alex');
    expect(text).toContain('Check-ins realizados: 5');
    expect(text).toContain('Valencia promedio: 4.2 / 5');
    expect(text).toContain('- autonomy: 15 pts');
  });
});
