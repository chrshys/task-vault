import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { VaultItem, VaultTask, TreeNode, ItemType, ItemMeta, TaskMeta, NoteMeta, FolderMeta, ProjectMeta, RepeatConfig } from '@shared/types'
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
  createFolder: (name: string, parentPath?: string) => Promise<VaultItem>
  createProject: (name: string, parentPath?: string) => Promise<VaultItem>
  getItemsByParent: (parentId: string | null) => VaultItem[]
  getTodayTasks: () => VaultItem[]
  getNext7DaysTasks: () => VaultItem[]
  getInboxItems: () => VaultItem[]
  createSubtask: (parentId: string, title: string, dueDate?: Date | null, repeat?: RepeatConfig | null) => Promise<VaultItem | null>
  getSubtasks: (parentId: string) => VaultTask[]
  ungroupFolder: (folderPath: string) => Promise<void>
  deleteProject: (projectPath: string) => Promise<void>
  moveProject: (projectPath: string, targetFolderPath: string) => Promise<void>
  createFolderWithProjects: (folderName: string, projectPaths: string[]) => Promise<VaultItem>
  updateSortOrder: (itemPath: string, newOrder: number) => Promise<void>
}

const VaultContext = createContext<VaultContextValue | null>(null)

function buildTree(items: Map<string, VaultItem>, vaultPath: string): TreeNode[] {
  const tree: TreeNode[] = []
  const folderMap = new Map<string, TreeNode>()
  // Track sort_order for each node path
  const sortOrderMap = new Map<string, number>()

  items.forEach((item) => {
    if (item.meta.type === 'folder' || item.meta.type === 'project') {
      const dirPath = path.dirname(item.path)
      const meta = item.meta as FolderMeta | ProjectMeta
      const node: TreeNode = {
        id: item.id,
        name: item.title,
        type: item.meta.type,
        path: dirPath,
        children: [],
        count: 0,
      }
      folderMap.set(dirPath, node)
      sortOrderMap.set(dirPath, meta.sort_order ?? Infinity)
    }
  })

  items.forEach((item) => {
    if (item.meta.type === 'task' || item.meta.type === 'note') {
      const dirPath = path.dirname(item.path)
      const parentNode = folderMap.get(dirPath)
      if (parentNode) {
        parentNode.count = (parentNode.count || 0) + 1
      }
    }
  })

  folderMap.forEach((node, nodePath) => {
    const parentPath = path.dirname(nodePath)
    const parentNode = folderMap.get(parentPath)

    if (parentNode && parentPath !== nodePath) {
      parentNode.children.push(node)
    } else if (nodePath !== vaultPath && node.name !== 'Inbox') {
      tree.push(node)
    }
  })

  // Sort helper: by sort_order first, then alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      const orderA = sortOrderMap.get(a.path) ?? Infinity
      const orderB = sortOrderMap.get(b.path) ?? Infinity
      if (orderA !== orderB) return orderA - orderB
      return a.name.localeCompare(b.name)
    }).map(node => ({
      ...node,
      children: sortNodes(node.children)
    }))
  }

  return sortNodes(tree)
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Map<string, VaultItem>>(new Map())
  const [tree, setTree] = useState<TreeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [vaultPath, setVaultPath] = useState<string | null>(null)

  const rebuildTree = useCallback((itemsMap: Map<string, VaultItem>, vault: string) => {
    setTree(buildTree(itemsMap, vault))
  }, [])

  const loadVault = useCallback(async (folderPath: string) => {
    setLoading(true)
    const loadedItems = await window.api.loadVault(folderPath)
    const itemsMap = new Map(loadedItems.map(item => [item.id, item]))
    setItems(itemsMap)
    setVaultPath(folderPath)
    rebuildTree(itemsMap, folderPath)
    setLoading(false)
  }, [rebuildTree])

  const initializeVault = useCallback(async (folderPath: string) => {
    setLoading(true)
    const loadedItems = await window.api.initializeVault(folderPath)
    const itemsMap = new Map(loadedItems.map(item => [item.id, item]))
    setItems(itemsMap)
    setVaultPath(folderPath)
    rebuildTree(itemsMap, folderPath)
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
      if (vaultPath) rebuildTree(next, vaultPath)
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

  const createFolder = useCallback(async (name: string, parentPath?: string) => {
    const basePath = parentPath || vaultPath
    if (!basePath) throw new Error('No vault path set')
    return createItem('folder', basePath, name)
  }, [vaultPath, createItem])

  const createProject = useCallback(async (name: string, parentPath?: string) => {
    const basePath = parentPath || vaultPath
    if (!basePath) throw new Error('No vault path set')
    return createItem('project', basePath, name)
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
      if (item.meta.type === 'folder' || item.meta.type === 'project') return false
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

  // Find an item by its directory path (for folders/projects, path is the directory they represent)
  const findItemByDirPath = useCallback((dirPath: string): VaultItem | undefined => {
    for (const item of items.values()) {
      if (item.meta.type === 'folder' || item.meta.type === 'project') {
        // For folders/projects, the item's path is the .folder.md/.project.md file,
        // but the directory it represents is path.dirname(item.path)
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

  // Get all projects that are direct children of a folder
  const getProjectsInFolder = useCallback((folderPath: string): VaultItem[] => {
    return Array.from(items.values()).filter(item => {
      if (item.meta.type === 'project') {
        const projectDir = path.dirname(item.path)
        const parentDir = path.dirname(projectDir)
        return parentDir === folderPath
      }
      return false
    })
  }, [items])

  const ungroupFolder = useCallback(async (folderPath: string) => {
    if (!vaultPath) throw new Error('No vault path set')

    // Find the folder item
    const folderItem = findItemByDirPath(folderPath)
    if (!folderItem || folderItem.meta.type !== 'folder') {
      throw new Error('Folder not found')
    }

    // Track items to add/remove from state
    const itemsToRemove: string[] = [folderItem.id]
    const itemsToAdd: VaultItem[] = []

    // Get all projects in this folder
    const projects = getProjectsInFolder(folderPath)

    // Move each project to root (vaultPath)
    for (const project of projects) {
      const projectDir = path.dirname(project.path)
      const projectName = path.basename(projectDir)
      const newProjectDir = path.join(vaultPath, projectName)
      const newProjectPath = path.join(newProjectDir, '.project.md')

      // Update project item path
      const updatedProject: VaultItem = {
        ...project,
        id: newProjectDir,
        path: newProjectPath,
      }
      await updateItem(updatedProject)
      itemsToRemove.push(project.id)
      itemsToAdd.push(updatedProject)

      // Move all items inside the project
      const projectItems = getItemsInDirectory(projectDir)
      for (const item of projectItems) {
        const oldItemPath = item.path
        const itemName = path.basename(item.path)
        const newItemPath = path.join(newProjectDir, itemName)
        const updatedItem: VaultItem = {
          ...item,
          id: newItemPath, // Update ID to new path
          path: newItemPath,
        }
        await updateItem(updatedItem)
        await deleteItem(oldItemPath)
        itemsToRemove.push(item.id)
        itemsToAdd.push(updatedItem)
      }

      // Delete old project marker and directory
      await deleteItem(project.path)
      await window.api.deleteDirectory(projectDir)
    }

    // Delete the folder marker and directory
    await deleteItem(folderItem.path)
    await window.api.deleteDirectory(folderPath)

    // Update state immediately for responsive UI
    setItems(prev => {
      const next = new Map(prev)
      for (const id of itemsToRemove) {
        next.delete(id)
      }
      for (const item of itemsToAdd) {
        next.set(item.id, item)
      }
      if (vaultPath) rebuildTree(next, vaultPath)
      return next
    })
  }, [vaultPath, findItemByDirPath, getProjectsInFolder, getItemsInDirectory, updateItem, deleteItem, rebuildTree])

  const deleteProject = useCallback(async (projectPath: string) => {
    // Find the project item
    const projectItem = findItemByDirPath(projectPath)
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
      if (vaultPath) rebuildTree(next, vaultPath)
      return next
    })
  }, [findItemByDirPath, getItemsInDirectory, deleteItem, vaultPath, rebuildTree])

  const moveProject = useCallback(async (projectPath: string, targetFolderPath: string) => {
    // Find the project item
    const projectItem = findItemByDirPath(projectPath)
    if (!projectItem || projectItem.meta.type !== 'project') {
      throw new Error('Project not found')
    }

    const projectName = path.basename(projectPath)
    const newProjectDir = path.join(targetFolderPath, projectName)
    const newProjectFilePath = path.join(newProjectDir, '.project.md')

    // Track items to add/remove from state
    const itemsToRemove: string[] = [projectItem.id]
    const itemsToAdd: VaultItem[] = []

    // Update project item path and ID
    const updatedProject: VaultItem = {
      ...projectItem,
      id: newProjectDir,
      path: newProjectFilePath,
    }
    await updateItem(updatedProject)
    itemsToAdd.push(updatedProject)

    // Move all items inside the project
    const projectItems = getItemsInDirectory(projectPath)
    for (const item of projectItems) {
      const oldItemPath = item.path
      const itemName = path.basename(item.path)
      const newItemPath = path.join(newProjectDir, itemName)
      const updatedItem: VaultItem = {
        ...item,
        id: newItemPath, // Update ID to new path
        path: newItemPath,
      }
      await updateItem(updatedItem)
      await deleteItem(oldItemPath)

      itemsToRemove.push(item.id)
      itemsToAdd.push(updatedItem)
    }

    // Delete old project marker and directory
    await deleteItem(projectItem.path)
    await window.api.deleteDirectory(projectPath)

    // Update state immediately for responsive UI
    setItems(prev => {
      const next = new Map(prev)
      // Remove old items
      for (const id of itemsToRemove) {
        next.delete(id)
      }
      // Add updated items
      for (const item of itemsToAdd) {
        next.set(item.id, item)
      }
      if (vaultPath) rebuildTree(next, vaultPath)
      return next
    })
  }, [findItemByDirPath, getItemsInDirectory, updateItem, deleteItem, vaultPath, rebuildTree])

  const createFolderWithProjects = useCallback(async (folderName: string, projectPaths: string[]): Promise<VaultItem> => {
    if (!vaultPath) throw new Error('No vault path set')

    // Create the new folder at vault root
    const folder = await createFolder(folderName)

    // Move each specified project into the new folder
    const folderDir = path.dirname(folder.path)
    for (const projectPath of projectPaths) {
      await moveProject(projectPath, folderDir)
    }

    return folder
  }, [vaultPath, createFolder, moveProject])

  const updateSortOrder = useCallback(async (itemPath: string, newOrder: number) => {
    // Try finding by directory path first (for folders/projects)
    let item = findItemByDirPath(itemPath)

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
      if (vaultPath) rebuildTree(next, vaultPath)
      return next
    })

    // Then persist to disk
    await updateItem(updatedItem)
  }, [findItemByDirPath, updateItem, vaultPath, rebuildTree, items])

  useEffect(() => {
    const unsubChanged = window.api.onFileChanged((item) => {
      setItems(prev => {
        const next = new Map(prev)
        next.set(item.id, item)
        if (vaultPath) rebuildTree(next, vaultPath)
        return next
      })
    })

    const unsubAdded = window.api.onFileAdded((item) => {
      setItems(prev => {
        const next = new Map(prev)
        next.set(item.id, item)
        if (vaultPath) rebuildTree(next, vaultPath)
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
        if (vaultPath) rebuildTree(next, vaultPath)
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
        createFolder,
        createProject,
        getItemsByParent,
        getTodayTasks,
        getNext7DaysTasks,
        getInboxItems,
        createSubtask,
        getSubtasks,
        ungroupFolder,
        deleteProject,
        moveProject,
        createFolderWithProjects,
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
