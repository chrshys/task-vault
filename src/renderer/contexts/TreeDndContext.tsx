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
import { arrayMove } from '@dnd-kit/sortable'
import { useVault } from './VaultContext'
import type { VaultItem, TreeNode, TaskMeta } from '@shared/types'
import path from 'path-browserify'

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
  const { items, updateItem, updateSortOrder } = useVault()
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    try {
      if (!over || active.id === over.id) return

      const activeId = String(active.id)
      const overId = String(over.id)
      const overData = over.data.current as { node?: TreeNode } | undefined

      // Check if this is a task being dropped on a sidebar project
      const draggedItem = items.get(activeId)
      if (!draggedItem) return

      // Only handle task/note items (not folders/projects)
      if (draggedItem.meta.type === 'folder' || draggedItem.meta.type === 'project') return

      // Handle task reordering within the same list (sortable task list)
      const overItem = items.get(overId)
      if (overItem &&
          (draggedItem.meta.type === 'task' || draggedItem.meta.type === 'note') &&
          (overItem.meta.type === 'task' || overItem.meta.type === 'note')) {
        // Get all sibling items in the same directory
        const parentPath = path.dirname(draggedItem.path)
        if (parentPath === path.dirname(overItem.path)) {
          const siblings = Array.from(items.values())
            .filter(i => {
              if (i.meta.type === 'folder' || i.meta.type === 'project') return false
              // Filter out subtasks - only sort top-level items
              if (i.meta.type === 'task' && (i.meta as TaskMeta).parent) return false
              return path.dirname(i.path) === parentPath
            })
            .sort((a, b) => {
              const aOrder = a.meta.sort_order ?? Infinity
              const bOrder = b.meta.sort_order ?? Infinity
              return aOrder - bOrder
            })

          const oldIndex = siblings.findIndex(i => i.id === activeId)
          const newIndex = siblings.findIndex(i => i.id === overId)

          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const reordered = arrayMove(siblings, oldIndex, newIndex)
            for (let i = 0; i < reordered.length; i++) {
              await updateSortOrder(reordered[i].path, i)
            }
            return
          }
        }
      }

      // Check if target is a sidebar project (has node property with type 'project')
      // This handles cross-project task moves
      if (overData?.node?.type === 'project') {
        const targetPath = overData.node.path
        const filename = path.basename(draggedItem.path)
        const newPath = path.join(targetPath, filename)

        if (newPath !== draggedItem.path) {
          await updateItem({
            ...draggedItem,
            path: newPath,
            meta: { ...draggedItem.meta, modified: new Date().toISOString() } as typeof draggedItem.meta,
          })
        }
        return
      }
    } finally {
      setActiveId(null)
      setActiveItem(null)
    }
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
