export async function restoreBookingEquipment(tx: any, bookingId: string) {
  const bookingEquipments = await tx.bookingEquipment.findMany({ where: { bookingId } })
  for (const be of bookingEquipments) {
    await tx.equipment.update({
      where: { id: be.equipmentId },
      data: { inUse: { decrement: be.count } },
    })
  }
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
