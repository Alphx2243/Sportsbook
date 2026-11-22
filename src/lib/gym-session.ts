export const MAX_GYM_SESSION_MS = 2 * 60 * 60 * 1000

export async function expireOverdueGymSessions(tx: any, now = new Date(), userId?: string) {
  const overdueSessions = await tx.gymLog.findMany({
    where: {
      ...(userId ? { userId } : {}),
      status: 'active',
      exitTime: null,
      entryTime: { lte: new Date(now.getTime() - MAX_GYM_SESSION_MS) },
    },
    select: { id: true, entryTime: true },
  })

  await Promise.all(overdueSessions.map((session: any) =>
    tx.gymLog.updateMany({
      where: { id: session.id, status: 'active', exitTime: null },
      data: {
        status: 'completed',
        exitTime: new Date(new Date(session.entryTime).getTime() + MAX_GYM_SESSION_MS),
        duration: 2,
        updatedAt: now,
      },
    })
  ))
}
