// Metrics module removed. Keeping noop service to satisfy imports.
export class MetricsService {
  static getInstance(): MetricsService {
    return new MetricsService();
  }
  initialize(): void {
    /* no-op */
  }
  logCustomMetric(): void {
    /* no-op */
  }
}

export const metricsService = MetricsService.getInstance();
