/**
 * Tests pour le logger centralisé
 */
import { logger } from '@/lib/logger';

describe('logger', () => {
  let consoleSpy: {
    log: jest.SpyInstance;
    info: jest.SpyInstance;
    warn: jest.SpyInstance;
    error: jest.SpyInstance;
  };

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(),
      info: jest.spyOn(console, 'info').mockImplementation(),
      warn: jest.spyOn(console, 'warn').mockImplementation(),
      error: jest.spyOn(console, 'error').mockImplementation(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('info', () => {
    it('should log info messages', () => {
      logger.info('Test info message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should include metadata in log', () => {
      logger.info('Test with meta', { userId: '123' });
      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toContain('Test with meta');
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      logger.warn('Test warning');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      logger.error('Test error');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error object');
      logger.error('Error occurred', { error });
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('should log debug messages', () => {
      logger.debug('Test debug');
      // Debug may or may not log depending on environment
      // Just verify it doesn't throw
    });
  });

  describe('sensitive data filtering', () => {
    it('should redact password in metadata', () => {
      logger.info('Login attempt', { password: 'secret123', email: 'test@test.com' });
      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).not.toContain('secret123');
      expect(call).toContain('[REDACTED]');
    });

    it('should redact token in metadata', () => {
      logger.info('API call', { token: 'jwt-token-here' });
      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).not.toContain('jwt-token-here');
    });

    it('should redact fields containing secret', () => {
      logger.info('External API', { clientSecret: 'my-secret-value' });
      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).not.toContain('my-secret-value');
      expect(call).toContain('[REDACTED]');
    });
  });

  describe('formatting', () => {
    it('should include timestamp', () => {
      logger.info('Timestamped message');
      const call = consoleSpy.log.mock.calls[0][0];
      // ISO timestamp format: 2025-12-07T...
      expect(call).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });

    it('should include log level', () => {
      logger.info('Level test');
      const call = consoleSpy.log.mock.calls[0][0];
      expect(call).toContain('[INFO]');
    });

    it('should handle complex metadata', () => {
      logger.info('Complex meta', {
        user: { id: '1', name: 'Test' },
        items: [1, 2, 3],
        count: 42,
      });
      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });
});
