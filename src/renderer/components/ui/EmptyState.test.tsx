import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No items" description="Add some items" />)
    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByText('Add some items')).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    render(<EmptyState title="Empty" icon="(tada)" />)
    expect(screen.getByText('(tada)')).toBeInTheDocument()
  })

  it('calls action onClick when button clicked', () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Add Item', onClick }}
      />
    )
    fireEvent.click(screen.getByText('Add Item'))
    expect(onClick).toHaveBeenCalled()
  })
})
