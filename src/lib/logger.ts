/**
 * Structured Logging Utility
 * Provides consistent, leveled logging across the application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, any>;
  error?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 1000;

  log(
    level: LogLevel,
    module: string,
    message: string,
    data?: Record<string, any>,
    error?: Error
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      ...(data && { data }),
      ...(error && { error: error.message }),
    };

    // Store in history for debugging
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Format for console output
    const prefix = `[${module}]`;
    const timestamp = this.isDevelopment ? `${entry.timestamp} ` : '';

    // Only log based on level in production
    const shouldLog =
      this.isDevelopment ||
      level === 'warn' ||
      level === 'error';

    if (!shouldLog) return;

    const logFn = {
      debug: this.isDevelopment ? console.debug : () => {},
      info: this.isDevelopment ? console.log : () => {},
      warn: console.warn,
      error: console.error,
    }[level];

    if (data) {
      logFn(`${timestamp}${prefix} ${message}`, data);
    } else {
      logFn(`${timestamp}${prefix} ${message}`);
    }

    if (error) {
      logFn(`${prefix} Error:`, error);
    }
  }

  debug(module: string, message: string, data?: Record<string, any>) {
    this.log('debug', module, message, data);
  }

  info(module: string, message: string, data?: Record<string, any>) {
    this.log('info', module, message, data);
  }

  warn(module: string, message: string, data?: Record<string, any>) {
    this.log('warn', module, message, data);
  }

  error(module: string, message: string, error?: Error, data?: Record<string, any>) {
    this.log('error', module, message, data, error);
  }

  /**
   * Get recent log history (for debugging)
   */
  getHistory(limit = 100): LogEntry[] {
    return this.logHistory.slice(-limit);
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }
}

export const logger = new Logger();

/**
 * Payment module logger
 */
export const paymentLogger = {
  debug: (msg: string, data?: any) => logger.debug('Payment', msg, data),
  info: (msg: string, data?: any) => logger.info('Payment', msg, data),
  warn: (msg: string, data?: any) => logger.warn('Payment', msg, data),
  error: (msg: string, error?: Error, data?: any) =>
    logger.error('Payment', msg, error, data),
};

/**
 * CashApp module logger
 */
export const cashappLogger = {
  debug: (msg: string, data?: any) => logger.debug('CashApp', msg, data),
  info: (msg: string, data?: any) => logger.info('CashApp', msg, data),
  warn: (msg: string, data?: any) => logger.warn('CashApp', msg, data),
  error: (msg: string, error?: Error, data?: any) =>
    logger.error('CashApp', msg, error, data),
};

/**
 * Admin store logger
 */
export const storeLogger = {
  debug: (msg: string, data?: any) => logger.debug('AdminStore', msg, data),
  info: (msg: string, data?: any) => logger.info('AdminStore', msg, data),
  warn: (msg: string, data?: any) => logger.warn('AdminStore', msg, data),
  error: (msg: string, error?: Error, data?: any) =>
    logger.error('AdminStore', msg, error, data),
};
