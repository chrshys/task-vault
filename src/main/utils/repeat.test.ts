import { describe, it, expect } from 'vitest'
import { calculateNextDue, getRepeatDescription } from './repeat'
import type { RepeatConfig } from '../../shared/types'

describe('calculateNextDue', () => {
  const baseDate = new Date('2024-01-15')

  it('calculates next daily due date', () => {
    const config: RepeatConfig = { frequency: 'daily', interval: 1, from: 'due_date' }
    const next = calculateNextDue(config, baseDate)
    expect(next.toISOString().slice(0, 10)).toBe('2024-01-16')
  })

  it('calculates next weekly due date', () => {
    const config: RepeatConfig = { frequency: 'weekly', interval: 1, from: 'due_date' }
    const next = calculateNextDue(config, baseDate)
    expect(next.toISOString().slice(0, 10)).toBe('2024-01-22')
  })

  it('handles interval > 1', () => {
    const config: RepeatConfig = { frequency: 'daily', interval: 3, from: 'due_date' }
    const next = calculateNextDue(config, baseDate)
    expect(next.toISOString().slice(0, 10)).toBe('2024-01-18')
  })
})

describe('getRepeatDescription', () => {
  it('returns empty string for null', () => {
    expect(getRepeatDescription(null)).toBe('')
  })

  it('describes daily repeat', () => {
    const config: RepeatConfig = { frequency: 'daily', interval: 1, from: 'due_date' }
    expect(getRepeatDescription(config)).toBe('Every day')
  })

  it('describes weekly repeat with interval', () => {
    const config: RepeatConfig = { frequency: 'weekly', interval: 2, from: 'due_date' }
    expect(getRepeatDescription(config)).toBe('Every 2 weeks')
  })

  it('includes completion date info', () => {
    const config: RepeatConfig = { frequency: 'daily', interval: 1, from: 'completion_date' }
    expect(getRepeatDescription(config)).toBe('Every day after completion')
  })
})
