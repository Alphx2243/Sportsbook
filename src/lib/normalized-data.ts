import { randomUUID } from 'crypto'

const IST_TIME_ZONE = 'Asia/Kolkata'
const IST_OFFSET_MINUTES = 330

export async function resolveSportByName(tx: any, sportName: string) {
  const sport = await tx.sport.findUnique({ where: { name: sportName } })
  if (!sport) throw new Error('Sport not found.')
  return sport
}

export function dateToDateString(value: Date | string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

export function dateToTimeString(value: Date | string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).format(new Date(value))
}

export function parseBookingDateTime(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hour = 0, minute = 0, second = 0] = time.split(':').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - IST_OFFSET_MINUTES * 60 * 1000)
}

export function getISTDayRange(date: string) {
  const start = parseBookingDateTime(date, '00:00:00')
  return {
    gte: start,
    lt: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  }
}

export async function resolveCourtByNo(tx: any, sportId: string, courtNo?: string | null) {
  if (!courtNo || courtNo === '0') return null
  const courtNumber = Number(courtNo)
  const filters: any[] = [{ name: courtNo }]
  if (Number.isFinite(courtNumber)) filters.push({ courtNumber })
  return tx.court.findFirst({
    where: {
      sportId,
      OR: filters,
    },
  })
}

export function withBookingDisplay(booking: any) {
  const sportName = booking.sport?.name || ''
  const courtNo = booking.court?.courtNumber?.toString() || booking.court?.name || null
  const startAt = booking.startAt ? new Date(booking.startAt) : null
  const endAt = booking.endAt ? new Date(booking.endAt) : null
  const { displayStartAt, displayEndAt } = normalizeLegacyShiftedActiveBooking(booking.status, startAt, endAt)
  return {
    ...booking,
    startAt: displayStartAt,
    endAt: displayEndAt,
    sportName,
    courtNo,
    date: displayStartAt ? dateToDateString(displayStartAt) : '',
    startTime: displayStartAt ? dateToTimeString(displayStartAt) : '',
    endTime: displayEndAt ? dateToTimeString(displayEndAt) : '',
    endDate: displayEndAt ? dateToDateString(displayEndAt) : null,
  }
}

function normalizeLegacyShiftedActiveBooking(status: string | undefined, startAt: Date | null, endAt: Date | null) {
  const affectedStatus = status === 'active' || status === 'returned'
  const looksShiftedIntoFuture = startAt && startAt.getTime() - Date.now() > 5 * 60 * 1000
  if (!affectedStatus || !looksShiftedIntoFuture) {
    return { displayStartAt: startAt, displayEndAt: endAt }
  }

  const offset = IST_OFFSET_MINUTES * 60 * 1000
  return {
    displayStartAt: new Date(startAt.getTime() - offset),
    displayEndAt: endAt ? new Date(endAt.getTime() - offset) : null,
  }
}

export function withMatchDisplay(match: any) {
  return { ...match, sportName: match.sport?.name || '' }
}

export function withApplicationDisplay(application: any) {
  return { ...application, sportName: application.sport?.name || '' }
}

export function withInviteDisplay(invite: any) {
  const scheduledAt = invite.scheduledAt ? new Date(invite.scheduledAt) : null
  return {
    ...invite,
    sport: invite.sportRef?.name || invite.sport?.name || '',
    date: scheduledAt ? dateToDateString(scheduledAt) : '',
    time: scheduledAt ? dateToTimeString(scheduledAt) : '',
  }
}

export async function syncUserSportExperiences(tx: any, userId: string, experiences?: string[]) {
  if (!experiences) return

  await tx.userSportExperience.deleteMany({ where: { userId } })

  for (const rawExperience of experiences) {
    const [rawSportName, rawLevel] = String(rawExperience).split(':')
    const sportName = rawSportName?.trim()
    if (!sportName) continue

    const sport = await tx.sport.findUnique({ where: { name: sportName } })
    if (!sport) continue
    await tx.userSportExperience.create({
      data: {
        id: randomUUID(),
        userId,
        sportId: sport.id,
        level: rawLevel?.trim() || null,
      },
    })
  }
}

export function withUserDisplay(user: any) {
  const sportsExperience = Array.isArray(user.sportExperiences)
    ? user.sportExperiences.map((experience: any) => {
      const name = experience.sport?.name
      return experience.level ? `${name}:${experience.level}` : name
    }).filter(Boolean)
    : []
  return { ...user, sportsExperience }
}

export async function syncCourtsForSport(tx: any, sportId: string, numberOfCourts: number, courtData?: unknown) {
  const courtNames = Array.isArray(courtData)
    ? courtData.map((item: any, index: number) => String(item).split(':')[0] || `Court ${index + 1}`)
    : Array.from({ length: numberOfCourts }, (_, index) => `Court ${index + 1}`)

  const activeNames = courtNames.slice(0, numberOfCourts)
  await tx.court.updateMany({ where: { sportId, name: { notIn: activeNames } }, data: { isActive: false } })

  for (let index = 0; index < activeNames.length; index++) {
    const name = activeNames[index]
    const parsedNumber = Number(String(name).replace(/\D/g, '')) || index + 1
    await tx.court.upsert({
      where: { sportId_name: { sportId, name } },
      update: { courtNumber: parsedNumber, isActive: true },
      create: {
        id: randomUUID(),
        sportId,
        name,
        courtNumber: parsedNumber,
        isActive: true,
      },
    })
  }
}

export async function withSportAvailability(tx: any, sport: any) {
  const activeBookings = await tx.booking.findMany({
    where: { sportId: sport.id, status: { in: ['pending', 'active', 'returned'] } },
    select: { courtId: true, numberOfPlayers: true },
  })
  const occupiedCourtIds = new Set(activeBookings.map((booking: any) => booking.courtId).filter(Boolean))
  const courts = sport.courts || []
  const courtData = courts.map((court: any) => `${court.name}:${occupiedCourtIds.has(court.id) ? '1' : '0'}`)
  const numPlayers = activeBookings.reduce((sum: number, booking: any) => sum + (booking.numberOfPlayers || 0), 0)
  return {
    ...sport,
    courtsInUse: occupiedCourtIds.size,
    numPlayers,
    courtData,
  }
}
