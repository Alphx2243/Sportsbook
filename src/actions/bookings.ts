// done
'use server'

import { PublicError } from '@/lib/public-error.js'
import prisma, { interactiveTransactionOptions } from '@/lib/prisma'
import { randomInt, randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { ActionResponse, CreateBookingInput } from '@/interfaces'
import { fail, ok } from '@/lib/action-response'
import { bookingUserSelect, ensureAdmin, ensureRoles, ensureSelfOrAdmin, requireUser } from '@/lib/auth-utils'
import { normalizeRole, ROLES } from '@/lib/roles'
import { bookingPlayerCount, bookingStatus, equipmentIssues, positiveInt, requiredString } from '@/lib/validation'
import { createBookingQrPayload, parseBookingQrPayload, verifyBookingQrPayload } from '@/lib/booking-qr'
import { dateToDateString, dateToTimeString, getISTDayRange, parseBookingDateTime, resolveCourtByNo, withBookingDisplay } from '@/lib/normalized-data'
import { scheduleBookingMaintenance } from '@/lib/booking-maintenance'
import { bookingDurationMs, extendedBookingEnd, outstandingBookingFilter, expireOverdueBookings, issueBookingEquipment, restoreBookingEquipment } from '@/lib/booking-state'
import { expireOverdueGymSessions, MAX_GYM_SESSION_MS } from '@/lib/gym-session'
import { hasAvailableCapacity, isCourtAvailable, isPublicSport } from '@/lib/facility-rules'
// import { notifySportUpdate } from '@/lib/socket-notify'
import { formatISTTime, getISTDate } from '@/lib/utils'

export async function createBooking(data: CreateBookingInput): Promise<ActionResponse> {
    return secureBooking(data)
}


export async function deleteBooking(id: string): Promise<ActionResponse> {
    try {
        await assertBookingAccess(id)
        await prisma.$transaction(async (tx: any) => {
            const [booking]: any = await tx.$queryRaw`SELECT * FROM "Booking" WHERE "id" = ${id} FOR UPDATE`
            if (!booking) throw new PublicError('Booking not found')
            if (booking.status !== 'pending') throw new PublicError('Only a booking awaiting QR scan can be cancelled.')
            await restoreBookingEquipment(tx, id)
            await tx.booking.delete({ where: { id } })
        }, interactiveTransactionOptions)
        revalidateAvailabilityPaths()
        revalidatePath('/dashboard')
        // await notifySportUpdate(booking.sport?.name || '', 'availability_changed');
        return ok(null)
    }
    catch (error: any) {
        return fail(error, 'Failed to delete booking')
    }
}

export async function getBooking(id: string): Promise<ActionResponse> {
    try {
        const booking = await assertBookingAccess(id)
        return ok(withBookingDisplay(booking))
    }
    catch (error: any) {
        return fail(error, 'Failed to get booking')
    }
}

export async function getDashboardBooking(): Promise<ActionResponse> {
    try {
        const { id: userId } = await requireUser()
        const [booking, gym] = await Promise.all([
            prisma.booking.findFirst({
                where: outstandingBookingFilter(userId),
                orderBy: { createdAt: 'desc' },
                include: { sport: true, court: true },
            }),
            prisma.gymLog.findFirst({
                where: { userId, status: 'active', exitTime: null, entryTime: { gt: new Date(Date.now() - MAX_GYM_SESSION_MS) } },
                orderBy: { entryTime: 'desc' },
                select: { id: true, status: true, entryTime: true },
            }),
        ])
        return ok({ booking: booking ? withBookingQrDisplay(booking) : null, gym })
    } catch (error) {
        return fail(error, 'Failed to load your current booking')
    }
}

export async function getBookings(filters: { userId?: string; status?: string; date?: string; timeRange?: string; scanner?: boolean } = {}): Promise<ActionResponse<{ documents: any[], total: number }>> {
    try {
        const actor = await requireUser()
        scheduleBookingMaintenance()
        const actorRole = normalizeRole(actor.role)
        const canManageBookings = actorRole === ROLES.ADMIN || actorRole === ROLES.GUARD
        if (filters.userId && !canManageBookings) {
            await ensureSelfOrAdmin(filters.userId)
        } else if (!filters.userId && !canManageBookings) {
            filters.userId = actor.id
        }

        const where: any = {}
        if (filters.scanner) where.OR = [
            { status: { in: ['pending', 'active', 'returned'] } },
            { status: 'expired', scanned: true },
        ]
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
            take: filters.scanner ? 20 : undefined,
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
        return fail(error, 'Failed to get bookings')
    }
}

export async function extendBooking(bookingId: string, extensionMinutes: number): Promise<ActionResponse> {
    try {
        await assertBookingAccess(bookingId)
        const safeExtensionMinutes = positiveInt(extensionMinutes, 'Extension minutes')
        const updatedBooking = await prisma.$transaction(async (tx: any) => {
            const [booking]: any = await tx.$queryRaw`SELECT * FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`;
            if (!booking) throw new PublicError('Booking not found');
            const sport = await tx.sport.findUnique({ where: { id: booking.sportId }, select: { sportType: true } })
            if (!sport) throw new PublicError('Sport not found.')
            if (isPublicSport(sport)) throw new PublicError('Public facility sessions are limited to two hours.')

            const newEndDate = extendedBookingEnd(booking, safeExtensionMinutes)
            return await tx.booking.update({
                where: { id: bookingId },
                data: { endAt: newEndDate }
            });
        }, interactiveTransactionOptions);
        revalidateAvailabilityPaths()
        return ok(updatedBooking)
    }
    catch (error: any) {
        return fail(error, 'Failed to extend booking')
    }
}

export async function expireBooking(bookingId: string): Promise<ActionResponse> {
    try {
        await assertBookingAccess(bookingId)
        await prisma.$transaction(async (tx: any) => {
            const [booking]: any = await tx.$queryRaw`SELECT * FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`;
            if (!booking || (booking.status !== 'active' && booking.status !== 'pending')) {
                throw new PublicError('Booking not found or already inactive');
            }
            if (new Date(booking.endAt).getTime() > Date.now()) {
                throw new PublicError('Booking time has not ended yet.');
            }

            const [sportRow]: any = await tx.$queryRaw`SELECT * FROM "Sport" WHERE "id" = ${booking.sportId} FOR UPDATE`;
            if (!sportRow) throw new PublicError('Associated Sport not found');

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
                throw new PublicError('Booking not found or cannot be completed');
            }

            const [sport]: any = await tx.$queryRaw`SELECT * FROM "Sport" WHERE "id" = ${booking.sportId} FOR UPDATE`;
            if (!sport) {
                throw new PublicError('Associated Sport not found');
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
                throw new PublicError('Booking not found or not active');
            }
            const sport = await tx.sport.findUnique({ where: { id: booking.sportId }, select: { sportType: true } })
            if (!sport) throw new PublicError('Sport not found.')
            if (isPublicSport(sport)) throw new PublicError('End public facility bookings directly instead.')

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
        return fail(error, 'Failed to request return approval')
    }
}

export async function endPublicBooking(bookingId: string): Promise<ActionResponse> {
    try {
        const booking = await assertBookingAccess(bookingId)
        if (!isPublicSport(booking.sport)) throw new PublicError('Only public facility bookings can be ended directly.')

        await prisma.$transaction(async (tx: any) => {
            const current = await tx.booking.findUnique({
                where: { id: bookingId },
                include: { sport: { select: { sportType: true } } },
            })
            if (!current || current.status !== 'active' || !isPublicSport(current.sport)) {
                throw new PublicError('Booking is not active.')
            }
            await tx.booking.update({
                where: { id: bookingId },
                data: { status: 'completed', endAt: getISTDate() },
            })
            await restoreBookingEquipment(tx, bookingId)
        }, interactiveTransactionOptions)

        revalidateAvailabilityPaths()
        revalidatePath('/dashboard')
        return ok(null)
    } catch (error: any) {
        return fail(error, 'Failed to end public facility booking')
    }
}

export async function secureBooking(data: CreateBookingInput): Promise<ActionResponse> {
    try {
        await ensureSelfOrAdmin(data.userId)
        const issues = equipmentIssues(data.equipmentsIssued)
        const result = await prisma.$transaction(async (tx: any) => {
            await expireOverdueBookings(tx, new Date(), data.userId)
            await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${data.userId} FOR UPDATE`;

            const existingBooking = await tx.booking.findFirst({
                where: outstandingBookingFilter(data.userId),
                select: { status: true },
            })
            if (existingBooking) {
                const msg = existingBooking.status === 'active' || existingBooking.status === 'returned' || existingBooking.status === 'expired'
                    ? 'You already have an active booking.'
                    : 'You already have a pending booking.';
                throw new PublicError(`${msg} Please complete it before booking again.`)
            }

            const [sport]: any = await tx.$queryRaw`SELECT * FROM "Sport" WHERE "name" = ${data.sportName} FOR UPDATE`;
            if (!sport) throw new PublicError('Sport not found.')

            const numPlayers = bookingPlayerCount(data.numberOfPlayers)
            assertPlayerCountForSport(sport, numPlayers)
            const courtNo = data.CourtNo
            await assertSportAvailability(tx, sport, courtNo ?? undefined)

            const court = isPublicSport(sport) ? null : await resolveCourtByNo(tx, sport.id, data.CourtNo)
            const now = getISTDate()
            const endAt = new Date(now.getTime() + 2 * 60 * 60 * 1000)
            const bookingData = isPublicSport(sport)
                ? {
                    ...data,
                    numberOfPlayers: numPlayers,
                    CourtNo: '0',
                    date: dateToDateString(now),
                    startTime: dateToTimeString(now),
                    enddate: dateToDateString(endAt),
                    endTime: dateToTimeString(endAt),
                    status: 'pending',
                }
                : { ...data, numberOfPlayers: numPlayers }
            const booking = await createBookingWithCode(tx, bookingData, sport.id, court?.id)

            for (const issued of issues) {
                const equipment = await tx.equipment.findFirst({ where: { name: issued.name, sportId: sport.id } });
                if (!equipment) throw new PublicError('Requested equipment was not found for this sport.');
                await tx.bookingEquipment.create({
                    data: {
                        id: randomUUID(),
                        bookingId: booking.id,
                        equipmentId: equipment.id,
                        count: issued.count,
                        issued: false,
                    }
                });
            }

            return await tx.booking.update({
                where: { id: booking.id },
                data: buildSignedQrUpdate(booking),
                include: { sport: true, court: true },
            });
        }, interactiveTransactionOptions)
        revalidateAvailabilityPaths()
        // await notifySportUpdate(data.sportName, 'availability_changed');
        return ok(withBookingDisplay(result))
    }
    catch (error: any) {
        return fail(error, 'Failed to create booking')
    }
}

export async function activateBooking(qrData: string): Promise<ActionResponse> {
    try {
        await ensureRoles([ROLES.ADMIN, ROLES.GUARD])
        let scannedPayload: ReturnType<typeof parseBookingQrPayload> | null = null
        let bookingId = ''
        let bookingCode = ''
        try {
            scannedPayload = parseBookingQrPayload(qrData)
            bookingId = scannedPayload.bookingId
        } catch {
            bookingCode = requiredString(qrData, 'Booking code', 4).trim()
            if (!/^\d{4}$/.test(bookingCode)) {
                throw new PublicError('Invalid booking code.')
            }
        }
        const result = await prisma.$transaction(async (tx: any) => {
            const [booking]: any = scannedPayload
                ? await tx.$queryRaw`SELECT * FROM "Booking" WHERE "id" = ${bookingId} FOR UPDATE`
                : await tx.$queryRaw`SELECT * FROM "Booking" WHERE "bookingCode" = ${bookingCode} AND "status" = 'pending' FOR UPDATE`
            if (!booking) throw new PublicError('Booking not found')
            bookingId = booking.id
            if (booking.status !== 'pending') throw new PublicError('Booking is not in pending state')
            if (new Date(booking.endAt).getTime() <= Date.now()) {
                await tx.booking.update({ where: { id: bookingId }, data: { status: 'expired' } })
                await restoreBookingEquipment(tx, bookingId)
                return null
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

            const [sport]: any = await tx.$queryRaw`SELECT * FROM "Sport" WHERE "id" = ${booking.sportId} FOR UPDATE`
            if (!sport) throw new PublicError('Associated Sport not found')
            if (isPublicSport(sport)) {
                const activePlayers = await tx.booking.aggregate({
                    where: { sportId: sport.id, status: 'active', endAt: { gt: new Date() } },
                    _sum: { numberOfPlayers: true },
                })
                const occupied = (activePlayers._sum.numberOfPlayers || 0) + (sport.manualOccupancy || 0)
                if (!sport.maxCapacity || !hasAvailableCapacity(sport.maxCapacity, occupied, booking.numberOfPlayers)) {
                    throw new PublicError('Facility is full.')
                }
            } else {
                const [court]: any = booking.courtId
                    ? await tx.$queryRaw`SELECT * FROM "Court" WHERE "id" = ${booking.courtId} FOR UPDATE`
                    : []
                if (!isCourtAvailable(court)) throw new PublicError('Court is no longer available.')
            }
            await issueBookingEquipment(tx, bookingId)

            const start = new Date(booking.startAt)
            const end = new Date(booking.endAt)
            const durationMs = bookingDurationMs(start, end)
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
        if (!result) return fail(new PublicError('Booking expired before QR scan.'))
        // await notifySportUpdate(result.sport.name, 'availability_changed')
        return ok(withBookingDisplay(result))
    } catch (error: any) {
        return fail(error, 'Failed to activate booking')
    }
}

export async function AddGymQRLog(UserGymId: string): Promise<ActionResponse> {
    return fail(new PublicError('Gym QR check-in has been retired. Create a Gym booking instead.'))
}

export async function endGymBooking(gymLogId: string): Promise<ActionResponse> {
    try {
        const actor = await requireUser()
        const now = getISTDate()
        const log = await prisma.$transaction(async (tx: any) => {
            await expireOverdueGymSessions(tx, now, actor.id)
            const [activeLog]: any = await tx.$queryRaw`SELECT * FROM "GymLog" WHERE "id" = ${gymLogId} FOR UPDATE`
            if (!activeLog || activeLog.status !== 'active' || activeLog.exitTime) {
                throw new PublicError('Gym booking is not active.')
            }
            if (activeLog.userId !== actor.id) throw new PublicError('You can only end your own gym booking.')
            const duration = parseFloat(((now.getTime() - new Date(activeLog.entryTime).getTime()) / (1000 * 60 * 60)).toFixed(2))
            return tx.gymLog.update({
                where: { id: gymLogId },
                data: { status: 'completed', exitTime: now, duration, updatedAt: now },
            })
        }, interactiveTransactionOptions)
        revalidatePath('/booking-scanner')
        revalidatePath('/dashboard')
        revalidatePath('/rto')
        return ok(withGymScanDisplay('finished', log))
    }
    catch (error: any) {
        return fail(error, 'Failed to end gym booking')
    }
}

async function assertBookingAccess(bookingId: string) {
    const user = await requireUser()
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { sport: true, court: true } })
    if (!booking) throw new PublicError('Booking not found')
    const role = normalizeRole(user.role)
    if (user.id !== booking.userId && role !== ROLES.ADMIN && role !== ROLES.GUARD) throw new PublicError('Unauthorized.')
    return booking
}

function revalidateAvailabilityPaths() {
    revalidatePath('/')
    revalidatePath('/book-court')
    revalidatePath('/rto')
    revalidatePath('/admin/sports')
}

async function assertSportAvailability(tx: any, sport: any, courtNo: string | undefined) {
    if (isPublicSport(sport)) {
        return
    }

    if (!courtNo) throw new PublicError('Please select a court.')
    const requestedCourt = await resolveCourtByNo(tx, sport.id, courtNo)
    if (!isCourtAvailable(requestedCourt)) throw new PublicError('Court is not available!')
}

function assertPlayerCountForSport(sport: any, numPlayers: number) {
    if (isPublicSport(sport) && numPlayers !== 1) {
        throw new PublicError('Public facility bookings are limited to one player.')
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
    const startAt = parseBookingDateTime(requiredString(data.date, 'Date', 20), requiredString(data.startTime, 'Start time', 20))
    const endAt = parseBookingDateTime(requiredString(data.enddate || data.date, 'End date', 20), requiredString(data.endTime, 'End time', 20))
    bookingDurationMs(startAt, endAt)
    return {
        userId: requiredString(data.userId, 'User ID'),
        sportId,
        courtId,
        numberOfPlayers: bookingPlayerCount(data.numberOfPlayers),
        startAt,
        endAt,
        status: 'pending',
        scanned: false,
    }
}

async function createBookingWithCode(tx: any, data: CreateBookingInput, sportId: string, courtId?: string | null) {
    for (let attempt = 0; attempt < 20; attempt++) {
        const bookingCode = randomInt(10_000).toString().padStart(4, '0')
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${bookingCode}))`
        const pendingBooking = await tx.booking.findFirst({ where: { bookingCode, status: 'pending' }, select: { id: true } })
        if (pendingBooking) continue

        return tx.booking.create({
            data: { ...normalizeBookingCreateData(data, sportId, courtId), bookingCode },
            include: { sport: true, court: true },
        })
    }
    throw new PublicError('Unable to generate a booking code. Please try again.')
}

function buildSignedQrUpdate(booking: any) {
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
