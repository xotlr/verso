import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDebounce } from '@/hooks/use-debounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    expect(result.current).toBe('initial')

    // Change the value
    rerender({ value: 'updated', delay: 500 })

    // Value should still be initial (not yet debounced)
    expect(result.current).toBe('initial')

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Now value should be updated
    expect(result.current).toBe('updated')
  })

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 500 } }
    )

    // Make multiple rapid changes
    rerender({ value: 'b', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    rerender({ value: 'c', delay: 500 })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    rerender({ value: 'd', delay: 500 })

    // Value should still be 'a' (initial)
    expect(result.current).toBe('a')

    // Advance to complete the last debounce
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should be final value
    expect(result.current).toBe('d')
  })

  it('should work with different types', () => {
    // Number
    const { result: numberResult } = renderHook(() => useDebounce(42, 100))
    expect(numberResult.current).toBe(42)

    // Object
    const obj = { name: 'test' }
    const { result: objectResult } = renderHook(() => useDebounce(obj, 100))
    expect(objectResult.current).toEqual({ name: 'test' })

    // Array
    const arr = [1, 2, 3]
    const { result: arrayResult } = renderHook(() => useDebounce(arr, 100))
    expect(arrayResult.current).toEqual([1, 2, 3])
  })

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    )

    rerender({ value: 'updated', delay: 0 })

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(result.current).toBe('updated')
  })

  it('should cleanup timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

    const { unmount, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    // Trigger a debounce
    rerender({ value: 'updated' })

    // Unmount should cleanup
    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
  })
})
