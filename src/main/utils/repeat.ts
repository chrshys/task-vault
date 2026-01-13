import { addDays, addWeeks, addMonths, addYears } from 'date-fns'
import type { RepeatConfig } from '../../shared/types'

export function calculateNextDue(config: RepeatConfig, fromDate: Date): Date {
  const { frequency, interval } = config

  switch (frequency) {
    case 'daily':
      return addDays(fromDate, interval)
    case 'weekly':
      return addWeeks(fromDate, interval)
    case 'monthly':
      return addMonths(fromDate, interval)
    case 'yearly':
      return addYears(fromDate, interval)
    default:
      return fromDate
  }
}

export function getRepeatDescription(config: RepeatConfig | null | undefined): string {
  if (!config) return ''

  const { frequency, interval, from } = config
  const freqMap: Record<string, [string, string]> = {
    daily: ['day', 'days'],
    weekly: ['week', 'weeks'],
    monthly: ['month', 'months'],
    yearly: ['year', 'years'],
  }

  const [singular, plural] = freqMap[frequency] || ['', '']
  const intervalStr = interval === 1 ? singular : `${interval} ${plural}`
  const fromStr = from === 'completion_date' ? 'after completion' : ''

  return `Every ${intervalStr} ${fromStr}`.trim()
}
