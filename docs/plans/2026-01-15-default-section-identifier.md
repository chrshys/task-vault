# Default Section Identifier Refactor

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace empty string `''` as the default section identifier with a constant `DEFAULT_SECTION_KEY` to eliminate falsy-check bugs.

**Architecture:** Introduce a dedicated constant `DEFAULT_SECTION_KEY = '__default__'` in shared/types.ts. Update all files that check for or use the empty string to use this constant instead. This eliminates the class of bugs where `if (sectionKey)` or `if (!selectedSectionName)` fails because empty string is falsy.

**Tech Stack:** TypeScript, React

---

## Task 1: Add DEFAULT_SECTION_KEY constant

**Files:**
- Modify: `src/shared/types.ts:103-107`

**Step 1: Add the constant**

Add after the imports, before the type definitions:

```typescript
/**
 * Key used to identify the default section.
 * Using a dedicated constant instead of empty string to avoid falsy-check bugs.
 */
export const DEFAULT_SECTION_KEY = '__default__'
```

**Step 2: Verify the change compiles**

Run: `cd /Users/christopherhayes/Projects/task-vault && npm run build 2>&1 | head -20`
Expected: No errors related to DEFAULT_SECTION_KEY

**Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add DEFAULT_SECTION_KEY constant

Introduces a dedicated constant for identifying the default section
instead of using empty string, which caused falsy-check bugs.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Update VaultContext section handling

**Files:**
- Modify: `src/renderer/contexts/VaultContext.tsx`

**Step 1: Import the constant**

Add to the imports from `@shared/types`:

```typescript
import type { VaultItem, VaultTask, TreeNode, SectionGroup, ItemType, ItemMeta, TaskMeta, NoteMeta, ProjectMeta, RepeatConfig, VaultConfig } from '@shared/types'
```

becomes:

```typescript
import { DEFAULT_SECTION_KEY, type VaultItem, type VaultTask, type TreeNode, type SectionGroup, type ItemType, type ItemMeta, type TaskMeta, type NoteMeta, type ProjectMeta, type RepeatConfig, type VaultConfig } from '@shared/types'
```

**Step 2: Update normalizeSectionOrder function**

Change line 57 from:
```typescript
    if (name === '') {
```
to:
```typescript
    if (name === '' || name === DEFAULT_SECTION_KEY) {
```

Change line 59-60 from:
```typescript
        normalized.push('')
        hasDefault = true
        seen.add('')
```
to:
```typescript
        normalized.push(DEFAULT_SECTION_KEY)
        hasDefault = true
        seen.add(DEFAULT_SECTION_KEY)
```

Change line 74-75 from:
```typescript
  if (!hasDefault) {
    normalized.unshift('')
  }
```
to:
```typescript
  if (!hasDefault) {
    normalized.unshift(DEFAULT_SECTION_KEY)
  }
```

**Step 3: Update buildSections function**

Change line 106-107 from:
```typescript
      const sectionName = (item.meta as ProjectMeta).section || ''
```
to:
```typescript
      const sectionName = (item.meta as ProjectMeta).section || DEFAULT_SECTION_KEY
```

Change line 116-117 from:
```typescript
        sectionName: sectionName || '',
```
to:
```typescript
        sectionName: sectionName || DEFAULT_SECTION_KEY,
```

Change line 163-168 from:
```typescript
    if (key === '') {
      sections.push({
        name: defaultSectionName,
        isDefault: true,
        projects: projects.sort(compareProjects),
      })
```
to:
```typescript
    if (key === DEFAULT_SECTION_KEY) {
      sections.push({
        name: defaultSectionName,
        isDefault: true,
        projects: projects.sort(compareProjects),
      })
```

**Step 4: Verify build**

Run: `cd /Users/christopherhayes/Projects/task-vault && npm run build 2>&1 | head -30`
Expected: No errors

**Step 5: Commit**

```bash
git add src/renderer/contexts/VaultContext.tsx
git commit -m "refactor(VaultContext): use DEFAULT_SECTION_KEY instead of empty string

Updates normalizeSectionOrder and buildSections to use the constant.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Update UIContext section handling

**Files:**
- Modify: `src/renderer/contexts/UIContext.tsx`

**Step 1: Import the constant**

Add import at the top:

```typescript
import { DEFAULT_SECTION_KEY } from '@shared/types'
```

**Step 2: No code changes needed in UIContext**

The UIContext uses `string | null` for `selectedSectionName` and already uses explicit null checks (`sectionName !== null`). The actual section key value is set from the Sidebar, which we'll update next.

**Step 3: Commit**

```bash
git add src/renderer/contexts/UIContext.tsx
git commit -m "refactor(UIContext): import DEFAULT_SECTION_KEY for consistency

Prepares UIContext for the new section key constant.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Update Sidebar section key handling

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

**Step 1: Import the constant**

Add to imports:

```typescript
import { DEFAULT_SECTION_KEY } from '@shared/types'
```

**Step 2: Update SectionItem sectionKey computation**

Change line 369 from:
```typescript
    const sectionKey = section.isDefault ? '' : section.name
```
to:
```typescript
    const sectionKey = section.isDefault ? DEFAULT_SECTION_KEY : section.name
```

**Step 3: Update handleCreateProjectInSection**

Change line 161 from:
```typescript
    await createProject(trimmedName, sectionKey || null)
```
to:
```typescript
    await createProject(trimmedName, sectionKey === DEFAULT_SECTION_KEY ? null : sectionKey)
```

**Step 4: Update collapsed sidebar ProjectItem**

Change line 615 from:
```typescript
                            sectionKey={node.sectionName ?? ''}
```
to:
```typescript
                            sectionKey={node.sectionName ?? DEFAULT_SECTION_KEY}
```

**Step 5: Verify build**

Run: `cd /Users/christopherhayes/Projects/task-vault && npm run build 2>&1 | head -30`
Expected: No errors

**Step 6: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "refactor(Sidebar): use DEFAULT_SECTION_KEY for section identification

Replaces empty string checks with the constant throughout the component.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Update SectionHeader droppable data

**Files:**
- Modify: `src/renderer/components/layout/SectionHeader.tsx`

**Step 1: Import the constant**

Add to imports:

```typescript
import { DEFAULT_SECTION_KEY } from '@shared/types'
```

**Step 2: Update droppable data**

Change line 35 from:
```typescript
    data: { sectionName: isDefault ? '' : name },
```
to:
```typescript
    data: { sectionName: isDefault ? DEFAULT_SECTION_KEY : name },
```

**Step 3: Verify build**

Run: `cd /Users/christopherhayes/Projects/task-vault && npm run build 2>&1 | head -30`
Expected: No errors

**Step 4: Commit**

```bash
git add src/renderer/components/layout/SectionHeader.tsx
git commit -m "refactor(SectionHeader): use DEFAULT_SECTION_KEY in droppable data

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update TaskList section matching

**Files:**
- Modify: `src/renderer/components/layout/TaskList.tsx`

**Step 1: Import the constant**

Add to imports:

```typescript
import { DEFAULT_SECTION_KEY } from '@shared/types'
```

**Step 2: Update sectionProjects useMemo**

Change lines 107-109 from:
```typescript
    const section = sections.find(s =>
      (s.isDefault && selectedSectionName === '') ||
      (!s.isDefault && s.name === selectedSectionName)
    )
```
to:
```typescript
    const section = sections.find(s =>
      (s.isDefault && selectedSectionName === DEFAULT_SECTION_KEY) ||
      (!s.isDefault && s.name === selectedSectionName)
    )
```

**Step 3: Update viewTitle for section view**

Change lines 209-210 from:
```typescript
      case 'section':
        if (selectedSectionName === null) return ''
        return selectedSectionName === '' ? 'Projects' : selectedSectionName
```
to:
```typescript
      case 'section':
        if (selectedSectionName === null) return ''
        if (selectedSectionName === DEFAULT_SECTION_KEY) return 'Projects'
        return selectedSectionName
```

**Step 4: Verify build**

Run: `cd /Users/christopherhayes/Projects/task-vault && npm run build 2>&1 | head -30`
Expected: No errors

**Step 5: Commit**

```bash
git add src/renderer/components/layout/TaskList.tsx
git commit -m "refactor(TaskList): use DEFAULT_SECTION_KEY for section matching

Eliminates empty string checks in sectionProjects useMemo and viewTitle.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update TreeDndContext section handling

**Files:**
- Modify: `src/renderer/contexts/TreeDndContext.tsx`

**Step 1: Import the constant**

Change line 15 from:
```typescript
import type { VaultItem, TreeNode, TaskMeta, ProjectMeta } from '@shared/types'
```
to:
```typescript
import { DEFAULT_SECTION_KEY, type VaultItem, type TreeNode, type TaskMeta, type ProjectMeta } from '@shared/types'
```

**Step 2: Update section key fallbacks**

Change line 94 from:
```typescript
          await setProjectSection(projectPath, sectionName || null)
```
to:
```typescript
          await setProjectSection(projectPath, sectionName === DEFAULT_SECTION_KEY ? null : sectionName ?? null)
```

Change line 102 from:
```typescript
          const sourceSectionKey = activeData?.sectionKey ?? ''
```
to:
```typescript
          const sourceSectionKey = activeData?.sectionKey ?? DEFAULT_SECTION_KEY
```

Change line 103 from:
```typescript
          const targetSectionKey = overData.sectionKey ?? ''
```
to:
```typescript
          const targetSectionKey = overData.sectionKey ?? DEFAULT_SECTION_KEY
```

Change line 113 from:
```typescript
              .filter(item => item.meta.type === 'project' && ((item.meta as ProjectMeta).section || '') === sourceSectionKey)
```
to:
```typescript
              .filter(item => item.meta.type === 'project' && ((item.meta as ProjectMeta).section || DEFAULT_SECTION_KEY) === sourceSectionKey)
```

Change line 127 from:
```typescript
              .filter(item => item.meta.type === 'project' && ((item.meta as ProjectMeta).section || '') === sourceSectionKey)
```
to:
```typescript
              .filter(item => item.meta.type === 'project' && ((item.meta as ProjectMeta).section || DEFAULT_SECTION_KEY) === sourceSectionKey)
```

Change line 130 from:
```typescript
              .filter(item => item.meta.type === 'project' && ((item.meta as ProjectMeta).section || '') === targetSectionKey)
```
to:
```typescript
              .filter(item => item.meta.type === 'project' && ((item.meta as ProjectMeta).section || DEFAULT_SECTION_KEY) === targetSectionKey)
```

Change line 141 from:
```typescript
            await setProjectSection(projectPath, targetSectionKey || null)
```
to:
```typescript
            await setProjectSection(projectPath, targetSectionKey === DEFAULT_SECTION_KEY ? null : targetSectionKey)
```

**Step 3: Verify build**

Run: `cd /Users/christopherhayes/Projects/task-vault && npm run build 2>&1 | head -30`
Expected: No errors

**Step 4: Commit**

```bash
git add src/renderer/contexts/TreeDndContext.tsx
git commit -m "refactor(TreeDndContext): use DEFAULT_SECTION_KEY for drag-and-drop

Updates all section key comparisons and fallbacks in the drag-and-drop logic.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Add validation to prevent reserved section names

**Files:**
- Modify: `src/renderer/components/layout/Sidebar.tsx`

**Step 1: Update validateSectionName function**

Change lines 191-198 from:
```typescript
  const validateSectionName = (name: string): string | null => {
    const trimmed = name.trim()
    if (!trimmed) return 'Section name cannot be empty'
    const existing = getAllSectionNames()
    if (existing.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      return 'Section already exists'
    }
    return null
  }
```
to:
```typescript
  const validateSectionName = (name: string): string | null => {
    const trimmed = name.trim()
    if (!trimmed) return 'Section name cannot be empty'
    if (trimmed === DEFAULT_SECTION_KEY || trimmed.startsWith('__')) {
      return 'Section name is reserved'
    }
    const existing = getAllSectionNames()
    if (existing.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      return 'Section already exists'
    }
    return null
  }
```

**Step 2: Verify build**

Run: `cd /Users/christopherhayes/Projects/task-vault && npm run build 2>&1 | head -30`
Expected: No errors

**Step 3: Commit**

```bash
git add src/renderer/components/layout/Sidebar.tsx
git commit -m "fix(Sidebar): prevent reserved section names

Validates that user cannot create sections with names starting with '__'
which are reserved for system use.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Full build and manual testing

**Step 1: Run full build**

Run: `cd /Users/christopherhayes/Projects/task-vault && npm run build`
Expected: Build succeeds with no errors

**Step 2: Run dev server for manual testing**

Run: `cd /Users/christopherhayes/Projects/task-vault && npm run dev`

**Step 3: Manual test checklist**

- [ ] Click on default "Projects" section - should navigate to section view
- [ ] Click on a custom section - should navigate correctly
- [ ] Create a new project in the default section - should work
- [ ] Drag a project to a different section - should work
- [ ] Drag a project to the default section - should work
- [ ] Create a new custom section - should work
- [ ] Verify section collapse/expand persists correctly

**Step 4: Commit if any fixes needed**

If any fixes were needed during testing, commit them now.

---

## Task 10: Final commit and summary

**Step 1: Review all changes**

Run: `cd /Users/christopherhayes/Projects/task-vault && git log --oneline HEAD~9..HEAD`

**Step 2: Verify no regressions**

Run: `cd /Users/christopherhayes/Projects/task-vault && npm run build && npm run lint`
Expected: All checks pass

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/shared/types.ts` | Added `DEFAULT_SECTION_KEY` constant |
| `src/renderer/contexts/VaultContext.tsx` | Updated `normalizeSectionOrder` and `buildSections` to use constant |
| `src/renderer/contexts/UIContext.tsx` | Import constant (no logic changes needed) |
| `src/renderer/components/layout/Sidebar.tsx` | Updated section key computation and validation |
| `src/renderer/components/layout/SectionHeader.tsx` | Updated droppable data |
| `src/renderer/components/layout/TaskList.tsx` | Updated section matching and viewTitle |
| `src/renderer/contexts/TreeDndContext.tsx` | Updated all section key comparisons |

**Why this fixes the bug:**
- The constant `'__default__'` is truthy, so `if (sectionKey)` now works correctly
- Explicit comparisons like `sectionKey === DEFAULT_SECTION_KEY` are clear and unambiguous
- Reserved name validation prevents user confusion
