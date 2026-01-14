import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { UIProvider, useUI } from './UIContext'

const wrapper = ({ children }: { children: ReactNode }) => (
  <UIProvider>{children}</UIProvider>
)

describe('UIContext navigation history', () => {
  it('starts with no back/forward history', () => {
    const { result } = renderHook(() => useUI(), { wrapper })
    expect(result.current.canGoBack).toBe(false)
    expect(result.current.canGoForward).toBe(false)
  })

  it('navigates and supports back/forward', () => {
    const { result } = renderHook(() => useUI(), { wrapper })

    act(() => {
      result.current.setSelectedView('project', '/test')
    })
    act(() => {
      result.current.setSelectedTaskId('task-1')
    })

    expect(result.current.canGoBack).toBe(true)

    act(() => {
      result.current.goBack()
    })

    expect(result.current.selectedTaskId).toBe(null)
    expect(result.current.canGoForward).toBe(true)

    act(() => {
      result.current.goForward()
    })

    expect(result.current.selectedTaskId).toBe('task-1')
  })
})
