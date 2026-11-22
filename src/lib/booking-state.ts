import type { Prisma } from '@prisma/client'
import { PublicError } from './public-error.js'

export function outstandingBookingFilter(userId: string): Prisma.BookingWhereInput {
  return { userId, OR: [
    { status: { in: ['pending', 'active', 'returned'] } },
    { status: 'expired', scanned: true, sport: { sportType: 'private' } },
  ] }
}

export function bookingDurationMs(startAt: Date, endAt: Date) {
  const duration = endAt.getTime() - startAt.getTime()
  if (!Number.isFinite(duration) || duration <= 0) throw new PublicError('End time must be after start time.')
  if (duration > 4 * 60 * 60 * 1000) throw new PublicError('Total booking duration cannot exceed 4 hours.')
  return duration
}

export function extendedBookingEnd(booking: { status: string; startAt: Date; endAt: Date }, minutes: number, now = new Date()) {
  if (booking.status !== 'active' || booking.endAt <= now) throw new PublicError('Only an active booking can be extended.')
  const endAt = new Date(booking.endAt.getTime() + minutes * 60_000)
  bookingDurationMs(booking.startAt, endAt)
  return endAt
}

export async function restoreBookingEquipment(tx: any, bookingId: string) {
  const bookingEquipments = await tx.bookingEquipment.findMany({
    where: { bookingId, issued: true },
    orderBy: { equipmentId: 'asc' },
  })
  for (const be of bookingEquipments) {
    const released = await tx.bookingEquipment.updateMany({
      where: { id: be.id, issued: true },
      data: { issued: false },
    })
    if (!released.count) continue
    await tx.equipment.update({
      where: { id: be.equipmentId },
      data: { inUse: { decrement: be.count } },
    })
  }
}

export async function issueBookingEquipment(tx: any, bookingId: string) {
  const bookingEquipments = await tx.bookingEquipment.findMany({
    where: { bookingId, issued: false },
    orderBy: { equipmentId: 'asc' },
  })
  for (const be of bookingEquipments) {
    const [equipment]: any = await tx.$queryRaw`SELECT * FROM "Equipment" WHERE "id" = ${be.equipmentId} FOR UPDATE`
    if (!hasEquipmentCapacity(equipment, be.count)) {
      throw new PublicError(`Not enough equipment available for this booking.`)
    }
    await tx.equipment.update({ where: { id: equipment.id }, data: { inUse: { increment: be.count } } })
    await tx.bookingEquipment.update({ where: { id: be.id }, data: { issued: true } })
  }
}

export function hasEquipmentCapacity(equipment: { inUse: number; total: number } | null, count: number) {
  return equipment !== null && equipment.inUse + count <= equipment.total
}

export async function expireOverdueBookings(db: any, now = new Date(), userId?: string) {
  const scope = userId ? { userId } : {}
  const overduePendingBookings = await db.booking.findMany({
    take: 50,
    where: { ...scope, status: 'pending', endAt: { lte: now } },
    select: { id: true },
    orderBy: { id: 'asc' },
  })

  for (const booking of overduePendingBookings) {
    const expire = async (tx: any) => {
      const changed = await tx.booking.updateMany({
        where: { id: booking.id, status: 'pending', endAt: { lte: now } },
        data: { status: 'expired' },
      })
      if (changed.count) await restoreBookingEquipment(tx, booking.id)
    }
    // Booking creation already supplies a transaction client.
    if (db.$transaction) await db.$transaction(expire)
    else await expire(db)
  }

  await db.booking.updateMany({
    limit: 50,
    where: { ...scope, status: 'active', endAt: { lte: now } },
    data: { status: 'expired' },
  })
}
