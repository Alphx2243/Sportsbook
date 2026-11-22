import { after } from 'next/server'
import prisma from './prisma'
import { expireOverdueBookings } from './booking-state'

let nextCleanupAt = 0

export function scheduleBookingMaintenance() {
    if (Date.now() < nextCleanupAt) return
    nextCleanupAt = Infinity
    after(async () => {
        try {
            await expireOverdueBookings(prisma)
        } catch {
            console.error('Background booking expiry failed')
        } finally {
            nextCleanupAt = Date.now() + 60_000
        }
    })
}
