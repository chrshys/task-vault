import { describe, it, expect, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLayoutMode } from './useLayoutMode'

describe('useLayoutMode', () => {
  const originalInnerWidth = window.innerWidth

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('returns "full" for width >= 900', () => {
    Object.defineProperty(window, 'innerWidth', { value: 900, writable: true })
    const { result } = renderHook(() => useLayoutMode())
    expect(result.current).toBe('full')
  })

  it('returns "compact" for width 480-899', () => {
    Object.defineProperty(window, 'innerWidth', { value: 700, writable: true })
    const { result } = renderHook(() => useLayoutMode())
    expect(result.current).toBe('compact')
  })

  it('returns "mobile" for width < 480', () => {
    Object.defineProperty(window, 'innerWidth', { value: 400, writable: true })
    const { result } = renderHook(() => useLayoutMode())
    expect(result.current).toBe('mobile')
  })
})
