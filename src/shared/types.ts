/**
 * Key used to identify the default section.
 * Using a dedicated constant instead of empty string to avoid falsy-check bugs.
 */
export const DEFAULT_SECTION_KEY = '__default__'

export type ItemType = 'project' | 'task' | 'note'
export type TaskStatus = 'pending' | 'completed'
export type RepeatFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type RepeatFrom = 'due_date' | 'completion_date'
export type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'

export interface RepeatConfig {
  frequency: RepeatFrequency
  interval: number
  from: RepeatFrom
  days?: DayOfWeek[]
  day_of_month?: number
}

export interface BaseMeta {
  type: ItemType
  created: string
  modified?: string
}

export interface ProjectMeta extends BaseMeta {
  type: 'project'
  name: string
  icon?: string
  color?: string
  sort_order?: number
  section?: string
}

export interface TaskMeta extends BaseMeta {
  type: 'task'
  status: TaskStatus
  due?: string
  reminder?: string // deprecated, keep for backwards compat
  reminders?: number[] // array of offsets in minutes (0 = at due time)
  repeat?: RepeatConfig | null
  parent?: string | null
  completed_at?: string
  previous_instance?: string
  sort_order?: number
}

export interface NoteMeta extends BaseMeta {
  type: 'note'
  reminder?: string
  repeat?: RepeatConfig | null
  parent?: string | null
  sort_order?: number
}

export type ItemMeta = ProjectMeta | TaskMeta | NoteMeta

export interface VaultItem {
  id: string
  path: string
  meta: ItemMeta
  content: string
  title: string
}

export interface VaultProject extends VaultItem {
  meta: ProjectMeta
}

export interface VaultTask extends VaultItem {
  meta: TaskMeta
}

export interface VaultNote extends VaultItem {
  meta: NoteMeta
}

export type VaultItemUnion = VaultProject | VaultTask | VaultNote

export interface AppSettings {
  vaultPath: string | null
  theme: 'light' | 'dark' | 'system'
  showCompleted: boolean
  defaultReminder: number
  startOnLogin: boolean
  showInMenuBar: boolean
}

export interface VaultConfig {
  version: number
  created: string
  sections?: string[]
  defaultSectionName?: string
}

export type ViewType = 'today' | 'next7' | 'inbox' | 'project' | 'section'

export interface TreeNode {
  id: string
  name: string
  type: ItemType
  path: string
  children: TreeNode[]
  count?: number
  sortOrder?: number
  sectionName?: string
}

export interface SectionGroup {
  name: string
  isDefault: boolean
  projects: TreeNode[]
}
