// done
'use server'
import prisma, { interactiveTransactionOptions } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { ActionResponse } from '@/interfaces'
import { fail, ok } from '@/lib/action-response'
import { ensureAdmin, getCurrentSessionUser, publicUserSelect, requireUser } from '@/lib/auth-utils'
import { requiredString } from '@/lib/validation'
import { syncUserSportExperiences, withUserDisplay } from '@/lib/normalized-data'
import { normalizeRole, ROLES } from '@/lib/roles'
import { validateRollNumber } from '@/lib/roll-number'

export async function updateUser(userId: string, data: {
    name?: string; phone?: string; rollNumber?: string; sportsExperience?: string[]; }): Promise<ActionResponse> {
    try {
        const actor = await getCurrentSessionUser()
        if (!actor || (actor.id !== userId && actor.role !== 'Admin')) throw new Error('Unauthorized.')
        const canEditIdentity = normalizeRole(actor.role) === ROLES.ADMIN

        const user = await prisma.$transaction(async (tx: any) => {
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    name: canEditIdentity && data.name !== undefined ? requiredString(data.name, 'Name') : undefined,
                    phone: data.phone !== undefined ? requiredString(data.phone, 'Phone', 30) : undefined,
                    rollNumber: canEditIdentity && data.rollNumber !== undefined ? validateRollNumber(data.rollNumber) : undefined,
                },
            });
            await syncUserSportExperiences(tx, userId, data.sportsExperience)
            const userWithExperience = await tx.user.findUnique({ where: { id: updatedUser.id }, select: publicUserSelect })
            return withUserDisplay(userWithExperience)
        }, interactiveTransactionOptions);
        return ok(user);
    }
    catch (error: any) {
        console.error("Update user error:", error);
        return fail(error, 'Failed to update user');
    }
}

export async function logout(): Promise<ActionResponse> {
    const cookieStore = await cookies()
    cookieStore.delete('session')
    return ok(null)
}

export async function getCurrentUser(): Promise<ActionResponse> {
    try {
        const user = await getCurrentSessionUser()
        if (!user) return fail(new Error('No session'))
        return ok(user)
    }
    catch (error: any) {
        return fail(error, 'Failed to get current user')
    }
}

export async function getUsers(): Promise<ActionResponse<{ documents: any[], total: number }>> {
    try {
        await ensureAdmin()
        const users = await prisma.user.findMany({ select: publicUserSelect });
        const documents = users.map(withUserDisplay)
        return ok({ documents, total: documents.length });
    }
    catch (error: any) {
        console.error("Get users error:", error);
        return fail(error, 'Failed to get users');
    }
}

export async function searchPublicPlayers(filters: {
    sportName?: string; skillLevel?: string; searchQuery?: string; page?: number; limit?: number
} = {}): Promise<ActionResponse<{ documents: any[], total: number }>> {
    try {
        await requireUser()
        const page = Math.max(1, Math.floor(filters.page || 1))
        const limit = Math.min(50, Math.max(1, Math.floor(filters.limit || 20)))
        const sportName = filters.sportName?.trim()
        const skillLevel = filters.skillLevel?.trim()
        const searchQuery = filters.searchQuery?.trim()
        const experienceWhere: any = {}
        if (sportName) experienceWhere.sport = { name: { equals: sportName, mode: 'insensitive' } }
        if (skillLevel) experienceWhere.level = { equals: skillLevel, mode: 'insensitive' }
        const where: any = {
            ...(searchQuery ? { name: { contains: searchQuery, mode: 'insensitive' } } : {}),
            ...(sportName || skillLevel ? { sportExperiences: { some: experienceWhere } } : {}),
        }
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                orderBy: { name: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    qrCodePath: true,
                    sportExperiences: { include: { sport: { select: { name: true } } } },
                },
            }),
            prisma.user.count({ where }),
        ])
        return ok({ documents: users.map(withUserDisplay), total })
    } catch (error: any) {
        console.error('Search public players error:', error)
        return fail(error, 'Failed to search players')
    }
}
