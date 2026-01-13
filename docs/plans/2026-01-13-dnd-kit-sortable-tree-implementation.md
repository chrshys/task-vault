# dnd-kit-sortable-tree Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace custom DnD implementation with dnd-kit-sortable-tree for better UX in sidebar and task list.

**Architecture:** Two SortableTree instances (sidebar + task list) sharing one DndContext. Cross-tree drops handled in onDragEnd.

**Tech Stack:** dnd-kit-sortable-tree, @dnd-kit/core, @dnd-kit/sortable, React

---

## Task 1: Install dnd-kit-sortable-tree

**Files:**
- Modify: `package.json`

**Step 1: Install the library**

Run: `npm install dnd-kit-sortable-tree`

**Step 2: Verify installation**

Run: `npm ls dnd-kit-sortable-tree`
Expected: Shows dnd-kit-sortable-tree@x.x.x

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add dnd-kit-sortable-tree dependency"
```

---

## Task 2: Create sidebar tree data adapter

**Files:**
- Create: `src/renderer/utils/sidebarTreeAdapter.ts`
- Test: `src/renderer/utils/sidebarTreeAdapter.test.ts`

**Step 1: Write the failing test**

```typescript
// src/renderer/utils/sidebarTreeAdapter.test.ts
import { describe, it, expect } from 'vitest'
import { toSortableTree, fromSortableTree } from './sidebarTreeAdapter'
import type { TreeNode } from '@shared/types'

describe('sidebarTreeAdapter', () => {
  const mockTree: TreeNode[] = [
    {
      id: 'folder-1',
      name: 'Work',
      type: 'folder',
      path: '/vault/Work',
      children: [
        { id: 'proj-1', name: 'Project A', type: 'project', path: '/vault/Work/Project A', children: [], count: 3 }
      ],
      count: 3
    },
    { id: 'proj-2', name: 'Personal', type: 'project', path: '/vault/Personal', children: [], count: 5 }
  ]

  it('converts TreeNode[] to flat sortable tree items', () => {
    const result = toSortableTree(mockTree)
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ id: 'folder-1', parentId: null, canHaveChildren: true })
    expect(result[1]).toMatchObject({ id: 'proj-1', parentId: 'folder-1', canHaveChildren: false })
    expect(result[2]).toMatchObject({ id: 'proj-2', parentId: null, canHaveChildren: false })
  })

  it('preserves original node data', () => {
    const result = toSortableTree(mockTree)
    expect(result[0].data.name).toBe('Work')
    expect(result[0].data.path).toBe('/vault/Work')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/renderer/utils/sidebarTreeAdapter.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

```typescript
// src/renderer/utils/sidebarTreeAdapter.ts
import type { TreeNode } from '@shared/types'
import type { TreeItem } from 'dnd-kit-sortable-tree'

export interface SidebarTreeItem extends TreeItem<{ node: TreeNode }> {
  canHaveChildren: boolean
}

export function toSortableTree(nodes: TreeNode[], parentId: string | null = null): SidebarTreeItem[] {
  const result: SidebarTreeItem[] = []

  for (const node of nodes) {
    result.push({
      id: node.id,
      parentId,
      canHaveChildren: node.type === 'folder',
      data: { node },
      children: [],
    })

    if (node.children.length > 0) {
      result.push(...toSortableTree(node.children, node.id))
    }
  }

  return result
}

export function fromSortableTree(items: SidebarTreeItem[]): TreeNode[] {
  const itemMap = new Map<string, SidebarTreeItem>()
  items.forEach(item => itemMap.set(item.id, item))

  const roots: TreeNode[] = []

  for (const item of items) {
    const node = item.data.node
    if (item.parentId === null) {
      roots.push(node)
    }
  }

  return roots
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/renderer/utils/sidebarTreeAdapter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderer/utils/sidebarTreeAdapter.ts src/renderer/utils/sidebarTreeAdapter.test.ts
git commit -m "feat: add sidebar tree data adapter for dnd-kit-sortable-tree"
```

---

## Task 3: Create new DndContext with sortable tree support

**Files:**
- Create: `src/renderer/contexts/TreeDndContext.tsx`

**Step 1: Create the new context**

```typescript
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
  const { items, moveProject, updateSortOrder, updateItem } = useVault()
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
```

**Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/renderer/contexts/TreeDndContext.tsx
git commit -m "feat: add TreeDndContext for sortable tree support"
```

---

## Task 4: Create SidebarTree component using dnd-kit-sortable-tree

**Files:**
- Create: `src/renderer/components/layout/SidebarTree.tsx`

**Step 1: Create the component**

```typescript
// src/renderer/components/layout/SidebarTree.tsx
import { useMemo } from 'react'
import { SortableTree, FolderTreeItemWrapper, type TreeItemComponentProps } from 'dnd-kit-sortable-tree'
import { Folder, ListTodo, ChevronRight } from 'lucide-react'
import { useVault } from '../../contexts/VaultContext'
import { useUI } from '../../contexts/UIContext'
import { toSortableTree, type SidebarTreeItem } from '../../utils/sidebarTreeAdapter'
import type { TreeNode } from '@shared/types'

function SidebarTreeItemComponent({
  item,
  depth,
  onCollapse,
  collapsed,
  ...props
}: TreeItemComponentProps<{ node: TreeNode }>) {
  const { selectedView, selectedPath, setSelectedView } = useUI()
  const node = item.data.node
  const Icon = node.type === 'folder' ? Folder : ListTodo
  const isSelected = selectedView === node.type && selectedPath === node.path
  const isFolder = node.type === 'folder'
  const hasChildren = node.children.length > 0

  const handleClick = () => {
    setSelectedView(node.type as 'folder' | 'project', node.path)
  }

  return (
    <FolderTreeItemWrapper {...props} item={item} depth={depth} collapsed={collapsed} onCollapse={onCollapse}>
      <button
        onClick={handleClick}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
          isSelected
            ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <span className="flex items-center gap-2.5">
          {isFolder && hasChildren ? (
            <span
              onClick={(e) => {
                e.stopPropagation()
                onCollapse?.()
              }}
              className="flex items-center justify-center -ml-1 mr-0.5 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <ChevronRight
                size={14}
                className={`text-gray-400 dark:text-gray-500 transition-transform ${collapsed ? '' : 'rotate-90'}`}
              />
            </span>
          ) : isFolder ? (
            <span className="w-[18px]" />
          ) : null}
          <Icon size={16} className={isSelected ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
          <span>{node.name}</span>
        </span>
        {node.count !== undefined && node.count > 0 && (
          <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">{node.count}</span>
        )}
      </button>
    </FolderTreeItemWrapper>
  )
}

interface SidebarTreeProps {
  onItemsChange: (items: SidebarTreeItem[]) => void
}

export function SidebarTree({ onItemsChange }: SidebarTreeProps) {
  const { tree } = useVault()

  const items = useMemo(() => toSortableTree(tree), [tree])

  return (
    <SortableTree
      items={items}
      onItemsChanged={onItemsChange}
      TreeItemComponent={SidebarTreeItemComponent}
      indentationWidth={16}
    />
  )
}
```

**Step 2: Verify it compiles**

Run: `npm run typecheck`
Expected: No errors (may need adjustments based on library API)

**Step 3: Commit**

```bash
git add src/renderer/components/layout/SidebarTree.tsx
git commit -m "feat: add SidebarTree component using dnd-kit-sortable-tree"
```

---

## Task 5: Integrate SidebarTree into Sidebar component

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx:620-635`

**Step 1: Import and use SidebarTree**

Replace the existing tree rendering section with:

```typescript
// Add import at top
import { SidebarTree } from './SidebarTree'
import { toSortableTree, type SidebarTreeItem } from '../../utils/sidebarTreeAdapter'

// Replace lines 620-634 with:
<div className="space-y-0.5">
  <SidebarTree
    onItemsChange={handleTreeChange}
  />
</div>
```

**Step 2: Add handler for tree changes**

```typescript
// Add after handleToggleCollapse function (~line 256)
const handleTreeChange = async (items: SidebarTreeItem[]) => {
  // Update sort orders based on new tree structure
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const node = item.data.node

    // Check if parent changed (moved into/out of folder)
    const newParentId = item.parentId
    const currentParent = tree.find(n => n.children.some(c => c.id === node.id))
    const currentParentId = currentParent?.id ?? null

    if (newParentId !== currentParentId) {
      // Item was moved to different parent
      const newParentNode = items.find(i => i.id === newParentId)
      const targetPath = newParentNode ? newParentNode.data.node.path : vaultPath!
      await moveProject(node.path, targetPath)
    }

    // Update sort order
    await updateSortOrder(node.path, i)
  }
}
```

**Step 3: Remove old DnD imports and components**

Remove from imports:
- `useDroppable` from '@dnd-kit/core'
- `SortableContext, verticalListSortingStrategy, useSortable` from '@dnd-kit/sortable'
- `useDropIndicator` from '../../contexts/DndContext'

Remove components:
- `DropIndicatorLine`
- `RootDropZone`
- `TreeItem` (replaced by SidebarTree)

**Step 4: Run the app to verify**

Run: `npm run electron:dev`
Expected: Sidebar renders, drag-and-drop works

**Step 5: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "feat: integrate SidebarTree into Sidebar component"
```

---

## Task 6: Filter subtasks from TaskList

**Files:**
- Modify: `src/renderer/components/layout/TaskList.tsx:31-34`

**Step 1: Add subtask filtering**

```typescript
// Replace lines 31-34 in displayItems memo:
return Array.from(items.values()).filter(item => {
  if (item.meta.type === 'folder' || item.meta.type === 'project') return false
  // Filter out subtasks - only show top-level tasks
  if (item.meta.type === 'task' && (item.meta as TaskMeta).parent) return false
  return path.dirname(item.path) === selectedPath
})
```

**Step 2: Add TaskMeta import**

```typescript
// Add to imports
import type { VaultItem, RepeatConfig, TaskMeta } from '@shared/types'
```

**Step 3: Verify subtasks don't appear in list**

Run: `npm run electron:dev`
Expected: Subtasks only appear in detail panel, not main list

**Step 4: Commit**

```bash
git add src/renderer/components/layout/TaskList.tsx
git commit -m "fix: filter subtasks from main task list"
```

---

## Task 7: Add sortable task list

**Files:**
- Modify: `src/renderer/components/layout/TaskList.tsx`

**Step 1: Add sortable context to task list**

```typescript
// Add imports
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Wrap task list with SortableContext (in the return, around displayItems.map):
<SortableContext items={displayItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
  {displayItems.map((item) => (
    <SortableTaskRow
      key={item.id}
      item={item}
      onToggleComplete={handleToggleComplete}
    />
  ))}
</SortableContext>
```

**Step 2: Create SortableTaskRow wrapper**

```typescript
// Add before TaskList component
function SortableTaskRow({ item, onToggleComplete }: { item: VaultItem; onToggleComplete: (item: VaultItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskRow item={item} onToggleComplete={onToggleComplete} />
    </div>
  )
}
```

**Step 3: Handle task reorder**

```typescript
// Add to TaskList component
const { updateSortOrder } = useVault()

// Add handler
const handleTaskReorder = async (activeId: string, overId: string) => {
  const oldIndex = displayItems.findIndex(i => i.id === activeId)
  const newIndex = displayItems.findIndex(i => i.id === overId)

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

  const reordered = arrayMove(displayItems, oldIndex, newIndex)
  for (let i = 0; i < reordered.length; i++) {
    await updateSortOrder(reordered[i].path, i)
  }
}
```

**Step 4: Verify task reordering works**

Run: `npm run electron:dev`
Expected: Tasks can be dragged to reorder within the list

**Step 5: Commit**

```bash
git add src/renderer/components/layout/TaskList.tsx
git commit -m "feat: add sortable task list with drag reordering"
```

---

## Task 8: Fix task-to-project cross-drag

**Files:**
- Modify: `src/renderer/contexts/TreeDndContext.tsx`

**Step 1: Add cross-drag detection in handleDragEnd**

```typescript
// Update handleDragEnd in TreeDndContext.tsx
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event

  try {
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    const overData = over.data.current

    // Check if this is a task being dropped on a sidebar project
    const draggedItem = items.get(activeId)
    if (!draggedItem) return

    // Only handle task/note items (not folders/projects)
    if (draggedItem.meta.type === 'folder' || draggedItem.meta.type === 'project') return

    // Check if target is a sidebar project
    if (overData?.type === 'sidebar-item' && overData.node?.type === 'project') {
      const targetPath = overData.node.path
      const filename = path.basename(draggedItem.path)
      const newPath = path.join(targetPath, filename)

      if (newPath !== draggedItem.path) {
        await updateItem({
          ...draggedItem,
          path: newPath,
          meta: { ...draggedItem.meta, modified: new Date().toISOString() },
        })
      }
      return
    }

    // Task reordering is handled by TaskList component
  } finally {
    setActiveId(null)
    setActiveItem(null)
  }
}
```

**Step 2: Add path import**

```typescript
import path from 'path-browserify'
```

**Step 3: Test cross-drag**

Run: `npm run electron:dev`
Expected: Dragging task to sidebar project moves it to that project

**Step 4: Commit**

```bash
git add src/renderer/contexts/TreeDndContext.tsx
git commit -m "feat: implement task-to-project cross-drag"
```

---

## Task 9: Remove old DndContext

**Files:**
- Delete: `src/renderer/contexts/DndContext.tsx`
- Modify: `src/renderer/App.tsx`

**Step 1: Update App.tsx to use TreeDndProvider**

```typescript
// Replace DndProvider import with TreeDndProvider
import { TreeDndProvider } from './contexts/TreeDndContext'

// Replace <DndProvider> with <TreeDndProvider> in JSX
```

**Step 2: Remove any remaining DndContext imports across codebase**

Search for: `from '../../contexts/DndContext'` or `from './DndContext'`
Remove those imports and usages.

**Step 3: Delete old DndContext.tsx**

Run: `rm src/renderer/contexts/DndContext.tsx`

**Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass

**Step 5: Run app and verify all functionality**

Run: `npm run electron:dev`
Expected: All DnD operations work correctly

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove old DndContext, use TreeDndProvider"
```

---

## Task 10: Update TaskRow to not be independently draggable

**Files:**
- Modify: `src/renderer/components/task/TaskRow.tsx`

**Step 1: Remove useDraggable from TaskRow**

Remove:
```typescript
import { useDraggable } from '@dnd-kit/core'
```

And remove the useDraggable hook usage and related style/attributes.

TaskRow should now be a simple presentational component - dragging is handled by SortableTaskRow wrapper.

**Step 2: Verify task rows still work**

Run: `npm run electron:dev`
Expected: Tasks display correctly, dragging handled by parent wrapper

**Step 3: Commit**

```bash
git add src/renderer/components/task/TaskRow.tsx
git commit -m "refactor: remove independent draggable from TaskRow"
```

---

## Task 11: Final cleanup and testing

**Files:**
- Various

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

**Step 2: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Run app and test all scenarios**

Run: `npm run electron:dev`

Test checklist:
- [ ] Drag folder to reorder at root
- [ ] Drag project into folder
- [ ] Drag project out of folder to root
- [ ] Drag project to reorder within folder
- [ ] Drag task to reorder in task list
- [ ] Drag task to sidebar project (moves task)
- [ ] Subtasks only appear in detail panel
- [ ] Collapsed folders persist

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete dnd-kit-sortable-tree migration"
```
