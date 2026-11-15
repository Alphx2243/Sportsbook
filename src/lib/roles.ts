export const ROLES = {
  USER: 'user',
  ADMIN: 'Admin',
  GUARD: 'guard',
  FACILITY_MANAGER: 'facility_manager',
} as const

export type AppRole = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<AppRole, string> = {
  [ROLES.USER]: 'User',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.GUARD]: 'Guard',
  [ROLES.FACILITY_MANAGER]: 'Facility Manager',
}

export const ROLE_OPTIONS = [
  { value: ROLES.USER, label: ROLE_LABELS[ROLES.USER] },
  { value: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN] },
  { value: ROLES.GUARD, label: ROLE_LABELS[ROLES.GUARD] },
  { value: ROLES.FACILITY_MANAGER, label: ROLE_LABELS[ROLES.FACILITY_MANAGER] },
] as const

export const ADMIN_NAV_LINKS = [
  { name: 'Overview', path: '/admin', roles: [ROLES.ADMIN] },
  { name: 'Scanner', path: '/booking-scanner', roles: [ROLES.ADMIN, ROLES.GUARD] },
  { name: 'Bookings', path: '/admin/bookings', roles: [ROLES.ADMIN, ROLES.GUARD] },
  { name: 'Users', path: '/admin/users', roles: [ROLES.ADMIN] },
  { name: 'Sports & Facilities', path: '/admin/sports', roles: [ROLES.ADMIN, ROLES.FACILITY_MANAGER] },
  { name: 'Match Scoring', path: '/admin/matches', roles: [ROLES.ADMIN, ROLES.FACILITY_MANAGER] },
  { name: 'Gym Scanner', path: '/gym-scanner', roles: [ROLES.ADMIN, ROLES.GUARD] },
] as const

export function normalizeRole(role: unknown): AppRole {
  if (typeof role !== 'string') return ROLES.USER

  const normalized = role.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (normalized === 'admin') return ROLES.ADMIN
  if (normalized === 'guard') return ROLES.GUARD
  if (normalized === 'facility_manager' || normalized === 'facilitymanager') return ROLES.FACILITY_MANAGER
  return ROLES.USER
}

export function isPortalRole(role: unknown): boolean {
  const normalizedRole = normalizeRole(role)
  return normalizedRole === ROLES.ADMIN || normalizedRole === ROLES.GUARD || normalizedRole === ROLES.FACILITY_MANAGER
}

export function getDefaultRouteForRole(role: unknown): string {
  const normalizedRole = normalizeRole(role)
  if (normalizedRole === ROLES.ADMIN) return '/admin'
  if (normalizedRole === ROLES.GUARD) return '/booking-scanner'
  if (normalizedRole === ROLES.FACILITY_MANAGER) return '/admin/sports'
  return '/dashboard'
}

export function canAccessAdminPath(role: unknown, pathname: string): boolean {
  const normalizedRole = normalizeRole(role)
  if (normalizedRole === ROLES.ADMIN) return true

  return ADMIN_NAV_LINKS.some((link) => {
    const matchesPath = pathname === link.path || pathname.startsWith(`${link.path}/`)
    return matchesPath && (link.roles as readonly AppRole[]).includes(normalizedRole)
  })
}

export function getAdminNavLinks(role: unknown) {
  const normalizedRole = normalizeRole(role)
  return ADMIN_NAV_LINKS.filter((link) => (link.roles as readonly AppRole[]).includes(normalizedRole))
}
