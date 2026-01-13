# Projects to Lists Refactor

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename "Projects" to "Lists" throughout the app and add folder/list management features (drag lists into folders, ungroup folders, delete lists).

**Architecture:** This is a multi-layer refactor touching types, file system, UI, and state management. We'll rename the concept first (breaking change handled by type system), then add new features. The file system uses `_project.md` marker files which will become `_list.md`.

**Tech Stack:** TypeScript, React, Electron, @dnd-kit, gray-matter

---

## Task 1: Update Type Definitions

**Files:**
- Modify: `src/shared/types.ts`

**Step 1: Update ItemType union**

```typescript
// Line 1: Change 'project' to 'list'
export type ItemType = 'folder' | 'list' | 'task' | 'note'
```

**Step 2: Rename ProjectMeta to ListMeta**

```typescript
// Lines 29-35: Rename interface and change type literal
export interface ListMeta extends BaseMeta {
  type: 'list'
  name: string
  icon?: string
  color?: string
  sort_order: number
}
```

**Step 3: Update ItemMeta union**

```typescript
// Line 55: Change ProjectMeta to ListMeta
export type ItemMeta = FolderMeta | ListMeta | TaskMeta | NoteMeta
```

**Step 4: Rename VaultProject to VaultList**

```typescript
// Lines 69-71: Rename interface and change meta type
export interface VaultList extends VaultItem {
  meta: ListMeta
}
```

**Step 5: Update VaultItemUnion**

```typescript
// Line 81: Change VaultProject to VaultList
export type VaultItemUnion = VaultFolder | VaultList | VaultTask | VaultNote
```

**Step 6: Update ViewType**

```typescript
// Line 97: Change 'project' to 'list'
export type ViewType = 'today' | 'next7' | 'inbox' | 'folder' | 'list'
```

**Step 7: Run TypeScript to find all type errors**

Run: `npx tsc --noEmit 2>&1 | head -100`
Expected: Multiple type errors showing all places that reference 'project'

**Step 8: Commit**

```bash
git add src/shared/types.ts
git commit -m "refactor: rename Project types to List"
```

---

## Task 2: Update File Service (Backend)

**Files:**
- Modify: `src/main/services/file-service.ts`

**Step 1: Change project case to list**

```typescript
// Lines 141-148: Change 'project' case to 'list' and filename
    case 'list':
      meta = { type: 'list', name: title, sort_order: 0, created: now }
      filename = '_list.md'
      folder = path.join(folder, title)
      await fs.mkdir(folder, { recursive: true })
      // For lists, use the directory path as ID (guaranteed unique)
      id = folder
      break
```

**Step 2: Add deleteDirectory function for list deletion**

```typescript
// After line 170 (after deleteFile function):
export async function deleteDirectory(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true })
}
```

**Step 3: Add moveDirectory function for list movement**

```typescript
// After deleteDirectory:
export async function moveDirectory(from: string, to: string): Promise<void> {
  await fs.rename(from, to)
}
```

**Step 4: Add ungroupFolder function**

```typescript
// After moveDirectory:
export async function ungroupFolder(folderPath: string, vaultPath: string): Promise<void> {
  const entries = await fs.readdir(folderPath, { withFileTypes: true })

  for (const entry of entries) {
    const sourcePath = path.join(folderPath, entry.name)
    const targetPath = path.join(vaultPath, entry.name)

    // Skip the _folder.md file itself
    if (entry.name === '_folder.md') continue

    await fs.rename(sourcePath, targetPath)
  }

  // Remove the now-empty folder
  await fs.rm(folderPath, { recursive: true, force: true })
}
```

**Step 5: Run TypeScript**

Run: `npx tsc --noEmit 2>&1 | head -50`
Expected: Fewer errors, file-service should compile

**Step 6: Commit**

```bash
git add src/main/services/file-service.ts
git commit -m "feat: add list/folder management operations to file service"
```

---

## Task 3: Update Frontmatter Parser

**Files:**
- Modify: `src/main/utils/frontmatter.ts`

**Step 1: Update type checks for list**

```typescript
// Line 15-16: Change 'project' to 'list'
    if (meta.type === 'folder' || meta.type === 'list') {
      id = path.dirname(filePath)
    }
```

**Step 2: Update title extraction**

```typescript
// Lines 22-24: Change 'project' to 'list'
    const title = titleMatch ? titleMatch[1].trim() : meta.type === 'folder' || meta.type === 'list'
      ? (meta as { name: string }).name
      : filename.replace(/^[a-z0-9]{4}-/, '').replace('.md', '').replace(/-/g, ' ')
```

**Step 3: Commit**

```bash
git add src/main/utils/frontmatter.ts
git commit -m "refactor: update frontmatter parser for list type"
```

---

## Task 4: Update IPC Handlers

**Files:**
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/index.ts`

**Step 1: Add deleteDirectory handler to ipc.ts**

```typescript
// After line 75 (after file:delete handler):
  ipcMain.handle('directory:delete', async (_event, dirPath: string) => {
    await fileService.deleteDirectory(dirPath)
  })
```

**Step 2: Add moveDirectory handler to ipc.ts**

```typescript
// After directory:delete:
  ipcMain.handle('directory:move', async (_event, { from, to }: { from: string; to: string }) => {
    await fileService.moveDirectory(from, to)
  })
```

**Step 3: Add ungroupFolder handler to ipc.ts**

```typescript
// After directory:move:
  ipcMain.handle('folder:ungroup', async (_event, { folderPath, vaultPath }: { folderPath: string; vaultPath: string }) => {
    await fileService.ungroupFolder(folderPath, vaultPath)
  })
```

**Step 4: Add API methods to preload**

```typescript
// After line 9 (after moveFile):
  deleteDirectory: (dirPath: string) => ipcRenderer.invoke('directory:delete', dirPath),
  moveDirectory: (from: string, to: string) => ipcRenderer.invoke('directory:move', { from, to }),
  ungroupFolder: (folderPath: string, vaultPath: string) =>
    ipcRenderer.invoke('folder:ungroup', { folderPath, vaultPath }),
```

**Step 5: Commit**

```bash
git add src/main/ipc.ts src/preload/index.ts
git commit -m "feat: add IPC handlers for directory operations"
```

---

## Task 5: Update VaultContext

**Files:**
- Modify: `src/renderer/contexts/VaultContext.tsx`

**Step 1: Update imports**

```typescript
// Line 2: Change VaultTask to include ListMeta
import type { VaultItem, VaultTask, TreeNode, ItemType, TaskMeta, NoteMeta, RepeatConfig, ListMeta } from '@shared/types'
```

**Step 2: Update buildTree function**

```typescript
// Line 34: Change 'project' to 'list'
    if (item.meta.type === 'folder' || item.meta.type === 'list') {
```

**Step 3: Update getInboxItems filter**

```typescript
// Line 237: Change 'project' to 'list'
      if (item.meta.type === 'folder' || item.meta.type === 'list') return false
```

**Step 4: Rename createProject to createList**

```typescript
// Lines 187-191: Rename function and change type
  const createList = useCallback(async (name: string, parentPath?: string) => {
    const basePath = parentPath || vaultPath
    if (!basePath) throw new Error('No vault path set')
    return createItem('list', basePath, name)
  }, [vaultPath, createItem])
```

**Step 5: Add deleteList function**

```typescript
// After createList:
  const deleteList = useCallback(async (listPath: string) => {
    await window.api.deleteDirectory(listPath)
  }, [])
```

**Step 6: Add moveList function**

```typescript
// After deleteList:
  const moveList = useCallback(async (listPath: string, targetFolderPath: string) => {
    const listName = path.basename(listPath)
    const newPath = path.join(targetFolderPath, listName)
    await window.api.moveDirectory(listPath, newPath)
  }, [])
```

**Step 7: Add ungroupFolder function**

```typescript
// After moveList:
  const ungroupFolder = useCallback(async (folderPath: string) => {
    if (!vaultPath) throw new Error('No vault path set')
    await window.api.ungroupFolder(folderPath, vaultPath)
  }, [vaultPath])
```

**Step 8: Update context interface**

```typescript
// Lines 17-18: Update interface
  createList: (name: string, parentPath?: string) => Promise<VaultItem>
  deleteList: (listPath: string) => Promise<void>
  moveList: (listPath: string, targetFolderPath: string) => Promise<void>
  ungroupFolder: (folderPath: string) => Promise<void>
```

**Step 9: Update Provider value**

```typescript
// Lines 321-322: Update in Provider value, replace createProject with createList
        createList,
        deleteList,
        moveList,
        ungroupFolder,
```

**Step 10: Commit**

```bash
git add src/renderer/contexts/VaultContext.tsx
git commit -m "refactor: rename createProject to createList, add list/folder operations"
```

---

## Task 6: Update DndContext for List Dragging

**Files:**
- Modify: `src/renderer/contexts/DndContext.tsx`

**Step 1: Update imports**

```typescript
// Line 13: Add ListMeta
import type { VaultItem, TaskMeta, ListMeta } from '@shared/types'
```

**Step 2: Update drag prevention logic**

```typescript
// Lines 47-49: Only prevent folders from being dragged, allow lists
    if (!draggedItem || draggedItem.meta.type === 'folder') {
      return
    }
```

**Step 3: Add list movement logic**

```typescript
// After line 49, before task/note move logic:
    // Handle list movement (only to folders or root)
    if (draggedItem.meta.type === 'list') {
      const listPath = path.dirname(draggedItem.path)
      const newPath = path.join(targetFolder, path.basename(listPath))

      if (newPath !== listPath) {
        // Use moveDirectory for lists
        await window.api.moveDirectory(listPath, newPath)
      }
      return
    }
```

**Step 4: Update type cast**

```typescript
// Line 59: Update type cast to include ListMeta
        meta: { ...draggedItem.meta, modified: new Date().toISOString() } as TaskMeta | ListMeta,
```

**Step 5: Commit**

```bash
git add src/renderer/contexts/DndContext.tsx
git commit -m "feat: enable drag-and-drop for lists into folders"
```

---

## Task 7: Update Sidebar UI

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

**Step 1: Add context menu state**

```typescript
// After line 110 (after settingsMenuRef):
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TreeNode } | null>(null)
```

**Step 2: Import context menu and add useVault for delete/ungroup**

```typescript
// Line 4: Add deleteList, ungroupFolder to useVault destructure
const { tree, getTodayTasks, getNext7DaysTasks, getInboxItems, createFolder, createList, deleteList, ungroupFolder } = useVault()
```

**Step 3: Add ContextMenu import**

```typescript
// Add import at top:
import { ContextMenu, ContextMenuItem } from '../ui/ContextMenu'
```

**Step 4: Update TreeItem to handle right-click**

```typescript
// In TreeItem component, add onContextMenu prop and handler:
function TreeItem({ node, depth = 0, onContextMenu }: { node: TreeNode; depth?: number; onContextMenu: (e: React.MouseEvent, node: TreeNode) => void }) {
```

**Step 5: Add onContextMenu to TreeItem button**

```typescript
// In TreeItem button element:
        onContextMenu={(e) => onContextMenu(e, node)}
```

**Step 6: Update all TreeItem usages to pass onContextMenu**

```typescript
// Line 467-469: Update tree.map
            {tree.map((node) => (
              <TreeItem key={node.id} node={node} onContextMenu={handleContextMenu} />
            ))}
```

**Step 7: Add handleContextMenu function**

```typescript
// After handleProjectKeyDown:
  const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, node })
  }

  const handleDeleteList = async () => {
    if (!contextMenu || contextMenu.node.type !== 'list') return
    await deleteList(contextMenu.node.path)
    setContextMenu(null)
  }

  const handleUngroupFolder = async () => {
    if (!contextMenu || contextMenu.node.type !== 'folder') return
    await ungroupFolder(contextMenu.node.path)
    setContextMenu(null)
  }
```

**Step 8: Rename all "Project" strings to "List"**

```typescript
// Line 103-104: Rename state variables
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')
```

```typescript
// Lines 156-162: Rename handler
  const handleCreateList = async () => {
    if (!newListName.trim()) return
    await createList(newListName.trim())
    setNewListName('')
    setShowNewList(false)
    setShowAddMenu(false)
  }
```

```typescript
// Lines 164-171: Rename key handler
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateList()
    } else if (e.key === 'Escape') {
      setNewListName('')
      setShowNewList(false)
    }
  }
```

**Step 9: Update UI strings**

```typescript
// Line 416: "New Project" -> "New List"
        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">New List</span>
```

```typescript
// Line 423: "Project name..." -> "List name..."
        placeholder="List name..."
```

```typescript
// Line 458: "New Project" -> "New List"
        <span>New List</span>
```

**Step 10: Update view type casts**

```typescript
// Lines 16 and 65: Change 'project' to 'list'
    setSelectedView(node.type as 'folder' | 'list', node.path)
```

**Step 11: Add ContextMenu render**

```typescript
// Before closing </div> of expanded sidebar, after settings menu:
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>
          {contextMenu.node.type === 'list' && (
            <ContextMenuItem onClick={handleDeleteList} variant="danger">
              Delete List
            </ContextMenuItem>
          )}
          {contextMenu.node.type === 'folder' && contextMenu.node.name !== 'Inbox' && (
            <ContextMenuItem onClick={handleUngroupFolder}>
              Ungroup
            </ContextMenuItem>
          )}
        </ContextMenu>
      )}
```

**Step 12: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "feat: add context menus for lists (delete) and folders (ungroup)"
```

---

## Task 8: Update TaskList Component

**Files:**
- Modify: `src/renderer/components/layout/TaskList.tsx`

**Step 1: Update displayItems switch cases**

```typescript
// Lines 28-29: Change 'project' to 'list'
      case 'folder':
      case 'list':
```

**Step 2: Update filter condition**

```typescript
// Line 32: Change 'project' to 'list'
          if (item.meta.type === 'folder' || item.meta.type === 'list') return false
```

**Step 3: Update viewTitle switch cases**

```typescript
// Lines 45-46: Change 'project' to 'list'
      case 'folder':
      case 'list':
```

**Step 4: Commit**

```bash
git add src/renderer/components/layout/TaskList.tsx
git commit -m "refactor: update TaskList to use 'list' type"
```

---

## Task 9: Update Remaining Type References

**Files:**
- Modify: `src/renderer/contexts/UIContext.tsx` (ViewType import already handled by types.ts change)

**Step 1: Verify UIContext compiles**

Run: `npx tsc --noEmit 2>&1 | grep -i "UIContext"`
Expected: No errors

**Step 2: Search for any remaining 'project' references**

Run: `grep -rn "project" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."`
Expected: Only comments or unrelated matches

**Step 3: Commit if any fixes needed**

```bash
git add -A
git commit -m "refactor: fix remaining project -> list references"
```

---

## Task 10: Update Window API Types

**Files:**
- Create or modify: `src/renderer/types/window.d.ts` (if exists) or add to existing type declarations

**Step 1: Add type declarations for new API methods**

```typescript
// If window.d.ts exists, add these to the api interface:
  deleteDirectory: (dirPath: string) => Promise<void>
  moveDirectory: (from: string, to: string) => Promise<void>
  ungroupFolder: (folderPath: string, vaultPath: string) => Promise<void>
```

**Step 2: Verify full TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: add window API type declarations"
```

---

## Task 11: Test and Build

**Step 1: Run the development server**

Run: `npm run dev`
Expected: App starts without errors

**Step 2: Manual testing checklist**

- [ ] Create a new List (was "Project")
- [ ] Verify List appears in sidebar with correct icon
- [ ] Right-click List → Delete option appears
- [ ] Delete List removes it and all contents
- [ ] Create a Folder
- [ ] Drag a List into the Folder
- [ ] Verify List appears nested under Folder
- [ ] Right-click Folder → Ungroup option appears (not for Inbox)
- [ ] Ungroup moves children to root and removes folder

**Step 3: Run build**

Run: `npm run build`
Expected: Build completes successfully

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete projects to lists refactor with folder/list management"
```

---

## Migration Notes

**Existing vaults:** Old `_project.md` files will still be parsed since the frontmatter parser reads the `type` field. Users with existing vaults will see their projects continue to work, but new items will be created as `_list.md`. Consider adding a migration script if full consistency is required.

**Backward compatibility:** The type system change from `'project'` to `'list'` is a breaking change for any external tools reading the vault directly. This is acceptable since the app is self-contained.
