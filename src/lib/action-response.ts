// done
import type { ActionResponse } from '@/interfaces'

export function ok<T>(data: T): ActionResponse<T> {
  return { success: true, data }
}

export function fail(error: unknown, fallback = 'Request failed'): ActionResponse<never> {
  const message = error instanceof Error && error.message ? error.message : fallback
  return { success: false, error: message }
}

export function forbidden(message = 'Unauthorized.'): never {
  throw new Error(message)
}

