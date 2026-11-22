'use server'

import { PublicError } from '@/lib/public-error.js'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { fail, ok } from '@/lib/action-response'
import { ensureAdmin, requireUser } from '@/lib/auth-utils'
import type { ActionResponse } from '@/interfaces'

const GLOBAL_SCHEDULE_ID = 'all-sports'
const MAX_SCHEDULE_SIZE = 25 * 1024 * 1024

export async function uploadGlobalSchedule(formData: FormData): Promise<ActionResponse> {
  try {
    await ensureAdmin()
    const file = formData.get('schedule')
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_SCHEDULE_SIZE) {
      throw new PublicError('Upload a PDF no larger than 25 MB.')
    }

    const pdfData = new Uint8Array(await file.arrayBuffer())
    if (new TextDecoder().decode(pdfData.slice(0, 4)) !== '%PDF') {
      throw new PublicError('The uploaded file is not a valid PDF.')
    }

    await prisma.globalSchedule.upsert({
      where: { id: GLOBAL_SCHEDULE_ID },
      update: { fileName: file.name, contentType: 'application/pdf', pdfData },
      create: { id: GLOBAL_SCHEDULE_ID, fileName: file.name, contentType: 'application/pdf', pdfData },
    })
    revalidatePath('/rto')
    revalidatePath('/admin/sports')
    return ok(null)
  } catch (error: any) {
    return fail(error, 'Failed to upload schedule')
  }
}
export async function getGlobalScheduleMeta(): Promise<ActionResponse<{ fileName: string; updatedAt: Date } | null>> {
  try {
    await requireUser()
    const schedule = await prisma.globalSchedule.findUnique({
      where: { id: GLOBAL_SCHEDULE_ID },
      select: { fileName: true, updatedAt: true },
    })
    return ok(schedule)
  } catch (error: any) {
    return fail(error, 'Failed to load schedule')
  }
}
