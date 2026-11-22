// done
import { PublicError } from './public-error.js'
import { normalizeRole } from '@/lib/roles'
import { isBookingPlayerCount, MAX_BOOKING_PLAYERS } from '@/lib/facility-rules'

const BOOKING_STATUSES = new Set(['pending', 'active', 'returned', 'expired', 'completed'])
const MATCH_STATUSES = new Set(['live', 'upcoming', 'finished'])
const SPORT_TYPES = new Set(['public', 'private'])

export function requiredString(value: unknown, field: string, maxLength = 255): string {
  if (typeof value !== 'string') throw new PublicError(`${field} is required.`)
  const trimmed = value.trim()
  if (!trimmed) throw new PublicError(`${field} is required.`)
  if (trimmed.length > maxLength) throw new PublicError(`${field} is too long.`)
  return trimmed
}

export function optionalString(value: unknown, field: string, maxLength = 255): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return requiredString(value, field, maxLength)
}

export function requiredEmail(value: unknown): string {
  const email = requiredString(value, 'Email', 320).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new PublicError('Email is invalid.')
  return email
}

export function positiveInt(value: unknown, field: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) throw new PublicError(`${field} must be a positive integer.`)
  return parsed
}

export function bookingPlayerCount(value: unknown): number {
  const players = positiveInt(value, 'Number of players')
  if (!isBookingPlayerCount(players)) throw new PublicError(`A booking can include at most ${MAX_BOOKING_PLAYERS} players.`)
  return players
}

export function nonNegativeInt(value: unknown, field: string, fallback?: number): number {
  if ((value === undefined || value === null || value === '') && fallback !== undefined) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) throw new PublicError(`${field} must be a non-negative integer.`)
  return parsed
}

export function bookingStatus(value: unknown): string {
  if (typeof value !== 'string' || !BOOKING_STATUSES.has(value)) throw new PublicError('Invalid booking status.')
  return value
}

export function roleValue(value: unknown): string {
  return normalizeRole(value)
}

export function matchStatus(value: unknown): string {
  return typeof value === 'string' && MATCH_STATUSES.has(value) ? value : 'live'
}

export function sportTypeValue(value: unknown): 'public' | 'private' {
  if (typeof value !== 'string' || !SPORT_TYPES.has(value)) throw new PublicError('Sport type must be public or private.')
  return value as 'public' | 'private'
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

