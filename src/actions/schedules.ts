'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { fail, ok } from '@/lib/action-response'
import { ensureAdmin, requireUser } from '@/lib/auth-utils'
import type { ActionResponse } from '@/interfaces'

const MAX_SCHEDULE_SIZE = 10 * 1024 * 1024

export async function uploadSportSchedule(sportId: string, formData: FormData): Promise<ActionResponse> {
  try {
    await ensureAdmin()
    const file = formData.get('schedule')
    if (!(file instanceof File) || file.type !== 'application/pdf' || file.size === 0 || file.size > MAX_SCHEDULE_SIZE) {
      throw new Error('Upload a PDF no larger than 10 MB.')
    }

    const pdfData = new Uint8Array(await file.arrayBuffer())
    if (new TextDecoder().decode(pdfData.slice(0, 4)) !== '%PDF') {
      throw new Error('The uploaded file is not a valid PDF.')
    }

    const sport = await prisma.sport.findUnique({ where: { id: sportId }, select: { id: true } })
    if (!sport) throw new Error('Sport not found.')

    await prisma.sportSchedule.upsert({
      where: { sportId },
      update: { fileName: file.name, contentType: file.type, pdfData },
      create: { id: randomUUID(), sportId, fileName: file.name, contentType: file.type, pdfData },
    })
    revalidatePath('/rto')
    revalidatePath('/admin/sports')
    return ok(null)
  } catch (error: any) {
    return fail(error, 'Failed to upload schedule')
  }
}

export async function getSportScheduleMeta(sportId: string): Promise<ActionResponse<{ fileName: string; updatedAt: Date } | null>> {
  try {
    await requireUser()
    const schedule = await prisma.sportSchedule.findUnique({
      where: { sportId },
      select: { fileName: true, updatedAt: true },
    })
    return ok(schedule)
  } catch (error: any) {
    return fail(error, 'Failed to load schedule')
  }
}
