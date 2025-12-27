import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useViewMode, type PageType } from '@/hooks/use-view-mode'

describe('useViewMode', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {}
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        store = {}
      }),
    }
  })()

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return grid as default view mode', () => {
    const { result } = renderHook(() => useViewMode('screenplays'))
    const [viewMode] = result.current
    expect(viewMode).toBe('grid')
  })

  it('should persist view mode to localStorage', () => {
    const { result } = renderHook(() => useViewMode('screenplays'))
    const [, setViewMode] = result.current

    act(() => {
      setViewMode('list')
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'viewModePreferences_screenplays',
      'list'
    )
  })

  it('should use different storage keys for different page types', () => {
    const { result: result1 } = renderHook(() => useViewMode('screenplays'))
    const { result: result2 } = renderHook(() => useViewMode('projects'))

    act(() => {
      result1.current[1]('list')
      result2.current[1]('grid')
    })

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'viewModePreferences_screenplays',
      'list'
    )
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'viewModePreferences_projects',
      'grid'
    )
  })

  it('should read stored view mode from localStorage', () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'viewModePreferences_home') return 'list'
      return null
    })

    const { result } = renderHook(() => useViewMode('home'))

    // After hydration, should read from localStorage
    expect(result.current[0]).toBe('list')
  })

  it('should handle invalid localStorage values gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid-value')

    const { result } = renderHook(() => useViewMode('screenplays'))

    // Should fallback to default 'grid'
    expect(result.current[0]).toBe('grid')
  })

  it('should update view mode when setter is called', () => {
    const { result } = renderHook(() => useViewMode('series'))

    act(() => {
      result.current[1]('list')
    })

    expect(result.current[0]).toBe('list')

    act(() => {
      result.current[1]('grid')
    })

    expect(result.current[0]).toBe('grid')
  })

  it('should work with all page types', () => {
    const pageTypes: PageType[] = ['screenplays', 'projects', 'series', 'home', 'shared']

    pageTypes.forEach((pageType) => {
      const { result } = renderHook(() => useViewMode(pageType))
      expect(result.current[0]).toBe('grid')

      act(() => {
        result.current[1]('list')
      })

      expect(result.current[0]).toBe('list')
    })
  })
})
