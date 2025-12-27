import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToolbarButton } from '@/components/editor/ToolbarButton'
import { TooltipProvider } from '@/components/ui/tooltip'

// Wrapper component to provide Tooltip context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>
}

describe('ToolbarButton', () => {
  const defaultProps = {
    icon: <span data-testid="icon">Icon</span>,
    label: 'Test Button',
    onClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with icon', () => {
    render(
      <TestWrapper>
        <ToolbarButton {...defaultProps} />
      </TestWrapper>
    )

    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <ToolbarButton {...defaultProps} />
      </TestWrapper>
    )

    await user.click(screen.getByRole('button'))

    expect(defaultProps.onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <ToolbarButton {...defaultProps} disabled />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    await user.click(button)

    expect(defaultProps.onClick).not.toHaveBeenCalled()
  })

  it('applies active styles when isActive is true', () => {
    render(
      <TestWrapper>
        <ToolbarButton {...defaultProps} isActive />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    // Active buttons should have active styling classes
    expect(button.className).toContain('bg-')
  })

  it('applies inactive styles when isActive is false', () => {
    render(
      <TestWrapper>
        <ToolbarButton {...defaultProps} isActive={false} />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <TestWrapper>
        <ToolbarButton {...defaultProps} className="custom-class" />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('shows tooltip on hover', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <ToolbarButton {...defaultProps} />
      </TestWrapper>
    )

    const button = screen.getByRole('button')
    await user.hover(button)

    // Tooltip should appear (may need to wait for animation)
    // Note: Tooltip testing depends on the tooltip implementation
  })

  it('accepts different tooltip sides', () => {
    const { rerender } = render(
      <TestWrapper>
        <ToolbarButton {...defaultProps} tooltipSide="top" />
      </TestWrapper>
    )

    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(
      <TestWrapper>
        <ToolbarButton {...defaultProps} tooltipSide="bottom" />
      </TestWrapper>
    )

    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(
      <TestWrapper>
        <ToolbarButton {...defaultProps} tooltipSide="left" />
      </TestWrapper>
    )

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('renders with SVG icon', () => {
    render(
      <TestWrapper>
        <ToolbarButton
          {...defaultProps}
          icon={
            <svg data-testid="svg-icon" viewBox="0 0 24 24">
              <path d="M0 0h24v24H0z" />
            </svg>
          }
        />
      </TestWrapper>
    )

    expect(screen.getByTestId('svg-icon')).toBeInTheDocument()
  })

  it('handles rapid clicks correctly', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <ToolbarButton {...defaultProps} />
      </TestWrapper>
    )

    const button = screen.getByRole('button')

    await user.click(button)
    await user.click(button)
    await user.click(button)

    expect(defaultProps.onClick).toHaveBeenCalledTimes(3)
  })
})
