/**
 * Servicio de Telemetría y Captura de Errores para Cliente y PWA.
 * Aísla las llamadas de monitoreo para integraciones con Sentry / OpenTelemetry.
 */
export class Telemetry {
  static captureError(error: Error | unknown, context?: Record<string, unknown>): void {
    console.error('[Telemetry Error]:', error, context);
    // En producción, Sentry.captureException(error, { extra: context });
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    console.log(`[Telemetry ${level.toUpperCase()}]:`, message);
    // En producción, Sentry.captureMessage(message, level);
  }
}
