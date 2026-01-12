export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

export function createFilename(id: string, title: string): string {
  const slug = slugify(title)
  return slug ? `${id}-${slug}.md` : `${id}.md`
}
