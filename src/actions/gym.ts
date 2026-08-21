'use server'

import prisma from '@/lib/prisma'
import { ActionResponse } from '@/interfaces'
import { fail, ok } from '@/lib/action-response'
import { ensureSelfOrAdmin } from '@/lib/auth-utils'
import { dateToDateString, dateToTimeString } from '@/lib/normalized-data'

export async function handleGymScan(userId: string): Promise<ActionResponse> {
    try {
        await ensureSelfOrAdmin(userId)
        return await prisma.$transaction(async (tx: any) => {
            const [user]: any = await tx.$queryRaw`SELECT id, name FROM "User" WHERE id = ${userId} FOR UPDATE`;
            if (!user) {
                return fail(new Error('User not found')) as ActionResponse;
            }

            const activeLog = await tx.gymLog.findFirst({
                where: { userId: userId, exitTime: null }
            });

            if (activeLog) {
                const exitTime = new Date();
                const entryTime = new Date(activeLog.entryTime);
                const durationMs = exitTime.getTime() - entryTime.getTime();
                const durationHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));

                const updatedLog = await tx.gymLog.update({
                    where: { id: activeLog.id },
                    data: { exitTime, duration: durationHours }
                });

                return ok({
                    type: 'check-out',
                    user: user.name,
                    duration: durationHours,
                    log: updatedLog
                }) as ActionResponse;
            } else {
                const newLog = await tx.gymLog.create({
                    data: { userId: userId, entryTime: new Date() }
                });

                return ok({
                    type: 'check-in',
                    user: user.name,
                    log: newLog
                }) as ActionResponse;
            }
        });
    }
    catch (error: any) {
        console.error('Gym scan error:', error)
        return fail(error, 'Failed to process gym scan')
    }
}

export async function getGymStats(userId: string): Promise<ActionResponse> {
    try {
        await ensureSelfOrAdmin(userId)
        const logs = await prisma.gymLog.findMany({
            where: { userId }, orderBy: { entryTime: 'desc' }
        })
        const completedLogs = logs.filter((log: any) => log.exitTime !== null)

        const totalHours = completedLogs.reduce((acc: number, log: any) => acc + (log.duration || 0), 0)
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)

        const weeklyHours = completedLogs
            .filter((log: any) => new Date(log.entryTime) >= weekAgo).reduce((acc: number, log: any) => acc + (log.duration || 0), 0)

        return ok({
                totalHours: (totalHours || 0).toFixed(1),
                weeklyHours: (weeklyHours || 0).toFixed(1),
                sessionsCount: logs.length,
                history: logs.slice(0, 10).map((log: any) => ({
                    id: log.id, date: dateToDateString(log.entryTime),
                    entryTime: dateToTimeString(log.entryTime),
                    exitTime: log.exitTime ? dateToTimeString(log.exitTime) : 'In Progress',
                    duration: log.duration ? `${log.duration} h` : '--', status: log.exitTime ? 'Completed' : 'Active'
                }))
            })
    }
    catch (error: any) {
        console.error('Get gym stats error:', error)
        return fail(error, 'Failed to get gym stats')
    }
}

export async function getGymBookings(userId: string): Promise<ActionResponse> {
    try{
        await ensureSelfOrAdmin(userId)
        const logs = await prisma.gymLog.findMany({
            where: { userId }, orderBy: { entryTime: 'desc' }
        });
        return ok({ documents: logs });
    }
    catch(error : any){
        console.error('Get gym bookings error: ', error);
        return fail(error, 'Failed to get gym bookings')
    }
}
