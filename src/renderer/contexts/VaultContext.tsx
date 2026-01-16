import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { DEFAULT_SECTION_KEY, type VaultItem, type VaultTask, type TreeNode, type SectionGroup, type ItemType, type ItemMeta, type TaskMeta, type NoteMeta, type ProjectMeta, type RepeatConfig, type VaultConfig } from '@shared/types'
import path from 'path-browserify'

export interface ConflictDialogProps {
  open: boolean
  item: VaultItem
  message: string
  onReload: () => void
  onOverwrite: () => void
}

interface VaultContextValue {
  items: Map<string, VaultItem>
  sections: SectionGroup[]
  sectionOrder: string[]
  defaultSectionName: string
  tree: TreeNode[]
  loading: boolean
  vaultPath: string | null
  loadVault: (path: string) => Promise<void>
  initializeVault: (path: string) => Promise<void>
  createItem: (type: ItemType, folder: string, title: string, dueDate?: Date | null, repeat?: RepeatConfig | null) => Promise<VaultItem>
  updateItem: (item: VaultItem) => Promise<void>
  moveItem: (item: VaultItem, newPath: string) => Promise<void>
  deleteItem: (path: string) => Promise<void>
  duplicateItem: (item: VaultItem) => Promise<VaultItem>
  convertItem: (item: VaultItem, toType: 'task' | 'note') => Promise<void>
  createProject: (name: string, sectionName?: string | null) => Promise<VaultItem>
  renameProject: (projectPath: string, newName: string) => Promise<string>
  getItemsByParent: (parentId: string | null) => VaultItem[]
  getTodayTasks: () => VaultItem[]
  getNext7DaysTasks: () => VaultItem[]
  getInboxItems: () => VaultItem[]
  createSubtask: (parentId: string, title: string, dueDate?: Date | null, repeat?: RepeatConfig | null) => Promise<VaultItem | null>
  getSubtasks: (parentId: string) => VaultTask[]
  deleteProject: (projectPath: string) => Promise<void>
  updateSortOrder: (itemPath: string, newOrder: number) => Promise<void>
  updateSortOrders: (updates: Array<{ itemPath: string; newOrder: number }>) => Promise<void>
  addSection: (sectionName: string) => Promise<void>
  reorderSections: (order: string[]) => Promise<void>
  setProjectSection: (projectPath: string, sectionName: string | null, projectItem?: VaultItem) => Promise<void>
  renameSection: (oldName: string, newName: string) => Promise<void>
  deleteSection: (sectionName: string) => Promise<void>
  getAllSectionNames: () => string[]
  conflictDialogProps: ConflictDialogProps | null
}

const VaultContext = createContext<VaultContextValue | null>(null)
const DEFAULT_SECTION_NAME = 'Projects'

function normalizeSectionOrder(sectionOrder: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  let hasDefault = false

  for (const name of sectionOrder) {
    if (name === '' || name === DEFAULT_SECTION_KEY) {
      if (!hasDefault) {
        normalized.push(DEFAULT_SECTION_KEY)
        hasDefault = true
        seen.add(DEFAULT_SECTION_KEY)
      }
      continue
    }
    const trimmed = name.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(trimmed)
  }

  if (!hasDefault) {
    normalized.unshift(DEFAULT_SECTION_KEY)
  }

  return normalized
}

function normalizeDefaultSectionName(name?: string): string {
  const trimmed = (name ?? '').trim()
  return trimmed || DEFAULT_SECTION_NAME
}

function buildSections(
  items: Map<string, VaultItem>,
  sectionOrder: string[] = [],
  defaultSectionName: string = DEFAULT_SECTION_NAME
): SectionGroup[] {
  const projectMap = new Map<string, TreeNode>()
  const sectionMap = new Map<string, TreeNode[]>()
  const normalizedOrder = normalizeSectionOrder(sectionOrder)
  const orderedSet = new Set<string>()

  for (const name of normalizedOrder) {
    if (!orderedSet.has(name)) {
      orderedSet.add(name)
      sectionMap.set(name, [])
    }
  }

  // First pass: create project nodes and group by section
  items.forEach((item) => {
    if (item.meta.type === 'project') {
      const dirPath = path.dirname(item.path)
      const sectionName = (item.meta as ProjectMeta).section || DEFAULT_SECTION_KEY

      const node: TreeNode = {
        id: item.id,
        name: item.title,
        type: 'project',
        path: dirPath,
        children: [],
        count: 0,
        sortOrder: (item.meta as ProjectMeta).sort_order,
        sectionName: sectionName || DEFAULT_SECTION_KEY,
      }
      projectMap.set(dirPath, node)

      const existing = sectionMap.get(sectionName) || []
      existing.push(node)
      sectionMap.set(sectionName, existing)
    }
  })

  // Second pass: count incomplete tasks and notes in each project
  items.forEach((item) => {
    if (item.meta.type === 'note') {
      const dirPath = path.dirname(item.path)
      const projectNode = projectMap.get(dirPath)
      if (projectNode) {
        projectNode.count = (projectNode.count || 0) + 1
      }
    } else if (item.meta.type === 'task' && item.meta.status !== 'completed') {
      const dirPath = path.dirname(item.path)
      const projectNode = projectMap.get(dirPath)
      if (projectNode) {
        projectNode.count = (projectNode.count || 0) + 1
      }
    }
  })

  // Build section groups
  const sections: SectionGroup[] = []

  const compareProjects = (a: TreeNode, b: TreeNode) => {
    const aOrder = a.sortOrder ?? Number.POSITIVE_INFINITY
    const bOrder = b.sortOrder ?? Number.POSITIVE_INFINITY
    if (aOrder !== bOrder) return aOrder - bOrder
    return a.name.localeCompare(b.name)
  }

  // Custom sections alphabetically
  const orderedKeys = [
    ...normalizedOrder,
    ...Array.from(sectionMap.keys())
      .filter(name => !orderedSet.has(name))
      .sort((a, b) => a.localeCompare(b)),
  ]

  for (const key of orderedKeys) {
    const projects = sectionMap.get(key) || []
    if (key === DEFAULT_SECTION_KEY) {
      sections.push({
        name: defaultSectionName,
        isDefault: true,
        projects: projects.sort(compareProjects),
      })
    } else {
      sections.push({
        name: key,
        isDefault: false,
        projects: projects.sort(compareProjects),
      })
    }
  }

  return sections
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Map<string, VaultItem>>(new Map())
  const [sections, setSections] = useState<SectionGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [vaultPath, setVaultPath] = useState<string | null>(null)
  const [vaultConfig, setVaultConfig] = useState<VaultConfig | null>(null)
  const [sectionOrder, setSectionOrder] = useState<string[]>([])
  const [defaultSectionName, setDefaultSectionName] = useState(DEFAULT_SECTION_NAME)
  const sectionOrderRef = useRef<string[]>([])

  // Conflict handling state
  const [conflictState, setConflictState] = useState<{
    item: VaultItem
    previousItem: VaultItem
    resolve: (action: 'reload' | 'overwrite') => void
  } | null>(null)

  const rebuildSections = useCallback((itemsMap: Map<string, VaultItem>, sectionOrderOverride?: string[], defaultNameOverride?: string) => {
    const order = sectionOrderOverride ?? sectionOrderRef.current
    const defaultName = normalizeDefaultSectionName(defaultNameOverride ?? defaultSectionName)
    setSections(buildSections(itemsMap, order, defaultName))
  }, [defaultSectionName])

  // Compute flat tree from sections for backward compatibility
  const tree = sections.flatMap(s => s.projects)

  const loadVault = useCallback(async (folderPath: string) => {
    setLoading(true)
    const [loadedItems, config] = await Promise.all([
      window.api.loadVault(folderPath),
      window.api.getVaultConfig(folderPath),
    ])
    const itemsMap = new Map(loadedItems.map(item => [item.id, item]))
    setItems(itemsMap)
    setVaultPath(folderPath)
    setVaultConfig(config)
    const configSections = normalizeSectionOrder(config.sections ?? [])
    const configDefaultSectionName = normalizeDefaultSectionName(config.defaultSectionName)
    setSectionOrder(configSections)
    setDefaultSectionName(configDefaultSectionName)
    sectionOrderRef.current = configSections
    rebuildSections(itemsMap, configSections, configDefaultSectionName)
    setLoading(false)
  }, [rebuildSections])

  const initializeVault = useCallback(async (folderPath: string) => {
    setLoading(true)
    const [loadedItems, config] = await Promise.all([
      window.api.initializeVault(folderPath),
      window.api.getVaultConfig(folderPath),
    ])
    const itemsMap = new Map(loadedItems.map(item => [item.id, item]))
    setItems(itemsMap)
    setVaultPath(folderPath)
    setVaultConfig(config)
    const configSections = normalizeSectionOrder(config.sections ?? [])
    const configDefaultSectionName = normalizeDefaultSectionName(config.defaultSectionName)
    setSectionOrder(configSections)
    setDefaultSectionName(configDefaultSectionName)
    sectionOrderRef.current = configSections
    rebuildSections(itemsMap, configSections, configDefaultSectionName)
    setLoading(false)
  }, [rebuildSections])

  const createItem = useCallback(async (type: ItemType, folder: string, title: string, dueDate?: Date | null, repeat?: RepeatConfig | null) => {
    let item = await window.api.createFile(type, folder, title)

    // If due date or repeat provided for a task, update immediately
    if (type === 'task' && (dueDate || repeat) && item.meta.type === 'task') {
      const taskMeta = item.meta as TaskMeta
      const updatedMeta = { ...taskMeta }
      if (dueDate) {
        updatedMeta.due = dueDate.toISOString()
      }
      if (repeat) {
        updatedMeta.repeat = repeat
      }
      const updatedItem: VaultItem = {
        ...item,
        meta: updatedMeta,
      }
      await window.api.writeFile(updatedItem.path, updatedItem)
      item = updatedItem
    }

    setItems(prev => {
      const next = new Map(prev)
      next.set(item.id, item)
      rebuildSections(next)
      return next
    })
    return item
  }, [rebuildSections])

  const updateItem = useCallback(async (item: VaultItem) => {
    // Store previous item for potential rollback
    const previousItem = items.get(item.id)

    // Update local state immediately for responsive UI
    setItems(prev => {
      const next = new Map(prev)
      next.set(item.id, item)
      rebuildSections(next)
      return next
    })

    // Then persist to disk
    const result = await window.api.writeFile(item.path, item)

    if (!result.success && 'conflict' in result) {
      // Rollback optimistic update
      if (previousItem) {
        setItems(prev => {
          const next = new Map(prev)
          next.set(previousItem.id, previousItem)
          rebuildSections(next)
          return next
        })
      }

      // Show conflict dialog and wait for user action
      const action = await new Promise<'reload' | 'overwrite'>((resolve) => {
        setConflictState({ item, previousItem: previousItem!, resolve })
      })

      setConflictState(null)

      if (action === 'reload') {
        // Reload item from disk
        const reloaded = await window.api.readFile(item.path) as VaultItem | null
        if (reloaded) {
          setItems(prev => {
            const next = new Map(prev)
            next.set(reloaded.id, reloaded)
            rebuildSections(next)
            return next
          })
        }
      } else {
        // Force overwrite
        await window.api.forceWriteFile(item.path, item)
        setItems(prev => {
          const next = new Map(prev)
          next.set(item.id, item)
          rebuildSections(next)
          return next
        })
      }
    }
  }, [rebuildSections, items])

  const moveItem = useCallback(async (item: VaultItem, newPath: string) => {
    const oldPath = item.path
    if (oldPath === newPath) return

    const updatedItem: VaultItem = {
      ...item,
      path: newPath,
      meta: { ...item.meta, modified: new Date().toISOString() } as typeof item.meta,
    }

    // Update local state immediately for responsive UI
    setItems(prev => {
      const next = new Map(prev)
      next.set(item.id, updatedItem)
      rebuildSections(next)
      return next
    })

    // Then move the file on disk
    await window.api.moveFile(oldPath, newPath)
  }, [rebuildSections])

  const deleteItem = useCallback(async (itemPath: string) => {
    await window.api.deleteFile(itemPath)
  }, [])

  const duplicateItem = useCallback(async (item: VaultItem) => {
    const folder = path.dirname(item.path)
    const newTitle = `${item.title} (copy)`
    const newItem = await createItem(item.meta.type as ItemType, folder, newTitle)
    const duplicated: VaultItem = {
      ...newItem,
      content: item.content,
      meta: { ...item.meta, created: new Date().toISOString(), modified: new Date().toISOString() },
    }
    await updateItem(duplicated)
    return duplicated
  }, [createItem, updateItem])

  const convertItem = useCallback(async (item: VaultItem, toType: 'task' | 'note') => {
    if (item.meta.type === toType) {
      return
    }
    if (item.meta.type !== 'task' && item.meta.type !== 'note') {
      return
    }

    const { created, modified, parent, repeat, reminder } = item.meta

    // Build base meta, filtering out undefined values (YAML can't serialize undefined)
    const baseMeta: Record<string, unknown> = { created, modified }
    if (parent !== undefined) baseMeta.parent = parent
    if (repeat !== undefined) baseMeta.repeat = repeat
    if (reminder !== undefined) baseMeta.reminder = reminder

    const newMeta = toType === 'task'
      ? { ...baseMeta, type: 'task' as const, status: 'pending' as const }
      : { ...baseMeta, type: 'note' as const }

    await updateItem({ ...item, meta: newMeta as TaskMeta | NoteMeta })
  }, [updateItem])

  const persistSectionOrder = useCallback(async (nextSections: string[], itemsOverride?: Map<string, VaultItem>) => {
    if (!vaultPath) return
    const normalizedSections = normalizeSectionOrder(nextSections)
    const normalizedDefaultSectionName = normalizeDefaultSectionName(defaultSectionName)
    const nextConfig: VaultConfig = {
      version: vaultConfig?.version ?? 1,
      created: vaultConfig?.created ?? new Date().toISOString(),
      sections: normalizedSections,
      defaultSectionName: normalizedDefaultSectionName,
    }
    const itemsMap = itemsOverride ?? items
    setVaultConfig(nextConfig)
    setSectionOrder(normalizedSections)
    sectionOrderRef.current = normalizedSections
    rebuildSections(itemsMap, normalizedSections, normalizedDefaultSectionName)
    await window.api.setVaultConfig(vaultPath, nextConfig)
  }, [defaultSectionName, items, rebuildSections, vaultConfig, vaultPath])

  const persistDefaultSectionName = useCallback(async (nextName: string, itemsOverride?: Map<string, VaultItem>) => {
    if (!vaultPath) return
    const normalizedDefaultSectionName = normalizeDefaultSectionName(nextName)
    const normalizedSections = normalizeSectionOrder(sectionOrder)
    const nextConfig: VaultConfig = {
      version: vaultConfig?.version ?? 1,
      created: vaultConfig?.created ?? new Date().toISOString(),
      sections: normalizedSections,
      defaultSectionName: normalizedDefaultSectionName,
    }
    const itemsMap = itemsOverride ?? items
    setVaultConfig(nextConfig)
    setDefaultSectionName(normalizedDefaultSectionName)
    rebuildSections(itemsMap, normalizedSections, normalizedDefaultSectionName)
    await window.api.setVaultConfig(vaultPath, nextConfig)
  }, [items, rebuildSections, sectionOrder, vaultConfig, vaultPath])

  const addSection = useCallback(async (sectionName: string) => {
    const trimmed = sectionName.trim()
    if (!trimmed) return
    const exists = sectionOrder.some(name => name.toLowerCase() === trimmed.toLowerCase())
    if (exists) return
    await persistSectionOrder([...sectionOrder, trimmed])
  }, [persistSectionOrder, sectionOrder])

  const reorderSections = useCallback(async (order: string[]) => {
    await persistSectionOrder(order)
  }, [persistSectionOrder])

  const getItemsByParent = useCallback((parentId: string | null) => {
    return Array.from(items.values()).filter(item => {
      if (item.meta.type === 'task' || item.meta.type === 'note') {
        return item.meta.parent === parentId
      }
      return false
    })
  }, [items])

  const getTodayTasks = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return Array.from(items.values()).filter(item => {
      if (item.meta.type !== 'task') return false
      if (item.meta.status === 'completed') return false
      if (!item.meta.due) return false
      const due = new Date(item.meta.due)
      return due >= today && due < tomorrow
    })
  }, [items])

  const getNext7DaysTasks = useCallback(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const next7 = new Date(today)
    next7.setDate(next7.getDate() + 7)

    return Array.from(items.values()).filter(item => {
      if (item.meta.type !== 'task') return false
      if (item.meta.status === 'completed') return false
      if (!item.meta.due) return false
      const due = new Date(item.meta.due)
      return due >= today && due < next7
    })
  }, [items])

  const getInboxItems = useCallback(() => {
    if (!vaultPath) return []
    const inboxPath = path.join(vaultPath, 'Inbox')

    return Array.from(items.values()).filter(item => {
      if (item.meta.type === 'project') return false
      return item.path.startsWith(inboxPath)
    })
  }, [items, vaultPath])

  const getSubtasks = useCallback((parentId: string): VaultTask[] => {
    return Array.from(items.values()).filter(item => {
      if (item.meta.type !== 'task') return false
      return (item.meta as TaskMeta).parent === parentId
    }) as VaultTask[]
  }, [items])

  const createSubtask = useCallback(async (parentId: string, title: string, dueDate?: Date | null, repeat?: RepeatConfig | null): Promise<VaultItem | null> => {
    const parent = items.get(parentId)
    if (!parent || parent.meta.type !== 'task') return null

    const folder = path.dirname(parent.path)
    const newItem = await createItem('task', folder, title, dueDate, repeat)

    if (newItem) {
      const updatedItem: VaultItem = {
        ...newItem,
        meta: { ...newItem.meta, parent: parentId } as TaskMeta,
      }
      await updateItem(updatedItem)
      return updatedItem
    }
    return null
  }, [items, createItem, updateItem])

  // Find a project by its directory path
  const findProjectByDirPath = useCallback((dirPath: string): VaultItem | undefined => {
    for (const item of items.values()) {
      if (item.meta.type === 'project') {
        if (path.dirname(item.path) === dirPath) {
          return item
        }
      }
    }
    return undefined
  }, [items])

  // Get all items (tasks/notes) that are inside a given directory
  const getItemsInDirectory = useCallback((dirPath: string): VaultItem[] => {
    return Array.from(items.values()).filter(item => {
      if (item.meta.type === 'task' || item.meta.type === 'note') {
        return path.dirname(item.path) === dirPath
      }
      return false
    })
  }, [items])

  const deleteProject = useCallback(async (projectPath: string) => {
    // Find the project item
    const projectItem = findProjectByDirPath(projectPath)
    if (!projectItem || projectItem.meta.type !== 'project') {
      throw new Error('Project not found')
    }

    // Track items to remove from state
    const itemsToRemove: string[] = [projectItem.id]

    // Get all items in this project
    const projectItems = getItemsInDirectory(projectPath)

    // Delete all tasks/notes in the project
    for (const item of projectItems) {
      await deleteItem(item.path)
      itemsToRemove.push(item.id)
    }

    // Delete the project item itself
    await deleteItem(projectItem.path)

    // Delete the project directory from file system
    await window.api.deleteDirectory(projectPath)

    // Update state immediately for responsive UI
    setItems(prev => {
      const next = new Map(prev)
      for (const id of itemsToRemove) {
        next.delete(id)
      }
      rebuildSections(next)
      return next
    })
  }, [findProjectByDirPath, getItemsInDirectory, deleteItem, rebuildSections])

  const renameProject = useCallback(async (projectPath: string, newName: string): Promise<string> => {
    // Get project item before renaming (we need the current state)
    const projectItem = findProjectByDirPath(projectPath)

    // Rename directory on disk and get new path
    const newPath = await window.api.renameDirectory(projectPath, newName)

    // Update all items in state with new paths
    setItems(prev => {
      const next = new Map<string, VaultItem>()

      for (const [id, item] of prev) {
        if (item.path.startsWith(projectPath)) {
          // Replace old path prefix with new path
          const newItemPath = item.path.replace(projectPath, newPath)

          if (item.meta.type === 'project') {
            // Project item: update id (which is the directory path), path, and title
            next.set(newPath, {
              ...item,
              id: newPath,
              path: newItemPath,
              title: newName,
              meta: { ...item.meta, name: newName } as typeof item.meta,
            })
          } else {
            // Task/note: just update path
            next.set(id, { ...item, path: newItemPath })
          }
        } else {
          next.set(id, item)
        }
      }

      rebuildSections(next)
      return next
    })

    // Also update the _project.md file with new title
    if (projectItem && projectItem.meta.type === 'project') {
      const newProjectPath = path.join(newPath, '_project.md')
      await window.api.writeFile(newProjectPath, {
        ...projectItem,
        id: newPath,
        path: newProjectPath,
        title: newName,
        meta: { ...projectItem.meta, name: newName } as typeof projectItem.meta,
      })
    }

    return newPath
  }, [rebuildSections, findProjectByDirPath])

  const updateSortOrders = useCallback(async (updates: Array<{ itemPath: string; newOrder: number }>) => {
    if (updates.length === 0) return

    const itemsByPath = new Map<string, VaultItem>()
    for (const item of items.values()) {
      itemsByPath.set(item.path, item)
    }

    const modifiedAt = new Date().toISOString()
    const updatedItems: VaultItem[] = updates.map(({ itemPath, newOrder }) => {
      const item = findProjectByDirPath(itemPath) ?? itemsByPath.get(itemPath)
      if (!item) {
        throw new Error('Item not found')
      }
      return {
        ...item,
        meta: {
          ...item.meta,
          sort_order: newOrder,
          modified: modifiedAt,
        } as ItemMeta,
      }
    })

    // Update local state in one batch to avoid intermediate reorders.
    setItems(prev => {
      const next = new Map(prev)
      for (const item of updatedItems) {
        next.set(item.id, item)
      }
      rebuildSections(next)
      return next
    })

    await Promise.all(updatedItems.map(item => updateItem(item)))
  }, [findProjectByDirPath, items, rebuildSections, updateItem])

  const updateSortOrder = useCallback(async (itemPath: string, newOrder: number) => {
    await updateSortOrders([{ itemPath, newOrder }])
  }, [updateSortOrders])

  const setProjectSection = useCallback(async (projectPath: string, sectionName: string | null, projectItem?: VaultItem) => {
    const resolvedProjectItem = projectItem ?? findProjectByDirPath(projectPath)
    if (!resolvedProjectItem || resolvedProjectItem.meta.type !== 'project') return

    const currentMeta = resolvedProjectItem.meta as ProjectMeta
    const updatedMeta: ProjectMeta = {
      ...currentMeta,
      modified: new Date().toISOString(),
    }

    // Set or remove section
    if (sectionName) {
      updatedMeta.section = sectionName
    } else {
      delete updatedMeta.section
    }

    const updatedItem: VaultItem = { ...resolvedProjectItem, meta: updatedMeta }

    const nextSectionOrder = sectionName
      ? sectionOrder.some(name => name.toLowerCase() === sectionName.toLowerCase())
        ? sectionOrder
        : [...sectionOrder, sectionName]
      : sectionOrder

    let updatedItems: Map<string, VaultItem> | null = null
    setItems(prev => {
      const next = new Map(prev)
      next.set(resolvedProjectItem.id, updatedItem)
      updatedItems = next
      rebuildSections(next, nextSectionOrder)
      return next
    })

    await window.api.writeFile(updatedItem.path, updatedItem)
    if (nextSectionOrder !== sectionOrder) {
      await persistSectionOrder(nextSectionOrder, updatedItems ?? new Map(items))
    }
  }, [findProjectByDirPath, items, rebuildSections, persistSectionOrder, sectionOrder])

  const createProject = useCallback(async (name: string, sectionName?: string | null) => {
    if (!vaultPath) throw new Error('No vault path set')
    const project = await createItem('project', vaultPath, name)
    const trimmedSection = sectionName?.trim()
    if (!trimmedSection) {
      return project
    }
    await setProjectSection(path.dirname(project.path), trimmedSection, project)
    return project
  }, [vaultPath, createItem, setProjectSection])

  const renameSection = useCallback(async (oldName: string, newName: string) => {
    const trimmed = newName.trim()
    if (!trimmed || oldName === trimmed) return

    if (oldName.toLowerCase() === defaultSectionName.toLowerCase()) {
      const trimmedLower = trimmed.toLowerCase()
      const hasConflict = sectionOrder.some(name => name.toLowerCase() === trimmedLower)
        || Array.from(items.values()).some(item => {
          if (item.meta.type !== 'project') return false
          return (item.meta as ProjectMeta).section?.toLowerCase() === trimmedLower
        })
      if (hasConflict) return
      await persistDefaultSectionName(trimmed)
      return
    }

    const updates: VaultItem[] = []
    const oldNameLower = oldName.toLowerCase()
    let nextSections = sectionOrder.map(name => name.toLowerCase() === oldNameLower ? trimmed : name)
    if (!nextSections.some(name => name.toLowerCase() === trimmed.toLowerCase())) {
      nextSections = [...nextSections, trimmed]
    }
    nextSections = normalizeSectionOrder(nextSections)

    let updatedItems: Map<string, VaultItem> | null = null
    setItems(prev => {
      const next = new Map(prev)
      for (const [id, item] of prev) {
        if (item.meta.type === 'project') {
          const projectMeta = item.meta as ProjectMeta
          if (projectMeta.section === oldName) {
            const updatedItem: VaultItem = {
              ...item,
              meta: { ...projectMeta, section: trimmed, modified: new Date().toISOString() },
            }
            next.set(id, updatedItem)
            updates.push(updatedItem)
          }
        }
      }
      updatedItems = next
      rebuildSections(next, nextSections)
      return next
    })

    // Persist all updates
    for (const item of updates) {
      await window.api.writeFile(item.path, item)
    }
    await persistSectionOrder(nextSections, updatedItems ?? new Map(items))
  }, [defaultSectionName, items, persistDefaultSectionName, persistSectionOrder, rebuildSections, sectionOrder])

  const deleteSection = useCallback(async (sectionName: string) => {
    if (sectionName.toLowerCase() === defaultSectionName.toLowerCase()) return
    const updates: VaultItem[] = []
    const sectionNameLower = sectionName.toLowerCase()
    const nextSections = normalizeSectionOrder(
      sectionOrder.filter(name => name.toLowerCase() !== sectionNameLower)
    )

    let updatedItems: Map<string, VaultItem> | null = null
    setItems(prev => {
      const next = new Map(prev)
      for (const [id, item] of prev) {
        if (item.meta.type === 'project') {
          const projectMeta = item.meta as ProjectMeta
          if (projectMeta.section === sectionName) {
            const { section: _section, ...restMeta } = projectMeta
            const updatedItem: VaultItem = {
              ...item,
              meta: { ...restMeta, modified: new Date().toISOString() } as ProjectMeta,
            }
            next.set(id, updatedItem)
            updates.push(updatedItem)
          }
        }
      }
      updatedItems = next
      rebuildSections(next, nextSections)
      return next
    })

    // Persist all updates
    for (const item of updates) {
      await window.api.writeFile(item.path, item)
    }
    await persistSectionOrder(nextSections, updatedItems ?? new Map(items))
  }, [defaultSectionName, items, persistSectionOrder, rebuildSections, sectionOrder])

  const getAllSectionNames = useCallback((): string[] => {
    const names = new Set<string>()
    names.add(defaultSectionName)
    for (const name of sectionOrder) {
      if (name.trim()) names.add(name)
    }
    for (const item of items.values()) {
      if (item.meta.type === 'project') {
        const section = (item.meta as ProjectMeta).section
        if (section) names.add(section)
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [defaultSectionName, items, sectionOrder])

  useEffect(() => {
    const unsubChanged = window.api.onFileChanged((item) => {
      setItems(prev => {
        const next = new Map(prev)
        next.set(item.id, item)
        rebuildSections(next)
        return next
      })
    })

    const unsubAdded = window.api.onFileAdded((item) => {
      setItems(prev => {
        const next = new Map(prev)
        next.set(item.id, item)
        rebuildSections(next)
        return next
      })
    })

    const unsubDeleted = window.api.onFileDeleted((deletedPath) => {
      setItems(prev => {
        const next = new Map(prev)
        for (const [id, item] of next) {
          if (item.path === deletedPath) {
            next.delete(id)
            break
          }
        }
        rebuildSections(next)
        return next
      })
    })

    return () => {
      unsubChanged()
      unsubAdded()
      unsubDeleted()
    }
  }, [vaultPath, rebuildSections])

  // Build conflict dialog props from state
  const conflictDialogProps: ConflictDialogProps | null = conflictState
    ? {
        open: true,
        item: conflictState.item,
        message: 'This file was modified outside the app. You can discard your changes and reload, or overwrite with your version.',
        onReload: () => conflictState.resolve('reload'),
        onOverwrite: () => conflictState.resolve('overwrite'),
      }
    : null

  return (
    <VaultContext.Provider
      value={{
        items,
        sections,
        sectionOrder,
        defaultSectionName,
        tree,
        loading,
        vaultPath,
        loadVault,
        initializeVault,
        createItem,
        updateItem,
        moveItem,
        deleteItem,
        duplicateItem,
        convertItem,
        createProject,
        renameProject,
        getItemsByParent,
        getTodayTasks,
        getNext7DaysTasks,
        getInboxItems,
        createSubtask,
        getSubtasks,
        deleteProject,
        updateSortOrder,
        updateSortOrders,
        addSection,
        reorderSections,
        setProjectSection,
        renameSection,
        deleteSection,
        getAllSectionNames,
        conflictDialogProps,
      }}
    >
      {children}
    </VaultContext.Provider>
  )
}

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider')
  }
  return context
}
