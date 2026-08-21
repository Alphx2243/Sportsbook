'use server'

import prisma from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from '@/interfaces'
import { fail, ok } from '@/lib/action-response'
import { ensureRoles } from '@/lib/auth-utils'
import { ROLES } from '@/lib/roles'
import { equipmentList, nonNegativeInt, requiredString } from '@/lib/validation'
import { dateToDateString, dateToTimeString, getISTDayRange, parseBookingDateTime, syncCourtsForSport, withSportAvailability } from '@/lib/normalized-data'
import { notifySportUpdate } from '@/lib/socket-notify'

async function withSportView(sport: any) {
    const { Equipment, ...rest } = sport
    const withAvailability = await withSportAvailability(prisma, rest)
    return { ...withAvailability, equipments: Equipment || [] }
}

export async function getSports(): Promise<ActionResponse<{ documents: any[], total: number }>> {
    try {
        const sports = await prisma.sport.findMany({
            orderBy: { name: 'asc' },
            include: { Equipment: true, courts: { where: { isActive: true }, orderBy: { courtNumber: 'asc' } } }
        })
        const documents = await Promise.all(sports.map(withSportView))
        return ok({ documents, total: documents.length })
    }
    catch (error: any) {
        console.error('Get sports error:', error);
        return fail(error, 'Failed to get sports')
    }
}

export async function getSport(id: string): Promise<ActionResponse> {
    try {
        const sport = await prisma.sport.findUnique({
            where: { id },
            include: { Equipment: true, courts: { where: { isActive: true }, orderBy: { courtNumber: 'asc' } } },
        })
        if (!sport) return fail(new Error('Sport not found'))
        return ok(await withSportView(sport))
    }
    catch (error: any) {
        console.error('Get sport error:', error);
        return fail(error, 'Failed to get sport')
    }
}

export async function getSportAnalytics(sportName: string): Promise<ActionResponse> {
    try {
        const safeSportName = requiredString(sportName, 'Sport name')
        const today = new Date();
        const dates = Array.from({ length: 7 }, (_: unknown, i: number) => {
            const d = new Date(today);
            d.setDate(today.getDate() - (6 - i));
            return dateToDateString(d);
        });
        const startRange = getISTDayRange(dates[0]);
        const endRange = getISTDayRange(dates[dates.length - 1]);

        const bookings = await prisma.booking.findMany({
            where: {
                sport: { name: safeSportName },
                startAt: { gte: startRange.gte, lt: endRange.lt }
            }
        });

        const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Kolkata' });
        const weeklyAttendance = dates.map((date: string) => {
            const dayName = dayFormatter.format(parseBookingDateTime(date, '12:00:00'));
            const dayBookings = bookings.filter((b: any) => dateToDateString(b.startAt) === date);
            const totalPlayers = dayBookings.reduce((sum: number, b: any) => sum + (b.numberOfPlayers || 0), 0);
            return { day: dayName, Students: totalPlayers };
        });

        const timeSlots = ["06-08", "08-10", "10-12", "12-14", "14-16", "16-18", "18-20", "20-22"];
        const peakHours = timeSlots.map((slot: string) => {
            const [startHour, endHour] = slot.split('-').map(Number);
            const slotBookings = bookings.filter((b: any) => {
                const hour = Number(dateToTimeString(b.startAt).split(':')[0]);
                return hour >= startHour && hour < endHour;
            });
            const totalUsersInSlot = slotBookings.reduce((sum: number, b: any) => sum + (b.numberOfPlayers || 0), 0);
            return { time: slot, Users: Math.round(totalUsersInSlot / 7) };
        });

        return ok({ weeklyAttendance, peakHours });
    }
    catch (error: any) {
        console.error('Get sport analytics error:', error);
        return fail(error, 'Failed to get analytics');
    }
}

export async function createSport(data: any): Promise<ActionResponse> {
    try {
        await ensureRoles([ROLES.ADMIN, ROLES.FACILITY_MANAGER])
        const equipments = equipmentList(data.totalEquipments)
        const numberOfCourts = nonNegativeInt(data.courts, 'Number of courts')
        const sport = await prisma.$transaction(async (tx: any) => {
            const createdSport = await tx.sport.create({
                data: {
                    name: requiredString(data.name, 'Sport name'),
                    numberOfCourts,
                    maxCapacity: data.maxCapacity ? nonNegativeInt(data.maxCapacity, 'Max capacity') : null,
                    Equipment: {
                        create: equipments.map((eq) => ({
                            id: randomUUID(),
                            name: eq.name,
                            total: eq.total,
                            inUse: 0,
                            updatedAt: new Date()
                        }))
                    }
                },
                include: { Equipment: true }
            })
            await syncCourtsForSport(tx, createdSport.id, numberOfCourts, data.CourtData)
            return createdSport
        })
        revalidatePath('/')
        revalidatePath('/admin/sports')
        await notifySportUpdate(sport.name)
        return ok(sport)
    }
    catch (error: any) {
        console.error('Create sport error:', error)
        return fail(error, 'Failed to create sport')
    }
}

