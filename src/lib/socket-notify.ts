import { requireServerEnv } from '@/lib/env'

const socketBaseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3005'

export async function notifySportUpdate(sportName: string, type: string = 'availability_changed') {
    await postSocketEvent('/notify-update', { sportName, type }, 'sport update')
}

export async function notifyMatchesUpdate() {
    await postSocketEvent('/notify-matches', undefined, 'matches update')
}

async function postSocketEvent(path: string, body: unknown, label: string) {
    const secret = requireServerEnv('SOCKET_INTERNAL_SECRET')
    try {
        const response = await fetch(`${socketBaseUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-socket-secret': secret,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        })
        if (!response.ok) console.error(`[SOCKET] ${label} failed with ${response.status}`)
    } catch (error) {
        console.error(`[SOCKET] Failed to send ${label}:`, error)
    }
}
