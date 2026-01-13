import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { VaultItem, VaultTask, TreeNode, ItemType, ItemMeta, TaskMeta, NoteMeta, RepeatConfig } from '@shared/types'
import path from 'path-browserify'

interface VaultContextValue {
  items: Map<string, VaultItem>
  tree: TreeNode[]
  loading: boolean
  vaultPath: string | null
  loadVault: (path: string) => Promise<void>
  initializeVault: (path: string) => Promise<void>
  createItem: (type: ItemType, folder: string, title: string, dueDate?: Date | null, repeat?: RepeatConfig | null) => Promise<VaultItem>
  updateItem: (item: VaultItem) => Promise<void>
  deleteItem: (path: string) => Promise<void>
  duplicateItem: (item: VaultItem) => Promise<VaultItem>
  convertItem: (item: VaultItem, toType: 'task' | 'note') => Promise<void>
  createProject: (name: string) => Promise<VaultItem>
  renameProject: (projectPath: string, newName: string) => Promise<string>
  getItemsByParent: (parentId: string | null) => VaultItem[]
  getTodayTasks: () => VaultItem[]
  getNext7DaysTasks: () => VaultItem[]
  getInboxItems: () => VaultItem[]
  createSubtask: (parentId: string, title: string, dueDate?: Date | null, repeat?: RepeatConfig | null) => Promise<VaultItem | null>
  getSubtasks: (parentId: string) => VaultTask[]
  deleteProject: (projectPath: string) => Promise<void>
  updateSortOrder: (itemPath: string, newOrder: number) => Promise<void>
}

const VaultContext = createContext<VaultContextValue | null>(null)

function buildTree(items: Map<string, VaultItem>): TreeNode[] {
  const projects: TreeNode[] = []
  const projectMap = new Map<string, TreeNode>()

  // First pass: create project nodes
  items.forEach((item) => {
    if (item.meta.type === 'project') {
      const dirPath = path.dirname(item.path)
      const node: TreeNode = {
        id: item.id,
        name: item.title,
        type: 'project',
        path: dirPath,
        children: [],
        count: 0,
      }
      projectMap.set(dirPath, node)
      projects.push(node)
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

  // Sort alphabetically by name
  return projects.sort((a, b) => a.name.localeCompare(b.name))
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Map<string, VaultItem>>(new Map())
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [vaultPath, setVaultPath] = useState<string | null>(null)

  const rebuildTree = useCallback((itemsMap: Map<string, VaultItem>) => {
    setTree(buildTree(itemsMap))
  }, [])

  const loadVault = useCallback(async (folderPath: string) => {
    setLoading(true)
    const loadedItems = await window.api.loadVault(folderPath)
    const itemsMap = new Map(loadedItems.map(item => [item.id, item]))
    setItems(itemsMap)
    setVaultPath(folderPath)
    rebuildTree(itemsMap)
    setLoading(false)
  }, [rebuildTree])

  const initializeVault = useCallback(async (folderPath: string) => {
    setLoading(true)
    const loadedItems = await window.api.initializeVault(folderPath)
    const itemsMap = new Map(loadedItems.map(item => [item.id, item]))
    setItems(itemsMap)
    setVaultPath(folderPath)
    rebuildTree(itemsMap)
    setLoading(false)
  }, [rebuildTree])

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
      rebuildTree(next)
      return next
    })
    return item
  }, [vaultPath, rebuildTree])

  const updateItem = useCallback(async (item: VaultItem) => {
    await window.api.writeFile(item.path, item)
  }, [])

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

  const createProject = useCallback(async (name: string) => {
    if (!vaultPath) throw new Error('No vault path set')
    return createItem('project', vaultPath, name)
  }, [vaultPath, createItem])

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
      rebuildTree(next)
      return next
    })
  }, [findProjectByDirPath, getItemsInDirectory, deleteItem, vaultPath, rebuildTree])

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

      rebuildTree(next)
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
  }, [rebuildTree, findProjectByDirPath])

  const updateSortOrder = useCallback(async (itemPath: string, newOrder: number) => {
    // Try finding by directory path first (for projects)
    let item = findProjectByDirPath(itemPath)

    // If not found, try finding by file path (for tasks/notes)
    if (!item) {
      item = Array.from(items.values()).find(i => i.path === itemPath)
    }

    if (!item) {
      throw new Error('Item not found')
    }

    const updatedItem: VaultItem = {
      ...item,
      meta: {
        ...item.meta,
        sort_order: newOrder,
        modified: new Date().toISOString(),
      } as ItemMeta,
    }

    // Update local state immediately for responsive UI
    setItems(prev => {
      const next = new Map(prev)
      next.set(updatedItem.id, updatedItem)
      rebuildTree(next)
      return next
    })

    // Then persist to disk
    await updateItem(updatedItem)
  }, [findProjectByDirPath, updateItem, vaultPath, rebuildTree, items])

  useEffect(() => {
    const unsubChanged = window.api.onFileChanged((item) => {
      setItems(prev => {
        const next = new Map(prev)
        next.set(item.id, item)
        rebuildTree(next)
        return next
      })
    })

    const unsubAdded = window.api.onFileAdded((item) => {
      setItems(prev => {
        const next = new Map(prev)
        next.set(item.id, item)
        rebuildTree(next)
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
        rebuildTree(next)
        return next
      })
    })

    return () => {
      unsubChanged()
      unsubAdded()
      unsubDeleted()
    }
  }, [vaultPath, rebuildTree])

  return (
    <VaultContext.Provider
      value={{
        items,
        tree,
        loading,
        vaultPath,
        loadVault,
        initializeVault,
        createItem,
        updateItem,
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
