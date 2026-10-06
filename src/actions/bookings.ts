// done
'use server'

import prisma, { interactiveTransactionOptions } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { ActionResponse, CreateBookingInput, UpdateBookingInput } from '@/interfaces'
import { fail, ok } from '@/lib/action-response'
import { bookingUserSelect, ensureAdmin, ensureRoles, ensureSelfOrAdmin, requireUser } from '@/lib/auth-utils'
import { normalizeRole, ROLES } from '@/lib/roles'
import { bookingStatus, equipmentIssues, positiveInt, requiredString } from '@/lib/validation'
import { createBookingQrPayload, parseBookingQrPayload, verifyBookingQrPayload } from '@/lib/booking-qr'
import { dateToDateString, dateToTimeString, getISTDayRange, parseBookingDateTime, resolveCourtByNo, resolveSportByName, withBookingDisplay } from '@/lib/normalized-data'
import { expireOverdueBookings, restoreBookingEquipment } from '@/lib/booking-state'
// import { notifySportUpdate } from '@/lib/socket-notify'
import { formatISTTime, getISTDate } from '@/lib/utils'

export async function createBooking(data: CreateBookingInput): Promise<ActionResponse> {
    try {
        await ensureSelfOrAdmin(data.userId)
        const result = await prisma.$transaction(async (tx: any) => {
            await expireOverdueBookings(tx)
            await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${data.userId} FOR UPDATE`;

            await assertNoActiveGymSession(tx, data.userId)

            const existingBooking = await tx.booking.findFirst({
                where: {
                    userId: data.userId,
                    status: { in: ['pending', 'active', 'returned', 'expired'] }
                }
            })

            if (existingBooking) {
                const msg = existingBooking.status === 'active' || existingBooking.status === 'returned' || existingBooking.status === 'expired'
                    ? 'You already have an active booking.'
                    : 'You already have a pending booking.';
                throw new Error(`${msg} Please complete it before booking again.`)
            }

            const [sport]: any = await tx.$queryRaw`SELECT * FROM "Sport" WHERE "name" = ${requiredString(data.sportName, 'Sport name')} FOR UPDATE`;
            if (!sport) throw new Error('Sport not found.')
            const numPlayers = positiveInt(data.numberOfPlayers, 'Number of players')
            await assertSportAvailability(tx, sport, data.CourtNo ?? undefined, numPlayers)
            const court = await resolveCourtByNo(tx, sport.id, data.CourtNo)
            const booking = await tx.booking.create({
                data: normalizeBookingCreateData({ ...data, numberOfPlayers: numPlayers }, sport.id, court?.id),
                include: { sport: true, court: true },
            })
            return await tx.booking.update({
                where: { id: booking.id },
                data: buildSignedQrUpdate(booking, data.qrdetail),
                include: { sport: true, court: true },
            })
        }, interactiveTransactionOptions)
        revalidateAvailabilityPaths()
        // await notifySportUpdate(data.sportName, 'availability_changed');
        return ok(withBookingDisplay(result))
    }
    catch (error: any) {
        console.error('Create booking error:', error)
        return fail(error, 'Failed to create booking')
    }
}

export async function updateBooking(id: string, data: UpdateBookingInput): Promise<ActionResponse> {
    try {
        const existing = await assertBookingAccess(id)
        const updateData: any = {
            userId: data.userId !== undefined ? requiredString(data.userId, 'User ID') : undefined,
            numberOfPlayers: data.numberOfPlayers ? positiveInt(data.numberOfPlayers, 'Number of players') : undefined,
            startAt: data.startTime !== undefined || data.date !== undefined
                ? parseBookingDateTime(data.date || dateToDateString(existing.startAt), data.startTime || dateToTimeString(existing.startAt))
                : undefined,
            endAt: data.endTime !== undefined || data.enddate !== undefined || data.date !== undefined
                ? parseBookingDateTime(data.enddate || data.date || dateToDateString(existing.endAt), data.endTime || dateToTimeString(existing.endAt))
                : undefined,
            scanned: data.scanned,
            qrDetail: data.qrdetail,
            status: data.status !== undefined ? bookingStatus(data.status) : undefined,
        }
        if (data.sportName || data.CourtNo !== undefined) {
            const sport = data.sportName ? await resolveSportByName(prisma, data.sportName) : await prisma.sport.findUnique({ where: { id: existing.sportId } })
            const court = await resolveCourtByNo(prisma, sport.id, data.CourtNo ?? existing.court?.courtNumber?.toString())
            updateData.sportId = sport.id
            updateData.courtId = court?.id || null
        }
        const booking = await prisma.booking.update({
            where: { id },
            data: updateData,
            include: { sport: true, court: true },
        })
        revalidateAvailabilityPaths()
        // await notifySportUpdate(data.sportName || existing.sport?.name, 'availability_changed');
        return ok(withBookingDisplay(booking))
    }
    catch (error: any) {
        console.error('Update booking error:', error)
        return fail(error, 'Failed to update booking')
    }
}

export async function deleteBooking(id: string): Promise<ActionResponse> {
    try {
        await assertBookingAccess(id)
        await prisma.$transaction(async (tx: any) => {
            const [booking]: any = await tx.$queryRaw`SELECT * FROM "Booking" WHERE "id" = ${id} FOR UPDATE`
            if (!booking) throw new Error('Booking not found')
            if (booking.status !== 'pending') throw new Error('Only a booking awaiting QR scan can be cancelled.')
            await restoreBookingEquipment(tx, id)
            await tx.booking.delete({ where: { id } })
        }, interactiveTransactionOptions)
        revalidateAvailabilityPaths()
        revalidatePath('/dashboard')
        // await notifySportUpdate(booking.sport?.name || '', 'availability_changed');
        return ok(null)
    }
    catch (error: any) {
        console.error('Delete booking error:', error)
        return fail(error, 'Failed to delete booking')
    }
}

export async function getBooking(id: string): Promise<ActionResponse> {
    try {
        const booking = await assertBookingAccess(id)
        return ok(withBookingDisplay(booking))
    }
    catch (error: any) {
        console.error('Get booking error:', error)
        return fail(error, 'Failed to get booking')
    }
}

export async function getBookings(filters: { userId?: string; status?: string; date?: string; timeRange?: string } = {}): Promise<ActionResponse<{ documents: any[], total: number }>> {
    try {
        const actor = await requireUser()
        const actorRole = normalizeRole(actor.role)
        const canManageBookings = actorRole === ROLES.ADMIN || actorRole === ROLES.GUARD
        if (filters.userId && !canManageBookings) {
            await ensureSelfOrAdmin(filters.userId)
        } else if (!filters.userId && !canManageBookings) {
            filters.userId = actor.id
        }

        const where: any = {}
        if (filters.userId) where.userId = filters.userId
        if (filters.status) where.status = bookingStatus(filters.status)
        if (filters.date) {
            const day = requiredString(filters.date, 'Date', 20)
            where.startAt = getISTDayRange(day)
        }
        if (filters.timeRange) {
            const day = filters.date || dateToDateString(new Date())
            const time = parseBookingDateTime(day, filters.timeRange)
            where.startAt = { ...(where.startAt || {}), lte: time }
            where.endAt = { gt: time }
        }
        const bookings = await prisma.booking.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: bookingUserSelect },
                BookingEquipment: { include: { Equipment: true } },
                sport: true,
                court: true,
            }
        })
        const documents = bookings.map(withBookingQrDisplay)
        return ok({ documents, total: documents.length })
    }
    catch (error: any) {
        console.error('Get bookings error:', error)
        return fail(error, 'Failed to get bookings')
    }
}

export async function extendBooking(bookingId: string, extensionMinutes: number): Promise<ActionResponse> {
    try {
        await assertBookingAccess(bookingId)
        const safeExtensionMinutes = positiveInt(extensionMinutes, 'Extension minutes')
        const updatedBooking = await prisma.$transaction(async (tx: any) => {
            const [booking]: any = await tx.$queryRaw`SELECT * FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`;
            if (!booking) throw new Error('Booking not found');

            const originalStartDate = new Date(booking.startAt);
            const currentEndDate = new Date(booking.endAt);
            const newEndDate = new Date(currentEndDate.getTime() + safeExtensionMinutes * 60000);
            const totalDurationMs = newEndDate.getTime() - originalStartDate.getTime();
            const totalDurationMinutes = totalDurationMs / (1000 * 60);

            if (totalDurationMinutes > 240) {
                throw new Error('Total booking duration cannot exceed 4 hours');
            }

            return await tx.booking.update({
                where: { id: bookingId },
                data: { endAt: newEndDate }
            });
        }, interactiveTransactionOptions);
        revalidateAvailabilityPaths()
        return ok(updatedBooking)
    }
    catch (error: any) {
        console.error('Extend booking error:', error)
        return fail(error, 'Failed to extend booking')
    }
}

export async function expireBooking(bookingId: string): Promise<ActionResponse> {
    try {
        await assertBookingAccess(bookingId)
        await prisma.$transaction(async (tx: any) => {
            const [booking]: any = await tx.$queryRaw`SELECT * FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`;
            if (!booking || (booking.status !== 'active' && booking.status !== 'pending')) {
                throw new Error('Booking not found or already inactive');
            }
            if (new Date(booking.endAt).getTime() > Date.now()) {
                throw new Error('Booking time has not ended yet.');
            }

            const [sportRow]: any = await tx.$queryRaw`SELECT * FROM "Sport" WHERE "id" = ${booking.sportId} FOR UPDATE`;
            if (!sportRow) throw new Error('Associated Sport not found');

            await tx.booking.update({ where: { id: bookingId }, data: { status: 'expired' } });

            if (booking.status === 'pending') {
                await restoreBookingEquipment(tx, bookingId);
            }
        }, interactiveTransactionOptions);
        revalidateAvailabilityPaths()
        revalidatePath('/dashboard')

        const bookingForSport: any = await prisma.booking.findUnique({ where: { id: bookingId }, include: { sport: true } });
        if (bookingForSport) {
            // await notifySportUpdate(bookingForSport.sport.name, 'availability_changed');
        }

        return ok(null)
    }
    catch (error: any) {
        console.error('Expire booking error:', error)
        return fail(error, 'Failed to expire booking')
    }
}

export async function completeBooking(bookingId: string): Promise<ActionResponse> {
    try {
        await ensureRoles([ROLES.ADMIN, ROLES.GUARD])
        const endedAt = getISTDate()
        await prisma.$transaction(async (tx: any) => {
            const [booking]: any = await tx.$queryRaw`SELECT * FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`;
            if (!booking || (booking.status !== 'returned' && booking.status !== 'expired' && booking.status !== 'active')) {
                throw new Error('Booking not found or cannot be completed');
            }

            const [sport]: any = await tx.$queryRaw`SELECT * FROM "Sport" WHERE "id" = ${booking.sportId} FOR UPDATE`;
            if (!sport) {
                throw new Error('Associated Sport not found');
            }

            await tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'completed',
                    endAt: booking.status === 'active' ? endedAt : undefined,
                }
            });
            if (booking.status === 'active' || booking.status === 'returned' || booking.scanned) {
                await restoreBookingEquipment(tx, bookingId);
            }
        }, interactiveTransactionOptions);

        revalidateAvailabilityPaths()
        revalidatePath('/dashboard')

        const bookingForSport: any = await prisma.booking.findUnique({ where: { id: bookingId }, include: { sport: true } });
        if (bookingForSport) {
            // await notifySportUpdate(bookingForSport.sport.name, 'availability_changed');
        }

        return ok(null)
    }
    catch (error: any) {
        console.error('Complete booking error:', error)
        return fail(error, 'Failed to complete booking')
    }
}

export async function requestReturn(bookingId: string): Promise<ActionResponse> {
    try {
        await assertBookingAccess(bookingId)
        const returnedAt = new Date()
        await prisma.$transaction(async (tx: any) => {
            const [booking]: any = await tx.$queryRaw`SELECT * FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`;
            if (!booking || booking.status !== 'active') {
                throw new Error('Booking not found or not active');
            }

            await tx.booking.update({
                where: { id: bookingId },
                data: { status: 'returned', endAt: returnedAt }
            });
        }, interactiveTransactionOptions);

        revalidateAvailabilityPaths()
        revalidatePath('/dashboard')

        const bookingForSport: any = await prisma.booking.findUnique({ where: { id: bookingId }, include: { sport: true } });
        if (bookingForSport) {
            // await notifySportUpdate(bookingForSport.sport.name, 'availability_changed');
        }

        return ok(null)
    }
    catch (error: any) {
        console.error('Request return error:', error)
        return fail(error, 'Failed to request return approval')
    }
}

export async function secureBooking(data: CreateBookingInput): Promise<ActionResponse> {
    try {
        await ensureSelfOrAdmin(data.userId)
        const issues = equipmentIssues(data.equipmentsIssued)
        const result = await prisma.$transaction(async (tx: any) => {
            await expireOverdueBookings(tx)
            await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${data.userId} FOR UPDATE`;

            await assertNoActiveGymSession(tx, data.userId)

            const existingBooking = await tx.booking.findFirst({
                where: { userId: data.userId, status: { in: ['pending', 'active', 'returned', 'expired'] } }
            })
            if (existingBooking) {
                const msg = existingBooking.status === 'active' || existingBooking.status === 'returned' || existingBooking.status === 'expired'
                    ? 'You already have an active booking.'
                    : 'You already have a pending booking.';
                throw new Error(`${msg} Please complete it before booking again.`)
            }

            const [sport]: any = await tx.$queryRaw`SELECT * FROM "Sport" WHERE "name" = ${data.sportName} FOR UPDATE`;
            if (!sport) throw new Error('Sport not found.')

            const numPlayers = positiveInt(data.numberOfPlayers, 'Number of players')
            const courtNo = data.CourtNo
            await assertSportAvailability(tx, sport, courtNo ?? undefined, numPlayers)

            const court = await resolveCourtByNo(tx, sport.id, data.CourtNo)
            const booking = await tx.booking.create({
                data: normalizeBookingCreateData({ ...data, numberOfPlayers: numPlayers }, sport.id, court?.id),
                include: { sport: true, court: true },
            });

            for (const issued of issues) {
                const equipment = await tx.equipment.findFirst({ where: { name: issued.name, sportId: sport.id } });
                if (!equipment) throw new Error(`Equipment '${issued.name}' not found for this sport.`);
                if (equipment.inUse + issued.count > equipment.total) throw new Error(`Not enough '${issued.name}' available.`);
                await tx.equipment.update({ where: { id: equipment.id }, data: { inUse: { increment: issued.count } } });
                await tx.bookingEquipment.create({
                    data: {
                        id: randomUUID(),
                        bookingId: booking.id,
                        equipmentId: equipment.id,
                        count: issued.count
                    }
                });
            }

            return await tx.booking.update({
                where: { id: booking.id },
                data: buildSignedQrUpdate(booking, data.qrdetail),
                include: { sport: true, court: true },
            });
        }, interactiveTransactionOptions)
        revalidateAvailabilityPaths()
        // await notifySportUpdate(data.sportName, 'availability_changed');
        return ok(withBookingDisplay(result))
    }
    catch (error: any) {
        console.error('Secure booking error:', error)
        return fail(error, 'Failed to create booking')
    }
}

export async function activateBooking(qrData: string): Promise<ActionResponse> {
    try {
        await ensureRoles([ROLES.ADMIN, ROLES.GUARD])
        let scannedPayload: ReturnType<typeof parseBookingQrPayload> | null = null
        let bookingId = ''
        try {
            scannedPayload = parseBookingQrPayload(qrData)
            bookingId = scannedPayload.bookingId
        } catch {
            bookingId = requiredString(qrData, 'Booking code', 100).trim()
            if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(bookingId)) {
                throw new Error('Invalid booking code.')
            }
        }
        const result = await prisma.$transaction(async (tx: any) => {
            const [booking]: any = await tx.$queryRaw`SELECT * FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`
            if (!booking) throw new Error('Booking not found')
            if (booking.status !== 'pending') throw new Error('Booking is not in pending state')
            if (new Date(booking.endAt).getTime() <= Date.now()) {
                await tx.booking.update({ where: { id: bookingId }, data: { status: 'expired' } })
                await restoreBookingEquipment(tx, bookingId)
                throw new Error('Booking expired before QR scan.')
            }
            if (scannedPayload) {
                verifyBookingQrPayload(qrData, {
                    bookingId: booking.id,
                    userId: booking.userId,
                    sportId: booking.sportId,
                    numberOfPlayers: booking.numberOfPlayers,
                    startAt: booking.startAt,
                    endAt: booking.endAt,
                    courtId: booking.courtId,
                    qrHash: booking.qrHash,
                })
            }

            const start = new Date(booking.startAt)
            const end = new Date(booking.endAt)
            const durationMs = end.getTime() - start.getTime()
            const istNow = getISTDate()
            const istEnd = new Date(istNow.getTime() + durationMs)

            return tx.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'active',
                    scanned: true,
                    startAt: istNow,
                    endAt: istEnd,
                },
                include: { sport: true, court: true },
            })
        }, interactiveTransactionOptions)

        revalidateAvailabilityPaths()
        revalidatePath('/admin/bookings')
        // await notifySportUpdate(result.sport.name, 'availability_changed')
        return ok(withBookingDisplay(result))
    } catch (error: any) {
        console.error('Activate booking error:', error)
        return fail(error, 'Failed to activate booking')
    }
}

export async function AddGymQRLog(UserGymId: string): Promise<ActionResponse> {
    try {
        await ensureRoles([ROLES.ADMIN, ROLES.GUARD])
        const now = getISTDate()
        const result = await prisma.$transaction(async (tx: any) => {
            await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${UserGymId} FOR UPDATE`
            const existingLog = await tx.gymLog.findFirst({
                where: {
                    userId: UserGymId,
                    status: { in: ['active'] }
                }
            })
            if (existingLog) {
                const durationHours = parseFloat(((now.getTime() - new Date(existingLog.entryTime).getTime()) / (1000 * 60 * 60)).toFixed(2))
                const log = await tx.gymLog.update({
                    where: { id: existingLog.id },
                    data: {
                        status: 'completed',
                        exitTime: now,
                        duration: durationHours,
                        updatedAt: now,
                    }
                })
                return withGymScanDisplay('finished', log)
            }

            const conflictingBooking = await tx.booking.findFirst({
                where: { userId: UserGymId, status: { in: ['pending', 'active', 'returned', 'expired'] } },
                select: { id: true },
            })
            if (conflictingBooking) {
                throw new Error('This student already has an unfinished sports booking.')
            }

            const log = await tx.gymLog.create({
                data: {
                    id: randomUUID(),
                    userId: UserGymId,
                    entryTime: now,
                    status: 'active',
                    createdAt: now,
                    updatedAt: now,
                }
            })
            return withGymScanDisplay('created', log)
        }, interactiveTransactionOptions)
        revalidatePath('/gym-scanner')
        revalidatePath('/dashboard')
        revalidatePath('/rto')
        return ok(result)
    }
    catch (error: any) {
        console.error('Error in AddGymQRLog: ', error)
        return fail(error, 'Failed to process gym QR')
    }
}

async function assertBookingAccess(bookingId: string) {
    const user = await requireUser()
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { sport: true, court: true } })
    if (!booking) throw new Error('Booking not found')
    const role = normalizeRole(user.role)
    if (user.id !== booking.userId && role !== ROLES.ADMIN && role !== ROLES.GUARD) throw new Error('Unauthorized.')
    return booking
}

function revalidateAvailabilityPaths() {
    revalidatePath('/')
    revalidatePath('/book-court')
    revalidatePath('/rto')
    revalidatePath('/admin/sports')
}

async function assertSportAvailability(tx: any, sport: any, courtNo: string | undefined, numPlayers: number) {
    const activeBookings = await tx.booking.findMany({ where: { sportId: sport.id, status: { in: ['pending', 'active', 'returned'] } } })
    if (sport.maxCapacity && sport.maxCapacity > 0) {
        const alreadyBookedPlayers = activeBookings.reduce((sum: number, booking: any) => sum + (booking.numberOfPlayers || 0), 0)
        if (alreadyBookedPlayers + numPlayers > sport.maxCapacity) throw new Error('Facility is full!')
        return
    }

    if (!courtNo) throw new Error('Please select a court.')
    const requestedCourt = await resolveCourtByNo(tx, sport.id, courtNo)
    if (!requestedCourt?.isActive) throw new Error('Court is not available!')
    if (activeBookings.some((booking: any) => booking.courtId === requestedCourt.id)) throw new Error('Court already booked!')
}

async function assertNoActiveGymSession(tx: any, userId: string) {
    const activeGymSession = await tx.gymLog.findFirst({
        where: { userId, status: 'active' },
        select: { id: true },
    })
    if (activeGymSession) {
        throw new Error('You cannot make a sports booking while your Gym session is active. Please scan out of the Gym first.')
    }
}

function withGymScanDisplay(action: 'created' | 'finished', log: any) {
    const entry = formatISTTime(new Date(log.entryTime))
    const exit = log.exitTime ? formatISTTime(new Date(log.exitTime)) : null

    return {
        action,
        message: action === 'created' ? 'Gym booking created' : 'Gym booking finished',
        id: log.id,
        status: log.status,
        entryDate: entry.date,
        entryTime: entry.time,
        exitDate: exit?.date || null,
        exitTime: exit?.time || null,
        duration: log.duration ? `${log.duration} h` : null,
    }
}

function normalizeBookingCreateData(data: CreateBookingInput, sportId?: string, courtId?: string | null) {
    return {
        userId: requiredString(data.userId, 'User ID'),
        sportId,
        courtId,
        numberOfPlayers: positiveInt(data.numberOfPlayers, 'Number of players'),
        startAt: parseBookingDateTime(requiredString(data.date, 'Date', 20), requiredString(data.startTime, 'Start time', 20)),
        endAt: parseBookingDateTime(requiredString(data.enddate || data.date, 'End date', 20), requiredString(data.endTime, 'End time', 20)),
        qrDetail: data.qrdetail,
        status: bookingStatus(data.status),
    }
}

function buildSignedQrUpdate(booking: any, qrDetail?: string) {
    const payload = createBookingQrPayload({
        bookingId: booking.id,
        userId: booking.userId,
        sportId: booking.sportId,
        numberOfPlayers: booking.numberOfPlayers,
        startAt: booking.startAt,
        endAt: booking.endAt,
        courtId: booking.courtId,
    })

    return {
        qrDetail: JSON.stringify(payload),
        qrHash: payload.h,
    }
}

function withBookingQrDisplay(booking: any) {
    const displayBooking = withBookingDisplay(booking)
    const payload = createBookingQrPayload({
        bookingId: booking.id,
        userId: booking.userId,
        sportId: booking.sportId,
        numberOfPlayers: booking.numberOfPlayers,
        startAt: booking.startAt,
        endAt: booking.endAt,
        courtId: booking.courtId,
    })

    return {
        ...displayBooking,
        qrDetail: JSON.stringify(payload),
    }
}
