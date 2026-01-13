import {
  DndContext as DndKitContext,
  DragMoveEvent,
  DragStartEvent,
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
import { useRef, useState, createContext, useContext, type ReactNode } from 'react'
import { useVault } from './VaultContext'
import type { VaultItem, TaskMeta, TreeNode, FolderMeta, ProjectMeta } from '@shared/types'
import path from 'path-browserify'

// Drop target tracking
export interface DropTarget {
  id: string
  position: 'before' | 'after'
}

interface DropIndicatorContextValue {
  activeDragId: string | null
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

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all root-level folders and projects, sorted by sort_order
 */
function getRootLevelItems(items: Map<string, VaultItem>, vaultPath: string): VaultItem[] {
  return Array.from(items.values())
    .filter(i => {
      if (i.meta.type !== 'project' && i.meta.type !== 'folder') return false
      return path.dirname(path.dirname(i.path)) === vaultPath
    })
    .sort((a, b) => {
      const aOrder = (a.meta as FolderMeta | ProjectMeta).sort_order ?? Infinity
      const bOrder = (b.meta as FolderMeta | ProjectMeta).sort_order ?? Infinity
      return aOrder - bOrder
    })
}

/**
 * Get sibling items of the same type within the same parent directory, sorted by sort_order
 */
function getSiblingItems(
  items: Map<string, VaultItem>,
  parentPath: string,
  itemType: 'folder' | 'project'
): VaultItem[] {
  return Array.from(items.values())
    .filter(i => {
      if (i.meta.type !== itemType) return false
      return path.dirname(path.dirname(i.path)) === parentPath
    })
    .sort((a, b) => {
      const aOrder = (a.meta as FolderMeta | ProjectMeta).sort_order ?? Infinity
      const bOrder = (b.meta as FolderMeta | ProjectMeta).sort_order ?? Infinity
      return aOrder - bOrder
    })
}

/**
 * Get the directory path for a folder/project item
 * (Items store path to .folder.md/.project.md, this returns the containing directory)
 */
function getItemDirPath(item: VaultItem): string {
  return path.dirname(item.path)
}

// ============================================================================
// DnD Provider Component
// ============================================================================

export function DndProvider({ children }: DndProviderProps) {
  const { items, updateItem, moveProject, updateSortOrder, vaultPath } = useVault()
  const [activeItem, setActiveItem] = useState<VaultItem | null>(null)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const dragPointerYRef = useRef<{ startY: number; currentY: number } | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  )

  // --------------------------------------------------------------------------
  // Drag Handlers
  // --------------------------------------------------------------------------

  const handleRootDropZoneDrop = async (
    activeData: { type: string; node: TreeNode },
    overData: { type: string; position: 'top' | 'bottom' }
  ): Promise<boolean> => {
    const draggedNode = activeData.node
    if (draggedNode.type !== 'project') return false

    const draggedParent = path.dirname(draggedNode.path)
    const draggedIsInFolder = vaultPath && draggedParent !== vaultPath
    const isTopZone = overData.position === 'top'

    const rootItems = getRootLevelItems(items, vaultPath!)
    const insertIndex = isTopZone ? 0 : rootItems.length

    if (draggedIsInFolder) {
      // Move project out of folder to root
      await moveProject(draggedNode.path, vaultPath!)
    }

    // Update sort orders to place item at correct position
    const itemsToReorder = draggedIsInFolder ? [...rootItems] : rootItems

    if (!draggedIsInFolder) {
      // For items already at root, reorder
      const currentIndex = itemsToReorder.findIndex(s => getItemDirPath(s) === draggedNode.path)
      if (currentIndex !== -1) {
        const newIndex = isTopZone ? 0 : itemsToReorder.length - 1
        if (currentIndex !== newIndex) {
          const reordered = arrayMove(itemsToReorder, currentIndex, newIndex)
          for (let i = 0; i < reordered.length; i++) {
            await updateSortOrder(getItemDirPath(reordered[i]), i)
          }
        }
      }
    } else {
      // For items moved from folder, set sort order after move
      // Compute the new path at root level (project name stays the same)
      const projectName = path.basename(draggedNode.path)
      const newProjectPath = path.join(vaultPath!, projectName)

      for (let i = 0; i < rootItems.length; i++) {
        const itemPath = getItemDirPath(rootItems[i])
        const newOrder = i >= insertIndex ? i + 1 : i
        await updateSortOrder(itemPath, newOrder)
      }
      await updateSortOrder(newProjectPath, insertIndex)
    }

    return true
  }

  const handleSidebarReorder = async (
    draggedNode: TreeNode,
    targetNode: TreeNode,
    dropPosition: 'before' | 'after' | null
  ): Promise<boolean> => {
    const draggedParent = path.dirname(draggedNode.path)
    const targetParent = path.dirname(targetNode.path)

    // Must be same parent and same type to reorder
    if (draggedParent !== targetParent || draggedNode.type !== targetNode.type) {
      return false
    }

    const siblings = getSiblingItems(items, draggedParent, draggedNode.type as 'folder' | 'project')
    const oldIndex = siblings.findIndex(s => getItemDirPath(s) === draggedNode.path)
    const targetIndex = siblings.findIndex(s => getItemDirPath(s) === targetNode.path)

    if (oldIndex === -1 || targetIndex === -1 || oldIndex === targetIndex) {
      return false
    }

    let newIndex = dropPosition === 'before' ? targetIndex : targetIndex + 1
    if (oldIndex < newIndex) newIndex--

    const reordered = arrayMove(siblings, oldIndex, newIndex)
    for (let i = 0; i < reordered.length; i++) {
      await updateSortOrder(getItemDirPath(reordered[i]), i)
    }

    return true
  }

  const handleRootReorder = async (
    draggedNode: TreeNode,
    targetNode: TreeNode,
    dropPosition: 'before' | 'after'
  ): Promise<boolean> => {
    if (!vaultPath) return false
    if ((draggedNode.type !== 'folder' && draggedNode.type !== 'project') ||
        (targetNode.type !== 'folder' && targetNode.type !== 'project')) {
      return false
    }

    const draggedParent = path.dirname(draggedNode.path)
    const targetParent = path.dirname(targetNode.path)
    if (draggedParent !== vaultPath || targetParent !== vaultPath) return false

    const rootItems = getRootLevelItems(items, vaultPath)
    const oldIndex = rootItems.findIndex(s => getItemDirPath(s) === draggedNode.path)
    const targetIndex = rootItems.findIndex(s => getItemDirPath(s) === targetNode.path)
    if (oldIndex === -1 || targetIndex === -1 || oldIndex === targetIndex) return false

    let newIndex = dropPosition === 'before' ? targetIndex : targetIndex + 1
    if (oldIndex < newIndex) newIndex--

    const reordered = arrayMove(rootItems, oldIndex, newIndex)
    for (let i = 0; i < reordered.length; i++) {
      await updateSortOrder(getItemDirPath(reordered[i]), i)
    }

    if (import.meta.env.DEV) {
      console.debug('[dnd] root reorder', {
        dragged: draggedNode.path,
        target: targetNode.path,
        dropPosition,
        oldIndex,
        newIndex,
      })
    }

    return true
  }

  const handleProjectMoveToRoot = async (
    draggedNode: TreeNode,
    targetNode: TreeNode,
    dropPosition: 'before' | 'after'
  ): Promise<boolean> => {
    if (draggedNode.type !== 'project') return false

    const draggedParent = path.dirname(draggedNode.path)
    const targetParent = path.dirname(targetNode.path)

    // Target must be at root level
    if (targetParent !== vaultPath) return false

    const draggedIsInFolder = draggedParent !== vaultPath

    const rootItems = getRootLevelItems(items, vaultPath!)
    const targetIndex = rootItems.findIndex(s => getItemDirPath(s) === targetNode.path)

    if (draggedIsInFolder) {
      // Move project out of folder to root, then position it
      await moveProject(draggedNode.path, vaultPath!)

      const insertIndex = dropPosition === 'before' ? targetIndex : targetIndex + 1

      // Compute the new path at root level (project name stays the same)
      const projectName = path.basename(draggedNode.path)
      const newProjectPath = path.join(vaultPath!, projectName)

      // Update sort orders for existing root items (shift items at/after insert position)
      for (let i = 0; i < rootItems.length; i++) {
        const itemPath = getItemDirPath(rootItems[i])
        const newOrder = i >= insertIndex ? i + 1 : i
        await updateSortOrder(itemPath, newOrder)
      }
      // Set sort order for the moved project
      await updateSortOrder(newProjectPath, insertIndex)
    } else {
      // Same level reorder (already at root)
      const oldIndex = rootItems.findIndex(s => getItemDirPath(s) === draggedNode.path)
      if (oldIndex !== -1 && targetIndex !== -1 && oldIndex !== targetIndex) {
        let newIndex = dropPosition === 'before' ? targetIndex : targetIndex + 1
        if (oldIndex < newIndex) newIndex--

        const reordered = arrayMove(rootItems, oldIndex, newIndex)
        for (let i = 0; i < reordered.length; i++) {
          await updateSortOrder(getItemDirPath(reordered[i]), i)
        }
      }
    }

    return true
  }

  // --------------------------------------------------------------------------
  // Main Event Handlers
  // --------------------------------------------------------------------------

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.get(String(event.active.id))
    if (item) setActiveItem(item)
    setActiveDragId(String(event.active.id))
    setDropTarget(null)

    const e = event.activatorEvent
    if (e instanceof MouseEvent) {
      dragPointerYRef.current = { startY: e.clientY, currentY: e.clientY }
    } else if (typeof TouchEvent !== 'undefined' && e instanceof TouchEvent) {
      const y = e.touches[0]?.clientY
      if (typeof y === 'number') dragPointerYRef.current = { startY: y, currentY: y }
      else dragPointerYRef.current = null
    } else {
      dragPointerYRef.current = null
    }
  }

  const handleDragMove = (event: DragMoveEvent) => {
    const p = dragPointerYRef.current
    if (!p) return
    p.currentY = p.startY + event.delta.y
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

    // Calculate position based on dragged element center relative to target center
    if (activeData?.type === 'sidebar-item') {
      const activeNode = activeData.node as TreeNode

      // For project-over-folder: support both "drop into" (center) and "drop before/after" (edges)
      // so projects can be placed above/below folders without always nesting.
      if (overNode.type === 'folder' && activeNode.type === 'project') {
        const overRect = over.rect
        const activeRect = active.rect.current.translated

        if (!activeRect) {
          setDropTarget(null)
          return
        }

        const pointerY = dragPointerYRef.current?.currentY ?? (activeRect.top + activeRect.height / 2)
        const yWithin = pointerY - overRect.top
        const ratio = overRect.height > 0 ? yWithin / overRect.height : 0.5

        // Edge zones show before/after indicators; center zone means "drop into folder"
        // Make the center zone generous so "drop into folder" is easy to hit.
        if (ratio <= 0.15) {
          setDropTarget({ id: String(over.id), position: 'before' })
        } else if (ratio >= 0.85) {
          setDropTarget({ id: String(over.id), position: 'after' })
        } else {
          setDropTarget(null)
        }
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
    setDropTarget(null)

    try {
      if (!over || active.id === over.id) return

      const activeData = active.data.current
      const overData = over.data.current

      // Handle root drop zone drops (top/bottom of list)
      if (overData?.type === 'root-drop-zone' && activeData?.type === 'sidebar-item') {
        await handleRootDropZoneDrop(
          activeData as { type: string; node: TreeNode },
          overData as { type: string; position: 'top' | 'bottom' }
        )
        return
      }

      // Handle sidebar item to sidebar item drags
      if (activeData?.type === 'sidebar-item' && overData?.type === 'sidebar-item') {
        const draggedNode = activeData.node as TreeNode
        const targetNode = overData.node as TreeNode
        const dropPosition =
          currentDropTarget?.id === String(over.id) ? currentDropTarget.position : null

        // Reorder at root level (folders + projects can be interleaved)
        if (dropPosition) {
          const rootReordered = await handleRootReorder(
            draggedNode,
            targetNode,
            dropPosition
          )
          if (rootReordered) return

          // Try same-parent, same-type reorder (e.g. within a folder)
          const reordered = await handleSidebarReorder(
            draggedNode,
            targetNode,
            dropPosition
          )
          if (reordered) return

          // Try moving project to root level
          const movedToRoot = await handleProjectMoveToRoot(
            draggedNode,
            targetNode,
            dropPosition
          )
          if (movedToRoot) return
        }

        // No position indicator - check for folder drop (move into folder)
        if (draggedNode.type === 'project' && targetNode.type === 'folder') {
          if (import.meta.env.DEV) {
            console.debug('[dnd] move project into folder', {
              project: draggedNode.path,
              folder: targetNode.path,
            })
          }
          await moveProject(draggedNode.path, targetNode.path)
          return
        }

        // Folder on folder or other invalid combinations - do nothing
        return
      }

      // Handle task reordering within the same list (sortable task list)
      const activeId = String(active.id)
      const overId = String(over.id)
      const activeItem = items.get(activeId)
      const overItem = items.get(overId)

      if (activeItem && overItem &&
          (activeItem.meta.type === 'task' || activeItem.meta.type === 'note') &&
          (overItem.meta.type === 'task' || overItem.meta.type === 'note')) {
        // Get all sibling items in the same directory
        const parentPath = path.dirname(activeItem.path)
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

      // Handle task/note drags to projects
      const draggedItem = items.get(String(active.id))
      const targetPath = String(over.id)

      if (!draggedItem || draggedItem.meta.type === 'folder' || draggedItem.meta.type === 'project') {
        return
      }

      // Check if target is a folder - tasks can only go in projects
      const targetItem = Array.from(items.values()).find(i =>
        (i.meta.type === 'folder' || i.meta.type === 'project') &&
        path.dirname(i.path) === targetPath
      )
      if (targetItem?.meta.type === 'folder') {
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
    } finally {
      // Keep the drag overlay/ghost until async work completes to avoid a "snap back" illusion.
      setActiveItem(null)
      setActiveDragId(null)
      dragPointerYRef.current = null
    }
  }

  const handleDragCancel = () => {
    setActiveItem(null)
    setActiveDragId(null)
    setDropTarget(null)
    dragPointerYRef.current = null
  }

  return (
    <DropIndicatorContext.Provider value={{ activeDragId, dropTarget, setDropTarget }}>
      <DndKitContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
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
      </DndKitContext>
    </DropIndicatorContext.Provider>
  )
}
