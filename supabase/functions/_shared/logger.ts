/**
 * Sistema de Logging Estruturado para Supabase Edge Functions
 * 
 * Fornece logging com níveis, contexto e formato JSON para facilitar
 * debugging e análise de problemas em produção.
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
    const envLevel = (Deno.env.get('LOG_LEVEL') || 'info').toLowerCase() as LogLevel;
    this.level = this.levelValues[envLevel] !== undefined ? envLevel : 'info';
    this.minLevelValue = this.levelValues[this.level];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelValues[level] >= this.minLevelValue;
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext): string {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };
    return JSON.stringify(logEntry);
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatLog('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatLog('error', message, context));
    }
  }

  /**
   * Log de início de operação com timer
   */
  startTimer(operationName: string, context?: LogContext): () => void {
    const startTime = Date.now();
    this.debug(`Starting operation: ${operationName}`, context);

    return () => {
      const duration = Date.now() - startTime;
      this.debug(`Completed operation: ${operationName}`, {
        ...context,
        duration_ms: duration,
      });
    };
  }
}

// Singleton instance
export const logger = new Logger();
