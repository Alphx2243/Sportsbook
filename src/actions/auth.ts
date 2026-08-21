// done
'use server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'
import { ActionResponse } from '@/interfaces'
import { fail, ok } from '@/lib/action-response'
import { getCurrentSessionUser, publicUserSelect, requireUser } from '@/lib/auth-utils'
import { requiredString } from '@/lib/validation'
import { syncUserSportExperiences, withUserDisplay } from '@/lib/normalized-data'

export async function updateUser(userId: string, data: {
    name?: string; phone?: string; rollNumber?: string; sportsExperience?: string[]; }): Promise<ActionResponse> {
    try {
        const actor = await getCurrentSessionUser()
        if (!actor || (actor.id !== userId && actor.role !== 'Admin')) throw new Error('Unauthorized.')

        const user = await prisma.$transaction(async (tx: any) => {
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    name: data.name !== undefined ? requiredString(data.name, 'Name') : undefined,
                    phone: data.phone !== undefined ? requiredString(data.phone, 'Phone', 30) : undefined,
                    rollNumber: data.rollNumber !== undefined ? requiredString(data.rollNumber, 'Roll number', 50) : undefined,
                },
            });
            await syncUserSportExperiences(tx, userId, data.sportsExperience)
            const userWithExperience = await tx.user.findUnique({ where: { id: updatedUser.id }, select: publicUserSelect })
            return withUserDisplay(userWithExperience)
        });
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
        await requireUser()
        const users = await prisma.user.findMany({ select: publicUserSelect });
        const documents = users.map(withUserDisplay)
        return ok({ documents, total: documents.length });
    }
    catch (error: any) {
        console.error("Get users error:", error);
        return fail(error, 'Failed to get users');
    }
}

