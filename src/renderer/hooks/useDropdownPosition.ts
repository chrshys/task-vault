import { useState, useEffect, useLayoutEffect, useCallback, RefObject } from 'react'

interface DropdownPosition {
  top?: number
  bottom?: number
  left?: number
  right?: number
  /** Maximum height available in the positioned direction */
  maxHeight?: number
}

interface UseDropdownPositionOptions {
  /** Width of the dropdown in pixels */
  width?: number
  /** Height of the dropdown in pixels (estimated, for vertical positioning) */
  height?: number
  /** Padding from viewport edges */
  padding?: number
  /** Prefer positioning above the trigger if space allows */
  preferTop?: boolean
  /** Horizontal alignment preference */
  align?: 'left' | 'right' | 'center'
}

const DEFAULT_OPTIONS: Required<UseDropdownPositionOptions> = {
  width: 320,
  height: 400,
  padding: 8,
  preferTop: false,
  align: 'right',
}

function calculatePosition(
  trigger: HTMLElement,
  options: Required<UseDropdownPositionOptions>
): DropdownPosition {
  const { width, height, padding, preferTop, align } = options
  const rect = trigger.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const newPosition: DropdownPosition = {}

  // Vertical positioning
  const spaceBelow = viewportHeight - rect.bottom - padding
  const spaceAbove = rect.top - padding

  if (preferTop && spaceAbove >= height) {
    // Position above
    newPosition.bottom = viewportHeight - rect.top + 4
    newPosition.maxHeight = spaceAbove - 4
  } else if (spaceBelow >= height || spaceBelow >= spaceAbove) {
    // Position below (default)
    newPosition.top = rect.bottom + 4
    newPosition.maxHeight = spaceBelow - 4
  } else {
    // Position above (not enough space below)
    newPosition.bottom = viewportHeight - rect.top + 4
    newPosition.maxHeight = spaceAbove - 4
  }

  // Horizontal positioning
  if (align === 'right') {
    // Try right-aligned first
    if (rect.right >= width + padding) {
      newPosition.right = viewportWidth - rect.right
    } else {
      // Fall back to left-aligned
      newPosition.left = Math.max(padding, rect.left)
    }
  } else if (align === 'left') {
    // Try left-aligned first
    if (viewportWidth - rect.left >= width + padding) {
      newPosition.left = rect.left
    } else {
      // Fall back to right-aligned
      newPosition.right = Math.max(padding, viewportWidth - rect.right)
    }
  } else {
    // Center alignment
    const centerLeft = rect.left + rect.width / 2 - width / 2
    if (centerLeft >= padding && centerLeft + width <= viewportWidth - padding) {
      newPosition.left = centerLeft
    } else if (centerLeft < padding) {
      newPosition.left = padding
    } else {
      newPosition.right = padding
    }
  }

  return newPosition
}

/**
 * Hook to calculate dropdown position that stays within viewport bounds.
 *
 * Usage:
 * ```tsx
 * const triggerRef = useRef<HTMLButtonElement>(null)
 * const [isOpen, setIsOpen] = useState(false)
 * const position = useDropdownPosition(triggerRef, isOpen, { width: 320 })
 *
 * return (
 *   <>
 *     <button ref={triggerRef}>Open</button>
 *     {isOpen && position && (
 *       <div className="fixed" style={position}>...</div>
 *     )}
 *   </>
 * )
 * ```
 */
export function useDropdownPosition(
  triggerRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  options: UseDropdownPositionOptions = {}
): DropdownPosition | null {
  const [position, setPosition] = useState<DropdownPosition | null>(null)

  const { width, height, padding, preferTop, align } = { ...DEFAULT_OPTIONS, ...options }

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) {
      setPosition(null)
      return
    }
    setPosition(calculatePosition(trigger, { width, height, padding, preferTop, align }))
  }, [triggerRef, width, height, padding, preferTop, align])

  // Use useLayoutEffect for initial position calculation (synchronous DOM measurement)
  // This is intentional - we need to measure DOM and set position before paint
  useLayoutEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      updatePosition()
    } else {
      setPosition(null)
    }
  }, [isOpen, updatePosition])

  // Subscribe to scroll and resize events for repositioning
  useEffect(() => {
    if (!isOpen) return

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, updatePosition])

  return position
}
