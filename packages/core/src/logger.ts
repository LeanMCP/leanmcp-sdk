/**
 * Simple configurable logger for LeanMCP SDK
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  timestamps?: boolean;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private timestamps: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.prefix = options.prefix ?? '';
    this.timestamps = options.timestamps ?? true;
  }

  private format(level: string, message: string, ...args: any[]): string {
    const timestamp = this.timestamps ? `[${new Date().toISOString()}]` : '';
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    return `${timestamp}${prefix}[${level}] ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.format('DEBUG', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.format('INFO', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.format('WARN', message), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.format('ERROR', message), ...args);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  getLevel(): LogLevel {
    return this.level;
  }
}

// Default logger instance
export const defaultLogger = new Logger({
  level: LogLevel.INFO,
  prefix: 'LeanMCP'
});
