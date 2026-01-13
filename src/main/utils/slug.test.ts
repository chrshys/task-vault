import { describe, it, expect } from 'vitest'
import { slugify, createFilename } from './slug'

describe('slugify', () => {
  it('converts title to lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('removes special characters', () => {
    expect(slugify('Test: A Thing!')).toBe('test-a-thing')
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })

  it('trims and collapses whitespace', () => {
    expect(slugify('  Too   Many   Spaces  ')).toBe('too-many-spaces')
  })

  it('truncates long slugs', () => {
    const longTitle = 'a'.repeat(100)
    expect(slugify(longTitle).length).toBeLessThanOrEqual(50)
  })
})

describe('createFilename', () => {
  it('creates filename with id and slug', () => {
    expect(createFilename('abc1', 'Hello World')).toBe('abc1-hello-world.md')
  })

  it('handles empty title', () => {
    expect(createFilename('abc1', '')).toBe('abc1.md')
  })
})
