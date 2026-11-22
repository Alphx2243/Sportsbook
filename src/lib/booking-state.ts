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
      throw new Error(`Not enough equipment available for this booking.`)
    }
    await tx.equipment.update({ where: { id: equipment.id }, data: { inUse: { increment: be.count } } })
    await tx.bookingEquipment.update({ where: { id: be.id }, data: { issued: true } })
  }
}

export function hasEquipmentCapacity(equipment: { inUse: number; total: number } | null, count: number) {
  return equipment !== null && equipment.inUse + count <= equipment.total
}

export async function expireOverdueBookings(tx: any, now = new Date()) {
  const overduePendingBookings = await tx.booking.findMany({
    where: { status: 'pending', endAt: { lte: now } },
    select: { id: true },
  })

  for (const booking of overduePendingBookings) {
    await tx.booking.update({ where: { id: booking.id }, data: { status: 'expired' } })
    await restoreBookingEquipment(tx, booking.id)
  }

  await tx.booking.updateMany({
    where: { status: 'active', endAt: { lte: now } },
    data: { status: 'expired' },
  })
}
