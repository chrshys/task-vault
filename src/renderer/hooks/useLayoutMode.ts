import { useMemo } from 'react'
import { useWindowSize } from './useWindowSize'

export type LayoutMode = 'full' | 'compact' | 'mobile'

const BREAKPOINT_FULL = 900
const BREAKPOINT_COMPACT = 480

export function useLayoutMode(): LayoutMode {
  const { width } = useWindowSize()

  return useMemo(() => {
    if (width >= BREAKPOINT_FULL) return 'full'
    if (width >= BREAKPOINT_COMPACT) return 'compact'
    return 'mobile'
  }, [width])
}
