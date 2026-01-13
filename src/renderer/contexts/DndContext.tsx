import {
  DndContext as DndKitContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useState, createContext, useContext, type ReactNode } from 'react'
import { useVault } from './VaultContext'
import type { VaultItem, TaskMeta, TreeNode } from '@shared/types'
import path from 'path-browserify'

// Drop target tracking
export interface DropTarget {
  id: string
  position: 'before' | 'after'
}

interface DropIndicatorContextValue {
  dropTarget: DropTarget | null
  setDropTarget: (target: DropTarget | null) => void
}

const DropIndicatorContext = createContext<DropIndicatorContextValue | null>(null)

export function useDropIndicator() {
  const context = useContext(DropIndicatorContext)
  if (!context) {
    throw new Error('useDropIndicator must be used within DndProvider')
  }
  return context
}

interface DndProviderProps {
  children: ReactNode
}

export function DndProvider({ children }: DndProviderProps) {
  const { items, updateItem, moveProject, createFolderWithProjects, updateSortOrder, vaultPath } = useVault()
  const [activeItem, setActiveItem] = useState<VaultItem | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
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
    setDropTarget(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      setDropTarget(null)
      return
    }

    const overData = over.data.current
    const activeData = active.data.current

    // Handle root drop zones (top/bottom of list)
    if (overData?.type === 'root-drop-zone') {
      // Only allow projects to be dropped at root level
      if (activeData?.type === 'sidebar-item') {
        const activeNode = activeData.node as TreeNode
        if (activeNode.type === 'project') {
          setDropTarget({
            id: String(over.id),
            position: overData.position === 'top' ? 'before' : 'after',
          })
          return
        }
      }
      setDropTarget(null)
      return
    }

    if (overData?.type !== 'sidebar-item') {
      setDropTarget(null)
      return
    }

    const overNode = overData.node as TreeNode

    // For folders, we want "drop into" behavior (no position indicator)
    // unless we're at the same level trying to reorder folders
    if (activeData?.type === 'sidebar-item') {
      const activeNode = activeData.node as TreeNode

      // If dropping on a folder and it's not a folder-on-folder reorder, no indicator
      if (overNode.type === 'folder' && activeNode.type !== 'folder') {
        setDropTarget(null)
        return
      }
    }

    // Calculate position based on dragged element center relative to target center
    const overRect = over.rect
    const activeRect = active.rect.current.translated

    if (!activeRect) {
      setDropTarget(null)
      return
    }

    // Compare the center of the dragged item to the center of the target
    const activeCenterY = activeRect.top + activeRect.height / 2
    const overCenterY = overRect.top + overRect.height / 2
    const position = activeCenterY < overCenterY ? 'before' : 'after'

    setDropTarget({
      id: String(over.id),
      position,
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    const currentDropTarget = dropTarget
    setActiveItem(null)
    setDropTarget(null)

    if (!over || active.id === over.id) return

    const activeData = active.data.current
    const overData = over.data.current

    // Handle drops on root drop zones (top/bottom of list)
    if (overData?.type === 'root-drop-zone' && activeData?.type === 'sidebar-item') {
      const draggedNode = activeData.node as TreeNode
      if (draggedNode.type !== 'project') return

      const draggedParent = path.dirname(draggedNode.path)
      const draggedIsInFolder = vaultPath && draggedParent !== vaultPath
      const isTopZone = overData.position === 'top'

      // Get all root-level items
      const rootItems = Array.from(items.values())
        .filter(i => {
          if (i.meta.type !== 'project' && i.meta.type !== 'folder') return false
          return path.dirname(path.dirname(i.path)) === vaultPath
        })
        .sort((a, b) => {
          const aOrder = (a.meta as any).sort_order ?? Infinity
          const bOrder = (b.meta as any).sort_order ?? Infinity
          return aOrder - bOrder
        })

      const insertIndex = isTopZone ? 0 : rootItems.length

      if (draggedIsInFolder) {
        // Move project out of folder to root
        await moveProject(draggedNode.path, vaultPath!)
      }

      // Update sort orders to place item at correct position
      const itemsToReorder = draggedIsInFolder
        ? [...rootItems] // Will include the newly moved item after state update
        : rootItems

      // For items already at root, reorder
      if (!draggedIsInFolder) {
        const currentIndex = itemsToReorder.findIndex(s => path.dirname(s.path) === draggedNode.path)
        if (currentIndex !== -1) {
          const newIndex = isTopZone ? 0 : itemsToReorder.length - 1
          if (currentIndex !== newIndex) {
            const reordered = arrayMove(itemsToReorder, currentIndex, newIndex)
            for (let i = 0; i < reordered.length; i++) {
              await updateSortOrder(path.dirname(reordered[i].path), i)
            }
          }
        }
      } else {
        // For items moved from folder, set sort order after move completes
        // The item is now at root, update all sort orders
        for (let i = 0; i < rootItems.length; i++) {
          const itemPath = path.dirname(rootItems[i].path)
          const newOrder = i >= insertIndex ? i + 1 : i
          await updateSortOrder(itemPath, newOrder)
        }
        // Set the moved item's order
        await updateSortOrder(draggedNode.path, insertIndex)
      }
      return
    }

    // Handle sidebar item drags
    if (activeData?.type === 'sidebar-item' && overData?.type === 'sidebar-item') {
      const draggedNode = activeData.node as TreeNode
      const targetNode = overData.node as TreeNode

      const draggedParent = path.dirname(draggedNode.path)
      const targetParent = path.dirname(targetNode.path)

      // If we have a position indicator, this is a positional drop (before/after)
      if (currentDropTarget) {
        const position = currentDropTarget.position

        // Project dropped at root level (target is at root)
        if (draggedNode.type === 'project' && targetParent === vaultPath) {
          const draggedIsInFolder = draggedParent !== vaultPath

          // Get all root-level items for reordering
          const rootItems = Array.from(items.values())
            .filter(i => {
              if (i.meta.type !== 'project' && i.meta.type !== 'folder') return false
              return path.dirname(path.dirname(i.path)) === vaultPath
            })
            .sort((a, b) => {
              const aOrder = (a.meta as any).sort_order ?? Infinity
              const bOrder = (b.meta as any).sort_order ?? Infinity
              return aOrder - bOrder
            })

          // Find target index
          const targetIndex = rootItems.findIndex(s => path.dirname(s.path) === targetNode.path)

          if (draggedIsInFolder) {
            // Move project out of folder to root, then position it
            await moveProject(draggedNode.path, vaultPath!)

            // Calculate insertion index based on position
            const insertIndex = position === 'before' ? targetIndex : targetIndex + 1

            // Re-fetch and reorder (the moved item is now at root)
            const updatedRootItems = Array.from(items.values())
              .filter(i => {
                if (i.meta.type !== 'project' && i.meta.type !== 'folder') return false
                return path.dirname(path.dirname(i.path)) === vaultPath
              })
              .sort((a, b) => {
                const aOrder = (a.meta as any).sort_order ?? Infinity
                const bOrder = (b.meta as any).sort_order ?? Infinity
                return aOrder - bOrder
              })

            // Update sort orders
            for (let i = 0; i < updatedRootItems.length; i++) {
              const itemDirPath = path.dirname(updatedRootItems[i].path)
              const isMovedItem = path.basename(itemDirPath) === path.basename(draggedNode.path)
              let newOrder: number

              if (isMovedItem) {
                newOrder = insertIndex
              } else if (i >= insertIndex) {
                newOrder = i + 1
              } else {
                newOrder = i
              }
              await updateSortOrder(itemDirPath, newOrder)
            }
          } else {
            // Same level reorder with position awareness
            const oldIndex = rootItems.findIndex(s => path.dirname(s.path) === draggedNode.path)

            if (oldIndex !== -1 && targetIndex !== -1 && oldIndex !== targetIndex) {
              // Calculate new index based on position
              let newIndex = position === 'before' ? targetIndex : targetIndex + 1
              // Adjust if moving from before to after
              if (oldIndex < newIndex) newIndex--

              const reordered = arrayMove(rootItems, oldIndex, newIndex)
              for (let i = 0; i < reordered.length; i++) {
                await updateSortOrder(path.dirname(reordered[i].path), i)
              }
            }
          }
          return
        }

        // Project dropped within a folder (reorder within folder)
        if (draggedParent === targetParent && draggedNode.type === targetNode.type) {
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

          const oldIndex = siblings.findIndex(s => path.dirname(s.path) === draggedNode.path)
          const targetIndex = siblings.findIndex(s => path.dirname(s.path) === targetNode.path)

          if (oldIndex !== -1 && targetIndex !== -1 && oldIndex !== targetIndex) {
            let newIndex = position === 'before' ? targetIndex : targetIndex + 1
            if (oldIndex < newIndex) newIndex--

            const reordered = arrayMove(siblings, oldIndex, newIndex)
            for (let i = 0; i < reordered.length; i++) {
              await updateSortOrder(path.dirname(reordered[i].path), i)
            }
          }
          return
        }
      }

      // No position indicator - check for folder drop (move into folder)
      if (draggedNode.type === 'project' && targetNode.type === 'folder') {
        await moveProject(draggedNode.path, targetNode.path)
        return
      }

      // Folder on folder = not allowed
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
    setDropTarget(null)
  }

  return (
    <DropIndicatorContext.Provider value={{ dropTarget, setDropTarget }}>
      <DndKitContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
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
    </DropIndicatorContext.Provider>
  )
}
