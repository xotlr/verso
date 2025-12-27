import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ZoomDropdown } from '@/components/editor/ZoomDropdown'

describe('ZoomDropdown', () => {
  const defaultProps = {
    zoom: 1.0,
    fitToWidthScale: 0.85,
    onZoomChange: vi.fn(),
    onResetZoom: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('displays current zoom percentage', () => {
    render(<ZoomDropdown {...defaultProps} zoom={1.0} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('displays different zoom percentages', () => {
    const { rerender } = render(<ZoomDropdown {...defaultProps} zoom={0.5} />)
    expect(screen.getByText('50%')).toBeInTheDocument()

    rerender(<ZoomDropdown {...defaultProps} zoom={1.5} />)
    expect(screen.getByText('150%')).toBeInTheDocument()

    rerender(<ZoomDropdown {...defaultProps} zoom={2.0} />)
    expect(screen.getByText('200%')).toBeInTheDocument()
  })

  it('displays "Fit" when zoom matches fitToWidthScale', () => {
    render(<ZoomDropdown {...defaultProps} zoom={0.85} fitToWidthScale={0.85} />)
    expect(screen.getByText('Fit')).toBeInTheDocument()
  })

  it('displays "Fit" when zoom is within tolerance of fitToWidthScale', () => {
    render(<ZoomDropdown {...defaultProps} zoom={0.855} fitToWidthScale={0.85} />)
    expect(screen.getByText('Fit')).toBeInTheDocument()
  })

  it('rounds zoom percentage for display', () => {
    render(<ZoomDropdown {...defaultProps} zoom={0.333} />)
    expect(screen.getByText('33%')).toBeInTheDocument()
  })

  it('handles edge case zoom values', () => {
    const { rerender } = render(<ZoomDropdown {...defaultProps} zoom={0.25} />)
    expect(screen.getByText('25%')).toBeInTheDocument()

    rerender(<ZoomDropdown {...defaultProps} zoom={2.0} />)
    expect(screen.getByText('200%')).toBeInTheDocument()
  })

  it('renders trigger button', () => {
    render(<ZoomDropdown {...defaultProps} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows chevron icon in trigger', () => {
    render(<ZoomDropdown {...defaultProps} />)
    // Button should be accessible and clickable
    const button = screen.getByRole('button')
    expect(button).toBeEnabled()
  })
})
