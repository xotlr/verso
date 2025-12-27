import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEditorZoom, ZOOM_PRESETS } from '@/hooks/editor/use-editor-zoom'
import { RefObject } from 'react'

describe('useEditorZoom', () => {
  let containerRef: RefObject<HTMLDivElement>
  let scrollContainerRef: RefObject<HTMLDivElement>
  let container: HTMLDivElement
  let scrollContainer: HTMLDivElement

  beforeEach(() => {
    // Create DOM elements
    container = document.createElement('div')
    scrollContainer = document.createElement('div')
    document.body.appendChild(container)
    document.body.appendChild(scrollContainer)

    // Create refs
    containerRef = { current: container }
    scrollContainerRef = { current: scrollContainer }

    vi.useFakeTimers()
  })

  afterEach(() => {
    document.body.removeChild(container)
    document.body.removeChild(scrollContainer)
    vi.restoreAllMocks()
  })

  it('should initialize with fitToWidthScale', () => {
    const { result } = renderHook(() =>
      useEditorZoom({
        containerRef,
        scrollContainerRef,
        fitToWidthScale: 0.8,
      })
    )

    expect(result.current.zoom).toBe(0.8)
    expect(result.current.fitToWidthScale).toBe(0.8)
  })

  it('should clamp zoom to min/max values', () => {
    const { result } = renderHook(() =>
      useEditorZoom({
        containerRef,
        scrollContainerRef,
        fitToWidthScale: 1.0,
        minZoom: 0.5,
        maxZoom: 1.5,
      })
    )

    // Try to set below minimum
    act(() => {
      result.current.setZoom(0.1)
    })
    expect(result.current.zoom).toBe(0.5)

    // Try to set above maximum
    act(() => {
      result.current.setZoom(3.0)
    })
    expect(result.current.zoom).toBe(1.5)
  })

  it('should zoom in to next preset', () => {
    const { result } = renderHook(() =>
      useEditorZoom({
        containerRef,
        scrollContainerRef,
        fitToWidthScale: 1.0,
      })
    )

    act(() => {
      result.current.zoomIn()
    })

    expect(result.current.zoom).toBe(1.25) // Next preset after 1.0
  })

  it('should zoom out to previous preset', () => {
    const { result } = renderHook(() =>
      useEditorZoom({
        containerRef,
        scrollContainerRef,
        fitToWidthScale: 1.0,
      })
    )

    act(() => {
      result.current.zoomOut()
    })

    expect(result.current.zoom).toBe(0.75) // Previous preset before 1.0
  })

  it('should reset zoom to fitToWidthScale', () => {
    const { result } = renderHook(() =>
      useEditorZoom({
        containerRef,
        scrollContainerRef,
        fitToWidthScale: 0.9,
      })
    )

    // Zoom to a different value
    act(() => {
      result.current.setZoom(1.5)
    })
    expect(result.current.zoom).toBe(1.5)
    expect(result.current.isZoomed).toBe(true)

    // Reset
    act(() => {
      result.current.resetZoom()
    })
    expect(result.current.zoom).toBe(0.9)
    expect(result.current.isZoomed).toBe(false)
  })

  it('should set isZoomed flag when manually zoomed', () => {
    const { result } = renderHook(() =>
      useEditorZoom({
        containerRef,
        scrollContainerRef,
        fitToWidthScale: 1.0,
      })
    )

    expect(result.current.isZoomed).toBe(false)

    act(() => {
      result.current.setZoom(1.5)
    })

    expect(result.current.isZoomed).toBe(true)
  })

  it('should call onZoomChange callback when zoom changes', () => {
    const onZoomChange = vi.fn()

    const { result } = renderHook(() =>
      useEditorZoom({
        containerRef,
        scrollContainerRef,
        fitToWidthScale: 1.0,
        onZoomChange,
      })
    )

    act(() => {
      result.current.setZoom(1.25)
    })

    expect(onZoomChange).toHaveBeenCalledWith(1.25)
  })

  it('should apply zoom to CSS variable on scroll container', () => {
    renderHook(() =>
      useEditorZoom({
        containerRef,
        scrollContainerRef,
        fitToWidthScale: 0.75,
      })
    )

    expect(scrollContainer.style.getPropertyValue('--editor-zoom')).toBe('0.75')
  })

  it('should have correct zoom presets', () => {
    expect(ZOOM_PRESETS).toEqual([0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0])
  })

  it('should not go below minimum zoom preset on zoomOut', () => {
    const { result } = renderHook(() =>
      useEditorZoom({
        containerRef,
        scrollContainerRef,
        fitToWidthScale: 0.25,
      })
    )

    act(() => {
      result.current.zoomOut()
    })

    expect(result.current.zoom).toBe(0.25) // Should stay at min
  })

  it('should not go above maximum zoom preset on zoomIn', () => {
    const { result } = renderHook(() =>
      useEditorZoom({
        containerRef,
        scrollContainerRef,
        fitToWidthScale: 2.0,
      })
    )

    act(() => {
      result.current.zoomIn()
    })

    expect(result.current.zoom).toBe(2.0) // Should stay at max
  })

  it('should update zoom when fitToWidthScale changes (if not manually zoomed)', () => {
    const { result, rerender } = renderHook(
      ({ fitToWidthScale }) =>
        useEditorZoom({
          containerRef,
          scrollContainerRef,
          fitToWidthScale,
        }),
      { initialProps: { fitToWidthScale: 0.8 } }
    )

    expect(result.current.zoom).toBe(0.8)

    rerender({ fitToWidthScale: 0.9 })

    expect(result.current.zoom).toBe(0.9)
  })

  it('should not update zoom when fitToWidthScale changes if manually zoomed', () => {
    const { result, rerender } = renderHook(
      ({ fitToWidthScale }) =>
        useEditorZoom({
          containerRef,
          scrollContainerRef,
          fitToWidthScale,
        }),
      { initialProps: { fitToWidthScale: 0.8 } }
    )

    // Manually zoom
    act(() => {
      result.current.setZoom(1.5)
    })

    expect(result.current.zoom).toBe(1.5)

    // Change fitToWidthScale
    rerender({ fitToWidthScale: 0.9 })

    // Should keep manual zoom, not update to fitToWidthScale
    expect(result.current.zoom).toBe(1.5)
  })
})
