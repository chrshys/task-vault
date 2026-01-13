# DnD Context Refactoring Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify the sidebar drag-and-drop code by extracting helpers, breaking down the 220-line handleDragEnd function, and removing dead code - all without changing behavior.

**Architecture:** Extract repeated patterns into helper functions, decompose handleDragEnd into focused handlers per drag type, remove unused pendingGroup feature. This is a pure refactor - all existing functionality must remain identical.

**Tech Stack:** React, @dnd-kit/core, @dnd-kit/sortable, TypeScript

---

### Task 1: Verify Current State

**Files:**
- Check: `src/renderer/contexts/DndContext.tsx`

**Step 1: Run the build to ensure clean starting state**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Start the app and manually verify drag-drop works**

Run: `npm run dev`
Expected: App starts, drag-drop functions for reordering and moving projects

**Step 3: Commit current state if any uncommitted changes**

```bash
git status
# If clean, skip. Otherwise:
git add -A
git commit -m "chore: checkpoint before DnD refactoring"
```

---

### Task 2: Remove Dead Code (pendingGroup feature)

**Files:**
- Modify: `src/renderer/contexts/DndContext.tsx`

**Step 1: Remove pendingGroup state declarations (lines 47-51)**

Delete these lines:
```typescript
const [pendingGroup, setPendingGroup] = useState<{
  draggedPath: string
  targetPath: string
} | null>(null)
const [newFolderName, setNewFolderName] = useState('')
```

**Step 2: Remove handleCreateGroup and handleCancelGroup functions (lines 359-372)**

Delete these lines:
```typescript
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
```

**Step 3: Remove pendingGroup modal JSX (lines 397-436)**

Delete the entire `{pendingGroup && (` block including the modal UI.

**Step 4: Remove createFolderWithProjects from useVault destructure (line 44)**

Change:
```typescript
const { items, updateItem, moveProject, createFolderWithProjects, updateSortOrder, vaultPath } = useVault()
```

To:
```typescript
const { items, updateItem, moveProject, updateSortOrder, vaultPath } = useVault()
```

**Step 5: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/renderer/contexts/DndContext.tsx
git commit -m "refactor: remove unused pendingGroup feature from DndContext"
```

---

### Task 3: Extract Helper - getRootLevelItems

**Files:**
- Modify: `src/renderer/contexts/DndContext.tsx`

**Step 1: Add helper function before DndProvider component**

Add after the imports and before `export function DndProvider`:

```typescript
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
```

**Step 2: Add FolderMeta and ProjectMeta to imports**

Update the import from shared/types:

```typescript
import type { VaultItem, TaskMeta, TreeNode, FolderMeta, ProjectMeta } from '@shared/types'
```

**Step 3: Replace first occurrence in handleDragEnd (around line 156-165)**

Replace:
```typescript
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
```

With:
```typescript
const rootItems = getRootLevelItems(items, vaultPath!)
```

**Step 4: Replace second occurrence (around line 222-231)**

Same replacement.

**Step 5: Replace third occurrence (around line 244-253)**

Same replacement.

**Step 6: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Test manually**

Run: `npm run dev`
Verify: Drag project to root level still works correctly

**Step 8: Commit**

```bash
git add src/renderer/contexts/DndContext.tsx
git commit -m "refactor: extract getRootLevelItems helper in DndContext"
```

---

### Task 4: Extract Helper - getSiblingItems

**Files:**
- Modify: `src/renderer/contexts/DndContext.tsx`

**Step 1: Add helper function after getRootLevelItems**

```typescript
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
```

**Step 2: Replace occurrence in handleDragEnd (around line 291-300)**

Replace:
```typescript
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
```

With:
```typescript
const siblings = getSiblingItems(items, draggedParent, draggedNode.type as 'folder' | 'project')
```

**Step 3: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/renderer/contexts/DndContext.tsx
git commit -m "refactor: extract getSiblingItems helper in DndContext"
```

---

### Task 5: Extract Helper - getItemDirPath

**Files:**
- Modify: `src/renderer/contexts/DndContext.tsx`

**Step 1: Add helper function after getSiblingItems**

```typescript
/**
 * Get the directory path for a folder/project item
 * (Items store path to .folder.md/.project.md, this returns the containing directory)
 */
function getItemDirPath(item: VaultItem): string {
  return path.dirname(item.path)
}
```

**Step 2: Replace occurrences of path.dirname(item.path) pattern for clarity**

In handleDragEnd, find places where `path.dirname(someItem.path)` is used to get the directory of a folder/project and replace with the helper for improved readability.

Example replacement (around line 181):
```typescript
// Before
const currentIndex = itemsToReorder.findIndex(s => path.dirname(s.path) === draggedNode.path)

// After
const currentIndex = itemsToReorder.findIndex(s => getItemDirPath(s) === draggedNode.path)
```

Apply this pattern to all similar occurrences in handleDragEnd (approximately 8-10 places).

**Step 3: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/renderer/contexts/DndContext.tsx
git commit -m "refactor: extract getItemDirPath helper for clearer path handling"
```

---

### Task 6: Extract Handler - handleRootDropZoneDrop

**Files:**
- Modify: `src/renderer/contexts/DndContext.tsx`

**Step 1: Extract root drop zone handling into separate function**

Add this function inside DndProvider, after the sensors definition:

```typescript
const handleRootDropZoneDrop = async (
  activeData: { type: string; node: TreeNode },
  overData: { type: string; position: 'top' | 'bottom' },
  overId: string
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
    for (let i = 0; i < rootItems.length; i++) {
      const itemPath = getItemDirPath(rootItems[i])
      const newOrder = i >= insertIndex ? i + 1 : i
      await updateSortOrder(itemPath, newOrder)
    }
    await updateSortOrder(draggedNode.path, insertIndex)
  }

  return true
}
```

**Step 2: Update handleDragEnd to use the extracted function**

Replace the root drop zone handling block (lines ~147-203) with:

```typescript
// Handle drops on root drop zones (top/bottom of list)
if (overData?.type === 'root-drop-zone' && activeData?.type === 'sidebar-item') {
  await handleRootDropZoneDrop(
    activeData as { type: string; node: TreeNode },
    overData as { type: string; position: 'top' | 'bottom' },
    String(over.id)
  )
  return
}
```

**Step 3: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Test manually**

Run: `npm run dev`
Verify: Dragging project to top/bottom of sidebar still works

**Step 5: Commit**

```bash
git add src/renderer/contexts/DndContext.tsx
git commit -m "refactor: extract handleRootDropZoneDrop from handleDragEnd"
```

---

### Task 7: Extract Handler - handleSidebarReorder

**Files:**
- Modify: `src/renderer/contexts/DndContext.tsx`

**Step 1: Extract sidebar reordering logic into separate function**

Add this function inside DndProvider:

```typescript
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
```

**Step 2: Update handleDragEnd to use extracted function for reordering cases**

In the sidebar-item handling section, after checking for drop position, use:

```typescript
// Same level reorder
if (currentDropTarget) {
  const reordered = await handleSidebarReorder(
    draggedNode,
    targetNode,
    currentDropTarget.position
  )
  if (reordered) return
}
```

**Step 3: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/renderer/contexts/DndContext.tsx
git commit -m "refactor: extract handleSidebarReorder from handleDragEnd"
```

---

### Task 8: Extract Handler - handleProjectMoveToRoot

**Files:**
- Modify: `src/renderer/contexts/DndContext.tsx`

**Step 1: Extract project-to-root movement logic**

Add this function inside DndProvider:

```typescript
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

    // Update sort orders after move
    const updatedRootItems = getRootLevelItems(items, vaultPath!)
    for (let i = 0; i < updatedRootItems.length; i++) {
      const itemDirPath = getItemDirPath(updatedRootItems[i])
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
```

**Step 2: Update handleDragEnd to use extracted function**

Replace the project-to-root handling with a call to this function.

**Step 3: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/renderer/contexts/DndContext.tsx
git commit -m "refactor: extract handleProjectMoveToRoot from handleDragEnd"
```

---

### Task 9: Simplify handleDragEnd Main Body

**Files:**
- Modify: `src/renderer/contexts/DndContext.tsx`

**Step 1: Rewrite handleDragEnd using extracted helpers**

Replace the entire handleDragEnd function with this cleaner version:

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event
  const currentDropTarget = dropTarget
  setActiveItem(null)
  setDropTarget(null)

  if (!over || active.id === over.id) return

  const activeData = active.data.current
  const overData = over.data.current

  // Handle root drop zone drops (top/bottom of list)
  if (overData?.type === 'root-drop-zone' && activeData?.type === 'sidebar-item') {
    await handleRootDropZoneDrop(
      activeData as { type: string; node: TreeNode },
      overData as { type: string; position: 'top' | 'bottom' },
      String(over.id)
    )
    return
  }

  // Handle sidebar item to sidebar item drags
  if (activeData?.type === 'sidebar-item' && overData?.type === 'sidebar-item') {
    const draggedNode = activeData.node as TreeNode
    const targetNode = overData.node as TreeNode

    // Try reordering first (same parent, same type, has position indicator)
    if (currentDropTarget) {
      const reordered = await handleSidebarReorder(
        draggedNode,
        targetNode,
        currentDropTarget.position
      )
      if (reordered) return

      // Try moving project to root level
      const movedToRoot = await handleProjectMoveToRoot(
        draggedNode,
        targetNode,
        currentDropTarget.position
      )
      if (movedToRoot) return
    }

    // No position indicator - check for folder drop (move into folder)
    if (draggedNode.type === 'project' && targetNode.type === 'folder') {
      await moveProject(draggedNode.path, targetNode.path)
      return
    }

    // Folder on folder or other invalid combinations - do nothing
    return
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
}
```

**Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Test all drag scenarios manually**

1. Drag project to reorder at root level
2. Drag project into a folder
3. Drag project out of folder to root
4. Drag project to reorder within folder
5. Drag folder to reorder folders
6. Drag task between projects

**Step 4: Commit**

```bash
git add src/renderer/contexts/DndContext.tsx
git commit -m "refactor: simplify handleDragEnd using extracted handlers"
```

---

### Task 10: Add Clarifying Comments

**Files:**
- Modify: `src/renderer/contexts/DndContext.tsx`

**Step 1: Add section comments to organize the file**

Add comments to delineate sections:

```typescript
// ============================================================================
// Helper Functions
// ============================================================================

// (getRootLevelItems, getSiblingItems, getItemDirPath here)

// ============================================================================
// DnD Provider Component
// ============================================================================

export function DndProvider({ children }: DndProviderProps) {
  // ...

  // --------------------------------------------------------------------------
  // Drag Handlers
  // --------------------------------------------------------------------------

  // (handleRootDropZoneDrop, handleSidebarReorder, etc. here)

  // --------------------------------------------------------------------------
  // Main Event Handlers
  // --------------------------------------------------------------------------

  // (handleDragStart, handleDragOver, handleDragEnd, handleDragCancel here)
}
```

**Step 2: Verify build succeeds**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/renderer/contexts/DndContext.tsx
git commit -m "refactor: add section comments for code organization"
```

---

### Task 11: Final Verification

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors or warnings

**Step 2: Run the app and test all functionality**

Run: `npm run dev`

Test checklist:
- [ ] Drag project to reorder at root
- [ ] Drag project into folder (blue highlight)
- [ ] Drag project out of folder to root
- [ ] Drag project to reorder within folder
- [ ] Drag folder to reorder (position indicator shows)
- [ ] Drag task to different project
- [ ] Right-click folder -> Ungroup
- [ ] Right-click project -> Delete (with confirmation)
- [ ] Drop indicators appear correctly (blue lines)
- [ ] Folder highlight appears when hovering

**Step 3: Count lines reduced**

Run: `wc -l src/renderer/contexts/DndContext.tsx`

Expected: Significant reduction from original ~440 lines (target: ~300-350 lines)

**Step 4: Final commit**

```bash
git add -A
git commit -m "refactor: complete DnD context refactoring - cleaner, more maintainable code"
```

---

## Summary

This refactoring:

1. **Removes ~100 lines** of dead code (pendingGroup feature)
2. **Extracts 3 helper functions**: `getRootLevelItems`, `getSiblingItems`, `getItemDirPath`
3. **Extracts 3 handler functions**: `handleRootDropZoneDrop`, `handleSidebarReorder`, `handleProjectMoveToRoot`
4. **Simplifies handleDragEnd** from 220 lines to ~50 lines
5. **Adds organizational comments** for maintainability
6. **Preserves all existing functionality** - this is a pure refactor

The code will be easier to understand, debug, and extend in the future.
