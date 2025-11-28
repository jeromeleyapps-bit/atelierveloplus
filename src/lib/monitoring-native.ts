/**
 * ============================================================================
 * MONITORING NATIF - Remplacement Sentry
 * ============================================================================
 * Date: 15 novembre 2025
 * Objectif: Solution 100% native sans dépendances externes
 * 
 * Fonctionnalités:
 * - Logging structuré (info, warn, error, debug)
 * - Capture erreurs + stack traces
 * - Performance monitoring (temps requêtes, mémoire)
 * - Alertes critiques
 * - Rotation logs automatique
 * - Export JSON pour analyse
 * 
 * Avantages vs Sentry:
 * - ✅ Gratuit (pas de limite)
 * - ✅ Données locales (RGPD compliant)
 * - ✅ Pas de dépendance externe
 * - ✅ Personnalisable à 100%
 * - ✅ Fonctionne offline
 * ============================================================================
 */

import fs from 'fs-extra';
import path from 'path';
import { app } from 'electron';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration?: number;
    memory?: NodeJS.MemoryUsage;
  };
  user?: {
    id?: string;
    email?: string;
  };
  request?: {
    method?: string;
    url?: string;
    statusCode?: number;
  };
}

interface MonitoringConfig {
  logDir: string;
  maxLogSize: number; // MB
  maxLogFiles: number;
  enableConsole: boolean;
  enableFile: boolean;
  minLevel: LogLevel;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

const DEFAULT_CONFIG: MonitoringConfig = {
  logDir: app ? path.join(app.getPath('userData'), 'logs') : './logs',
  maxLogSize: 10, // 10 MB
  maxLogFiles: 5,
  enableConsole: true,
  enableFile: true,
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
};

// ============================================================================
// CLASSE MONITORING
// ============================================================================

class NativeMonitoring {
  private config: MonitoringConfig;
  private currentLogFile: string;
  private logBuffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentLogFile = this.getLogFilePath();
    
    // Créer dossier logs
    fs.ensureDirSync(this.config.logDir);
    
    // Démarrer flush automatique (toutes les 5 secondes)
    this.startAutoFlush();
    
    // Rotation logs au démarrage
    this.rotateLogs();
  }

  // ==========================================================================
  // MÉTHODES PUBLIQUES
  // ==========================================================================

  /**
   * Log niveau DEBUG
   */
  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  /**
   * Log niveau INFO
   */
  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  /**
   * Log niveau WARN
   */
  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  /**
   * Log niveau ERROR
   */
  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log('error', message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  /**
   * Log niveau CRITICAL (alertes importantes)
   */
  critical(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log('critical', message, {
      ...context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
    
    // Flush immédiat pour erreurs critiques
    this.flush();
  }

  /**
   * Capture exception globale
   */
  captureException(error: Error, context?: Record<string, unknown>) {
    this.error(`Exception capturée: ${error.message}`, error, context);
  }

  /**
   * Mesurer performance d'une fonction
   */
  async measurePerformance<T>(
    name: string,
    fn: () => Promise<T> | T,
    context?: Record<string, unknown>
  ): Promise<T> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();

      this.log('info', `Performance: ${name}`, {
        ...context,
        performance: {
          duration,
          memory: {
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            external: endMemory.external - startMemory.external,
          },
        },
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`Performance ERROR: ${name}`, error as Error, {
        ...context,
        performance: { duration },
      });
      throw error;
    }
  }

  /**
   * Log requête HTTP
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: Record<string, unknown>
  ) {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    this.log(level, `${method} ${url} ${statusCode}`, {
      ...context,
      request: { method, url, statusCode },
      performance: { duration },
    });
  }

  /**
   * Obtenir statistiques
   */
  async getStats(): Promise<{
    totalLogs: number;
    byLevel: Record<LogLevel, number>;
    logFiles: string[];
    totalSize: number;
  }> {
    const files = await fs.readdir(this.config.logDir);
    const logFiles = files.filter(f => f.endsWith('.log'));
    
    let totalSize = 0;
    for (const file of logFiles) {
      const stats = await fs.stat(path.join(this.config.logDir, file));
      totalSize += stats.size;
    }

    // Compter logs par niveau (fichier actuel)
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0,
    };

    if (fs.existsSync(this.currentLogFile)) {
      const content = await fs.readFile(this.currentLogFile, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        try {
          const entry: LogEntry = JSON.parse(line);
          byLevel[entry.level]++;
        } catch {
          // Ignorer lignes invalides
        }
      }
    }

    const totalLogs = Object.values(byLevel).reduce((sum, count) => sum + count, 0);

    return {
      totalLogs,
      byLevel,
      logFiles,
      totalSize,
    };
  }

  /**
   * Exporter logs en JSON
   */
  async exportLogs(outputPath: string, filter?: {
    level?: LogLevel;
    startDate?: Date;
    endDate?: Date;
  }): Promise<void> {
    const files = await fs.readdir(this.config.logDir);
    const logFiles = files.filter(f => f.endsWith('.log')).sort();
    
    const allLogs: LogEntry[] = [];

    for (const file of logFiles) {
      const filePath = path.join(this.config.logDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        try {
          const entry: LogEntry = JSON.parse(line);
          
          // Appliquer filtres
          if (filter?.level && entry.level !== filter.level) continue;
          if (filter?.startDate && new Date(entry.timestamp) < filter.startDate) continue;
          if (filter?.endDate && new Date(entry.timestamp) > filter.endDate) continue;
          
          allLogs.push(entry);
        } catch {
          // Ignorer lignes invalides
        }
      }
    }

    await fs.writeJson(outputPath, allLogs, { spaces: 2 });
  }

  /**
   * Nettoyer logs anciens
   */
  async cleanup(olderThanDays: number = 30): Promise<number> {
    const files = await fs.readdir(this.config.logDir);
    const logFiles = files.filter(f => f.endsWith('.log'));
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    let deletedCount = 0;

    for (const file of logFiles) {
      const filePath = path.join(this.config.logDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        await fs.remove(filePath);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Arrêter monitoring (flush final)
   */
  async stop(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    await this.flush();
  }

  // ==========================================================================
  // MÉTHODES PRIVÉES
  // ==========================================================================

  private log(level: LogLevel, message: string, context?: Record<string, unknown>) {
    // Vérifier niveau minimum
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    // Console
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Fichier
    if (this.config.enableFile) {
      this.logBuffer.push(entry);
    }
  }

  private logToConsole(entry: LogEntry) {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      critical: '🚨',
    }[entry.level];

    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const message = `${emoji} [${timestamp}] ${entry.message}`;

    switch (entry.level) {
      case 'debug':
        logger.debug(message, { context: entry.context || '' });
        break;
      case 'info':
        logger.info(message, { context: entry.context || '' });
        break;
      case 'warn':
        logger.warn(message, { context: entry.context || '' });
        break;
      case 'error':
      case 'critical':
        logger.error(message, { error: entry.error || entry.context || '' });
        break;
    }
  }

  private async flush() {
    if (this.logBuffer.length === 0) return;

    try {
      // Vérifier rotation
      await this.checkRotation();

      // Écrire logs
      const lines = this.logBuffer.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      await fs.appendFile(this.currentLogFile, lines, 'utf-8');

      // Vider buffer
      this.logBuffer = [];
    } catch (error) {
      logger.error('[MONITORING] Erreur flush logs:', error);
    }
  }

  private startAutoFlush() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 5000); // Flush toutes les 5 secondes
  }

  private async checkRotation() {
    try {
      const stats = await fs.stat(this.currentLogFile);
      const sizeMB = stats.size / (1024 * 1024);

      if (sizeMB >= this.config.maxLogSize) {
        await this.rotateLogs();
      }
    } catch {
      // Fichier n'existe pas encore
    }
  }

  private async rotateLogs() {
    const files = await fs.readdir(this.config.logDir);
    const logFiles = files
      .filter(f => f.startsWith('app-') && f.endsWith('.log'))
      .sort()
      .reverse();

    // Supprimer fichiers excédentaires
    if (logFiles.length >= this.config.maxLogFiles) {
      const toDelete = logFiles.slice(this.config.maxLogFiles - 1);
      for (const file of toDelete) {
        await fs.remove(path.join(this.config.logDir, file));
      }
    }

    // Nouveau fichier
    this.currentLogFile = this.getLogFilePath();
  }

  private getLogFilePath(): string {
    const date = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    return path.join(this.config.logDir, `app-${date}-${timestamp}.log`);
  }
}

// ============================================================================
// INSTANCE SINGLETON
// ============================================================================

let monitoringInstance: NativeMonitoring | null = null;

export function getMonitoring(): NativeMonitoring {
  if (!monitoringInstance) {
    monitoringInstance = new NativeMonitoring();
  }
  return monitoringInstance;
}

export async function stopMonitoring(): Promise<void> {
  if (monitoringInstance) {
    await monitoringInstance.stop();
    monitoringInstance = null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { NativeMonitoring };
export type { LogLevel, LogEntry, MonitoringConfig };
export { logger } from '@/lib/logger';
export default getMonitoring;
