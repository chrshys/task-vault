# Sidebar Sections Design

## Overview

Add user-created sections to organize projects in the sidebar. Sections are visual groupings only (not filesystem structure). Projects can be assigned to sections and dragged between them.

## Data Model

### Project Frontmatter

Add optional `section` field to project metadata:

```yaml
---
type: project
title: My Project
section: "Work"  # Optional - empty/missing means default "Projects" section
---
```

### Collapse State (localStorage)

```json
{
  "sidebar-sections-collapsed": {
    "/path/to/vault": ["Work", "Personal"]
  }
}
```

- Keyed by vault path for multi-vault support
- Array contains names of collapsed sections

## UI Design

### Plus Button Dropdown

Expand existing dropdown:
- "New Project" (existing)
- "New Section" (new) - inline input for section name

### Section Headers

Each section renders with:
- Collapse chevron icon (rotates when collapsed)
- Section name
- Plus button (creates project in that section)
- Right-click context menu: Rename, Delete

### Section Ordering

1. "Projects" (default, always first)
2. Custom sections in alphabetical order

### Drag and Drop

- Section headers are drop zones
- Dropping a project on a section header updates its `section` field
- Dropping on "Projects" clears the `section` field
- Visual feedback: blue ring highlight on drag-over

## Implementation

### VaultContext Changes

New functions:
- `createSection(name)` - validation only, no file created
- `renameSection(oldName, newName)` - updates all projects with that section
- `deleteSection(name)` - clears section field from affected projects

Modify `rebuildTree()` to group projects by section.

### New Data Structure

```typescript
interface SectionGroup {
  name: string           // "Projects" or custom name
  isDefault: boolean     // true for "Projects"
  projects: TreeNode[]   // projects in this section
}
```

### UIContext Changes

- Add `collapsedSections: Set<string>` state
- Add `toggleSectionCollapse(name: string)` function
- Load/save to localStorage on mount/change

### Sidebar.tsx Changes

- Group projects by section before rendering
- Render each section with collapsible header
- Add section headers as drop zones
- Extend Plus dropdown with "New Section" option
- Add context menu handler for section headers

## Edge Cases

### Creating a Section
- Empty name not allowed
- Duplicate names not allowed (case-insensitive)
- "Projects" is reserved

### Renaming a Section
- Same validation as create
- All projects with old name updated atomically

### Deleting a Section
- Confirmation dialog shown
- Projects in section revert to default "Projects"

### Empty Sections
- Remain visible until explicitly deleted
