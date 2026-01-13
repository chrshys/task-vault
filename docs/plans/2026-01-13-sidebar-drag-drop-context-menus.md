# Sidebar Drag-Drop & Context Menus Design

## Overview

Enable drag-and-drop for folders and projects in the sidebar, plus context menu actions for ungrouping folders and deleting projects.

## Drag-and-Drop Behavior

### Reordering (Folders & Projects)
- Both folders and projects can be dragged to reorder within their current level
- Show insertion indicator (horizontal line) between items to show drop position
- Dropping between items reorders without changing hierarchy

### Project → Folder (Move into)
- When dragging a project and hovering over a folder's body (not between items), show blue highlight
- On drop, move the project into that folder
- Folders can hold multiple projects (append behavior)

### Project → Project (Create Folder)
- When dragging a project over another project's body, show purple/different highlight to indicate grouping
- On drop, show inline text input prompting for folder name
- On Enter or blur with valid name: create new folder containing both projects
- On Escape or empty name: cancel operation

### Folder Drag Restrictions
- Folders can be reordered but cannot be dropped INTO other folders
- If a folder is dragged over another folder's body, show "not allowed" cursor
- Folders cannot be nested inside folders

### Drop Zone Detection
- "Between items" = reorder (show insertion line)
- "Over item body" = move into / group (show highlight)

## Context Menus

### Right-click Folder
- **"Ungroup"** - Removes the folder, moves all contained projects to root level
- Immediate action (no confirmation needed)

### Right-click Project
- **"Delete"** - Shows confirmation: "Delete project 'X' and all its contents?"
- Cancel button (secondary) and Delete button (danger/red)
- On confirm: delete all tasks/notes inside, then delete the project

## State & Persistence

### Sort Order
- Add `order` field to folder/project items (numeric index)
- When reordering, update `order` field for affected items
- Tree building sorts by `order` (alphabetical fallback for items without order)

### Folder Creation (from project grouping)
- Create new folder item at file system level
- Move both projects into folder by updating their paths
- Assign order values to maintain position in tree

### Ungroup Operation
- Read all projects inside the folder
- Update each project's path to move to root
- Delete the folder item
- Assign order values to place ungrouped projects where folder was

### Delete Project Operation
- Query all items where `path.dirname(item.path) === projectPath`
- Delete each task/note
- Delete the project item
- Tree rebuilds automatically

## Implementation Notes

### Files to Modify
- `src/renderer/components/layout/Sidebar.tsx` - Add draggable/droppable to TreeItem, context menu handlers
- `src/renderer/contexts/DndContext.tsx` - Extend to handle sidebar drags separately from task/note drags
- `src/renderer/contexts/VaultContext.tsx` - Add `deleteProject()`, `ungroupFolder()`, `reorderItems()` methods
- `src/renderer/components/ui/ContextMenu.tsx` - Already exists, reuse for folder/project menus

### New Components
- Confirmation modal for delete (simple portal-based modal)
- Inline folder name input for project grouping
