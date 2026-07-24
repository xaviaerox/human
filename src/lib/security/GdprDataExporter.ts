/**
 * MIRA — GDPR Data Portability Exporter
 * Bundles complete family and child records (routines, goals, emotional logs, sparks) into standard JSON and CSV files.
 */

import type { Profile, Family, EmotionalCheckin, Routine, Goal } from '@/types';

export interface GdprExportData {
  family: Family;
  profiles: Profile[];
  routines: Routine[];
  goals: Goal[];
  emotionalCheckins: EmotionalCheckin[];
  exportedAt: string;
}

export class GdprDataExporter {
  static exportToJson(data: GdprExportData) {
    const payload = {
      compliance: 'GDPR / COPPA Article 20 Right to Data Portability',
      platform: 'MIRA Platform',
      version: '1.0.0',
      data,
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mira_gdpr_export_${data.family.id}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static exportCheckinsToCsv(checkins: EmotionalCheckin[], childName = 'Alex') {
    const headers = ['ID', 'Child ID', 'Valence (1-5)', 'Energy (1-5)', 'Emotion', 'Note', 'Occurred At'];
    const rows = checkins.map((c) => [
      c.id,
      c.child_id,
      c.valence,
      c.energy_level,
      `"${c.emotion_word || ''}"`,
      `"${(c.note || '').replace(/"/g, '""')}"`,
      c.occurred_at,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mira_registros_emocionales_${childName.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
