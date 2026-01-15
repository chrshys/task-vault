# Section Task List View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to click on a section name in the sidebar to view all tasks from that section, grouped by collapsible project headers.

**Architecture:** Add `'section'` as a new ViewType. Split SectionHeader click targets so chevron toggles collapse while label selects section. TaskList renders project groups with collapsible headers when in section view.

**Tech Stack:** React, TypeScript, TailwindCSS, localStorage for persistence

---

## Task 1: Add ViewType and UIContext State

**Files:**
- Modify: `src/shared/types.ts:90`
- Modify: `src/renderer/contexts/UIContext.tsx`

**Step 1: Update ViewType**

In `src/shared/types.ts:90`, change:

```typescript
export type ViewType = 'today' | 'next7' | 'inbox' | 'project' | 'section'
```

**Step 2: Add localStorage helpers for project group collapse**

In `src/renderer/contexts/UIContext.tsx`, add after line 30 (after `saveCollapsedSections`):

```typescript
const COLLAPSED_PROJECT_GROUPS_KEY = 'tasklist-project-groups-collapsed'

function loadCollapsedProjectGroups(vaultPath: string | null): Set<string> {
  if (!vaultPath) return new Set()
  try {
    const data = localStorage.getItem(COLLAPSED_PROJECT_GROUPS_KEY)
    if (!data) return new Set()
    const parsed = JSON.parse(data)
    return new Set(parsed[vaultPath] || [])
  } catch {
    return new Set()
  }
}

function saveCollapsedProjectGroups(vaultPath: string | null, collapsed: Set<string>) {
  if (!vaultPath) return
  try {
    const data = localStorage.getItem(COLLAPSED_PROJECT_GROUPS_KEY)
    const parsed = data ? JSON.parse(data) : {}
    parsed[vaultPath] = Array.from(collapsed)
    localStorage.setItem(COLLAPSED_PROJECT_GROUPS_KEY, JSON.stringify(parsed))
  } catch {
    // Ignore storage errors
  }
}
```

**Step 3: Add new state and functions to UIContextValue interface**

In `src/renderer/contexts/UIContext.tsx`, add to `UIContextValue` interface (after line 56):

```typescript
  selectedSectionName: string | null
  collapsedProjectGroups: Set<string>
  setSelectedSection: (sectionName: string | null) => void
  toggleProjectGroupCollapse: (projectPath: string) => void
  isProjectGroupCollapsed: (projectPath: string) => boolean
```

**Step 4: Add state variables to UIProvider**

In `src/renderer/contexts/UIContext.tsx`, add after `collapsedSections` state (after line 72):

```typescript
  const [selectedSectionName, setSelectedSectionName] = useState<string | null>(null)
  const [collapsedProjectGroups, setCollapsedProjectGroups] = useState<Set<string>>(new Set())
```

**Step 5: Add useEffect to load/save collapsed project groups**

In `src/renderer/contexts/UIContext.tsx`, add after the existing collapsed sections useEffects (after line 91):

```typescript
  // Load collapsed project groups when vault changes
  useEffect(() => {
    setCollapsedProjectGroups(loadCollapsedProjectGroups(vaultPath))
  }, [vaultPath])

  // Save collapsed project groups when they change
  useEffect(() => {
    saveCollapsedProjectGroups(vaultPath, collapsedProjectGroups)
  }, [vaultPath, collapsedProjectGroups])
```

**Step 6: Modify setSelectedView to clear section selection**

In `src/renderer/contexts/UIContext.tsx`, update the `setSelectedView` callback (around line 99):

```typescript
  const setSelectedView = useCallback((view: ViewType, path?: string) => {
    setSelectedViewState(view)
    setSelectedPath(path || null)
    setSelectedTaskId(null)
    setSelectedSectionName(null) // Clear section when selecting other views
    pushNavState({ view, path: path || null, taskId: null })
  }, [pushNavState])
```

**Step 7: Add setSelectedSection function**

In `src/renderer/contexts/UIContext.tsx`, add after `isSectionCollapsed` (after line 174):

```typescript
  const setSelectedSection = useCallback((sectionName: string | null) => {
    if (sectionName) {
      setSelectedViewState('section')
      setSelectedPath(null) // Clear project selection
      setSelectedSectionName(sectionName)
      pushNavState({ view: 'section', path: null, taskId: null })
    } else {
      setSelectedSectionName(null)
    }
  }, [pushNavState])

  const toggleProjectGroupCollapse = useCallback((projectPath: string) => {
    setCollapsedProjectGroups(prev => {
      const next = new Set(prev)
      if (next.has(projectPath)) {
        next.delete(projectPath)
      } else {
        next.add(projectPath)
      }
      return next
    })
  }, [])

  const isProjectGroupCollapsed = useCallback((projectPath: string) => {
    return collapsedProjectGroups.has(projectPath)
  }, [collapsedProjectGroups])
```

**Step 8: Add new values to context provider**

In `src/renderer/contexts/UIContext.tsx`, add to the Provider value object (after line 210):

```typescript
        selectedSectionName,
        collapsedProjectGroups,
        setSelectedSection,
        toggleProjectGroupCollapse,
        isProjectGroupCollapsed,
```

**Step 9: Commit**

```bash
git add src/shared/types.ts src/renderer/contexts/UIContext.tsx
git commit -m "feat(ui): add section selection state to UIContext

Add selectedSectionName, collapsedProjectGroups state and related
functions. Extend ViewType to include 'section'."
```

---

## Task 2: Split SectionHeader Click Targets

**Files:**
- Modify: `src/renderer/components/layout/SectionHeader.tsx`

**Step 1: Add onSelectSection prop**

In `src/renderer/components/layout/SectionHeader.tsx`, update the interface (replace lines 4-15):

```typescript
interface SectionHeaderProps {
  name: string
  isDefault: boolean
  isCollapsed: boolean
  isSelected: boolean
  onToggleCollapse: () => void
  onSelectSection: () => void
  onAddProject: () => void
  onContextMenu: (e: React.MouseEvent) => void
  dragAttributes?: DraggableAttributes
  dragListeners?: DraggableSyntheticListeners
  dragActivatorRef?: (node: HTMLButtonElement | null) => void
  isDragging?: boolean
}
```

**Step 2: Update component function signature**

In `src/renderer/components/layout/SectionHeader.tsx`, update the function params (replace lines 17-28):

```typescript
export function SectionHeader({
  name,
  isDefault,
  isCollapsed,
  isSelected,
  onToggleCollapse,
  onSelectSection,
  onAddProject,
  onContextMenu,
  dragAttributes,
  dragListeners,
  dragActivatorRef,
  isDragging,
}: SectionHeaderProps) {
```

**Step 3: Split the button into chevron and label**

In `src/renderer/components/layout/SectionHeader.tsx`, replace the current button (lines 49-63) with:

```typescript
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleCollapse()
          }}
          className="p-0.5 -m-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <ChevronDown
            size={12}
            className={`flex-shrink-0 transition-transform duration-200 ${
              isCollapsed ? '-rotate-90' : ''
            }`}
          />
        </button>
        <button
          onClick={onSelectSection}
          ref={dragActivatorRef}
          {...dragAttributes}
          {...dragListeners}
          className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${
            isSelected
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          {name}
        </button>
      </div>
```

**Step 4: Update wrapper div for selection highlight**

In `src/renderer/components/layout/SectionHeader.tsx`, replace the wrapper div className (lines 42-47):

```typescript
      className={`flex items-center justify-between px-3 mb-1 py-1 rounded-lg transition-colors ${
        isSelected
          ? 'bg-gray-200 dark:bg-gray-700'
          : isOver
            ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-400 dark:ring-blue-500'
            : ''
      }`}
```

**Step 5: Commit**

```bash
git add src/renderer/components/layout/SectionHeader.tsx
git commit -m "feat(sidebar): split section header into chevron and label clicks

Chevron toggles collapse, label selects section. Add isSelected prop
for highlight state."
```

---

## Task 3: Wire Up Sidebar Section Selection

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

**Step 1: Destructure new functions from useUI**

In `src/renderer/components/layout/Sidebar.tsx`, update the useUI destructuring (line 22):

```typescript
  const { selectedView, selectedPath, setSelectedView: setSelectedViewBase, sidebarCollapsed: sidebarCollapsedFromContext, toggleSectionCollapse, isSectionCollapsed, selectedSectionName, setSelectedSection } = useUI()
```

**Step 2: Update SectionHeader usage in SectionItem**

In `src/renderer/components/layout/Sidebar.tsx`, update the SectionHeader component (lines 416-427):

```typescript
            <SectionHeader
              name={section.name}
              isDefault={section.isDefault}
              isCollapsed={isCollapsed}
              isSelected={selectedSectionName === sectionKey}
              onToggleCollapse={() => toggleSectionCollapse(sectionKey)}
              onSelectSection={() => setSelectedSection(sectionKey)}
              onAddProject={() => handleOpenSectionMenu(sectionKey, section.name)}
              onContextMenu={(e) => sectionContextMenu.open(e, { name: section.name, isDefault: section.isDefault })}
              dragAttributes={attributes}
              dragListeners={listeners}
              dragActivatorRef={setActivatorNodeRef}
              isDragging={isDragging}
            />
```

**Step 3: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "feat(sidebar): wire up section selection to SectionHeader

Pass isSelected and onSelectSection props to enable section
highlighting and selection."
```

---

## Task 4: Add Section View to TaskList

**Files:**
- Modify: `src/renderer/components/layout/TaskList.tsx`

**Step 1: Import additional hooks and icons**

In `src/renderer/components/layout/TaskList.tsx`, update imports (line 4):

```typescript
import { ChevronDown, ListTodo } from 'lucide-react'
```

**Step 2: Destructure new values from useUI and useVault**

In `src/renderer/components/layout/TaskList.tsx`, update useUI (line 51):

```typescript
  const { selectedView, selectedPath, setSelectedView, selectedSectionName, toggleProjectGroupCollapse, isProjectGroupCollapsed } = useUI()
```

Update useVault (line 50):

```typescript
  const { items, vaultPath, sections, getTodayTasks, getNext7DaysTasks, getInboxItems, createItem, updateItem, renameProject } = useVault()
```

**Step 3: Add helper to get section's projects with tasks**

In `src/renderer/components/layout/TaskList.tsx`, add after the `completedCollapsed` state (after line 68):

```typescript
  // Get projects for the selected section with their pending tasks
  const sectionProjects = useMemo(() => {
    if (selectedView !== 'section' || !selectedSectionName) return []

    const section = sections.find(s =>
      (s.isDefault && selectedSectionName === '') ||
      (!s.isDefault && s.name === selectedSectionName)
    )
    if (!section) return []

    return section.projects.map(project => {
      const projectTasks = Array.from(items.values())
        .filter(item => {
          if (item.meta.type === 'project') return false
          if (item.meta.type === 'task') {
            const taskMeta = item.meta as TaskMeta
            // Filter out completed tasks and subtasks
            if (taskMeta.status === 'completed') return false
            if (taskMeta.parent) return false
          }
          return path.dirname(item.path) === project.path
        })
        .sort((a, b) => (a.meta.sort_order ?? Infinity) - (b.meta.sort_order ?? Infinity))

      return {
        ...project,
        tasks: projectTasks,
      }
    })
  }, [selectedView, selectedSectionName, sections, items])
```

**Step 4: Update viewTitle for section view**

In `src/renderer/components/layout/TaskList.tsx`, update the viewTitle useMemo (replace lines 136-147):

```typescript
  const viewTitle = useMemo(() => {
    switch (selectedView) {
      case 'today': return 'Today'
      case 'next7': return 'Next 7 Days'
      case 'inbox': return 'Inbox'
      case 'project':
        if (!selectedPath) return ''
        return path.basename(selectedPath)
      case 'section':
        if (!selectedSectionName) return ''
        return selectedSectionName === '' ? 'Projects' : selectedSectionName
      default:
        return ''
    }
  }, [selectedView, selectedPath, selectedSectionName])
```

**Step 5: Add ProjectGroupHeader component**

In `src/renderer/components/layout/TaskList.tsx`, add after the `SortableTaskRow` component (after line 47):

```typescript
function ProjectGroupHeader({
  name,
  path: projectPath,
  taskCount,
  isCollapsed,
  onToggleCollapse
}: {
  name: string
  path: string
  taskCount: number
  isCollapsed: boolean
  onToggleCollapse: () => void
}) {
  return (
    <button
      onClick={onToggleCollapse}
      className="w-full flex items-center gap-2 px-1 py-2 text-[13px] font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
    >
      <ChevronDown
        size={14}
        className={`flex-shrink-0 transition-transform duration-200 ${
          isCollapsed ? '-rotate-90' : ''
        }`}
      />
      <ListTodo size={14} className="flex-shrink-0 text-gray-400 dark:text-gray-500" />
      <span className="truncate">{name}</span>
      {taskCount > 0 && (
        <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums ml-auto">
          {taskCount}
        </span>
      )}
    </button>
  )
}
```

**Step 6: Add section view rendering**

In `src/renderer/components/layout/TaskList.tsx`, in the return statement, replace the content inside the scrollable area (lines 378-451) with logic that handles section view:

After `<div className="max-w-3xl w-full mx-auto px-4 pb-4">` (line 379), replace the content:

```typescript
        {selectedView === 'section' ? (
          // Section view with project groups
          sectionProjects.length === 0 ? (
            <EmptyState
              icon="(folder)"
              title="No projects in this section"
              description="Add projects to this section from the sidebar."
            />
          ) : (
            <div className="space-y-2">
              {sectionProjects.map((project) => {
                const isCollapsed = isProjectGroupCollapsed(project.path)
                return (
                  <div key={project.id}>
                    <ProjectGroupHeader
                      name={project.name}
                      path={project.path}
                      taskCount={project.tasks.length}
                      isCollapsed={isCollapsed}
                      onToggleCollapse={() => toggleProjectGroupCollapse(project.path)}
                    />
                    <div
                      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                        isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
                      }`}
                    >
                      <div className="overflow-hidden pl-6">
                        {project.tasks.length === 0 ? (
                          <p className="py-2 text-sm text-gray-400 dark:text-gray-500 italic">
                            No tasks in this project
                          </p>
                        ) : (
                          project.tasks.map((item) => (
                            <TaskRow
                              key={item.id}
                              item={item}
                              onToggleComplete={handleToggleComplete}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : pendingItems.length === 0 && completedItems.length === 0 ? (
          <EmptyState
            {...(selectedView === 'today' ? {
              icon: '(tada)',
              title: 'All done for today!',
              description: 'No tasks due today. Enjoy your day or add something new.',
            } : selectedView === 'next7' ? {
              icon: '(calendar)',
              title: 'Week looks clear',
              description: 'No tasks due in the next 7 days.',
            } : selectedView === 'inbox' ? {
              icon: '(inbox)',
              title: 'Inbox is empty',
              description: 'Items without a folder appear here.',
            } : {
              icon: '(project)',
              title: 'No tasks yet',
              description: 'Create your first task in this project.',
            })}
          />
        ) : (
          <>
            <SortableContext items={pendingItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
              {pendingItems.map((item) => (
                <SortableTaskRow
                  key={item.id}
                  item={item}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </SortableContext>

            {completedItems.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => setCompletedCollapsed(prev => !prev)}
                  className="flex items-center gap-1 px-1 py-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <ChevronDown
                    size={12}
                    className={`flex-shrink-0 transition-transform duration-200 ${
                      completedCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                  <span>Completed</span>
                  <span className="ml-1 text-gray-400 dark:text-gray-500 tabular-nums">
                    {completedItems.length}
                  </span>
                </button>

                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    completedCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <SortableContext items={completedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                      {completedItems.map((item) => (
                        <SortableTaskRow
                          key={item.id}
                          item={item}
                          onToggleComplete={handleToggleComplete}
                        />
                      ))}
                    </SortableContext>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
```

**Step 7: Hide quick capture for section view**

In `src/renderer/components/layout/TaskList.tsx`, wrap the quick capture div (lines 286-376) with a condition:

```typescript
      {selectedView !== 'section' && (
        <div className="max-w-3xl w-full mx-auto px-4 pb-4">
          {/* existing quick capture content */}
        </div>
      )}
```

**Step 8: Commit**

```bash
git add src/renderer/components/layout/TaskList.tsx
git commit -m "feat(tasklist): add section view with collapsible project groups

Render section view showing all projects with their pending tasks.
Project groups are collapsible. Quick capture hidden in section view."
```

---

## Task 5: Manual Testing

**Step 1: Build and run the app**

Run: `npm run dev`

**Step 2: Test section click behavior**

1. Click on a section chevron - should toggle expand/collapse
2. Click on section name - should highlight section and show section view
3. Verify task list shows all projects from that section

**Step 3: Test project group collapse**

1. In section view, click project header chevron - should collapse/expand
2. Verify collapse state persists after navigating away and back

**Step 4: Test selection mutual exclusivity**

1. Select a section - verify it's highlighted
2. Click on a project - verify section is deselected, project is selected
3. Click on Today/Next 7 Days/Inbox - verify section is deselected

**Step 5: Verify empty states**

1. Select a section with no projects - verify "No projects in this section" message
2. Select a section where a project has no tasks - verify "No tasks in this project" message

**Step 6: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: address issues found in manual testing"
```
