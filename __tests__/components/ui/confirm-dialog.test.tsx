import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook, act } from '@testing-library/react'
import { ConfirmDialog, useConfirmDialog } from '@/components/ui/confirm-dialog'

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Confirm Action',
    description: 'Are you sure you want to proceed?',
    onConfirm: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders dialog when open', () => {
    render(<ConfirmDialog {...defaultProps} />)

    expect(screen.getByText('Confirm Action')).toBeInTheDocument()
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />)

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument()
  })

  it('renders default button labels', () => {
    render(<ConfirmDialog {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('renders custom button labels', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Delete"
        cancelLabel="Keep"
      />
    )

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument()
  })

  it('calls onConfirm and closes dialog when confirm button clicked', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onCancel and closes dialog when cancel button clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('closes dialog when cancel clicked even without onCancel handler', async () => {
    const user = userEvent.setup()
    render(<ConfirmDialog {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('applies destructive styling when variant is destructive', () => {
    render(<ConfirmDialog {...defaultProps} variant="destructive" />)

    const confirmButton = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmButton).toHaveClass('bg-destructive')
  })

  it('does not apply destructive styling by default', () => {
    render(<ConfirmDialog {...defaultProps} />)

    const confirmButton = screen.getByRole('button', { name: 'Confirm' })
    expect(confirmButton).not.toHaveClass('bg-destructive')
  })
})

describe('useConfirmDialog', () => {
  const options = {
    title: 'Delete Item',
    description: 'This action cannot be undone.',
    confirmLabel: 'Delete',
    cancelLabel: 'Keep',
    variant: 'destructive' as const,
  }

  it('initializes with dialog closed', () => {
    const { result } = renderHook(() => useConfirmDialog(options))

    expect(result.current.isOpen).toBe(false)
  })

  it('opens dialog when confirm is called', () => {
    const { result } = renderHook(() => useConfirmDialog(options))

    act(() => {
      result.current.confirm(() => {})
    })

    expect(result.current.isOpen).toBe(true)
  })

  it('closes dialog when close is called', () => {
    const { result } = renderHook(() => useConfirmDialog(options))

    act(() => {
      result.current.confirm(() => {})
    })
    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.close()
    })
    expect(result.current.isOpen).toBe(false)
  })

  it('returns correct dialogProps', () => {
    const { result } = renderHook(() => useConfirmDialog(options))

    expect(result.current.dialogProps.title).toBe('Delete Item')
    expect(result.current.dialogProps.description).toBe('This action cannot be undone.')
    expect(result.current.dialogProps.confirmLabel).toBe('Delete')
    expect(result.current.dialogProps.cancelLabel).toBe('Keep')
    expect(result.current.dialogProps.variant).toBe('destructive')
  })

  it('executes pending confirm callback when onConfirm is called', () => {
    const { result } = renderHook(() => useConfirmDialog(options))
    const callback = vi.fn()

    act(() => {
      result.current.confirm(callback)
    })

    act(() => {
      result.current.dialogProps.onConfirm()
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(result.current.isOpen).toBe(false)
  })

  it('clears pending callback after confirm', () => {
    const { result } = renderHook(() => useConfirmDialog(options))
    const callback = vi.fn()

    act(() => {
      result.current.confirm(callback)
    })

    act(() => {
      result.current.dialogProps.onConfirm()
    })

    // Call confirm again
    act(() => {
      result.current.dialogProps.onConfirm()
    })

    // Should only have been called once
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('onOpenChange updates isOpen state', () => {
    const { result } = renderHook(() => useConfirmDialog(options))

    act(() => {
      result.current.dialogProps.onOpenChange(true)
    })
    expect(result.current.isOpen).toBe(true)

    act(() => {
      result.current.dialogProps.onOpenChange(false)
    })
    expect(result.current.isOpen).toBe(false)
  })
})
