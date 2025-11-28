/**
 * Safe localStorage utilities with error handling for:
 * - localStorage being disabled (private browsing, security restrictions)
 * - QuotaExceededError (storage full)
 * - Invalid JSON data
 */

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: StorageError;
}

export type StorageError =
  | 'STORAGE_UNAVAILABLE'
  | 'QUOTA_EXCEEDED'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely get an item from localStorage with type validation
 */
export function safeGetItem<T>(
  key: string,
  validator?: (data: unknown) => data is T
): StorageResult<T> {
  try {
    if (!isStorageAvailable()) {
      return { success: false, error: 'STORAGE_UNAVAILABLE' };
    }

    const item = localStorage.getItem(key);
    if (item === null) {
      return { success: true, data: undefined };
    }

    const parsed = JSON.parse(item);

    // If validator provided, use it to validate the data
    if (validator) {
      if (!validator(parsed)) {
        console.warn(`Storage validation failed for key: ${key}`);
        return { success: false, error: 'VALIDATION_ERROR' };
      }
    }

    return { success: true, data: parsed as T };
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.error(`Failed to parse stored data for key: ${key}`, e);
      return { success: false, error: 'PARSE_ERROR' };
    }
    console.error(`Storage error for key: ${key}`, e);
    return { success: false, error: 'UNKNOWN_ERROR' };
  }
}

/**
 * Safely set an item in localStorage
 */
export function safeSetItem<T>(key: string, value: T): StorageResult<void> {
  try {
    if (!isStorageAvailable()) {
      return { success: false, error: 'STORAGE_UNAVAILABLE' };
    }

    localStorage.setItem(key, JSON.stringify(value));
    return { success: true };
  } catch (e) {
    if (e instanceof DOMException) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.error('localStorage quota exceeded');
        return { success: false, error: 'QUOTA_EXCEEDED' };
      }
      if (e.name === 'SecurityError') {
        return { success: false, error: 'STORAGE_UNAVAILABLE' };
      }
    }
    console.error(`Failed to save to localStorage for key: ${key}`, e);
    return { success: false, error: 'UNKNOWN_ERROR' };
  }
}

/**
 * Safely remove an item from localStorage
 */
export function safeRemoveItem(key: string): StorageResult<void> {
  try {
    if (!isStorageAvailable()) {
      return { success: false, error: 'STORAGE_UNAVAILABLE' };
    }

    localStorage.removeItem(key);
    return { success: true };
  } catch (e) {
    console.error(`Failed to remove from localStorage for key: ${key}`, e);
    return { success: false, error: 'UNKNOWN_ERROR' };
  }
}

/**
 * Get user-friendly error message
 */
export function getStorageErrorMessage(error: StorageError): string {
  switch (error) {
    case 'STORAGE_UNAVAILABLE':
      return 'Local storage is not available. Your changes may not be saved.';
    case 'QUOTA_EXCEEDED':
      return 'Storage is full. Please clear some data to save new changes.';
    case 'PARSE_ERROR':
      return 'Saved data was corrupted and could not be loaded.';
    case 'VALIDATION_ERROR':
      return 'Saved data format is invalid and could not be loaded.';
    case 'UNKNOWN_ERROR':
    default:
      return 'An unexpected error occurred with storage.';
  }
}
