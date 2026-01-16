import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ContextMenuProps {
  x: number
  y: number
  onClose: () => void
  children: ReactNode
}

export function ContextMenu({ x, y, onClose, children }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return createPortal(
    <div
      ref={menuRef}
      className="fixed flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  )
}

interface ContextMenuItemProps {
  onClick: () => void
  variant?: 'default' | 'danger'
  children: ReactNode
}

export function ContextMenuItem({ onClick, variant = 'default', children }: ContextMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 text-left text-sm whitespace-nowrap ${
        variant === 'danger'
          ? 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  )
}
