import { describe, it, expect } from 'vitest'
import { generateId, isValidId, extractId } from './id'

describe('generateId', () => {
  it('generates 4-character alphanumeric ID', () => {
    const id = generateId()
    expect(id).toMatch(/^[a-z0-9]{4}$/)
  })

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})

describe('isValidId', () => {
  it('validates correct IDs', () => {
    expect(isValidId('a1b2')).toBe(true)
    expect(isValidId('0000')).toBe(true)
    expect(isValidId('zzzz')).toBe(true)
  })

  it('rejects invalid IDs', () => {
    expect(isValidId('ABC1')).toBe(false) // uppercase
    expect(isValidId('ab1')).toBe(false)  // too short
    expect(isValidId('ab123')).toBe(false) // too long
    expect(isValidId('ab-1')).toBe(false) // special char
  })
})

describe('extractId', () => {
  it('extracts ID from filename', () => {
    expect(extractId('a1b2-some-task.md')).toBe('a1b2')
  })

  it('returns null for invalid filename format', () => {
    expect(extractId('task.md')).toBe(null) // no hyphen after first 4 chars
    expect(extractId('AB12-task.md')).toBe(null) // uppercase not matched
    expect(extractId('abc-task.md')).toBe(null) // only 3 chars before hyphen
  })
})
