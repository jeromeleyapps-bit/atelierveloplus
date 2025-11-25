import { metricsService } from "./metrics.service";

export function initializeMetrics() {
  // Démarrer la collecte des métriques
  metricsService.initialize();
}

// Exporter une instance unique
export const metrics = {
  logCustom: () => { /* no-op */ },
};
