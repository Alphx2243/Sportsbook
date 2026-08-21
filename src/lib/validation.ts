// done
import { normalizeRole } from '@/lib/roles'

const BOOKING_STATUSES = new Set(['pending', 'active', 'returned', 'expired', 'completed'])
const MATCH_STATUSES = new Set(['live', 'upcoming', 'finished'])

export function requiredString(value: unknown, field: string, maxLength = 255): string {
  if (typeof value !== 'string') throw new Error(`${field} is required.`)
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${field} is required.`)
  if (trimmed.length > maxLength) throw new Error(`${field} is too long.`)
  return trimmed
}

export function optionalString(value: unknown, field: string, maxLength = 255): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return requiredString(value, field, maxLength)
}

export function requiredEmail(value: unknown): string {
  const email = requiredString(value, 'Email', 320).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email is invalid.')
  return email
}

export function positiveInt(value: unknown, field: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${field} must be a positive integer.`)
  return parsed
}

export function nonNegativeInt(value: unknown, field: string, fallback?: number): number {
  if ((value === undefined || value === null || value === '') && fallback !== undefined) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${field} must be a non-negative integer.`)
  return parsed
}

export function bookingStatus(value: unknown): string {
  if (typeof value !== 'string' || !BOOKING_STATUSES.has(value)) throw new Error('Invalid booking status.')
  return value
}

export function roleValue(value: unknown): string {
  return normalizeRole(value)
}

export function matchStatus(value: unknown): string {
  return typeof value === 'string' && MATCH_STATUSES.has(value) ? value : 'live'
}

export function equipmentIssues(value: unknown): Array<{ name: string; count: number }> {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const [name, count] = requiredString(item, 'Equipment', 200).split(':')
    return {
      name: requiredString(name, 'Equipment name', 100),
      count: positiveInt(count, 'Equipment count'),
    }
  })
}


export function equipmentList(value: unknown): Array<{ name: string; total: number }> {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const [name, total] = requiredString(item, 'Equipment', 200).split(':')
    return {
      name: requiredString(name, 'Equipment name', 100),
      total: nonNegativeInt(total, 'Equipment total', 0),
    }
  })
}

