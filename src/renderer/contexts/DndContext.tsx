import {
  DndContext as DndKitContext,
  DragEndEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { useState, type ReactNode } from 'react'
import { useVault } from './VaultContext'
import type { VaultItem, TaskMeta } from '@shared/types'
import path from 'path-browserify'

interface DndProviderProps {
  children: ReactNode
}

export function DndProvider({ children }: DndProviderProps) {
  const { items, updateItem } = useVault()
  const [activeItem, setActiveItem] = useState<VaultItem | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  )

  const handleDragStart = (event: { active: { id: string | number } }) => {
    const item = items.get(String(event.active.id))
    if (item) setActiveItem(item)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveItem(null)

    if (!over || active.id === over.id) return

    const draggedItem = items.get(String(active.id))
    const targetFolder = String(over.id)

    if (!draggedItem || draggedItem.meta.type === 'folder' || draggedItem.meta.type === 'project') {
      return
    }

    // Move file to new folder
    const filename = path.basename(draggedItem.path)
    const newPath = path.join(targetFolder, filename)

    if (newPath !== draggedItem.path) {
      await updateItem({
        ...draggedItem,
        path: newPath,
        meta: { ...draggedItem.meta, modified: new Date().toISOString() } as TaskMeta,
      })
    }
  }

  const handleDragCancel = () => {
    setActiveItem(null)
  }

  return (
    <DndKitContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay>
        {activeItem && (
          <div className="px-3 py-2 bg-gray-700 rounded shadow-lg text-sm text-gray-200">
            {activeItem.title}
          </div>
        )}
      </DragOverlay>
    </DndKitContext>
  )
}
