import matter from 'gray-matter'
import type { ItemMeta, VaultItem } from '../../shared/types'
import { extractId } from './id'
import path from 'path'

export function parseFile(filePath: string, fileContent: string): VaultItem | null {
  try {
    const { data, content } = matter(fileContent)
    const meta = data as ItemMeta
    const filename = path.basename(filePath)

    // For folders/projects, use the directory path as ID (guaranteed unique)
    // For tasks/notes, use ID from filename or frontmatter
    let id: string
    if (meta.type === 'folder' || meta.type === 'project') {
      id = path.dirname(filePath)
    } else {
      id = (data.id as string) || extractId(filename) || filename.replace('.md', '')
    }

    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1].trim() : meta.type === 'folder' || meta.type === 'project'
      ? (meta as { name: string }).name
      : filename.replace(/^[a-z0-9]{4}-/, '').replace('.md', '').replace(/-/g, ' ')

    const bodyContent = titleMatch
      ? content.replace(/^#\s+.+\n*/, '').trim()
      : content.trim()

    return {
      id,
      path: filePath,
      meta,
      content: bodyContent,
      title,
    }
  } catch (error) {
    console.error(`Failed to parse file: ${filePath}`, error)
    return null
  }
}

export function serializeFile(item: VaultItem): string {
  const { meta, content, title } = item

  const body = meta.type === 'task' || meta.type === 'note'
    ? `# ${title}\n\n${content}`
    : content

  // Folders/projects derive ID from directory path, no need to store in frontmatter
  return matter.stringify(body, meta)
}
