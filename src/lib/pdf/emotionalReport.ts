/**
 * MIRA — Emotional & Growth Summary Generator
 * Exports parent and therapist-friendly summary reports.
 */


export interface EmotionalReportData {
  childName: string;
  periodStartDate: string;
  periodEndDate: string;
  totalCheckins: number;
  averageValence: number;
  averageEnergy: number;
  dominantEmotions: string[];
  routinesCompleted: number;
  valueScores: Record<string, number>;
}

export function generateEmotionalSummaryText(data: EmotionalReportData): string {
  const lines: string[] = [];
  lines.push(`====================================================`);
  lines.push(`MIRA — INFORME DE CRECIMIENTO Y REGULACIÓN EMOCIONAL`);
  lines.push(`====================================================`);
  lines.push(`Nombre del Niño/a: ${data.childName}`);
  lines.push(`Período: ${data.periodStartDate} a ${data.periodEndDate}`);
  lines.push(``);
  lines.push(`--- RESUMEN EMOCIONAL ---`);
  lines.push(`Check-ins realizados: ${data.totalCheckins}`);
  lines.push(`Valencia promedio: ${data.averageValence.toFixed(1)} / 5`);
  lines.push(`Energía promedio: ${data.averageEnergy.toFixed(1)} / 5`);
  lines.push(`Emociones más frecuentes: ${data.dominantEmotions.join(', ') || 'N/A'}`);
  lines.push(``);
  lines.push(`--- RUTINAS Y AUTONOMÍA ---`);
  lines.push(`Rutinas completadas en el período: ${data.routinesCompleted}`);
  lines.push(``);
  lines.push(`--- DIMENSIONES DE VALORES ---`);
  Object.entries(data.valueScores).forEach(([dimension, score]) => {
    lines.push(`- ${dimension}: ${score} pts`);
  });
  lines.push(``);
  lines.push(`Nota: Este informe ha sido generado respetando la privacidad familiar sin comparativas.`);
  lines.push(`====================================================`);

  return lines.join('\n');
}

export function downloadEmotionalSummaryFile(data: EmotionalReportData) {
  const content = generateEmotionalSummaryText(data);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `informe_mira_${data.childName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
