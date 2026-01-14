import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isStorageAvailable,
  safeGetItem,
  safeSetItem,
  safeRemoveItem,
  getStorageErrorMessage,
  type StorageError,
} from '@/lib/storage'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: () => {
      store = {}
    },
  }
})()

describe('isStorageAvailable', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should return true when localStorage is available', () => {
    expect(isStorageAvailable()).toBe(true)
  })

  it('should return false when localStorage throws on setItem', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('Storage disabled')
    })
    expect(isStorageAvailable()).toBe(false)
  })

  it('should return false when localStorage throws on removeItem', () => {
    localStorageMock.removeItem.mockImplementationOnce(() => {
      throw new Error('Storage disabled')
    })
    expect(isStorageAvailable()).toBe(false)
  })
})

describe('safeGetItem', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should return stored data successfully', () => {
    localStorageMock.setItem('test', JSON.stringify({ foo: 'bar' }))
    const result = safeGetItem<{ foo: string }>('test')
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ foo: 'bar' })
  })

  it('should return undefined for non-existent key', () => {
    const result = safeGetItem('nonexistent')
    expect(result.success).toBe(true)
    expect(result.data).toBeUndefined()
  })

  it('should return STORAGE_UNAVAILABLE when storage is not available', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('Storage disabled')
    })
    const result = safeGetItem('test')
    expect(result.success).toBe(false)
    expect(result.error).toBe('STORAGE_UNAVAILABLE')
  })

  it('should return PARSE_ERROR for invalid JSON', () => {
    localStorageMock.getItem.mockReturnValueOnce('not valid json {')
    const result = safeGetItem('test')
    expect(result.success).toBe(false)
    expect(result.error).toBe('PARSE_ERROR')
  })

  describe('with validator', () => {
    const isUserData = (data: unknown): data is { name: string; age: number } => {
      return (
        typeof data === 'object' &&
        data !== null &&
        'name' in data &&
        'age' in data &&
        typeof (data as { name: unknown }).name === 'string' &&
        typeof (data as { age: unknown }).age === 'number'
      )
    }

    it('should return data when validator passes', () => {
      localStorageMock.setItem('user', JSON.stringify({ name: 'John', age: 30 }))
      const result = safeGetItem('user', isUserData)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'John', age: 30 })
    })

    it('should return VALIDATION_ERROR when validator fails', () => {
      localStorageMock.setItem('user', JSON.stringify({ name: 'John' })) // missing age
      const result = safeGetItem('user', isUserData)
      expect(result.success).toBe(false)
      expect(result.error).toBe('VALIDATION_ERROR')
    })

    it('should return VALIDATION_ERROR for wrong data type', () => {
      localStorageMock.setItem('user', JSON.stringify('not an object'))
      const result = safeGetItem('user', isUserData)
      expect(result.success).toBe(false)
      expect(result.error).toBe('VALIDATION_ERROR')
    })
  })

  it('should handle arrays', () => {
    localStorageMock.setItem('list', JSON.stringify([1, 2, 3]))
    const result = safeGetItem<number[]>('list')
    expect(result.success).toBe(true)
    expect(result.data).toEqual([1, 2, 3])
  })

  it('should handle primitive values', () => {
    localStorageMock.setItem('count', JSON.stringify(42))
    const result = safeGetItem<number>('count')
    expect(result.success).toBe(true)
    expect(result.data).toBe(42)
  })

  it('should handle null value', () => {
    localStorageMock.setItem('nullable', JSON.stringify(null))
    const result = safeGetItem<null>('nullable')
    expect(result.success).toBe(true)
    expect(result.data).toBeNull()
  })
})

describe('safeSetItem', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should store data successfully', () => {
    const result = safeSetItem('test', { foo: 'bar' })
    expect(result.success).toBe(true)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test', JSON.stringify({ foo: 'bar' }))
  })

  it('should return STORAGE_UNAVAILABLE when storage is not available', () => {
    // Make isStorageAvailable return false
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('Storage disabled')
    })
    const result = safeSetItem('test', 'value')
    expect(result.success).toBe(false)
    expect(result.error).toBe('STORAGE_UNAVAILABLE')
  })

  it('should return QUOTA_EXCEEDED when storage is full', () => {
    // First call for isStorageAvailable check
    localStorageMock.setItem.mockImplementationOnce(() => {}) // for test key
    localStorageMock.removeItem.mockImplementationOnce(() => {}) // for test key cleanup
    // Second call for actual setItem
    localStorageMock.setItem.mockImplementationOnce(() => {
      const error = new DOMException('Quota exceeded', 'QuotaExceededError')
      throw error
    })
    const result = safeSetItem('test', 'value')
    expect(result.success).toBe(false)
    expect(result.error).toBe('QUOTA_EXCEEDED')
  })

  it('should return STORAGE_UNAVAILABLE for SecurityError', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {})
    localStorageMock.removeItem.mockImplementationOnce(() => {})
    localStorageMock.setItem.mockImplementationOnce(() => {
      const error = new DOMException('Security restriction', 'SecurityError')
      throw error
    })
    const result = safeSetItem('test', 'value')
    expect(result.success).toBe(false)
    expect(result.error).toBe('STORAGE_UNAVAILABLE')
  })

  it('should return UNKNOWN_ERROR for other errors', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {})
    localStorageMock.removeItem.mockImplementationOnce(() => {})
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('Some other error')
    })
    const result = safeSetItem('test', 'value')
    expect(result.success).toBe(false)
    expect(result.error).toBe('UNKNOWN_ERROR')
  })

  it('should handle arrays', () => {
    const result = safeSetItem('list', [1, 2, 3])
    expect(result.success).toBe(true)
  })

  it('should handle primitive values', () => {
    const result = safeSetItem('count', 42)
    expect(result.success).toBe(true)
  })

  it('should handle null', () => {
    const result = safeSetItem('nullable', null)
    expect(result.success).toBe(true)
  })
})

describe('safeRemoveItem', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should remove item successfully', () => {
    localStorageMock.setItem('test', 'value')
    const result = safeRemoveItem('test')
    expect(result.success).toBe(true)
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('test')
  })

  it('should succeed when removing non-existent key', () => {
    const result = safeRemoveItem('nonexistent')
    expect(result.success).toBe(true)
  })

  it('should return STORAGE_UNAVAILABLE when storage is not available', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('Storage disabled')
    })
    const result = safeRemoveItem('test')
    expect(result.success).toBe(false)
    expect(result.error).toBe('STORAGE_UNAVAILABLE')
  })

  it('should return UNKNOWN_ERROR on failure', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {})
    localStorageMock.removeItem.mockImplementationOnce(() => {})
    localStorageMock.removeItem.mockImplementationOnce(() => {
      throw new Error('Remove failed')
    })
    const result = safeRemoveItem('test')
    expect(result.success).toBe(false)
    expect(result.error).toBe('UNKNOWN_ERROR')
  })
})

describe('getStorageErrorMessage', () => {
  it('should return correct message for STORAGE_UNAVAILABLE', () => {
    const message = getStorageErrorMessage('STORAGE_UNAVAILABLE')
    expect(message).toContain('not available')
  })

  it('should return correct message for QUOTA_EXCEEDED', () => {
    const message = getStorageErrorMessage('QUOTA_EXCEEDED')
    expect(message).toContain('full')
  })

  it('should return correct message for PARSE_ERROR', () => {
    const message = getStorageErrorMessage('PARSE_ERROR')
    expect(message).toContain('corrupted')
  })

  it('should return correct message for VALIDATION_ERROR', () => {
    const message = getStorageErrorMessage('VALIDATION_ERROR')
    expect(message).toContain('invalid')
  })

  it('should return correct message for UNKNOWN_ERROR', () => {
    const message = getStorageErrorMessage('UNKNOWN_ERROR')
    expect(message).toContain('unexpected')
  })

  it('should return fallback message for unrecognized error', () => {
    const message = getStorageErrorMessage('SOME_NEW_ERROR' as StorageError)
    expect(message).toContain('unexpected')
  })
})

describe('integration scenarios', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should handle round-trip storage of complex objects', () => {
    const data = {
      user: { name: 'John', settings: { theme: 'dark' } },
      items: [1, 2, 3],
      timestamp: '2024-01-01',
    }

    safeSetItem('complex', data)
    const result = safeGetItem<typeof data>('complex')

    expect(result.success).toBe(true)
    expect(result.data).toEqual(data)
  })

  it('should handle update flow', () => {
    // Set initial value
    safeSetItem('counter', 0)

    // Get and update
    const result = safeGetItem<number>('counter')
    expect(result.data).toBe(0)

    safeSetItem('counter', (result.data ?? 0) + 1)

    const updated = safeGetItem<number>('counter')
    expect(updated.data).toBe(1)
  })

  it('should handle delete and recreate flow', () => {
    safeSetItem('temp', 'value')
    expect(safeGetItem('temp').data).toBe('value')

    safeRemoveItem('temp')
    expect(safeGetItem('temp').data).toBeUndefined()

    safeSetItem('temp', 'new value')
    expect(safeGetItem('temp').data).toBe('new value')
  })
})
