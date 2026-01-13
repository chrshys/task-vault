import { customAlphabet } from 'nanoid'

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz'
const nanoid = customAlphabet(alphabet, 4)

export function generateId(): string {
  return nanoid()
}

export function extractId(filename: string): string | null {
  const match = filename.match(/^([a-z0-9]{4})-/)
  return match ? match[1] : null
}

export function isValidId(id: string): boolean {
  return /^[a-z0-9]{4}$/.test(id)
}
