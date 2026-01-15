/**
 * Voiced Error Messages System
 * Contextual, personality-driven error messages
 */

import { pickSmart } from '../../utils';
import type { ErrorContext, ErrorDomain, VoicedError } from './types';
import {
  genericErrors,
  networkErrors,
  authErrors,
  permissionErrors,
  notFoundErrors,
  validationErrors,
  rateLimitErrors,
  uploadErrors,
  exportErrors,
  saveErrors,
  loadErrors,
  deleteErrors,
  createErrors,
  updateErrors,
  conflictErrors,
  timeoutErrors,
  serverErrors,
  parseErrors,
  paymentErrors,
  domainErrors,
  actionFailures,
} from './pools';

export * from './types';
export * from './pools';

/**
 * Error pool lookup by context
 */
const errorPoolsByContext: Record<ErrorContext, VoicedError[]> = {
  GENERIC: genericErrors,
  NETWORK: networkErrors,
  AUTH: authErrors,
  PERMISSION: permissionErrors,
  NOT_FOUND: notFoundErrors,
  VALIDATION: validationErrors,
  RATE_LIMIT: rateLimitErrors,
  FILE_UPLOAD: uploadErrors,
  FILE_EXPORT: exportErrors,
  SAVE: saveErrors,
  LOAD: loadErrors,
  DELETE: deleteErrors,
  CREATE: createErrors,
  UPDATE: updateErrors,
  CONFLICT: conflictErrors,
  TIMEOUT: timeoutErrors,
  SERVER: serverErrors,
  PARSE: parseErrors,
  PAYMENT: paymentErrors,
};

/**
 * Get a voiced error message for a given context
 */
export function getVoicedError(
  context: ErrorContext,
  recentErrors: string[] = [],
  seed?: number
): VoicedError {
  const pool = errorPoolsByContext[context] || genericErrors;
  const messages = pool.map((e) => e.message);
  const selectedMessage = pickSmart(messages, recentErrors, seed ?? Date.now());
  return pool.find((e) => e.message === selectedMessage) || pool[0];
}

/**
 * Get a voiced error message by domain (screenplay, project, etc.)
 */
export function getDomainError(
  domain: ErrorDomain,
  recentErrors: string[] = [],
  seed?: number
): VoicedError {
  const pool = domainErrors[domain] || domainErrors.general || genericErrors;
  const messages = pool.map((e) => e.message);
  const selectedMessage = pickSmart(messages, recentErrors, seed ?? Date.now());
  return pool.find((e) => e.message === selectedMessage) || pool[0];
}

/**
 * Get a voiced "Failed to X" replacement
 */
export function getActionFailure(
  action: keyof typeof actionFailures,
  recentErrors: string[] = [],
  seed?: number
): string {
  const pool = actionFailures[action] || actionFailures.load;
  return pickSmart(pool, recentErrors, seed ?? Date.now());
}

/**
 * Format error with optional action suggestion
 */
export function formatVoicedError(error: VoicedError): string {
  if (error.action) {
    return `${error.message}. ${error.action}`;
  }
  return error.message;
}

/**
 * Detect error context from HTTP status code
 */
export function contextFromStatus(status: number): ErrorContext {
  if (status === 400) return 'VALIDATION';
  if (status === 401) return 'AUTH';
  if (status === 403) return 'PERMISSION';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 410) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMIT';
  if (status === 408) return 'TIMEOUT';
  if (status >= 500) return 'SERVER';
  return 'GENERIC';
}

/**
 * Detect error context from Error object
 */
export function contextFromError(error: unknown): ErrorContext {
  if (!error) return 'GENERIC';

  // Check for AbortError (timeout)
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'TIMEOUT';
  }

  // Check for network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'NETWORK';
  }

  // Check error message patterns
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    if (msg.includes('network') || msg.includes('offline') || msg.includes('connection')) {
      return 'NETWORK';
    }
    if (msg.includes('unauthorized') || msg.includes('authentication') || msg.includes('login')) {
      return 'AUTH';
    }
    if (msg.includes('forbidden') || msg.includes('permission') || msg.includes('access denied')) {
      return 'PERMISSION';
    }
    if (msg.includes('not found') || msg.includes('404')) {
      return 'NOT_FOUND';
    }
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return 'TIMEOUT';
    }
    if (msg.includes('rate limit') || msg.includes('too many')) {
      return 'RATE_LIMIT';
    }
    if (msg.includes('conflict') || msg.includes('duplicate')) {
      return 'CONFLICT';
    }
    if (msg.includes('validation') || msg.includes('invalid')) {
      return 'VALIDATION';
    }
    if (msg.includes('parse') || msg.includes('format')) {
      return 'PARSE';
    }
  }

  return 'GENERIC';
}

/**
 * Get a friendly error message from any error
 * Main utility for replacing "Failed to X" patterns
 */
export function voiceError(
  error: unknown,
  fallbackContext: ErrorContext = 'GENERIC',
  recentErrors: string[] = []
): string {
  const context = contextFromError(error) || fallbackContext;
  const voiced = getVoicedError(context, recentErrors);
  return formatVoicedError(voiced);
}

/**
 * Create a toast-friendly error object
 * Returns { title, description } for toast components
 */
export function toastError(
  error: unknown,
  fallbackContext: ErrorContext = 'GENERIC',
  recentErrors: string[] = []
): { title: string; description?: string } {
  const context = contextFromError(error) || fallbackContext;
  const voiced = getVoicedError(context, recentErrors);

  return {
    title: voiced.message,
    description: voiced.action,
  };
}

/**
 * Quick helpers for common error types
 */
export const voicedErrors = {
  network: (recent: string[] = []) => getVoicedError('NETWORK', recent),
  auth: (recent: string[] = []) => getVoicedError('AUTH', recent),
  permission: (recent: string[] = []) => getVoicedError('PERMISSION', recent),
  notFound: (recent: string[] = []) => getVoicedError('NOT_FOUND', recent),
  validation: (recent: string[] = []) => getVoicedError('VALIDATION', recent),
  rateLimit: (recent: string[] = []) => getVoicedError('RATE_LIMIT', recent),
  upload: (recent: string[] = []) => getVoicedError('FILE_UPLOAD', recent),
  export: (recent: string[] = []) => getVoicedError('FILE_EXPORT', recent),
  save: (recent: string[] = []) => getVoicedError('SAVE', recent),
  load: (recent: string[] = []) => getVoicedError('LOAD', recent),
  delete: (recent: string[] = []) => getVoicedError('DELETE', recent),
  create: (recent: string[] = []) => getVoicedError('CREATE', recent),
  update: (recent: string[] = []) => getVoicedError('UPDATE', recent),
  conflict: (recent: string[] = []) => getVoicedError('CONFLICT', recent),
  timeout: (recent: string[] = []) => getVoicedError('TIMEOUT', recent),
  server: (recent: string[] = []) => getVoicedError('SERVER', recent),
  parse: (recent: string[] = []) => getVoicedError('PARSE', recent),
  payment: (recent: string[] = []) => getVoicedError('PAYMENT', recent),
  generic: (recent: string[] = []) => getVoicedError('GENERIC', recent),
};
