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
import { arrayMove } from '@dnd-kit/sortable'
import { useState, type ReactNode } from 'react'
import { useVault } from './VaultContext'
import type { VaultItem, TaskMeta, TreeNode } from '@shared/types'
import path from 'path-browserify'

interface DndProviderProps {
  children: ReactNode
}

export function DndProvider({ children }: DndProviderProps) {
  const { items, updateItem, moveProject, createFolderWithProjects, updateSortOrder } = useVault()
  const [activeItem, setActiveItem] = useState<VaultItem | null>(null)
  const [pendingGroup, setPendingGroup] = useState<{
    draggedPath: string
    targetPath: string
  } | null>(null)
  const [newFolderName, setNewFolderName] = useState('')

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

    const activeData = active.data.current
    const overData = over.data.current

    // Handle sidebar item drags
    if (activeData?.type === 'sidebar-item' && overData?.type === 'sidebar-item') {
      const draggedNode = activeData.node as TreeNode
      const targetNode = overData.node as TreeNode

      const draggedParent = path.dirname(draggedNode.path)
      const targetParent = path.dirname(targetNode.path)

      // Same parent and same type = reorder
      if (draggedParent === targetParent && draggedNode.type === targetNode.type) {
        // Find all siblings at this level
        // Note on path structure:
        // - VaultItem.path is the file path: /vault/ProjectA/.project.md
        // - TreeNode.path is the directory path: /vault/ProjectA
        // - dirname(i.path) gives /vault/ProjectA (project folder)
        // - dirname(dirname(i.path)) gives /vault (parent of project folder)
        const siblings = Array.from(items.values())
          .filter(i => {
            if (i.meta.type !== draggedNode.type) return false
            return path.dirname(path.dirname(i.path)) === draggedParent
          })
          .sort((a, b) => {
            const aOrder = (a.meta as any).sort_order ?? Infinity
            const bOrder = (b.meta as any).sort_order ?? Infinity
            return aOrder - bOrder
          })

        // Match VaultItem to TreeNode by comparing dirname(file path) to directory path
        const oldIndex = siblings.findIndex(s => path.dirname(s.path) === draggedNode.path)
        const newIndex = siblings.findIndex(s => path.dirname(s.path) === targetNode.path)

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(siblings, oldIndex, newIndex)
          for (let i = 0; i < reordered.length; i++) {
            await updateSortOrder(path.dirname(reordered[i].path), i)
          }
        }
        return
      }

      // Project dropped on folder = move into folder
      if (draggedNode.type === 'project' && targetNode.type === 'folder') {
        await moveProject(draggedNode.path, targetNode.path)
        return
      }

      // Project dropped on project = prompt for folder name
      if (draggedNode.type === 'project' && targetNode.type === 'project') {
        setPendingGroup({
          draggedPath: draggedNode.path,
          targetPath: targetNode.path,
        })
        return
      }

      // Folder on folder = not allowed (visual feedback only)
      return
    }

    // Existing task/note drag handling
    const draggedItem = items.get(String(active.id))
    const targetPath = String(over.id)

    if (!draggedItem || draggedItem.meta.type === 'folder' || draggedItem.meta.type === 'project') {
      return
    }

    // Check if target is a folder (not a project) - tasks can only go in projects
    const targetItem = Array.from(items.values()).find(i =>
      (i.meta.type === 'folder' || i.meta.type === 'project') &&
      path.dirname(i.path) === targetPath
    )
    if (targetItem?.meta.type === 'folder') {
      // Don't allow dropping tasks directly into folders
      return
    }

    // Move file to new project
    const filename = path.basename(draggedItem.path)
    const newPath = path.join(targetPath, filename)

    if (newPath !== draggedItem.path) {
      await updateItem({
        ...draggedItem,
        path: newPath,
        meta: { ...draggedItem.meta, modified: new Date().toISOString() } as TaskMeta,
      })
    }
  }

  const handleCreateGroup = async () => {
    if (!pendingGroup || !newFolderName.trim()) return
    await createFolderWithProjects(newFolderName.trim(), [
      pendingGroup.draggedPath,
      pendingGroup.targetPath,
    ])
    setPendingGroup(null)
    setNewFolderName('')
  }

  const handleCancelGroup = () => {
    setPendingGroup(null)
    setNewFolderName('')
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
      {pendingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleCancelGroup} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Create Folder
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter a name for the new folder:
            </p>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateGroup()
                if (e.key === 'Escape') handleCancelGroup()
              }}
              placeholder="Folder name..."
              className="w-full px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelGroup}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </DndKitContext>
  )
}
