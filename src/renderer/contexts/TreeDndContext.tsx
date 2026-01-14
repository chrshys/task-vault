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
import type { VaultItem, TreeNode, TaskMeta, ProjectMeta } from '@shared/types'
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
  const { items, moveItem, updateSortOrder, vaultPath, setProjectSection, sectionOrder, reorderSections } = useVault()
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
      const activeData = active.data.current as { node?: TreeNode; sectionKey?: string; type?: string } | undefined
      const overData = over.data.current as { node?: TreeNode; sectionName?: string; sectionKey?: string; type?: string } | undefined

      // Check if this is a task being dropped on a sidebar project
      // Handle section reordering
      if (activeData?.type === 'section') {
        const targetKey = overData?.type === 'section'
          ? overData.sectionKey
          : overData?.type === 'project'
            ? overData.sectionKey
            : overData?.sectionName
        const sourceKey = activeData.sectionKey

        if (targetKey !== undefined && sourceKey !== undefined) {
          const order = sectionOrder
          const oldIndex = order.indexOf(sourceKey)
          const newIndex = order.indexOf(targetKey)
          if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            await reorderSections(arrayMove(order, oldIndex, newIndex))
          }
        }
        return
      }

      const draggedItem = items.get(activeId)
      if (!draggedItem) return

      // Handle section drop (moving project to different section)
      if (overId.startsWith('section-drop-')) {
        const sectionName = overData?.sectionName as string | undefined
        if (draggedItem.meta.type === 'project') {
          const projectPath = path.dirname(draggedItem.path)
          await setProjectSection(projectPath, sectionName || null)
        }
        return
      }

      // Handle project reordering within a section
      if (draggedItem.meta.type === 'project') {
        if (overData?.type === 'project') {
          const sourceSectionKey = activeData?.sectionKey ?? ''
          const targetSectionKey = overData.sectionKey ?? ''
          const projectSorter = (a: VaultItem, b: VaultItem) => {
            const aOrder = (a.meta as ProjectMeta).sort_order ?? Number.POSITIVE_INFINITY
            const bOrder = (b.meta as ProjectMeta).sort_order ?? Number.POSITIVE_INFINITY
            if (aOrder !== bOrder) return aOrder - bOrder
            return a.title.localeCompare(b.title)
          }

          if (sourceSectionKey === targetSectionKey) {
            const siblings = Array.from(items.values())
              .filter(item => item.meta.type === 'project' && ((item.meta as ProjectMeta).section || '') === sourceSectionKey)
              .sort(projectSorter)

            const oldIndex = siblings.findIndex(i => i.id === activeId)
            const newIndex = siblings.findIndex(i => i.id === overId)

            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
              const reordered = arrayMove(siblings, oldIndex, newIndex)
              for (let i = 0; i < reordered.length; i++) {
                await updateSortOrder(reordered[i].id, i)
              }
            }
          } else {
            const sourceSiblings = Array.from(items.values())
              .filter(item => item.meta.type === 'project' && ((item.meta as ProjectMeta).section || '') === sourceSectionKey)
              .sort(projectSorter)
            const targetSiblings = Array.from(items.values())
              .filter(item => item.meta.type === 'project' && ((item.meta as ProjectMeta).section || '') === targetSectionKey)
              .sort(projectSorter)

            const draggedProject = sourceSiblings.find(i => i.id === activeId) ?? draggedItem
            const filteredTarget = targetSiblings.filter(i => i.id !== activeId)
            const overIndex = filteredTarget.findIndex(i => i.id === overId)
            const insertIndex = overIndex === -1 ? filteredTarget.length : overIndex
            const reorderedTarget = [...filteredTarget]
            reorderedTarget.splice(insertIndex, 0, draggedProject)

            const projectPath = path.dirname(draggedItem.path)
            await setProjectSection(projectPath, targetSectionKey || null)

            for (let i = 0; i < reorderedTarget.length; i++) {
              await updateSortOrder(reorderedTarget[i].id, i)
            }

            const reorderedSource = sourceSiblings.filter(i => i.id !== activeId)
            for (let i = 0; i < reorderedSource.length; i++) {
              await updateSortOrder(reorderedSource[i].id, i)
            }
          }
        }
        return
      }

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
              if (i.meta.type === 'project') return false
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
          await moveItem(draggedItem, newPath)
        }
        return
      }

      // Check if target is the inbox drop zone
      if (overId === 'inbox-drop' && vaultPath) {
        const inboxPath = path.join(vaultPath, 'Inbox')
        const filename = path.basename(draggedItem.path)
        const newPath = path.join(inboxPath, filename)

        if (newPath !== draggedItem.path) {
          await moveItem(draggedItem, newPath)
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
