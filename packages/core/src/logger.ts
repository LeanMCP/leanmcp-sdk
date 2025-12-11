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
  /**
   * Enable or disable ANSI colors. Defaults to true.
   */
  colorize?: boolean;
  /**
   * Provide additional metadata context (e.g. module name)
   */
  context?: string;
  /**
   * Optional third-party handlers (PostHog, Sentry, etc.)
   * They receive the structured payload for easy integration.
   */
  handlers?: LoggerHandler[];
}

export interface LogPayload {
  level: LogLevel;
  levelLabel: string;
  message: string;
  args: any[];
  prefix?: string;
  context?: string;
  timestamp: string;
}

export type LoggerHandler = (payload: LogPayload) => void;

const COLORS = {
  reset: '\u001b[0m',
  gray: '\u001b[38;5;244m',
  blue: '\u001b[1;34m',
  amber: '\u001b[38;5;214m',
  red: '\u001b[1;31m'
};

const levelStyles: Record<LogLevel, { label: string; color: string }> = {
  [LogLevel.DEBUG]: { label: 'DEBUG', color: COLORS.gray },
  [LogLevel.INFO]: { label: 'INFO', color: COLORS.blue },
  [LogLevel.WARN]: { label: 'WARN', color: COLORS.amber },
  [LogLevel.ERROR]: { label: 'ERROR', color: COLORS.red },
  [LogLevel.NONE]: { label: 'NONE', color: COLORS.gray }
};

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private timestamps: boolean;
  private colorize: boolean;
  private context?: string;
  private handlers: LoggerHandler[];

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.prefix = options.prefix ?? '';
    this.timestamps = options.timestamps ?? true;
    this.colorize = options.colorize ?? true;
    this.context = options.context;
    this.handlers = options.handlers ?? [];
  }

  private format(level: LogLevel, message: string): string {
    const style = levelStyles[level];
    const timestamp = this.timestamps ? `[${new Date().toISOString()}]` : '';
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    const context = this.context ? `[${this.context}]` : '';
    const label = `[${style.label}]`;

    const parts = `${timestamp}${prefix}${context}${label} ${message}`;
    if (!this.colorize) return parts;

    return `${style.color}${parts}${COLORS.reset}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level && this.level !== LogLevel.NONE;
  }

  private emit(level: LogLevel, message: string, consoleFn: (...args: any[]) => void, ...args: any[]): void {
    if (!this.shouldLog(level)) return;

    const payload: LogPayload = {
      level,
      levelLabel: levelStyles[level].label,
      message,
      args,
      prefix: this.prefix,
      context: this.context,
      timestamp: new Date().toISOString()
    };

    consoleFn(this.format(level, message), ...args);
    this.handlers.forEach(handler => {
      try {
        handler(payload);
      } catch (err) {
        // Avoid breaking logging pipeline due to handler errors
        console.debug('Logger handler error', err);
      }
    });
  }

  debug(message: string, ...args: any[]): void {
    this.emit(LogLevel.DEBUG, message, console.debug, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.emit(LogLevel.INFO, message, console.info, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.emit(LogLevel.WARN, message, console.warn, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.emit(LogLevel.ERROR, message, console.error, ...args);
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
