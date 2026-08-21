'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import type { ActionResponse } from '@/interfaces'
import { ensureAdmin, ensureRoles, publicUserSelect } from '@/lib/auth-utils'
import { v4 as uuidv4 } from 'uuid'
import { equipmentList, matchStatus, nonNegativeInt, requiredString, roleValue } from '@/lib/validation'
import { ROLES } from '@/lib/roles'
import { resolveSportByName, syncCourtsForSport, withMatchDisplay, withUserDisplay } from '@/lib/normalized-data'
import { notifyMatchesUpdate } from '@/lib/socket-notify'

export async function getAdminStats(): Promise<ActionResponse> {
    try {
        await ensureAdmin();
        const [userCount, bookingCount, sportCount, activeBookings] = await Promise.all([
            prisma.user.count(),
            prisma.booking.count(),
            prisma.sport.count(),
            prisma.booking.count({ where: { status: { in: ['active', 'expired'] } } })
        ])

        return {
            success: true,
            data: {
                userCount,
                bookingCount,
                sportCount,
                activeBookings
            }
        }
    } catch (error: any) {
        console.error('Get admin stats error:', error)
        return { success: false, error: error.message }
    }
}

export async function getAllUsers(): Promise<ActionResponse> {
    try {
        await ensureAdmin();
        const usersWithExperience = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: { ...publicUserSelect, sportExperiences: { include: { sport: true } } },
        })
        return { success: true, data: usersWithExperience.map(withUserDisplay) }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function createUser(data: any): Promise<ActionResponse> {
    return { success: false, error: 'Users must sign in with Google first.' }
}

export async function updateUserRole(userId: string, role: string): Promise<ActionResponse> {
    try {
        await ensureAdmin();
        await prisma.user.update({
            where: { id: userId },
            data: { role: roleValue(role) as any }
        })
        revalidatePath('/admin/users')
        return { success: true, data: null }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteUser(userId: string): Promise<ActionResponse> {
    try {
        await ensureAdmin();
        await prisma.$transaction([
            prisma.booking.deleteMany({ where: { userId } }),
            prisma.gymLog.deleteMany({ where: { userId } }),
            prisma.user.delete({ where: { id: userId } })
        ])
        revalidatePath('/admin/users')
        return { success: true, data: null }
    } catch (error: any) {
        console.error('Delete user error:', error)
        return { success: false, error: error.message }
    }
}

export async function updateSportInventory(sportId: string, data: any): Promise<ActionResponse> {
    try {
        await ensureRoles([ROLES.ADMIN, ROLES.FACILITY_MANAGER]);
        const parsedEquipment = data.totalEquipments ? equipmentList(data.totalEquipments) : undefined
        await prisma.$transaction(async (tx: any) => {
            const updatedSport = await tx.sport.update({
                where: { id: sportId },
                data: {
                    numberOfCourts: data.numberOfCourts !== undefined ? nonNegativeInt(data.numberOfCourts, 'Number of courts') : undefined,
                    maxCapacity: data.maxCapacity !== undefined ? nonNegativeInt(data.maxCapacity, 'Max capacity') : undefined,
                }
            })
            await syncCourtsForSport(
                tx,
                sportId,
                data.numberOfCourts !== undefined ? nonNegativeInt(data.numberOfCourts, 'Number of courts') : updatedSport.numberOfCourts,
                data.CourtData
            )

            if (parsedEquipment) {
                const existingEqs = await tx.equipment.findMany({ where: { sportId } });
                const incomingEqs = parsedEquipment;

                const incomingNames = incomingEqs.map((e: any) => e.name);
                await tx.equipment.deleteMany({
                    where: {
                        sportId,
                        name: { notIn: incomingNames }
                    }
                });

                for (const eq of incomingEqs) {
                    const existing = existingEqs.find((e: any) => e.name === eq.name);
                    if (existing) {
                        await tx.equipment.update({
                            where: { id: existing.id },
                            data: { total: eq.total, updatedAt: new Date() }
                        });
                    } else {
                        await tx.equipment.create({
                            data: {
                                id: uuidv4(),
                                name: eq.name,
                                total: eq.total,
                                inUse: 0,
                                sportId: sportId,
                                updatedAt: new Date()
                            }
                        });
                    }
                }
            }
        });

        revalidatePath('/admin/sports')
        revalidatePath('/')
        return { success: true, data: null }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getAllMatches(): Promise<ActionResponse> {
    try {
        await ensureRoles([ROLES.ADMIN, ROLES.FACILITY_MANAGER]);
        const matches = await prisma.match.findMany({
            orderBy: { createdAt: 'desc' },
            include: { sport: true },
        })
        return { success: true, data: matches.map(withMatchDisplay) }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function createMatch(data: any): Promise<ActionResponse> {
    try {
        await ensureRoles([ROLES.ADMIN, ROLES.FACILITY_MANAGER]);
        const sport = await resolveSportByName(prisma, requiredString(data.sportName, 'Sport name'))
        const match = await prisma.match.create({
            data: {
                sportId: sport.id,
                team1: requiredString(data.team1, 'Team 1'),
                team2: requiredString(data.team2, 'Team 2'),
                score1: nonNegativeInt(data.score1, 'Score 1', 0).toString(),
                score2: nonNegativeInt(data.score2, 'Score 2', 0).toString(),
                status: matchStatus(data.status) as any
            }
        })
        revalidatePath('/admin/matches')
        revalidatePath('/live-scores')
        await notifyMatchesUpdate();
        return { success: true, data: withMatchDisplay({ ...match, sport }) }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function updateMatch(matchId: string, data: any): Promise<ActionResponse> {
    try {
        await ensureRoles([ROLES.ADMIN, ROLES.FACILITY_MANAGER]);
        await prisma.match.update({
            where: { id: matchId },
            data: {
                score1: data.score1 !== undefined ? nonNegativeInt(data.score1, 'Score 1').toString() : undefined,
                score2: data.score2 !== undefined ? nonNegativeInt(data.score2, 'Score 2').toString() : undefined,
                status: data.status !== undefined ? matchStatus(data.status) as any : undefined,
                team1: data.team1 !== undefined ? requiredString(data.team1, 'Team 1') : undefined,
                team2: data.team2 !== undefined ? requiredString(data.team2, 'Team 2') : undefined,
            }
        })
        revalidatePath('/admin/matches')
        revalidatePath('/live-scores')
        await notifyMatchesUpdate();
        return { success: true, data: null }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function deleteMatch(matchId: string): Promise<ActionResponse> {
    try {
        await ensureRoles([ROLES.ADMIN, ROLES.FACILITY_MANAGER]);
        const match = await prisma.match.delete({
            where: { id: matchId }
        })
        revalidatePath('/admin/matches')
        revalidatePath('/live-scores')
        await notifyMatchesUpdate();
        return { success: true, data: null }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

