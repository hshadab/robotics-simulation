import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, configureLogger, addLogHandler, getLogConfig, loggers } from '../lib/logger';

describe('logger', () => {
  const consoleSpy = {
    log: vi.spyOn(console, 'log').mockImplementation(() => undefined),
    debug: vi.spyOn(console, 'debug').mockImplementation(() => undefined),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset config
    configureLogger({ enabled: true, minLevel: 'debug' });
  });

  describe('createLogger', () => {
    it('creates a logger with all log methods', () => {
      const logger = createLogger('Test');
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
    });

    it('logs messages with namespace prefix', () => {
      configureLogger({ minLevel: 'debug' });
      const logger = createLogger('TestNamespace');
      logger.info('Test message');

      expect(consoleSpy.log).toHaveBeenCalled();
      const call = consoleSpy.log.mock.calls[0];
      expect(call[0]).toContain('TestNamespace');
    });
  });

  describe('log levels', () => {
    it('respects minimum log level', () => {
      configureLogger({ minLevel: 'warn' });
      const logger = createLogger('Test');

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe('configureLogger', () => {
    it('can disable logging', () => {
      configureLogger({ enabled: false });
      const logger = createLogger('Test');
      logger.error('Should not appear');

      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('returns current config', () => {
      const config = getLogConfig();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('minLevel');
      expect(config).toHaveProperty('handlers');
    });
  });

  describe('custom handlers', () => {
    it('calls registered handlers', () => {
      configureLogger({ minLevel: 'debug' });
      const handler = vi.fn();
      const unsubscribe = addLogHandler(handler);

      const logger = createLogger('Test');
      logger.info('Handler test');

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          namespace: 'Test',
          message: 'Handler test',
        })
      );

      unsubscribe();
    });

    it('can unsubscribe handlers', () => {
      configureLogger({ minLevel: 'debug' });
      const handler = vi.fn();
      const unsubscribe = addLogHandler(handler);

      unsubscribe();

      const logger = createLogger('Test');
      logger.info('Should not call handler');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('pre-created loggers', () => {
    it('has loggers for common namespaces', () => {
      expect(loggers).toHaveProperty('claude');
      expect(loggers).toHaveProperty('policy');
      expect(loggers).toHaveProperty('serial');
      expect(loggers).toHaveProperty('vision');
      expect(loggers).toHaveProperty('ai');
    });
  });

  describe('data logging', () => {
    it('includes data in log entries', () => {
      configureLogger({ minLevel: 'debug' });
      const handler = vi.fn();
      addLogHandler(handler);

      const logger = createLogger('Test');
      const testData = { foo: 'bar', count: 42 };
      logger.info('Message with data', testData);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          data: testData,
        })
      );
    });
  });
});
