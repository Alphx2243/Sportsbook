'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from '@/interfaces'
import { fail, ok } from '@/lib/action-response'
import { ensureAdmin } from '@/lib/auth-utils'
import { matchStatus, nonNegativeInt, requiredString } from '@/lib/validation'
import { resolveSportByName, withMatchDisplay } from '@/lib/normalized-data'
import { notifyMatchesUpdate } from '@/lib/socket-notify'

export async function getMatches(filters: { status?: string; sportName?: string } = {}): Promise<ActionResponse<{ documents: any[], total: number }>> {
    try {
        const where: any = {}
        if (filters.status) where.status = matchStatus(filters.status)
        if (filters.sportName) {
            const sport = await prisma.sport.findUnique({ where: { name: requiredString(filters.sportName, 'Sport name') } })
            where.sportId = sport?.id || '__missing__'
        }

        const matches = await prisma.match.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { sport: true },
        })
        const documents = matches.map(withMatchDisplay)
        return ok({ documents, total: documents.length })
    }
    catch (error: any) {
        console.error('Get matches error:', error)
        return fail(error, 'Failed to get matches')
    }
}

export async function createMatch(data: any): Promise<ActionResponse> {
    try {
        await ensureAdmin()
        const sport = await resolveSportByName(prisma, requiredString(data.sportName, 'Sport name'))
        const match = await prisma.match.create({
            data: {
                sportId: sport.id,
                team1: requiredString(data.team1, 'Team 1'),
                team2: requiredString(data.team2, 'Team 2'),
                score1: nonNegativeInt(data.score1, 'Score 1', 0).toString(),
                score2: nonNegativeInt(data.score2, 'Score 2', 0).toString(),
                status: matchStatus(data.status) as any,
            },
        })
        revalidatePath('/live-scores')
        await notifyMatchesUpdate();
        return ok(withMatchDisplay({ ...match, sport }))
    }
    catch (error: any) {
        console.error('Create match error:', error)
        return fail(error, 'Failed to create match')
    }
}

export async function updateMatch(id: string, data: any): Promise<ActionResponse> {
    try {
        await ensureAdmin()
        const match = await prisma.match.update({
            where: { id },
            data: {
                score1: data.score1 !== undefined ? nonNegativeInt(data.score1, 'Score 1').toString() : undefined,
                score2: data.score2 !== undefined ? nonNegativeInt(data.score2, 'Score 2').toString() : undefined,
                status: data.status !== undefined ? matchStatus(data.status) as any : undefined,
            },
        })
        revalidatePath('/live-scores')
        await notifyMatchesUpdate();
        return ok(match)
    }
    catch (error: any) {
        console.error('Update match error:', error)
        return fail(error, 'Failed to update match')
    }
}

export async function deleteMatch(id: string): Promise<ActionResponse> {
    try {
        await ensureAdmin()
        await prisma.match.delete({ where: { id } })
        revalidatePath('/live-scores')
        await notifyMatchesUpdate();
        return ok(null)
    }
    catch (error: any) {
        console.error('Delete match error:', error)
        return fail(error, 'Failed to delete match')
    }
}

