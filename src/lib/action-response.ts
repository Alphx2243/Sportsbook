// done
import type { ActionResponse } from '@/interfaces'
import { PublicError } from './public-error.js'

export function ok<T>(data: T): ActionResponse<T> {
  return { success: true, data }
}

export function fail(error: unknown, fallback = 'Request failed'): ActionResponse<never> {
  if (error instanceof PublicError) return { success: false, error: error.message }
  const reference = crypto.randomUUID()
  console.error('Server action failed', { reference, operation: fallback })
  return { success: false, error: `${fallback}. Reference: ${reference}` }
}

export function forbidden(message = 'Unauthorized.'): never {
  throw new PublicError(message)
}

