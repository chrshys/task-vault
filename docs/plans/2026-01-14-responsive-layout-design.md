# Responsive Layout & Resizable Panels Design

## Overview

Add resizable panels, responsive breakpoints, and mobile navigation to Task Vault. The goal is a fluid layout that adapts from wide desktop displays down to narrow mobile viewports.

## Layout Modes

Three layout modes based on window width:

| Mode | Window Width | Visible Panels |
|------|--------------|----------------|
| Full | ≥900px | Sidebar + Task List + Task Detail |
| Compact | 640-899px | Task List + Task Detail |
| Mobile | <640px | Single panel (list OR detail) |

**Minimum app window width:** 320px (reduced from current ~680px)

## Panel Constraints

| Panel | Min Width | Max Width | Collapse Behavior |
|-------|-----------|-----------|-------------------|
| Sidebar | 180px | 400px | Snaps to 56px icon-only mode when dragged below minimum |
| Task List | 320px | No limit | Hard stop at minimum |
| Task Detail | 320px | No limit | Hard stop at minimum |

## Resizable Panels

**Implementation:** Use `react-resizable-panels` library.

**Drag handles:**
- Between sidebar and task list
- Between task list and task detail
- Subtle vertical line, more visible on hover
- 4-6px hit area
- Cursor changes to `col-resize` on hover

**Persistence:** Panel sizes stored in localStorage, restored on app launch.

## Mobile Navigation (<640px)

**Selection-based view switching:**
- Task list is the default view
- Selecting a task navigates to full-screen task detail
- Top bar shows back button to return to list
- Forward button available after navigating back (browser-like history)

**No hamburger menu or bottom tabs** - keep it simple with back/forward navigation.

## Focus Mode

Available at any viewport width:
- Button in task detail panel (top-right corner) expands detail to full viewport width
- Hides sidebar and task list entirely
- Same button toggles back to normal layout
- Top bar remains visible for window controls and navigation

## Task Detail Layout Changes

Move header content (checkbox, due date, more menu) into the body:

```
┌─────────────────────────────────────────────────┐
│ [←]  Task Detail                        [⛶]    │  ← Minimal header: back + focus toggle
├─────────────────────────────────────────────────┤
│                                                 │
│  [☐]  Task title goes here                      │  ← Checkbox inline with title
│                                                 │
│  [📅 Due date]  [⋯]                             │  ← Due date picker + more menu row
│                                                 │
│  Description content...                         │
│                                                 │
│  ─────────────────                              │
│  Subtasks                                       │
│  □ Subtask 1                                    │
│  □ Subtask 2                                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

**For notes:** No checkbox, show note icon in its place.

## Breakpoint Behavior

### ≥900px (Full Mode)
- All three panels visible
- Both drag handles active
- Sidebar can collapse to icon-only via drag

### 640-899px (Compact Mode)
- Sidebar auto-hidden (not just collapsed - completely hidden)
- Task list + task detail visible
- Single drag handle between them
- No way to show sidebar at this width

### <640px (Mobile Mode)
- Single panel view only
- Task list shown by default
- Selecting task shows detail full-screen
- Back button returns to list
- Focus mode button hidden (already full-screen)

## Implementation Components

1. **ResizablePanelLayout** - New component wrapping the three-panel structure using react-resizable-panels
2. **useResponsiveLayout** - Hook to track viewport width and determine current layout mode
3. **useLayoutPersistence** - Hook to save/restore panel sizes from localStorage
4. **FocusModeToggle** - Button component for task detail focus mode
5. **MobileNavBar** - Modified top bar with back/forward navigation for mobile mode

## State Management

Add to UIContext:
- `layoutMode`: 'full' | 'compact' | 'mobile'
- `focusMode`: boolean
- `panelSizes`: { sidebar: number, taskList: number, taskDetail: number }

## Accessibility

- Drag handles include ARIA labels for screen readers
- Keyboard support for resizing (arrow keys when handle focused)
- Focus mode toggle has clear label
- Mobile navigation uses semantic button elements
