import { useState, useCallback } from 'react'

interface ContextMenuState {
  isOpen: boolean
  x: number
  y: number
  data: unknown
}

export function useContextMenu<T>() {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    data: null,
  })

  const open = useCallback((e: React.MouseEvent, data: T) => {
    e.preventDefault()
    setState({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      data,
    })
  }, [])

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  return {
    isOpen: state.isOpen,
    x: state.x,
    y: state.y,
    data: state.data as T,
    open,
    close,
  }
}
