import matter from 'gray-matter'
import type { ItemMeta, VaultItem } from '../../shared/types'
import { extractId } from './id'
import path from 'path'

export function parseFile(filePath: string, fileContent: string): VaultItem | null {
  try {
    const { data, content } = matter(fileContent)
    const meta = data as ItemMeta
    const filename = path.basename(filePath)
    const id = extractId(filename) || filename.replace('.md', '')

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

  return matter.stringify(body, meta)
}
