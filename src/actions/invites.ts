// done
'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from '@/interfaces'
import { fail, ok } from '@/lib/action-response'
import { requireUser } from '@/lib/auth-utils'
import { requiredEmail, requiredString } from '@/lib/validation'
import { parseBookingDateTime, resolveSportByName, withInviteDisplay } from '@/lib/normalized-data'

export async function createInvite(data: any): Promise<ActionResponse> {
    try {
        const user = await requireUser()
        const email = requiredEmail(data.email)
        if (user.email !== email && user.role !== 'Admin') throw new Error('Unauthorized.')

        const sportName = requiredString(data.sport, 'Sport')
        const sport = await resolveSportByName(prisma, sportName)
        const invite = await prisma.invite.create({
            data: {
                sportId: sport.id,
                venue: requiredString(data.venue, 'Venue'),
                scheduledAt: parseBookingDateTime(requiredString(data.date, 'Date', 20), requiredString(data.time, 'Time', 20)),
                email,
                name: requiredString(data.name || user.name, 'Name'),
                mobileNumber: requiredString(data.mobilenumber || data.mobileNumber || user.phone, 'Mobile number', 30),
                show: data.show ?? true,
            },
            include: { sportRef: true },
        })
        revalidatePath('/')
        return ok(withInviteDisplay(invite))
    }
    catch (error: any) {
        console.error('Create invite error:', error)
        return fail(error, 'Failed to create invite')
    }
}

export async function getInvites(): Promise<ActionResponse<any[]>> {
    try {
        await requireUser()
        const invites = await prisma.invite.findMany({ where: { show: true }, orderBy: { createdAt: 'desc' }, include: { sportRef: true } })
        return ok(invites.map(withInviteDisplay))
    }
    catch (error: any) {
        console.error('Get invites error:', error)
        return fail(error, 'Failed to get invites')
    }
}

export async function editInvite(id: string): Promise<ActionResponse> {
    try {
        await assertInviteAccess(id)
        const invite = await prisma.invite.update({ where: { id }, data: { show: false }, include: { sportRef: true } })
        revalidatePath('/')
        return ok(withInviteDisplay(invite))
    }
    catch (error: any) {
        console.error('Edit invite error:', error)
        return fail(error, 'Failed to edit invite')
    }
}

export async function deleteInvite(id: string): Promise<ActionResponse> {
    try {
        await assertInviteAccess(id)
        await prisma.invite.delete({ where: { id } })
        revalidatePath('/')
        return ok(null)
    }
    catch (error: any) {
        console.error('Delete invite error:', error);
        return fail(error, 'Failed to delete invite')
    }
}

async function assertInviteAccess(id: string) {
    const user = await requireUser()
    const invite = await prisma.invite.findUnique({ where: { id } })
    if (!invite) throw new Error('Invite not found.')
    if (invite.email !== user.email && user.role !== 'Admin') throw new Error('Unauthorized.')
    return invite
}

