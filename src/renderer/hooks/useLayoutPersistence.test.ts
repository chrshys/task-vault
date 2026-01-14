import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLayoutPersistence } from './useLayoutPersistence'

describe('useLayoutPersistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns default sizes when no stored value', () => {
    const { result } = renderHook(() => useLayoutPersistence())
    expect(result.current.sizes).toEqual({
      sidebarPx: 256,
      taskListPercent: 40,
      taskDetailPercent: 60,
    })
  })

  it('persists sizes to localStorage', () => {
    const { result } = renderHook(() => useLayoutPersistence())

    act(() => {
      result.current.setSizes({ sidebarPx: 300, taskListPercent: 50, taskDetailPercent: 50 })
    })

    const stored = JSON.parse(localStorage.getItem('panel-sizes') || '{}')
    expect(stored.sidebarPx).toBe(300)
  })

  it('restores sizes from localStorage', () => {
    localStorage.setItem('panel-sizes', JSON.stringify({
      sidebarPx: 200,
      taskListPercent: 45,
      taskDetailPercent: 55,
    }))

    const { result } = renderHook(() => useLayoutPersistence())
    expect(result.current.sizes.sidebarPx).toBe(200)
  })
})
