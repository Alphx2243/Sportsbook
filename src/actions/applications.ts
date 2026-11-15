'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { ActionResponse } from '@/interfaces'
import { fail, ok } from '@/lib/action-response'
import { requireUser } from '@/lib/auth-utils'
import { requiredEmail, requiredString } from '@/lib/validation'
import { resolveSportByName, withApplicationDisplay } from '@/lib/normalized-data'

export async function createApplication(data: any): Promise<ActionResponse> {
    try {
        const user = await requireUser()
        const email = requiredEmail(data.email)
        if (user.email !== email && user.role !== 'Admin') throw new Error('Unauthorized.')

        const sportName = requiredString(data.sportname, 'Sport name', 100)
        const sport = await resolveSportByName(prisma, sportName)
        const application = await prisma.guideApplication.create({
            data: {
                email,
                option: requiredString(data.option, 'Option', 50),
                sportId: sport.id,
                level: data.level ? requiredString(data.level, 'Level', 50) : null,
                resolved: data.resolved ?? false,
                time: data.time ? requiredString(data.time, 'Time', 100) : null,
                description: data.description ? requiredString(data.description, 'Description', 1000) : null,
                avDays: Array.isArray(data.avdays) ? data.avdays.map((d: unknown) => requiredString(d, 'Available day', 20)).join(',') : data.avdays,
            },
            include: { sport: true },
        })
        revalidatePath('/')
        return ok(withApplicationDisplay(application))
    }
    catch (error: any) {
        console.error('Create application error:', error);
        return fail(error, 'Failed to create application')
    }
}

export async function getApplications(): Promise<ActionResponse<any[]>> {
    try {
        await requireUser()
        const applications = await prisma.guideApplication.findMany({
            where: { resolved: false },
            orderBy: { createdAt: 'desc' },
            include: { sport: true },
        })
        return ok(applications.map(withApplicationDisplay))
    } catch (error: any) {
        console.error('Get applications error:', error)
        return fail(error, 'Failed to get applications')
    }
}

export async function deleteApplication(id: string): Promise<ActionResponse> {
    try {
        await assertApplicationAccess(id)
        await prisma.guideApplication.delete({ where: { id } })
        revalidatePath('/')
        return ok(null)
    } catch (error: any) {
        console.error('Delete application error:', error)
        return fail(error, 'Failed to delete application')
    }
}

async function assertApplicationAccess(id: string) {
    const user = await requireUser()
    const application = await prisma.guideApplication.findUnique({ where: { id } })
    if (!application) throw new Error('Application not found.')
    if (application.email !== user.email && user.role !== 'Admin') throw new Error('Unauthorized.')
    return application
}

