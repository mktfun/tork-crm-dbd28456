/**
 * Sistema de Logging Estruturado para Frontend
 * 
 * Fornece logging com níveis e contexto para facilitar debugging
 * e análise de problemas no cliente.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private level: LogLevel;
  private minLevelValue: number;

  private levelValues: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    // Em produção, usar 'info'; em desenvolvimento, usar 'debug'
    const envLevel = import.meta.env.MODE === 'production' ? 'info' : 'debug';
    this.level = envLevel as LogLevel;
    this.minLevelValue = this.levelValues[this.level];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelValues[level] >= this.minLevelValue;
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext): any[] {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (context && Object.keys(context).length > 0) {
      return [prefix, message, context];
    }
    return [prefix, message];
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(...this.formatLog('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(...this.formatLog('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatLog('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(...this.formatLog('error', message, context));
    }
  }

  /**
   * Log de performance para operações críticas
   */
  performance(operationName: string, duration: number, context?: LogContext): void {
    this.info(`Performance: ${operationName}`, {
      ...context,
      duration_ms: duration,
    });
  }
}

// Singleton instance
export const logger = new Logger();
