// done
import { PublicError } from './public-error.js'
import prisma from '@/lib/prisma'
import { liveSessionFilter } from './session-key'
import { cookies } from 'next/headers'
import { withUserDisplay } from '@/lib/normalized-data'
import { AppRole, normalizeRole, ROLES } from '@/lib/roles'

export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  rollNumber: true,
  sportExperiences: { include: { sport: true } },
  qrCodePath: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

export const bookingUserSelect = {
  name: true,
  rollNumber: true,
} as const

export async function getCurrentSessionUser() {
  const cookieStore = await cookies()
  const session = cookieStore.get('session')
  if (!session) return null

  const record = await prisma.loginSession.findUnique({
    where: liveSessionFilter(session.value),
    select: { user: { select: publicUserSelect } },
  })
  return record ? withUserDisplay(record.user) : null
}

export async function requireUser() {
  const user = await getCurrentSessionUser()
  if (!user) throw new PublicError('Unauthorized.')
  return user
}

export async function ensureAdmin() {
  return ensureRoles([ROLES.ADMIN])
}

export async function ensureRoles(allowedRoles: AppRole[]) {
  const user = await requireUser()
  if (!allowedRoles.includes(normalizeRole(user.role))) throw new PublicError('Unauthorized: You do not have access to this area.')
  return user
}

export async function ensureSelfOrAdmin(userId: string) {
  const user = await requireUser()
  if (user.id !== userId && normalizeRole(user.role) !== ROLES.ADMIN) throw new PublicError('Unauthorized.')
  return user
}


