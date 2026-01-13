# Drag-and-Drop Migration to dnd-kit-sortable-tree

## Problem

The current DnD implementation is "fussy" due to:
- Invisible 15%/85% drop zones (users can't tell where items will land)
- Manual pointer Y tracking that desynchronizes with visual position
- Nested `SortableContext` components that break cross-level drags
- Silent failures when drops don't match handler conditions
- Bug: any task drag moves to new project, even without hovering over sidebar

## Solution

Adopt `dnd-kit-sortable-tree` library which handles:
- Flattened tree structure with `parentId` attributes
- Built-in visual drop indicators
- Cross-level drag support
- Tree-aware collision detection

## Architecture

```
<DndContext>
  ├── <SidebarTree>        // Folders → Projects
  │     └── dnd-kit-sortable-tree (flattened hierarchy)
  │
  └── <TaskListTree>       // Tasks per project (flat sortable)
        └── dnd-kit-sortable-tree (single level)
</DndContext>
```

One shared `DndContext` enables cross-tree drags (task → sidebar project).

## Data Models

### Sidebar Tree Item

```typescript
interface SidebarTreeItem {
  id: string
  parentId: string | null  // null = root level
  type: 'folder' | 'project'
  name: string
  sortOrder: number
  collapsed?: boolean
}
```

**Rules:**
- Folders can contain: projects only
- Projects cannot contain sidebar items
- Root level can have: folders and projects

### Task List Item

```typescript
interface TaskListItem {
  id: string
  projectId: string
  parentId: string | null  // null = top-level task
  sortOrder: number
  status: 'pending' | 'completed'
}
```

**Display:**
1. Filter: only `parentId === null` (hide subtasks from main list)
2. Group: pending first, completed second
3. Sort: by `sortOrder` within each group

## Drop Behaviors

### Sidebar
- Project over folder → moves into folder
- Project between items → reorder
- Project out of folder → moves to root

### Task List
- Task up/down → reorder within status group
- Grouping is display-only; manual order preserved

### Cross-Tree
- Task dropped on sidebar project → moves to that project
- Only triggers when `over.id` is a project (fixes current bug)

## Files to Modify

| File | Change |
|------|--------|
| `DndContext.tsx` | Replace custom handlers with library tree logic |
| `Sidebar.tsx` | Use `SortableTree` + `FolderTreeItemWrapper` |
| Task list component | Use `SortableTree` for flat sortable |
| `TaskRow.tsx` | Change from `useDraggable` to tree item |
| `SubtaskList.tsx` | No change (stays as checkboxes) |

## Code to Delete

- `dragPointerYRef` manual tracking
- 15%/85% threshold logic
- `handleRootDropZoneDrop`, `handleSidebarReorder`, `handleProjectMoveToRoot`
- `DropIndicatorContext` (library handles indicators)

## Migration Steps

1. Install `dnd-kit-sortable-tree`
2. Create new DndContext wrapper with library
3. Migrate sidebar to `SortableTree`
4. Migrate task list to `SortableTree`
5. Wire up cross-tree drops
6. Filter subtasks from main task list
7. Delete old DnD code

## Edge Cases

**Invalid drops (no-op):**
- Folder into folder
- Task into folder (only projects accept)
- Project into project

**Error handling:**
- Optimistic visual updates during drag
- Snap back on persistence error

## Accessibility

Library provides keyboard support:
- Tab to focus handle
- Space to pick up
- Arrow keys to move
- Space to drop
