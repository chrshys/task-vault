import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders when open', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Delete Item"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('Delete Item')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Delete Item"
        message="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.queryByText('Delete Item')).not.toBeInTheDocument()
  })

  it('calls onConfirm when confirm clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="Delete"
        message="Sure?"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="Delete"
        message="Sure?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})
