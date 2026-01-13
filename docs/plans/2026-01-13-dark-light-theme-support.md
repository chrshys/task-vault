# Dark/Light Theme Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make all UI components properly respond to the theme toggle by adding light mode styles alongside existing dark mode styles.

**Architecture:** The app already has proper theme infrastructure (ThemeContext, CSS variables, Tailwind `darkMode: 'class'`). The fix involves converting hardcoded dark-mode colors to use Tailwind's `dark:` prefix pattern, so components display light colors by default and dark colors when `.dark` class is present on root.

**Tech Stack:** React, Tailwind CSS with `dark:` prefix utilities, existing CSS variables in globals.css

---

## Color Mapping Reference

Use these mappings consistently across all components:

| Dark Mode (current) | Light Mode (add) | Pattern |
|---------------------|------------------|---------|
| `bg-gray-900` | `bg-white` | `bg-white dark:bg-gray-900` |
| `bg-gray-800` | `bg-gray-50` | `bg-gray-50 dark:bg-gray-800` |
| `bg-gray-700` | `bg-gray-100` | `bg-gray-100 dark:bg-gray-700` |
| `bg-gray-600` | `bg-gray-200` | `bg-gray-200 dark:bg-gray-600` |
| `text-white` | `text-gray-900` | `text-gray-900 dark:text-white` |
| `text-gray-100` | `text-gray-900` | `text-gray-900 dark:text-gray-100` |
| `text-gray-200` | `text-gray-800` | `text-gray-800 dark:text-gray-200` |
| `text-gray-300` | `text-gray-700` | `text-gray-700 dark:text-gray-300` |
| `text-gray-400` | `text-gray-600` | `text-gray-600 dark:text-gray-400` |
| `text-gray-500` | `text-gray-500` | `text-gray-500` (same) |
| `border-gray-700` | `border-gray-200` | `border-gray-200 dark:border-gray-700` |
| `border-gray-600` | `border-gray-300` | `border-gray-300 dark:border-gray-600` |
| `hover:bg-gray-700` | `hover:bg-gray-100` | `hover:bg-gray-100 dark:hover:bg-gray-700` |
| `hover:bg-gray-800` | `hover:bg-gray-50` | `hover:bg-gray-50 dark:hover:bg-gray-800` |
| `placeholder-gray-500` | `placeholder-gray-400` | `placeholder-gray-400 dark:placeholder-gray-500` |

---

## Task 1: Sidebar.tsx

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

**Step 1: Update root container background**

Change line 92:
```tsx
// FROM:
<div className="h-full flex flex-col bg-gray-900">

// TO:
<div className="h-full flex flex-col bg-white dark:bg-gray-900">
```

**Step 2: Update TreeItem button styling**

Change lines 23-25:
```tsx
// FROM:
className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-gray-300 ${
  isOver ? 'bg-blue-600/30 ring-1 ring-blue-500' : 'hover:bg-gray-700'
}`}

// TO:
className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm text-gray-700 dark:text-gray-300 ${
  isOver ? 'bg-blue-600/30 ring-1 ring-blue-500' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
}`}
```

**Step 3: Update TreeItem count badge**

Change line 33:
```tsx
// FROM:
<span className="text-gray-500 text-xs">{node.count}</span>

// TO (no change needed, gray-500 works for both):
<span className="text-gray-500 text-xs">{node.count}</span>
```

**Step 4: Update Today/Next7/Inbox buttons**

Change lines 97-98 (Today button):
```tsx
// FROM:
className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${
  selectedView === 'today' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700'
}`}

// TO:
className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${
  selectedView === 'today' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
}`}
```

Apply same pattern to Next 7 Days button (lines 112-113) and Inbox button (lines 127-128).

**Step 5: Update Lists section**

Change line 141:
```tsx
// FROM:
<div className="border-t border-gray-700 pt-2">

// TO:
<div className="border-t border-gray-200 dark:border-gray-700 pt-2">
```

**Step 6: Update bottom section borders and inputs**

Change line 151:
```tsx
// FROM:
<div className="p-2 border-t border-gray-700 space-y-2">

// TO:
<div className="p-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
```

Change line 162-163 (folder input):
```tsx
// FROM:
className="flex-1 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-100 placeholder-gray-500 outline-none focus:border-blue-500"

// TO:
className="flex-1 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500"
```

Apply same pattern to project input (line 190-191).

Change lines 177-178 (New Folder button):
```tsx
// FROM:
className="w-full px-2 py-1.5 text-sm text-gray-500 hover:text-gray-300 text-left"

// TO:
className="w-full px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-left"
```

Apply same pattern to New Project button (lines 203-204).

**Step 7: Run the app and verify**

Run: `npm run dev`
Expected: Sidebar should display light colors in light mode, dark colors in dark mode

**Step 8: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "feat: add light mode support to Sidebar

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: TitleBar.tsx

**Files:**
- Modify: `src/renderer/components/layout/TitleBar.tsx`

**Step 1: Update container background and border**

Change line 26:
```tsx
// FROM:
className="h-10 bg-gray-900 flex items-center justify-between border-b border-gray-800 shrink-0 px-4"

// TO:
className="h-10 bg-white dark:bg-gray-900 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 shrink-0 px-4"
```

**Step 2: Update Undo button**

Change lines 39-43:
```tsx
// FROM:
className={`px-2 py-1 text-xs rounded ${
  canUndo
    ? 'text-gray-300 hover:bg-gray-700'
    : 'text-gray-600 cursor-not-allowed'
}`}

// TO:
className={`px-2 py-1 text-xs rounded ${
  canUndo
    ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
}`}
```

**Step 3: Update Redo button**

Change lines 51-55 (same pattern as Undo):
```tsx
// FROM:
className={`px-2 py-1 text-xs rounded ${
  canRedo
    ? 'text-gray-300 hover:bg-gray-700'
    : 'text-gray-600 cursor-not-allowed'
}`}

// TO:
className={`px-2 py-1 text-xs rounded ${
  canRedo
    ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
}`}
```

**Step 4: Run the app and verify**

Run: `npm run dev`
Expected: TitleBar should display light colors in light mode

**Step 5: Commit**

```bash
git add src/renderer/components/layout/TitleBar.tsx
git commit -m "feat: add light mode support to TitleBar

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: TaskList.tsx

**Files:**
- Modify: `src/renderer/components/layout/TaskList.tsx`

**Step 1: Update container background**

Change line 76:
```tsx
// FROM:
<div className="h-full flex flex-col bg-gray-800">

// TO:
<div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
```

**Step 2: Update header section**

Change lines 77-79:
```tsx
// FROM:
<div className="p-4 border-b border-gray-700">
  <h2 className="text-lg font-semibold text-white">{viewTitle}</h2>
</div>

// TO:
<div className="p-4 border-b border-gray-200 dark:border-gray-700">
  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{viewTitle}</h2>
</div>
```

**Step 3: Update create section border**

Change line 81:
```tsx
// FROM:
<div className="p-2 border-b border-gray-700">

// TO:
<div className="p-2 border-b border-gray-200 dark:border-gray-700">
```

**Step 4: Update Task/Note toggle buttons**

Change lines 85-86 (Task button):
```tsx
// FROM:
className={`px-2 py-1 text-xs rounded ${createType === 'task' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}

// TO:
className={`px-2 py-1 text-xs rounded ${createType === 'task' ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
```

Apply same pattern to Note button (lines 90-91).

**Step 5: Update input field**

Change line 102:
```tsx
// FROM:
className="w-full px-3 py-2 bg-transparent border border-transparent rounded text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-gray-600"

// TO:
className="w-full px-3 py-2 bg-transparent border border-transparent rounded text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600"
```

**Step 6: Update Notes section header**

Change lines 141-142:
```tsx
// FROM:
<h3 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">

// TO (no change needed - gray-500 works for both):
<h3 className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
```

**Step 7: Run the app and verify**

Run: `npm run dev`
Expected: TaskList should display light colors in light mode

**Step 8: Commit**

```bash
git add src/renderer/components/layout/TaskList.tsx
git commit -m "feat: add light mode support to TaskList

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: TaskRow.tsx

**Files:**
- Modify: `src/renderer/components/task/TaskRow.tsx`

**Step 1: Update row container**

Change lines 74-76:
```tsx
// FROM:
className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer ${
  isSelected ? 'bg-gray-700' : 'hover:bg-gray-800'
} ${isDragging ? 'opacity-50' : ''}`}

// TO:
className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer ${
  isSelected ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
} ${isDragging ? 'opacity-50' : ''}`}
```

**Step 2: Update checkbox border**

Change lines 86-89:
```tsx
// FROM:
className={`w-5 h-5 rounded border flex items-center justify-center ${
  isCompleted
    ? 'bg-blue-600 border-blue-600 text-white'
    : 'border-gray-500 hover:border-blue-500'
}`}

// TO:
className={`w-5 h-5 rounded border flex items-center justify-center ${
  isCompleted
    ? 'bg-blue-600 border-blue-600 text-white'
    : 'border-gray-400 dark:border-gray-500 hover:border-blue-500'
}`}
```

**Step 3: Update note icon**

Change line 97:
```tsx
// FROM:
<span className="w-5 h-5 flex items-center justify-center text-gray-500">

// TO (no change needed - gray-500 works for both):
<span className="w-5 h-5 flex items-center justify-center text-gray-500">
```

**Step 4: Update task title text**

Change line 104:
```tsx
// FROM:
<p className={`text-sm truncate ${isCompleted ? 'line-through text-gray-500' : 'text-gray-200'}`}>

// TO:
<p className={`text-sm truncate ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
```

**Step 5: Update subtask count**

Change line 108:
```tsx
// FROM:
<span className="text-xs text-gray-400">

// TO:
<span className="text-xs text-gray-500 dark:text-gray-400">
```

**Step 6: Update content preview**

Change line 114:
```tsx
// FROM:
<p className="text-xs text-gray-500 truncate">

// TO (no change needed - gray-500 works for both):
<p className="text-xs text-gray-500 truncate">
```

**Step 7: Run the app and verify**

Run: `npm run dev`
Expected: TaskRow should display light colors in light mode

**Step 8: Commit**

```bash
git add src/renderer/components/task/TaskRow.tsx
git commit -m "feat: add light mode support to TaskRow

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: TaskDetail.tsx

**Files:**
- Modify: `src/renderer/components/layout/TaskDetail.tsx`

**Step 1: Update empty state**

Change line 76:
```tsx
// FROM:
<div className="h-full flex items-center justify-center text-gray-500 bg-gray-800">

// TO:
<div className="h-full flex items-center justify-center text-gray-500 bg-gray-50 dark:bg-gray-800">
```

**Step 2: Update container**

Change line 88:
```tsx
// FROM:
<div className="h-full flex flex-col bg-gray-800">

// TO:
<div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
```

**Step 3: Update header border**

Change line 89:
```tsx
// FROM:
<div className="p-4 border-b border-gray-700 flex items-center justify-between">

// TO:
<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
```

**Step 4: Update Back button**

Change line 92:
```tsx
// FROM:
className="text-sm text-gray-400 hover:text-gray-200"

// TO:
className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
```

**Step 5: Update Delete button**

Change line 98:
```tsx
// FROM:
className="text-sm text-red-400 hover:text-red-300"

// TO:
className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
```

**Step 6: Update title input**

Change line 109:
```tsx
// FROM:
className="w-full text-xl font-semibold bg-transparent border-none outline-none text-white mb-4"

// TO:
className="w-full text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white mb-4"
```

**Step 7: Run the app and verify**

Run: `npm run dev`
Expected: TaskDetail should display light colors in light mode

**Step 8: Commit**

```bash
git add src/renderer/components/layout/TaskDetail.tsx
git commit -m "feat: add light mode support to TaskDetail

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: NoteDetail.tsx

**Files:**
- Modify: `src/renderer/components/layout/NoteDetail.tsx`

**Step 1: Update container**

Change line 53:
```tsx
// FROM:
<div className="flex flex-col h-full bg-gray-800">

// TO:
<div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800">
```

**Step 2: Update header border**

Change line 54:
```tsx
// FROM:
<div className="p-4 border-b border-gray-700 flex items-center justify-between">

// TO:
<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
```

**Step 3: Update Back button**

Change line 57:
```tsx
// FROM:
className="text-sm text-gray-400 hover:text-gray-200"

// TO:
className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
```

**Step 4: Update Delete button**

Change line 63:
```tsx
// FROM:
className="text-sm text-red-400 hover:text-red-300"

// TO:
className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
```

**Step 5: Update title input**

Change line 74:
```tsx
// FROM:
className="w-full text-xl font-semibold bg-transparent border-none outline-none text-white mb-4"

// TO:
className="w-full text-xl font-semibold bg-transparent border-none outline-none text-gray-900 dark:text-white mb-4"
```

**Step 6: Run the app and verify**

Run: `npm run dev`
Expected: NoteDetail should display light colors in light mode

**Step 7: Commit**

```bash
git add src/renderer/components/layout/NoteDetail.tsx
git commit -m "feat: add light mode support to NoteDetail

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: ConfirmDialog.tsx

**Files:**
- Modify: `src/renderer/components/ui/ConfirmDialog.tsx`

**Step 1: Update dialog background**

Change line 32:
```tsx
// FROM:
<div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-4">

// TO:
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-4">
```

**Step 2: Update title**

Change line 33:
```tsx
// FROM:
<h3 className="text-lg font-semibold text-gray-100 mb-2">{title}</h3>

// TO:
<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
```

**Step 3: Update message**

Change line 34:
```tsx
// FROM:
<p className="text-sm text-gray-400 mb-4">{message}</p>

// TO:
<p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{message}</p>
```

**Step 4: Update cancel button**

Change line 38:
```tsx
// FROM:
className="px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded"

// TO:
className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
```

**Step 5: Run the app and verify**

Run: `npm run dev`
Expected: ConfirmDialog should display light colors in light mode

**Step 6: Commit**

```bash
git add src/renderer/components/ui/ConfirmDialog.tsx
git commit -m "feat: add light mode support to ConfirmDialog

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: ContextMenu.tsx

**Files:**
- Modify: `src/renderer/components/ui/ContextMenu.tsx`

**Step 1: Update menu container**

Change line 34:
```tsx
// FROM:
className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50 min-w-[160px]"

// TO:
className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
```

**Step 2: Update menu item**

Change lines 53-56:
```tsx
// FROM:
className={`w-full px-3 py-1.5 text-left text-sm ${
  variant === 'danger'
    ? 'text-red-400 hover:bg-red-900/30'
    : 'text-gray-300 hover:bg-gray-700'
}`}

// TO:
className={`w-full px-3 py-1.5 text-left text-sm ${
  variant === 'danger'
    ? 'text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
}`}
```

**Step 3: Run the app and verify**

Run: `npm run dev`
Expected: ContextMenu should display light colors in light mode

**Step 4: Commit**

```bash
git add src/renderer/components/ui/ContextMenu.tsx
git commit -m "feat: add light mode support to ContextMenu

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: QuickAddModal.tsx

**Files:**
- Modify: `src/renderer/components/ui/QuickAddModal.tsx`

**Step 1: Update modal background**

Change line 39:
```tsx
// FROM:
className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg"

// TO:
className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg"
```

**Step 2: Update label**

Change line 43:
```tsx
// FROM:
<div className="text-xs text-gray-500 mb-2">

// TO (no change needed - gray-500 works for both):
<div className="text-xs text-gray-500 mb-2">
```

**Step 3: Update input**

Change line 53:
```tsx
// FROM:
className="w-full text-lg bg-transparent border-none outline-none text-gray-100 placeholder-gray-500"

// TO:
className="w-full text-lg bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
```

**Step 4: Update footer border**

Change line 55:
```tsx
// FROM:
<div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-700">

// TO:
<div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
```

**Step 5: Update cancel button**

Change line 59:
```tsx
// FROM:
className="px-3 py-1 text-sm text-gray-400 hover:bg-gray-700 rounded"

// TO:
className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
```

**Step 6: Run the app and verify**

Run: `npm run dev`
Expected: QuickAddModal should display light colors in light mode

**Step 7: Commit**

```bash
git add src/renderer/components/ui/QuickAddModal.tsx
git commit -m "feat: add light mode support to QuickAddModal

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: ThemeToggle.tsx

**Files:**
- Modify: `src/renderer/components/ui/ThemeToggle.tsx`

**Step 1: Update container background**

Change line 7:
```tsx
// FROM:
<div className="flex items-center gap-1 p-1 bg-gray-800 rounded-lg">

// TO:
<div className="flex items-center gap-1 p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
```

**Step 2: Update button styles**

Change line 10 (light mode button):
```tsx
// FROM:
className={`p-1.5 rounded text-sm ${theme === 'light' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}

// TO:
className={`p-1.5 rounded text-sm ${theme === 'light' ? 'bg-white dark:bg-gray-700' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}
```

Apply same pattern to dark mode button (line 19) and system button (line 28).

**Step 3: Run the app and verify**

Run: `npm run dev`
Expected: ThemeToggle should display light colors in light mode

**Step 4: Commit**

```bash
git add src/renderer/components/ui/ThemeToggle.tsx
git commit -m "feat: add light mode support to ThemeToggle

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 11: RichTextEditor.tsx

**Files:**
- Modify: `src/renderer/components/ui/RichTextEditor.tsx`

**Step 1: Update toolbar border**

Change line 18:
```tsx
// FROM:
<div className="flex gap-1 p-1 border-b border-gray-700 mb-2">

// TO:
<div className="flex gap-1 p-1 border-b border-gray-200 dark:border-gray-700 mb-2">
```

**Step 2: Update toolbar button (Bold)**

Change line 21:
```tsx
// FROM:
className={`p-1 rounded text-sm ${editor.isActive('bold') ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'}`}

// TO:
className={`p-1 rounded text-sm ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}`}
```

Apply same pattern to Italic button (line 28), Bullet List button (line 35), and Ordered List button (line 42).

**Step 3: Update container border**

Change line 76:
```tsx
// FROM:
<div className={`border border-gray-700 rounded-md ${className}`}>

// TO:
<div className={`border border-gray-300 dark:border-gray-700 rounded-md ${className}`}>
```

**Step 4: Update EditorContent prose class**

Change line 79:
```tsx
// FROM:
<EditorContent editor={editor} className="prose prose-sm prose-invert max-w-none min-h-[100px] outline-none" />

// TO:
<EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none min-h-[100px] outline-none" />
```

**Step 5: Run the app and verify**

Run: `npm run dev`
Expected: RichTextEditor should display light colors in light mode

**Step 6: Commit**

```bash
git add src/renderer/components/ui/RichTextEditor.tsx
git commit -m "feat: add light mode support to RichTextEditor

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 12: RecurrencePicker.tsx

**Files:**
- Modify: `src/renderer/components/ui/RecurrencePicker.tsx`

**Step 1: Update trigger button**

Change line 54:
```tsx
// FROM:
className="px-3 py-2 text-sm border border-gray-600 rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600"

// TO:
className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
```

**Step 2: Update dropdown container**

Change line 60:
```tsx
// FROM:
<div className="absolute top-full mt-1 left-0 z-10 w-64 p-3 bg-gray-700 rounded-md shadow-lg border border-gray-600">

// TO:
<div className="absolute top-full mt-1 left-0 z-10 w-64 p-3 bg-white dark:bg-gray-700 rounded-md shadow-lg border border-gray-200 dark:border-gray-600">
```

**Step 3: Update Frequency label**

Change line 62:
```tsx
// FROM:
<label className="block text-xs text-gray-400 mb-1">Frequency</label>

// TO:
<label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Frequency</label>
```

**Step 4: Update frequency buttons**

Change lines 69-73:
```tsx
// FROM:
className={`px-2 py-1 text-xs rounded ${
  value?.frequency === f.value
    ? 'bg-blue-600 text-white'
    : 'bg-gray-600 text-gray-200 hover:bg-gray-500'
}`}

// TO:
className={`px-2 py-1 text-xs rounded ${
  value?.frequency === f.value
    ? 'bg-blue-600 text-white'
    : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500'
}`}
```

**Step 5: Update "Every" section**

Change line 84:
```tsx
// FROM:
<label className="block text-xs text-gray-400 mb-1">Every</label>

// TO:
<label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Every</label>
```

Change line 90:
```tsx
// FROM:
className="w-16 px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded text-gray-200"

// TO:
className="w-16 px-2 py-1 text-sm bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-800 dark:text-gray-200"
```

Change line 92:
```tsx
// FROM:
<span className="ml-2 text-sm text-gray-300">

// TO:
<span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
```

**Step 6: Update "Repeat from" section**

Change line 101:
```tsx
// FROM:
<label className="block text-xs text-gray-400 mb-1">Repeat from</label>

// TO:
<label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Repeat from</label>
```

Change line 105:
```tsx
// FROM:
className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded text-gray-200"

// TO:
className="w-full px-2 py-1 text-sm bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-800 dark:text-gray-200"
```

**Step 7: Update footer buttons**

Change line 118:
```tsx
// FROM:
className="px-2 py-1 text-xs bg-gray-600 text-gray-200 rounded hover:bg-gray-500"

// TO:
className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
```

**Step 8: Run the app and verify**

Run: `npm run dev`
Expected: RecurrencePicker should display light colors in light mode

**Step 9: Commit**

```bash
git add src/renderer/components/ui/RecurrencePicker.tsx
git commit -m "feat: add light mode support to RecurrencePicker

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 13: SubtaskList.tsx

**Files:**
- Modify: `src/renderer/components/task/SubtaskList.tsx`

**Step 1: Update header**

Change line 33:
```tsx
// FROM:
<h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">

// TO (no change needed - gray-500 works for both):
<h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
```

**Step 2: Update checkbox border**

Change line 44:
```tsx
// FROM:
className="w-4 h-4 rounded border-gray-300"

// TO (no change needed - this is a native checkbox):
className="w-4 h-4 rounded border-gray-300"
```

**Step 3: Update subtask text**

Change line 46:
```tsx
// FROM:
<span className={`text-sm ${subtask.meta.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-200'}`}>

// TO:
<span className={`text-sm ${subtask.meta.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
```

**Step 4: Update input**

Change line 60:
```tsx
// FROM:
className="flex-1 px-2 py-1 text-sm border border-gray-600 rounded bg-gray-700 text-gray-200 placeholder:text-gray-500"

// TO:
className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
```

**Step 5: Update Add button**

Change line 64:
```tsx
// FROM:
className="px-2 py-1 text-sm bg-gray-700 rounded hover:bg-gray-600 text-gray-200"

// TO:
className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
```

**Step 6: Run the app and verify**

Run: `npm run dev`
Expected: SubtaskList should display light colors in light mode

**Step 7: Commit**

```bash
git add src/renderer/components/task/SubtaskList.tsx
git commit -m "feat: add light mode support to SubtaskList

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 14: globals.css - React Datepicker Light Mode

**Files:**
- Modify: `src/renderer/styles/globals.css`

**Step 1: Add light mode styles for React Datepicker**

Add after line 104 (after the `.dark .react-datepicker__time-list-item:hover` block):
```css
/* React Datepicker light mode styles */
.react-datepicker {
  background-color: #ffffff;
  border-color: #e5e7eb;
}

.react-datepicker__header {
  background-color: #f3f4f6;
  border-color: #e5e7eb;
}

.react-datepicker__current-month,
.react-datepicker__day-name,
.react-datepicker__day {
  color: #111827;
}

.react-datepicker__day:hover {
  background-color: #e5e7eb;
}

.react-datepicker__day--selected {
  background-color: #2563eb;
  color: #ffffff;
}

.react-datepicker__time-container {
  border-color: #e5e7eb;
}

.react-datepicker__time {
  background-color: #ffffff;
}

.react-datepicker__time-list-item {
  color: #111827;
}

.react-datepicker__time-list-item:hover {
  background-color: #e5e7eb;
}
```

**Step 2: Run the app and verify**

Run: `npm run dev`
Expected: DatePicker should display light colors in light mode

**Step 3: Commit**

```bash
git add src/renderer/styles/globals.css
git commit -m "feat: add light mode styles for React Datepicker

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Final Verification and Cleanup

**Step 1: Run the full application**

Run: `npm run dev`

**Step 2: Test light mode**

1. Click the sun icon in the theme toggle
2. Verify all components display appropriate light colors:
   - Sidebar: white background, dark text
   - TitleBar: white background, dark text
   - TaskList: light gray background, dark text
   - TaskRow: light hover states, dark text
   - TaskDetail/NoteDetail: light background, dark text
   - All modals and dialogs: white background, dark text
   - All inputs: light background with visible borders

**Step 3: Test dark mode**

1. Click the moon icon in the theme toggle
2. Verify all components display appropriate dark colors (should match current behavior)

**Step 4: Test system preference**

1. Click the desktop icon in the theme toggle
2. Change system preference and verify app follows

**Step 5: Run type check**

Run: `npm run typecheck`
Expected: No type errors

**Step 6: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete dark/light theme support across all UI components

- Added light mode variants to all hardcoded dark-mode colors
- Used Tailwind dark: prefix pattern consistently
- Added light mode styles for React Datepicker
- All components now properly respond to theme toggle

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

This plan covers 15 tasks to add proper light mode support:

| # | Component | Complexity |
|---|-----------|------------|
| 1 | Sidebar.tsx | High (many elements) |
| 2 | TitleBar.tsx | Low |
| 3 | TaskList.tsx | Medium |
| 4 | TaskRow.tsx | Medium |
| 5 | TaskDetail.tsx | Medium |
| 6 | NoteDetail.tsx | Medium |
| 7 | ConfirmDialog.tsx | Low |
| 8 | ContextMenu.tsx | Low |
| 9 | QuickAddModal.tsx | Low |
| 10 | ThemeToggle.tsx | Low |
| 11 | RichTextEditor.tsx | Medium |
| 12 | RecurrencePicker.tsx | High (many elements) |
| 13 | SubtaskList.tsx | Low |
| 14 | globals.css | Low |
| 15 | Final Verification | Testing |

Components already working: `NoteRow.tsx`, `EmptyState.tsx` (use proper `dark:` prefix pattern)
