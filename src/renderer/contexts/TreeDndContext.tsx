// src/renderer/contexts/TreeDndContext.tsx
import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useVault } from './VaultContext'
import type { VaultItem } from '@shared/types'

interface TreeDndContextValue {
  activeId: string | null
  activeItem: VaultItem | null
}

const TreeDndContext = createContext<TreeDndContextValue | null>(null)

export function useTreeDnd() {
  const context = useContext(TreeDndContext)
  if (!context) {
    throw new Error('useTreeDnd must be used within TreeDndProvider')
  }
  return context
}

interface TreeDndProviderProps {
  children: ReactNode
}

export function TreeDndProvider({ children }: TreeDndProviderProps) {
  const { items } = useVault()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeItem, setActiveItem] = useState<VaultItem | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id)
    setActiveId(id)
    const item = items.get(id)
    if (item) setActiveItem(item)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    setActiveItem(null)
    // Tree-specific handling will be added in later tasks
    void event
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setActiveItem(null)
  }

  return (
    <TreeDndContext.Provider value={{ activeId, activeItem }}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {activeItem && (
            <div className="px-3 py-2 bg-gray-700 rounded shadow-lg text-sm text-gray-200">
              {activeItem.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </TreeDndContext.Provider>
  )
}
