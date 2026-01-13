# Sidebar Sections Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add collapsible sections to organize projects in the sidebar, with drag-and-drop support.

**Architecture:** Sections are UI-only groupings stored as a `section` field in project frontmatter. Projects without a section appear under "Projects" (default). Collapse state persists in localStorage.

**Tech Stack:** React, TypeScript, dnd-kit, localStorage

---

### Task 1: Add section field to ProjectMeta type

**Files:**
- Modify: `src/shared/types.ts:21-27`

**Step 1: Add section field to ProjectMeta**

```typescript
export interface ProjectMeta extends BaseMeta {
  type: 'project'
  name: string
  icon?: string
  color?: string
  sort_order?: number
  section?: string  // Add this line
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add section field to ProjectMeta type"
```

---

### Task 2: Add SectionGroup type and update buildTree

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/renderer/contexts/VaultContext.tsx:32-66`

**Step 1: Add SectionGroup type to types.ts**

After the TreeNode interface, add:

```typescript
export interface SectionGroup {
  name: string
  isDefault: boolean
  projects: TreeNode[]
}
```

**Step 2: Update VaultContext to export sections instead of flat tree**

Replace the `buildTree` function and update state:

```typescript
function buildSections(items: Map<string, VaultItem>): SectionGroup[] {
  const projectMap = new Map<string, TreeNode>()
  const sectionMap = new Map<string, TreeNode[]>()

  // First pass: create project nodes and group by section
  items.forEach((item) => {
    if (item.meta.type === 'project') {
      const dirPath = path.dirname(item.path)
      const sectionName = (item.meta as ProjectMeta).section || ''

      const node: TreeNode = {
        id: item.id,
        name: item.title,
        type: 'project',
        path: dirPath,
        children: [],
        count: 0,
      }
      projectMap.set(dirPath, node)

      const existing = sectionMap.get(sectionName) || []
      existing.push(node)
      sectionMap.set(sectionName, existing)
    }
  })

  // Second pass: count tasks/notes in each project
  items.forEach((item) => {
    if (item.meta.type === 'task' || item.meta.type === 'note') {
      const dirPath = path.dirname(item.path)
      const projectNode = projectMap.get(dirPath)
      if (projectNode) {
        projectNode.count = (projectNode.count || 0) + 1
      }
    }
  })

  // Build section groups
  const sections: SectionGroup[] = []

  // Default "Projects" section first (empty string key)
  const defaultProjects = sectionMap.get('') || []
  sections.push({
    name: 'Projects',
    isDefault: true,
    projects: defaultProjects.sort((a, b) => a.name.localeCompare(b.name)),
  })

  // Custom sections alphabetically
  const customSections = Array.from(sectionMap.keys())
    .filter(name => name !== '')
    .sort((a, b) => a.localeCompare(b))

  for (const name of customSections) {
    const projects = sectionMap.get(name) || []
    sections.push({
      name,
      isDefault: false,
      projects: projects.sort((a, b) => a.name.localeCompare(b.name)),
    })
  }

  return sections
}
```

**Step 3: Update VaultContext state and exports**

Change state from `tree` to `sections`:

```typescript
const [sections, setSections] = useState<SectionGroup[]>([])

const rebuildSections = useCallback((itemsMap: Map<string, VaultItem>) => {
  setSections(buildSections(itemsMap))
}, [])
```

Replace all `rebuildTree` calls with `rebuildSections`.

Update context value to export both `sections` and `tree` (for backward compat):

```typescript
// Compute flat tree from sections for backward compatibility
const tree = sections.flatMap(s => s.projects)
```

**Step 4: Update VaultContextValue interface**

```typescript
interface VaultContextValue {
  items: Map<string, VaultItem>
  sections: SectionGroup[]  // Add this
  tree: TreeNode[]          // Keep for backward compat
  // ... rest unchanged
}
```

**Step 5: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No errors

**Step 6: Commit**

```bash
git add src/shared/types.ts src/renderer/contexts/VaultContext.tsx
git commit -m "feat: group projects by section in VaultContext"
```

---

### Task 3: Add section collapse state to UIContext

**Files:**
- Modify: `src/renderer/contexts/UIContext.tsx`

**Step 1: Add localStorage key constant**

```typescript
const COLLAPSED_SECTIONS_KEY = 'sidebar-sections-collapsed'
```

**Step 2: Add helper functions for localStorage**

```typescript
function loadCollapsedSections(vaultPath: string | null): Set<string> {
  if (!vaultPath) return new Set()
  try {
    const data = localStorage.getItem(COLLAPSED_SECTIONS_KEY)
    if (!data) return new Set()
    const parsed = JSON.parse(data)
    return new Set(parsed[vaultPath] || [])
  } catch {
    return new Set()
  }
}

function saveCollapsedSections(vaultPath: string | null, collapsed: Set<string>) {
  if (!vaultPath) return
  try {
    const data = localStorage.getItem(COLLAPSED_SECTIONS_KEY)
    const parsed = data ? JSON.parse(data) : {}
    parsed[vaultPath] = Array.from(collapsed)
    localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(parsed))
  } catch {
    // Ignore storage errors
  }
}
```

**Step 3: Add state and toggle function to UIProvider**

```typescript
const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

const toggleSectionCollapse = useCallback((sectionName: string) => {
  setCollapsedSections(prev => {
    const next = new Set(prev)
    if (next.has(sectionName)) {
      next.delete(sectionName)
    } else {
      next.add(sectionName)
    }
    return next
  })
}, [])

const isSectionCollapsed = useCallback((sectionName: string) => {
  return collapsedSections.has(sectionName)
}, [collapsedSections])
```

**Step 4: Add vaultPath prop and load/save effects**

UIProvider needs vaultPath to key localStorage. Add prop and effects:

```typescript
export function UIProvider({ children, vaultPath }: { children: ReactNode, vaultPath: string | null }) {
  // ... existing state ...

  // Load collapsed sections when vault changes
  useEffect(() => {
    setCollapsedSections(loadCollapsedSections(vaultPath))
  }, [vaultPath])

  // Save collapsed sections when they change
  useEffect(() => {
    saveCollapsedSections(vaultPath, collapsedSections)
  }, [vaultPath, collapsedSections])
```

**Step 5: Update UIContextValue interface and provider value**

```typescript
interface UIContextValue {
  // ... existing ...
  collapsedSections: Set<string>
  toggleSectionCollapse: (sectionName: string) => void
  isSectionCollapsed: (sectionName: string) => boolean
}
```

**Step 6: Update App.tsx to pass vaultPath to UIProvider**

In `src/renderer/App.tsx`, update UIProvider usage:

```typescript
<UIProvider vaultPath={vaultPath}>
```

**Step 7: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No errors

**Step 8: Commit**

```bash
git add src/renderer/contexts/UIContext.tsx src/renderer/App.tsx
git commit -m "feat: add section collapse state with localStorage persistence"
```

---

### Task 4: Add section management functions to VaultContext

**Files:**
- Modify: `src/renderer/contexts/VaultContext.tsx`

**Step 1: Add setProjectSection function**

```typescript
const setProjectSection = useCallback(async (projectPath: string, sectionName: string | null) => {
  const projectItem = findProjectByDirPath(projectPath)
  if (!projectItem || projectItem.meta.type !== 'project') return

  const updatedMeta: ProjectMeta = {
    ...projectItem.meta as ProjectMeta,
    section: sectionName || undefined,
    modified: new Date().toISOString(),
  }

  // Remove section key entirely if empty
  if (!sectionName) {
    delete (updatedMeta as Partial<ProjectMeta>).section
  }

  const updatedItem: VaultItem = { ...projectItem, meta: updatedMeta }

  setItems(prev => {
    const next = new Map(prev)
    next.set(projectItem.id, updatedItem)
    rebuildSections(next)
    return next
  })

  await window.api.writeFile(updatedItem.path, updatedItem)
}, [findProjectByDirPath, rebuildSections])
```

**Step 2: Add renameSection function**

```typescript
const renameSection = useCallback(async (oldName: string, newName: string) => {
  if (!newName.trim() || oldName === newName) return

  const updates: VaultItem[] = []

  setItems(prev => {
    const next = new Map(prev)
    for (const [id, item] of prev) {
      if (item.meta.type === 'project') {
        const projectMeta = item.meta as ProjectMeta
        if (projectMeta.section === oldName) {
          const updatedItem: VaultItem = {
            ...item,
            meta: { ...projectMeta, section: newName, modified: new Date().toISOString() },
          }
          next.set(id, updatedItem)
          updates.push(updatedItem)
        }
      }
    }
    rebuildSections(next)
    return next
  })

  // Persist all updates
  for (const item of updates) {
    await window.api.writeFile(item.path, item)
  }
}, [rebuildSections])
```

**Step 3: Add deleteSection function**

```typescript
const deleteSection = useCallback(async (sectionName: string) => {
  const updates: VaultItem[] = []

  setItems(prev => {
    const next = new Map(prev)
    for (const [id, item] of prev) {
      if (item.meta.type === 'project') {
        const projectMeta = item.meta as ProjectMeta
        if (projectMeta.section === sectionName) {
          const { section, ...restMeta } = projectMeta
          const updatedItem: VaultItem = {
            ...item,
            meta: { ...restMeta, modified: new Date().toISOString() } as ProjectMeta,
          }
          next.set(id, updatedItem)
          updates.push(updatedItem)
        }
      }
    }
    rebuildSections(next)
    return next
  })

  // Persist all updates
  for (const item of updates) {
    await window.api.writeFile(item.path, item)
  }
}, [rebuildSections])
```

**Step 4: Add getAllSectionNames helper**

```typescript
const getAllSectionNames = useCallback((): string[] => {
  const names = new Set<string>()
  for (const item of items.values()) {
    if (item.meta.type === 'project') {
      const section = (item.meta as ProjectMeta).section
      if (section) names.add(section)
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b))
}, [items])
```

**Step 5: Update VaultContextValue interface and exports**

```typescript
interface VaultContextValue {
  // ... existing ...
  setProjectSection: (projectPath: string, sectionName: string | null) => Promise<void>
  renameSection: (oldName: string, newName: string) => Promise<void>
  deleteSection: (sectionName: string) => Promise<void>
  getAllSectionNames: () => string[]
}
```

Add to provider value.

**Step 6: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No errors

**Step 7: Commit**

```bash
git add src/renderer/contexts/VaultContext.tsx
git commit -m "feat: add section CRUD functions to VaultContext"
```

---

### Task 5: Create SectionHeader component

**Files:**
- Create: `src/renderer/components/layout/SectionHeader.tsx`

**Step 1: Create the component file**

```typescript
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'

interface SectionHeaderProps {
  name: string
  isDefault: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
  onAddProject: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

export function SectionHeader({
  name,
  isDefault,
  isCollapsed,
  onToggleCollapse,
  onAddProject,
  onContextMenu,
}: SectionHeaderProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-drop-${name}`,
    data: { sectionName: isDefault ? '' : name },
  })

  return (
    <div
      ref={setNodeRef}
      onContextMenu={isDefault ? undefined : onContextMenu}
      className={`flex items-center justify-between px-3 mb-2 py-1 -mx-3 rounded-lg transition-colors ${
        isOver
          ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400 dark:ring-blue-500'
          : ''
      }`}
    >
      <button
        onClick={onToggleCollapse}
        className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight size={12} className="flex-shrink-0" />
        ) : (
          <ChevronDown size={12} className="flex-shrink-0" />
        )}
        <span>{name}</span>
      </button>
      <button
        onClick={onAddProject}
        className="p-1 -m-1 rounded transition-colors text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300"
        title={`New project in ${name}`}
      >
        <Plus size={12} strokeWidth={2.5} />
      </button>
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/renderer/components/layout/SectionHeader.tsx
git commit -m "feat: create SectionHeader component with collapse and drop zone"
```

---

### Task 6: Update Sidebar to render sections

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

**Step 1: Update imports and hooks**

Add to imports:

```typescript
import { SectionHeader } from './SectionHeader'
import type { TreeNode, SectionGroup } from '@shared/types'
```

Update useVault destructuring:

```typescript
const { sections, tree, getTodayTasks, getNext7DaysTasks, getInboxItems, createProject, deleteProject, renameProject, setProjectSection, renameSection, deleteSection, getAllSectionNames } = useVault()
```

Update useUI destructuring:

```typescript
const { selectedView, selectedPath, setSelectedView, sidebarCollapsed, toggleSectionCollapse, isSectionCollapsed } = useUI()
```

**Step 2: Add state for section operations**

```typescript
const [addingToSection, setAddingToSection] = useState<string | null>(null)
const [editingSection, setEditingSection] = useState<{name: string, newName: string} | null>(null)
const [deleteSectionConfirm, setDeleteSectionConfirm] = useState<{open: boolean, name: string | null}>({open: false, name: null})
const sectionContextMenu = useContextMenu<string>()
```

**Step 3: Add section handlers**

```typescript
const handleCreateProjectInSection = async (sectionName: string) => {
  if (!newProjectName.trim()) return
  const project = await createProject(newProjectName.trim())
  if (sectionName) {
    await setProjectSection(path.dirname(project.path), sectionName)
  }
  setNewProjectName('')
  setAddingToSection(null)
}

const handleStartSectionRename = (name: string) => {
  setEditingSection({ name, newName: name })
}

const handleSectionRenameSubmit = async () => {
  if (!editingSection) return
  const { name, newName } = editingSection
  setEditingSection(null)
  if (newName.trim() && newName !== name) {
    await renameSection(name, newName.trim())
  }
}

const handleDeleteSection = async () => {
  if (!deleteSectionConfirm.name) return
  await deleteSection(deleteSectionConfirm.name)
  setDeleteSectionConfirm({open: false, name: null})
}
```

**Step 4: Replace project list with sections rendering**

Replace the projects section (lines 431-491) with:

```typescript
<div className="border-t border-gray-200 dark:border-gray-700 pt-4">
  {sections.map((section) => (
    <div key={section.name} className="mb-4">
      <SectionHeader
        name={section.name}
        isDefault={section.isDefault}
        isCollapsed={isSectionCollapsed(section.name)}
        onToggleCollapse={() => toggleSectionCollapse(section.name)}
        onAddProject={() => setAddingToSection(section.isDefault ? '' : section.name)}
        onContextMenu={(e) => sectionContextMenu.open(e, section.name)}
      />

      {/* New project input for this section */}
      {addingToSection === (section.isDefault ? '' : section.name) && (
        <div className="px-3 mb-2">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateProjectInSection(section.isDefault ? '' : section.name)
              } else if (e.key === 'Escape') {
                setAddingToSection(null)
                setNewProjectName('')
              }
            }}
            placeholder="Project name..."
            className="w-full px-2.5 py-1.5 text-[13px] bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            autoFocus
          />
        </div>
      )}

      {/* Projects in this section */}
      {!isSectionCollapsed(section.name) && (
        <div className="space-y-0.5">
          {section.projects.map((node) => (
            editingProject?.node.id === node.id
              ? <div key={node.id}>{renderProjectEditInput(node)}</div>
              : <ProjectItem key={node.id} node={node} />
          ))}
        </div>
      )}
    </div>
  ))}
</div>
```

**Step 5: Update Plus dropdown to include "New Section"**

Add to the dropdown menu (after the project creation form):

```typescript
{showNewProject && (
  <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
    {/* New Project option */}
    <button
      onClick={() => setAddingToSection('')}
      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <ListTodo size={14} className="text-gray-400" />
      <span>New Project</span>
    </button>

    {/* New Section option */}
    <button
      onClick={() => {
        setShowNewProject(false)
        // Prompt for section name
        const name = window.prompt('Section name:')
        if (name?.trim()) {
          // Create first project in section to establish it
          // Or we can just set addingToSection
        }
      }}
      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <FolderPlus size={14} className="text-gray-400" />
      <span>New Section</span>
    </button>
  </div>
)}
```

**Step 6: Add section context menu**

```typescript
{sectionContextMenu.isOpen && sectionContextMenu.data && (
  <ContextMenu x={sectionContextMenu.x} y={sectionContextMenu.y} onClose={sectionContextMenu.close}>
    <ContextMenuItem onClick={() => {
      handleStartSectionRename(sectionContextMenu.data!)
      sectionContextMenu.close()
    }}>Rename</ContextMenuItem>
    <ContextMenuItem variant="danger" onClick={() => {
      setDeleteSectionConfirm({open: true, name: sectionContextMenu.data})
      sectionContextMenu.close()
    }}>Delete</ContextMenuItem>
  </ContextMenu>
)}

<ConfirmDialog
  open={deleteSectionConfirm.open}
  title="Delete Section"
  message={`Delete section "${deleteSectionConfirm.name}"? Projects will move to the default section.`}
  confirmLabel="Delete"
  variant="danger"
  onConfirm={handleDeleteSection}
  onCancel={() => setDeleteSectionConfirm({open: false, name: null})}
/>
```

**Step 7: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No errors

**Step 8: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "feat: render sections with collapsible headers in sidebar"
```

---

### Task 7: Add section drop handling to TreeDndContext

**Files:**
- Modify: `src/renderer/contexts/TreeDndContext.tsx`

**Step 1: Import setProjectSection from VaultContext**

```typescript
const { items, moveItem, updateSortOrder, vaultPath, setProjectSection } = useVault()
```

**Step 2: Add section drop handling in handleDragEnd**

After the project drop handling, add:

```typescript
// Handle section drop (moving project to different section)
if (overId.startsWith('section-drop-')) {
  const sectionName = overData?.sectionName as string | undefined
  if (draggedItem.meta.type === 'project') {
    const projectPath = path.dirname(draggedItem.path)
    await setProjectSection(projectPath, sectionName || null)
  }
  return
}
```

**Step 3: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add src/renderer/contexts/TreeDndContext.tsx
git commit -m "feat: handle section drop for moving projects between sections"
```

---

### Task 8: Add New Section dialog

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

**Step 1: Add state for new section dialog**

```typescript
const [showNewSection, setShowNewSection] = useState(false)
const [newSectionName, setNewSectionName] = useState('')
```

**Step 2: Add validation helper**

```typescript
const validateSectionName = (name: string): string | null => {
  const trimmed = name.trim()
  if (!trimmed) return 'Section name cannot be empty'
  if (trimmed.toLowerCase() === 'projects') return '"Projects" is reserved'
  const existing = getAllSectionNames()
  if (existing.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
    return 'Section already exists'
  }
  return null
}
```

**Step 3: Update Plus dropdown to show New Section option properly**

Replace the prompt-based approach with inline input:

```typescript
{showNewSection && (
  <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
    <div className="px-3">
      <div className="flex items-center gap-2 mb-2">
        <FolderPlus size={14} className="text-gray-400 dark:text-gray-500" />
        <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">New Section</span>
      </div>
      <input
        type="text"
        value={newSectionName}
        onChange={(e) => setNewSectionName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const error = validateSectionName(newSectionName)
            if (!error) {
              setAddingToSection(newSectionName.trim())
              setShowNewSection(false)
              setNewSectionName('')
            }
          } else if (e.key === 'Escape') {
            setShowNewSection(false)
            setNewSectionName('')
          }
        }}
        placeholder="Section name..."
        className="w-full px-2.5 py-1.5 text-[13px] bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
      <div className="flex justify-end gap-2 mt-2">
        <button
          onClick={() => { setShowNewSection(false); setNewSectionName('') }}
          className="px-2.5 py-1 text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            const error = validateSectionName(newSectionName)
            if (!error) {
              setAddingToSection(newSectionName.trim())
              setShowNewSection(false)
              setNewSectionName('')
            }
          }}
          disabled={!!validateSectionName(newSectionName)}
          className="px-2.5 py-1 text-[12px] font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create
        </button>
      </div>
    </div>
  </div>
)}
```

**Step 4: Add FolderPlus to imports**

```typescript
import { CalendarDays, CalendarRange, Inbox, ListTodo, List, Plus, Settings, Sun, Moon, Monitor, FolderPlus } from 'lucide-react'
```

**Step 5: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No errors

**Step 6: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "feat: add New Section dialog with validation"
```

---

### Task 9: Add section rename inline editing

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

**Step 1: Add ref for section edit input**

```typescript
const sectionEditInputRef = useRef<HTMLInputElement>(null)
```

**Step 2: Add effect to focus section edit input**

```typescript
useEffect(() => {
  if (editingSection && sectionEditInputRef.current) {
    sectionEditInputRef.current.focus()
    sectionEditInputRef.current.select()
  }
}, [editingSection])
```

**Step 3: Update SectionHeader to show edit input when editing**

In the sections map, replace SectionHeader with conditional:

```typescript
{editingSection?.name === section.name ? (
  <div className="flex items-center px-3 mb-2">
    <input
      ref={sectionEditInputRef}
      type="text"
      value={editingSection.newName}
      onChange={(e) => setEditingSection({ ...editingSection, newName: e.target.value })}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleSectionRenameSubmit()
        } else if (e.key === 'Escape') {
          setEditingSection(null)
        }
      }}
      onBlur={handleSectionRenameSubmit}
      className="flex-1 px-1 py-0.5 text-[11px] font-semibold uppercase tracking-wider bg-white dark:bg-gray-800 border border-blue-500 rounded text-gray-700 dark:text-gray-300 outline-none"
    />
  </div>
) : (
  <SectionHeader ... />
)}
```

**Step 4: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "feat: add inline section rename editing"
```

---

### Task 10: Final integration and testing

**Files:**
- All modified files

**Step 1: Run full type check**

Run: `npm run typecheck`
Expected: No errors

**Step 2: Run the app and test manually**

Run: `npm run dev`

Test checklist:
- [ ] Default "Projects" section shows existing projects
- [ ] Can create new section via Plus dropdown
- [ ] Can add project to a section
- [ ] Can collapse/expand sections (chevron works)
- [ ] Collapse state persists after refresh
- [ ] Can right-click section to rename
- [ ] Can right-click section to delete (projects move to default)
- [ ] Can drag project onto section header to move it
- [ ] "Projects" section cannot be renamed/deleted

**Step 3: Fix any issues found**

Address any bugs discovered during testing.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete sidebar sections implementation"
```
