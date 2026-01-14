import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'panel-sizes'

interface PanelSizes {
  sidebarPx: number
  taskListPercent: number
  taskDetailPercent: number
}

const DEFAULT_SIZES: PanelSizes = {
  sidebarPx: 256,
  taskListPercent: 40,
  taskDetailPercent: 60,
}

export function useLayoutPersistence() {
  const [sizes, setSizesState] = useState<PanelSizes>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_SIZES, ...JSON.parse(stored) }
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_SIZES
  })

  const setSizes = useCallback((newSizes: Partial<PanelSizes>) => {
    setSizesState(prev => ({ ...prev, ...newSizes }))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes))
    } catch {
      // Ignore storage errors
    }
  }, [sizes])

  return { sizes, setSizes }
}
