import { getEmotionalAdapter, getRoutineAdapter, getCompanionAdapter } from '@/lib/adapters';
import type { Result } from '@/types';

export interface FamilyExportData {
  exportedAt: string;
  familyId: string;
  childId: string;
  routines: unknown[];
  checkins: unknown[];
  memories: unknown[];
}

/**
 * Servicio de Exportación y Portabilidad de Datos Familiar (Cumplimiento GDPR).
 * Permite a los padres descargar un archivo estructurado JSON de toda la actividad de sus hijos.
 */
export class DataExporter {
  static async exportChildData(familyId: string, childId: string): Promise<Result<FamilyExportData>> {
    try {
      const routineAdapter = getRoutineAdapter();
      const emotionalAdapter = getEmotionalAdapter();
      const companionAdapter = getCompanionAdapter();

      const [routinesRes, checkinsRes, memoriesRes] = await Promise.all([
        routineAdapter.getRoutines(familyId, childId),
        emotionalAdapter.getRecentCheckins(childId, 100),
        companionAdapter.getMemories(childId),
      ]);

      const exportPayload: FamilyExportData = {
        exportedAt: new Date().toISOString(),
        familyId,
        childId,
        routines: routinesRes.ok ? routinesRes.data : [],
        checkins: checkinsRes.ok ? checkinsRes.data : [],
        memories: memoriesRes.ok ? memoriesRes.data : [],
      };

      return { ok: true, data: exportPayload };
    } catch (err) {
      console.error('[DataExporter] Failed to export family data:', err);
      return {
        ok: false,
        error: {
          message: err instanceof Error ? err.message : 'Data export failed',
          code: 'EXPORT_FAILED',
        },
      };
    }
  }

  /**
   * Dispara la descarga directa de un archivo JSON formateado en el navegador del cliente.
   */
  static triggerJsonDownload(data: FamilyExportData, filename = 'mira_family_export.json'): void {
    if (typeof window === 'undefined') return;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
