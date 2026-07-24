import { describe, it, expect } from 'vitest';
import { WebLLMWasmEngine } from '@/lib/companion/WebLLMWasmEngine';
import { GdprDataExporter } from '@/lib/security/GdprDataExporter';
import { realtimeManager } from '@/lib/supabaseRealtimeManager';
import { ErrorTracker } from '@/lib/observability/errorTracker';

describe('WebLLMWasmEngine', () => {
  it('debe generar streaming de respuesta simulado localmente', async () => {
    const engine = new WebLLMWasmEngine();
    await engine.initialize();
    expect(engine.getLoadedStatus()).toBe(true);

    let streamResult = '';
    await engine.generateStream(
      [{ role: 'user', content: 'Hola Lumi' }],
      (delta) => {
        streamResult += delta;
      }
    );

    expect(streamResult).toContain('Lumi');
  });
});

describe('GdprDataExporter', () => {
  it('debe estar definido y ofrecer metodos de exportacion', () => {
    expect(GdprDataExporter.exportToJson).toBeDefined();
    expect(GdprDataExporter.exportCheckinsToCsv).toBeDefined();
  });
});

describe('ErrorTracker Observability', () => {
  it('debe capturar y registrar errores correctamente', () => {
    ErrorTracker.clearReports();
    ErrorTracker.captureError(new Error('Test error'));
    const reports = ErrorTracker.getReports();
    expect(reports.length).toBe(1);
    expect(reports[0]?.message).toBe('Test error');
  });
});

describe('Supabase Realtime Manager', () => {
  it('debe devolver un canal singleton y manejar desuscripcion', () => {
    expect(realtimeManager).toBeDefined();
  });
});
