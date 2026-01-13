# Sidebar Drag-Drop & Context Menus Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable drag-and-drop for reordering and organizing folders/projects in the sidebar, plus context menus for ungroup and delete actions.

**Architecture:** Extend existing @dnd-kit setup with sortable for reordering. Add useDraggable to TreeItem. Detect drop target type (folder body vs project body vs insertion gap) to determine action. Add context menus using existing ContextMenu component.

**Tech Stack:** @dnd-kit/core, @dnd-kit/sortable (new), React, TypeScript

---

### Task 1: Install @dnd-kit/sortable

**Step 1: Add package**

Run: `npm install @dnd-kit/sortable`

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit/sortable for sidebar reordering"
```

---

### Task 2: Add VaultContext Methods for Folder/Project Operations

**Files:**
- Modify: `src/renderer/contexts/VaultContext.tsx`

**Step 1: Add ungroupFolder method**

Add to VaultContextValue interface (after line 18):

```typescript
ungroupFolder: (folderPath: string) => Promise<void>
```

Add implementation (after createProject function, around line 191):

```typescript
const ungroupFolder = useCallback(async (folderPath: string) => {
  if (!vaultPath) return

  // Find all projects in this folder
  const projectsInFolder = Array.from(items.values()).filter(item => {
    if (item.meta.type !== 'project') return false
    const itemDir = path.dirname(item.path)
    return itemDir === folderPath
  })

  // Move each project to root
  for (const project of projectsInFolder) {
    const filename = path.basename(project.path)
    const newPath = path.join(vaultPath, filename)
    await updateItem({
      ...project,
      path: newPath,
      meta: { ...project.meta, modified: new Date().toISOString() },
    })
  }

  // Find and delete the folder item
  const folderItem = Array.from(items.values()).find(item => {
    if (item.meta.type !== 'folder') return false
    return path.dirname(item.path) === folderPath
  })

  if (folderItem) {
    await deleteItem(folderItem.path)
  }
}, [items, vaultPath, updateItem, deleteItem])
```

**Step 2: Add deleteProject method**

Add to VaultContextValue interface (after ungroupFolder):

```typescript
deleteProject: (projectPath: string) => Promise<void>
```

Add implementation (after ungroupFolder):

```typescript
const deleteProject = useCallback(async (projectPath: string) => {
  // Find all tasks/notes in this project
  const itemsInProject = Array.from(items.values()).filter(item => {
    if (item.meta.type === 'folder' || item.meta.type === 'project') return false
    const itemDir = path.dirname(item.path)
    return itemDir === projectPath
  })

  // Delete all items in project
  for (const item of itemsInProject) {
    await deleteItem(item.path)
  }

  // Find and delete the project item itself
  const projectItem = Array.from(items.values()).find(item => {
    if (item.meta.type !== 'project') return false
    return path.dirname(item.path) === projectPath
  })

  if (projectItem) {
    await deleteItem(projectItem.path)
  }
}, [items, deleteItem])
```

**Step 3: Add moveProject method (for drag into folder)**

Add to VaultContextValue interface:

```typescript
moveProject: (projectPath: string, targetFolderPath: string) => Promise<void>
```

Add implementation:

```typescript
const moveProject = useCallback(async (projectPath: string, targetFolderPath: string) => {
  const projectItem = Array.from(items.values()).find(item => {
    if (item.meta.type !== 'project') return false
    return path.dirname(item.path) === projectPath
  })

  if (!projectItem) return

  // Move the project's directory marker file
  const filename = path.basename(projectItem.path)
  const newPath = path.join(targetFolderPath, path.basename(projectPath), filename)

  await updateItem({
    ...projectItem,
    path: newPath,
    meta: { ...projectItem.meta, modified: new Date().toISOString() },
  })

  // Move all items inside the project
  const itemsInProject = Array.from(items.values()).filter(item => {
    if (item.meta.type === 'folder' || item.meta.type === 'project') return false
    return path.dirname(item.path) === projectPath
  })

  for (const item of itemsInProject) {
    const itemFilename = path.basename(item.path)
    const newItemPath = path.join(targetFolderPath, path.basename(projectPath), itemFilename)
    await updateItem({
      ...item,
      path: newItemPath,
      meta: { ...item.meta, modified: new Date().toISOString() },
    })
  }
}, [items, updateItem])
```

**Step 4: Add createFolderWithProjects method (for grouping)**

Add to VaultContextValue interface:

```typescript
createFolderWithProjects: (folderName: string, projectPaths: string[]) => Promise<void>
```

Add implementation:

```typescript
const createFolderWithProjects = useCallback(async (folderName: string, projectPaths: string[]) => {
  if (!vaultPath) return

  // Create the new folder
  const folder = await createFolder(folderName)
  const folderPath = path.dirname(folder.path)

  // Move each project into the new folder
  for (const projectPath of projectPaths) {
    await moveProject(projectPath, folderPath)
  }
}, [vaultPath, createFolder, moveProject])
```

**Step 5: Add updateSortOrder method**

Add to VaultContextValue interface:

```typescript
updateSortOrder: (itemPath: string, newOrder: number) => Promise<void>
```

Add implementation:

```typescript
const updateSortOrder = useCallback(async (itemPath: string, newOrder: number) => {
  const item = Array.from(items.values()).find(i => {
    if (i.meta.type !== 'folder' && i.meta.type !== 'project') return false
    return path.dirname(i.path) === itemPath
  })

  if (!item) return
  if (item.meta.type !== 'folder' && item.meta.type !== 'project') return

  await updateItem({
    ...item,
    meta: { ...item.meta, sort_order: newOrder, modified: new Date().toISOString() },
  })
}, [items, updateItem])
```

**Step 6: Update buildTree to sort by sort_order**

Modify line 69:

```typescript
return tree.sort((a, b) => {
  const aItem = Array.from(items.values()).find(i => i.id === a.id)
  const bItem = Array.from(items.values()).find(i => i.id === b.id)
  const aOrder = (aItem?.meta as FolderMeta | ProjectMeta)?.sort_order ?? Infinity
  const bOrder = (bItem?.meta as FolderMeta | ProjectMeta)?.sort_order ?? Infinity
  if (aOrder !== bOrder) return aOrder - bOrder
  return a.name.localeCompare(b.name)
})
```

**Step 7: Add methods to provider value**

Add to the Provider value object (around line 320):

```typescript
ungroupFolder,
deleteProject,
moveProject,
createFolderWithProjects,
updateSortOrder,
```

**Step 8: Commit**

```bash
git add src/renderer/contexts/VaultContext.tsx
git commit -m "feat: add VaultContext methods for folder/project operations"
```

---

### Task 3: Create ConfirmDialog Component

**Files:**
- Create: `src/renderer/components/ui/ConfirmDialog.tsx`

**Step 1: Create the component**

```typescript
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div
        ref={dialogRef}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              variant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
```

**Step 2: Commit**

```bash
git add src/renderer/components/ui/ConfirmDialog.tsx
git commit -m "feat: add ConfirmDialog component for delete confirmations"
```

---

### Task 4: Add Context Menus to Sidebar TreeItem

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

**Step 1: Import dependencies**

Add to imports at top:

```typescript
import { useContextMenu } from '../../hooks/useContextMenu'
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import type { TreeNode } from '@shared/types'
```

**Step 2: Add context menu and dialog state to Sidebar component**

Add after line 118 (after settingsMenuRef):

```typescript
const contextMenu = useContextMenu<TreeNode>()
const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; node: TreeNode | null }>({
  isOpen: false,
  node: null,
})
```

**Step 3: Add handler functions**

Add after the handleProjectKeyDown function (around line 179):

```typescript
const handleUngroup = async () => {
  if (!contextMenu.data || contextMenu.data.type !== 'folder') return
  await ungroupFolder(contextMenu.data.path)
  contextMenu.close()
}

const handleDeleteProject = async () => {
  if (!deleteConfirm.node || deleteConfirm.node.type !== 'project') return
  await deleteProject(deleteConfirm.node.path)
  setDeleteConfirm({ isOpen: false, node: null })
}

const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
  contextMenu.open(e, node)
}
```

**Step 4: Get ungroupFolder and deleteProject from useVault**

Modify line 106:

```typescript
const { tree, getTodayTasks, getNext7DaysTasks, getInboxItems, createFolder, createProject, ungroupFolder, deleteProject } = useVault()
```

**Step 5: Pass context menu handler to TreeItem**

Modify TreeItem to accept onContextMenu prop. Change function signature at line 9:

```typescript
function TreeItem({
  node,
  depth = 0,
  onContextMenu,
}: {
  node: TreeNode
  depth?: number
  onContextMenu?: (e: React.MouseEvent, node: TreeNode) => void
}) {
```

**Step 6: Add onContextMenu to TreeItem button**

Add to button element (around line 26):

```typescript
onContextMenu={(e) => onContextMenu?.(e, node)}
```

**Step 7: Pass handler when rendering TreeItem**

Modify line 475-477:

```typescript
{tree.map((node) => (
  <TreeItem
    key={node.id}
    node={node}
    onContextMenu={handleContextMenu}
  />
))}
```

**Step 8: Also pass to nested TreeItem in TreeItem component**

Modify line 46-48 in TreeItem:

```typescript
{node.children.map((child) => (
  <TreeItem
    key={child.id}
    node={child}
    depth={depth + 1}
    onContextMenu={onContextMenu}
  />
))}
```

**Step 9: Add context menu and dialog rendering**

Add before the closing `</div>` of the Sidebar component (around line 536):

```typescript
{/* Context Menu */}
{contextMenu.isOpen && contextMenu.data && (
  <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={contextMenu.close}>
    {contextMenu.data.type === 'folder' && (
      <ContextMenuItem onClick={handleUngroup}>
        Ungroup
      </ContextMenuItem>
    )}
    {contextMenu.data.type === 'project' && (
      <ContextMenuItem
        variant="danger"
        onClick={() => {
          setDeleteConfirm({ isOpen: true, node: contextMenu.data })
          contextMenu.close()
        }}
      >
        Delete
      </ContextMenuItem>
    )}
  </ContextMenu>
)}

{/* Delete Confirmation Dialog */}
<ConfirmDialog
  isOpen={deleteConfirm.isOpen}
  title="Delete Project"
  message={`Delete project "${deleteConfirm.node?.name}" and all its contents?`}
  confirmLabel="Delete"
  cancelLabel="Cancel"
  variant="danger"
  onConfirm={handleDeleteProject}
  onCancel={() => setDeleteConfirm({ isOpen: false, node: null })}
/>
```

**Step 10: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "feat: add context menus for folder ungroup and project delete"
```

---

### Task 5: Add Drag Capability to Sidebar Items

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

**Step 1: Import drag hooks**

Update imports:

```typescript
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
```

**Step 2: Update TreeItem to use both draggable and droppable**

Replace the TreeItem function (lines 9-53) with:

```typescript
function TreeItem({
  node,
  depth = 0,
  onContextMenu,
}: {
  node: TreeNode
  depth?: number
  onContextMenu?: (e: React.MouseEvent, node: TreeNode) => void
}) {
  const { selectedView, selectedPath, setSelectedView } = useUI()

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `drop-${node.path}`,
    data: { type: 'sidebar-item', node },
  })

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `drag-${node.path}`,
    data: { type: 'sidebar-item', node },
  })

  const handleClick = () => {
    setSelectedView(node.type as 'folder' | 'project', node.path)
  }

  const Icon = node.type === 'folder' ? Folder : ListTodo
  const isSelected = selectedView === node.type && selectedPath === node.path

  // Combine refs
  const setNodeRef = (el: HTMLButtonElement | null) => {
    setDroppableRef(el)
    setDraggableRef(el)
  }

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  // Determine drop highlight color
  const getDropHighlight = () => {
    if (!isOver) return ''
    // Project being dropped on project = purple (grouping)
    if (node.type === 'project') return 'bg-purple-600/20 ring-1 ring-purple-500'
    // Project being dropped on folder = blue (move into)
    if (node.type === 'folder') return 'bg-blue-600/20 ring-1 ring-blue-500'
    return ''
  }

  return (
    <div>
      <button
        ref={setNodeRef}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu?.(e, node)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
          isOver
            ? getDropHighlight()
            : isSelected
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
        style={{ ...style, paddingLeft: `${12 + depth * 16}px` }}
        {...attributes}
        {...listeners}
      >
        <span className="flex items-center gap-2.5">
          <Icon size={16} className={isSelected ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
          <span>{node.name}</span>
        </span>
        {node.count !== undefined && node.count > 0 && (
          <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">{node.count}</span>
        )}
      </button>
      {node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "feat: add drag capability to sidebar folders and projects"
```

---

### Task 6: Handle Sidebar Drag Events in DndContext

**Files:**
- Modify: `src/renderer/contexts/DndContext.tsx`

**Step 1: Import additional types**

```typescript
import type { VaultItem, TaskMeta, TreeNode } from '@shared/types'
```

**Step 2: Get additional methods from VaultContext**

Update line 21:

```typescript
const { items, updateItem, moveProject, createFolderWithProjects } = useVault()
```

**Step 3: Add state for folder name prompt**

After line 22:

```typescript
const [pendingGroup, setPendingGroup] = useState<{
  draggedPath: string
  targetPath: string
} | null>(null)
const [newFolderName, setNewFolderName] = useState('')
```

**Step 4: Update handleDragEnd to handle sidebar items**

Replace handleDragEnd function:

```typescript
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

    // Project dropped on folder = move into folder
    if (draggedNode.type === 'project' && targetNode.type === 'folder') {
      await moveProject(draggedNode.path, targetNode.path)
      return
    }

    // Project dropped on project = prompt for folder name to group
    if (draggedNode.type === 'project' && targetNode.type === 'project') {
      setPendingGroup({
        draggedPath: draggedNode.path,
        targetPath: targetNode.path,
      })
      return
    }

    // Folder dropped on folder = not allowed (handled by UI feedback)
    return
  }

  // Handle existing task/note drags
  const draggedItem = items.get(String(active.id))
  const targetFolder = String(over.id).replace('drop-', '')

  if (!draggedItem || draggedItem.meta.type === 'folder' || draggedItem.meta.type === 'project') {
    return
  }

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
```

**Step 5: Add handler for folder name submission**

After handleDragCancel:

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

**Step 6: Add folder name input UI**

Add before closing `</DndKitContext>` tag (around line 75):

```typescript
{/* Folder name prompt for grouping */}
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
```

**Step 7: Commit**

```bash
git add src/renderer/contexts/DndContext.tsx
git commit -m "feat: handle sidebar drag events for move and group operations"
```

---

### Task 7: Add Sortable Reordering for Sidebar

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`
- Modify: `src/renderer/contexts/DndContext.tsx`

**Step 1: Import sortable in Sidebar**

Add to imports:

```typescript
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
```

**Step 2: Convert TreeItem to use useSortable instead of separate draggable/droppable**

Replace TreeItem with sortable version:

```typescript
function TreeItem({
  node,
  depth = 0,
  onContextMenu,
}: {
  node: TreeNode
  depth?: number
  onContextMenu?: (e: React.MouseEvent, node: TreeNode) => void
}) {
  const { selectedView, selectedPath, setSelectedView } = useUI()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: node.path,
    data: { type: 'sidebar-item', node },
  })

  const handleClick = () => {
    setSelectedView(node.type as 'folder' | 'project', node.path)
  }

  const Icon = node.type === 'folder' ? Folder : ListTodo
  const isSelected = selectedView === node.type && selectedPath === node.path

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getDropHighlight = () => {
    if (!isOver) return ''
    if (node.type === 'project') return 'bg-purple-600/20 ring-1 ring-purple-500'
    if (node.type === 'folder') return 'bg-blue-600/20 ring-1 ring-blue-500'
    return ''
  }

  return (
    <div>
      <button
        ref={setNodeRef}
        onClick={handleClick}
        onContextMenu={(e) => onContextMenu?.(e, node)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
          isOver
            ? getDropHighlight()
            : isSelected
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
        style={{ ...style, paddingLeft: `${12 + depth * 16}px` }}
        {...attributes}
        {...listeners}
      >
        <span className="flex items-center gap-2.5">
          <Icon size={16} className={isSelected ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
          <span>{node.name}</span>
        </span>
        {node.count !== undefined && node.count > 0 && (
          <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">{node.count}</span>
        )}
      </button>
      {node.children.length > 0 && (
        <SortableContext items={node.children.map(c => c.path)} strategy={verticalListSortingStrategy}>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onContextMenu={onContextMenu}
            />
          ))}
        </SortableContext>
      )}
    </div>
  )
}
```

**Step 3: Wrap tree rendering in SortableContext**

Modify lines 474-478:

```typescript
<SortableContext items={tree.map(n => n.path)} strategy={verticalListSortingStrategy}>
  {tree.map((node) => (
    <TreeItem
      key={node.id}
      node={node}
      onContextMenu={handleContextMenu}
    />
  ))}
</SortableContext>
```

**Step 4: Import CSS utility**

Add to imports:

```typescript
import { CSS } from '@dnd-kit/utilities'
```

**Step 5: Update DndContext to handle reordering**

In DndContext.tsx, add arrayMove import:

```typescript
import { arrayMove } from '@dnd-kit/sortable'
```

Add updateSortOrder to useVault destructure:

```typescript
const { items, updateItem, moveProject, createFolderWithProjects, updateSortOrder } = useVault()
```

Update handleDragEnd to include reordering logic - add before the task/note handling:

```typescript
// Handle reordering (same level)
if (activeData?.type === 'sidebar-item' && overData?.type === 'sidebar-item') {
  const draggedNode = activeData.node as TreeNode
  const targetNode = overData.node as TreeNode

  // Same type and same parent = reorder
  const draggedParent = path.dirname(draggedNode.path)
  const targetParent = path.dirname(targetNode.path)

  if (draggedParent === targetParent && draggedNode.type === targetNode.type) {
    // Just update sort orders - tree will rebuild automatically
    // Get all siblings, find indices, calculate new order
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
    const newIndex = siblings.findIndex(s => path.dirname(s.path) === targetNode.path)

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const reordered = arrayMove(siblings, oldIndex, newIndex)
      for (let i = 0; i < reordered.length; i++) {
        await updateSortOrder(path.dirname(reordered[i].path), i)
      }
    }
    return
  }

  // Different types or parents = move/group operations (existing logic)
  // ... rest of existing sidebar-item handling
}
```

**Step 6: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx src/renderer/contexts/DndContext.tsx
git commit -m "feat: add sortable reordering for sidebar items"
```

---

### Task 8: Test and Fix Edge Cases

**Step 1: Test the following scenarios manually**

1. Drag project into folder - should move project
2. Drag project onto project - should prompt for folder name, create folder with both
3. Drag folder to reorder - should reorder folders
4. Drag project to reorder - should reorder projects
5. Right-click folder → Ungroup - should move projects to root, delete folder
6. Right-click project → Delete - should show confirmation, delete on confirm
7. Drag folder onto folder - should show not-allowed visual (no action)

**Step 2: Fix any issues found during testing**

**Step 3: Final commit**

```bash
git add -A
git commit -m "fix: address edge cases in sidebar drag-drop and context menus"
```

---

## Summary

This implementation adds:
1. **VaultContext methods**: ungroupFolder, deleteProject, moveProject, createFolderWithProjects, updateSortOrder
2. **ConfirmDialog component**: Reusable confirmation modal
3. **Context menus**: Right-click folder for Ungroup, right-click project for Delete
4. **Drag-and-drop**: Reordering folders/projects, moving projects into folders, grouping projects into new folders
5. **Sort order persistence**: Using existing sort_order field in FolderMeta/ProjectMeta
