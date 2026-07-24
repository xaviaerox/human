/**
 * MIRA — Client Error Tracker & Observability Helper
 * Captures unhandled client-side errors and performance metrics for static GitHub Pages deployments.
 */

export interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  timestamp: string;
}

export class ErrorTracker {
  private static reports: ErrorReport[] = [];

  static captureError(error: Error | string, componentStack?: string) {
    const report: ErrorReport = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      componentStack,
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      timestamp: new Date().toISOString(),
    };

    this.reports.push(report);
    if (process.env.NODE_ENV !== 'production') {
      console.error('[MIRA ErrorTracker]', report);
    }
  }

  static getReports(): ErrorReport[] {
    return this.reports;
  }

  static clearReports() {
    this.reports = [];
  }
}
