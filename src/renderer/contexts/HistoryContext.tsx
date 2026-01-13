import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { VaultItem } from '@shared/types'

interface HistoryAction {
  type: 'update' | 'create' | 'delete'
  before: VaultItem | null
  after: VaultItem | null
  path: string
}

interface HistoryContextValue {
  canUndo: boolean
  canRedo: boolean
  push: (action: HistoryAction) => void
  undo: () => HistoryAction | null
  redo: () => HistoryAction | null
}

const HistoryContext = createContext<HistoryContextValue | null>(null)

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [past, setPast] = useState<HistoryAction[]>([])
  const [future, setFuture] = useState<HistoryAction[]>([])

  const push = useCallback((action: HistoryAction) => {
    setPast(prev => [...prev.slice(-49), action])
    setFuture([])
  }, [])

  const undo = useCallback(() => {
    if (past.length === 0) return null
    const action = past[past.length - 1]
    setPast(prev => prev.slice(0, -1))
    setFuture(prev => [...prev, action])
    return action
  }, [past])

  const redo = useCallback(() => {
    if (future.length === 0) return null
    const action = future[future.length - 1]
    setFuture(prev => prev.slice(0, -1))
    setPast(prev => [...prev, action])
    return action
  }, [future])

  return (
    <HistoryContext.Provider
      value={{
        canUndo: past.length > 0,
        canRedo: future.length > 0,
        push,
        undo,
        redo,
      }}
    >
      {children}
    </HistoryContext.Provider>
  )
}

export function useHistory() {
  const context = useContext(HistoryContext)
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider')
  }
  return context
}

export type { HistoryAction }
