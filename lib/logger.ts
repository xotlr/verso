/**
 * Structured logging utility with correlation ID support.
 * Provides consistent, parseable log output for production observability.
 */

import { AsyncLocalStorage } from 'async_hooks'

// AsyncLocalStorage for correlation ID propagation across async boundaries
const correlationStorage = new AsyncLocalStorage<LogContext>()

export interface LogContext {
  correlationId: string
  userId?: string
  path?: string
  method?: string
  userAgent?: string
  ip?: string
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  correlationId: string
  message: string
  userId?: string
  path?: string
  method?: string
  durationMs?: number
  statusCode?: number
  error?: {
    name: string
    message: string
    stack?: string
    code?: string
  }
  meta?: Record<string, unknown>
}

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Minimum log level (configurable via env)
const MIN_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || 'info'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

/**
 * Generate a unique correlation ID.
 * Format: timestamp-random for sortability and uniqueness.
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}`
}

/**
 * Get the current correlation ID from context.
 */
export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId
}

/**
 * Get the full current log context.
 */
export function getLogContext(): LogContext | undefined {
  return correlationStorage.getStore()
}

/**
 * Run a function with a specific log context.
 * All logs within the function will include the correlation ID.
 */
export function withLogContext<T>(context: LogContext, fn: () => T): T {
  return correlationStorage.run(context, fn)
}

/**
 * Run an async function with a specific log context.
 */
export async function withLogContextAsync<T>(
  context: LogContext,
  fn: () => Promise<T>
): Promise<T> {
  return correlationStorage.run(context, fn)
}

/**
 * Format a log entry for output.
 * In production: JSON for log aggregation tools.
 * In development: Human-readable format.
 */
function formatLogEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    // JSON format for production log aggregation (Datadog, CloudWatch, etc.)
    return JSON.stringify(entry)
  }

  // Human-readable format for development
  const { timestamp, level, correlationId, message, userId, path, method, durationMs, statusCode, error, meta } = entry

  const levelColors: Record<LogLevel, string> = {
    debug: '\x1b[90m', // gray
    info: '\x1b[36m',  // cyan
    warn: '\x1b[33m',  // yellow
    error: '\x1b[31m', // red
  }
  const reset = '\x1b[0m'
  const dim = '\x1b[2m'

  let output = `${dim}${timestamp}${reset} ${levelColors[level]}${level.toUpperCase().padEnd(5)}${reset}`
  output += ` ${dim}[${correlationId}]${reset}`

  if (method && path) {
    output += ` ${method} ${path}`
  }

  if (userId) {
    output += ` ${dim}user:${userId.substring(0, 8)}${reset}`
  }

  output += ` ${message}`

  if (statusCode) {
    const statusColor = statusCode >= 500 ? '\x1b[31m' : statusCode >= 400 ? '\x1b[33m' : '\x1b[32m'
    output += ` ${statusColor}${statusCode}${reset}`
  }

  if (durationMs !== undefined) {
    output += ` ${dim}${durationMs}ms${reset}`
  }

  if (error) {
    output += `\n  ${levelColors.error}${error.name}: ${error.message}${reset}`
    if (error.stack && !IS_PRODUCTION) {
      output += `\n${dim}${error.stack}${reset}`
    }
  }

  if (meta && Object.keys(meta).length > 0) {
    output += `\n  ${dim}${JSON.stringify(meta)}${reset}`
  }

  return output
}

/**
 * Write a log entry to the appropriate output.
 */
function writeLog(entry: LogEntry): void {
  // Check if we should log at this level
  if (LOG_LEVELS[entry.level] < LOG_LEVELS[MIN_LOG_LEVEL]) {
    return
  }

  const formatted = formatLogEntry(entry)

  if (entry.level === 'error') {
    console.error(formatted)
  } else if (entry.level === 'warn') {
    console.warn(formatted)
  } else {
    console.log(formatted)
  }
}

/**
 * Create a log entry with context.
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  options: {
    error?: Error
    meta?: Record<string, unknown>
    durationMs?: number
    statusCode?: number
  } = {}
): LogEntry {
  const context = getLogContext()
  const { error, meta, durationMs, statusCode } = options

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    correlationId: context?.correlationId || 'no-context',
    message,
    userId: context?.userId,
    path: context?.path,
    method: context?.method,
    durationMs,
    statusCode,
    meta,
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: IS_PRODUCTION ? undefined : error.stack,
      code: (error as Error & { code?: string }).code,
    }
  }

  return entry
}

/**
 * Logger interface for structured logging.
 */
export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    writeLog(createLogEntry('debug', message, { meta }))
  },

  info(message: string, meta?: Record<string, unknown>): void {
    writeLog(createLogEntry('info', message, { meta }))
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    writeLog(createLogEntry('warn', message, { meta }))
  },

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    writeLog(createLogEntry('error', message, { error, meta }))
  },

  /**
   * Log an HTTP request/response cycle.
   */
  request(options: {
    message: string
    statusCode: number
    durationMs: number
    meta?: Record<string, unknown>
  }): void {
    const level: LogLevel = options.statusCode >= 500 ? 'error' : options.statusCode >= 400 ? 'warn' : 'info'
    writeLog(createLogEntry(level, options.message, options))
  },

  /**
   * Log a security-relevant event.
   */
  security(message: string, meta?: Record<string, unknown>): void {
    writeLog(createLogEntry('warn', `[SECURITY] ${message}`, { meta }))
  },

  /**
   * Log an audit event (user actions on resources).
   */
  audit(action: string, resource: string, resourceId: string, meta?: Record<string, unknown>): void {
    const context = getLogContext()
    writeLog(createLogEntry('info', `[AUDIT] ${action} ${resource}:${resourceId}`, {
      meta: {
        ...meta,
        action,
        resource,
        resourceId,
        userId: context?.userId,
      },
    }))
  },
}

/**
 * Create a child logger with additional context.
 * Useful for adding module-specific context.
 */
export function createLogger(module: string) {
  return {
    debug(message: string, meta?: Record<string, unknown>): void {
      logger.debug(`[${module}] ${message}`, meta)
    },
    info(message: string, meta?: Record<string, unknown>): void {
      logger.info(`[${module}] ${message}`, meta)
    },
    warn(message: string, meta?: Record<string, unknown>): void {
      logger.warn(`[${module}] ${message}`, meta)
    },
    error(message: string, error?: Error, meta?: Record<string, unknown>): void {
      logger.error(`[${module}] ${message}`, error, meta)
    },
  }
}

// Re-export types for consumers
export type { LogEntry }
