import prisma from '@/lib/prisma'
import { requireUser } from '@/lib/auth-utils'

export async function GET(_: Request, { params }: { params: Promise<{ sportId: string }> }) {
  try {
    await requireUser()
    const { sportId } = await params
    const schedule = await prisma.sportSchedule.findUnique({ where: { sportId } })
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
