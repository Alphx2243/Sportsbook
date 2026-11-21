import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/auth-utils'

export async function GET() {
  try {
    await requireUser()
    const schedule = await prisma.globalSchedule.findUnique({ where: { id: 'all-sports' } })
    if (!schedule) return new Response('Schedule not found.', { status: 404 })

    return new Response(new Uint8Array(schedule.pdfData), {
      headers: {
        'Content-Type': schedule.contentType,
        'Content-Disposition': `inline; filename="${schedule.fileName.replace(/["\\]/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return new Response('Unauthorized.', { status: 401 })
  }
}
