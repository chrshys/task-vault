import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SubtaskList } from './SubtaskList'

// Mock the context
vi.mock('../../contexts/VaultContext', () => ({
  useVault: () => ({
    getSubtasks: vi.fn(() => []),
    createSubtask: vi.fn(),
    updateItem: vi.fn(),
  }),
}))

describe('SubtaskList', () => {
  it('renders add subtask input', () => {
    render(<SubtaskList parentId="test123" />)
    expect(screen.getByPlaceholderText('Add subtask...')).toBeInTheDocument()
  })

  it('shows subtask count', () => {
    render(<SubtaskList parentId="test123" />)
    expect(screen.getByText(/Subtasks/)).toBeInTheDocument()
  })

  it('shows add button when input is focused', () => {
    render(<SubtaskList parentId="test123" />)
    const input = screen.getByPlaceholderText('Add subtask...')
    fireEvent.focus(input)
    expect(screen.getByText('Add')).toBeInTheDocument()
  })
})
