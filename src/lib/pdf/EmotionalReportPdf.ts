import type { Profile, EmotionalWeeklySummary } from '@/types';

export interface EmotionalReportData {
  child: Profile;
  familyName: string;
  weeklySummary: EmotionalWeeklySummary | null;
  valueScores: Record<string, number>;
  totalSparks: number;
  completedRoutinesCount: number;
}

/**
  Generates and opens a clean, printable PDF report window for parents and therapists.
 */
export function generateEmotionalReportPrintout(data: EmotionalReportData): void {
  const { child, familyName, weeklySummary, valueScores, totalSparks, completedRoutinesCount } = data;
  const dateStr = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const dimensionNames: Record<string, { label: string; emoji: string }> = {
    regulation: { label: 'Regulación Emocional', emoji: '☯' },
    autonomy: { label: 'Autonomía', emoji: '↟' },
    courage: { label: 'Valentía y Esfuerzo', emoji: '▲' },
    connection: { label: 'Constancia en Rutinas', emoji: '♾' },
    empathy: { label: 'Empatía y Social', emoji: '♡' },
    curiosity: { label: 'Creatividad y Curiosidad', emoji: '✨' },
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Informe de Evolución Emocional — ${child.display_name}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; color: #2d2a25; line-height: 1.5; padding: 40px; max-width: 800px; margin: 0 auto; }
        .header { border-b: 2px solid #e5e1d8; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: 700; color: #524e45; margin: 0; }
        .subtitle { font-size: 14px; color: #7d7468; margin-top: 4px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .card { background: #faf9f7; border: 1px solid #e5e1d8; border-radius: 12px; padding: 16px; }
        .card-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #7d7468; margin-bottom: 8px; font-weight: 600; }
        .card-value { font-size: 20px; font-weight: 700; color: #2d2a25; }
        .scores-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .scores-table th, .scores-table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #e5e1d8; font-size: 14px; }
        .scores-table th { background: #f2f0eb; font-weight: 600; color: #524e45; }
        .footer { border-t: 1px solid #e5e1d8; pt-20px; font-size: 11px; color: #9b9289; text-align: center; margin-top: 40px; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div className="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="background: #748b52; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">🖨️ Imprimir / Guardar en PDF</button>
      </div>

      <div class="header">
        <h1 class="title">MIRA — Informe de Crecimiento Emocional</h1>
        <p class="subtitle">Familia: ${familyName} | Niño/a: <strong>${child.display_name}</strong> | Fecha: ${dateStr}</p>
      </div>

      <div class="grid">
        <div class="card">
          <div class="card-title">Check-ins Emocionales (Esta semana)</div>
          <div class="card-value">${weeklySummary?.checkin_count ?? 0} registros</div>
        </div>
        <div class="card">
          <div class="card-title">Rutinas Completadas</div>
          <div class="card-value">${completedRoutinesCount} rutinas</div>
        </div>
        <div class="card">
          <div class="card-title">Balance de Estrellas (Sparks)</div>
          <div class="card-value">⭐ ${totalSparks} estrellas</div>
        </div>
        <div class="card">
          <div class="card-title">Promedio de Valencia Emocional</div>
          <div class="card-value">${weeklySummary?.avg_valence ? `${weeklySummary.avg_valence.toFixed(1)} / 5.0` : 'Sin datos'}</div>
        </div>
      </div>

      <h3 style="font-size: 16px; color: #524e45; margin-bottom: 12px;">Evolución de Valores y Autonomía</h3>
      <table class="scores-table">
        <thead>
          <tr>
            <th>Dimensión de Crecimiento</th>
            <th>Puntuación Actual</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(valueScores).map(([dimId, score]) => `
            <tr>
              <td>${dimensionNames[dimId]?.emoji || '•'} ${dimensionNames[dimId]?.label || dimId}</td>
              <td><strong>${score} pts</strong></td>
            </tr>
          `).join('')}
          ${Object.keys(valueScores).length === 0 ? '<tr><td colspan="2">Sin datos de valores registrados todavía.</td></tr>' : ''}
        </tbody>
      </table>

      <div class="footer">
        <p>Informe generado automáticamente por MIRA — Plataforma de crecimiento emocional no punitivo para niños y familias neurodivergentes.</p>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
