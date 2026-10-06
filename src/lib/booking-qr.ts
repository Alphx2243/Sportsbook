import { createHmac, timingSafeEqual } from 'crypto'
import { requireServerEnv } from './env'

const QR_VERSION = 2

type BookingQrFields = {
  bookingId: string
  userId: string
  sportId: string
  numberOfPlayers: number
  startAt: Date | string
  endAt: Date | string
  courtId?: string | null
}

type BookingQrPayload = BookingQrFields & {
  qrVersion: number
  qrHash: string
  [key: string]: unknown
}

type CompactBookingQrPayload = {
  v: number
  b: string
  u: string
  s: string
  n: number
  a: string
  e: string
  c?: string
  h: string
}

function canonicalBookingQrData(fields: BookingQrFields) {
  return [
    fields.bookingId,
    fields.userId,
    fields.sportId,
    String(fields.numberOfPlayers),
    new Date(fields.startAt).toISOString(),
    new Date(fields.endAt).toISOString(),
    fields.courtId || '',
  ].join('|')
}

export function createBookingQrHash(fields: BookingQrFields) {
  return createHmac('sha256', requireServerEnv('QR_CODE_SECRET'))
    .update(canonicalBookingQrData(fields))
    .digest('base64url')
}

function createLegacyBookingQrHash(fields: BookingQrFields) {
  return createHmac('sha256', requireServerEnv('QR_CODE_SECRET'))
    .update(canonicalBookingQrData(fields))
    .digest('hex')
}

export function createBookingQrPayload(fields: BookingQrFields): CompactBookingQrPayload {
  const qrHash = createBookingQrHash(fields)
  return {
    v: QR_VERSION,
    b: fields.bookingId,
    u: fields.userId,
    s: fields.sportId,
    n: fields.numberOfPlayers,
    a: new Date(fields.startAt).toISOString(),
    e: new Date(fields.endAt).toISOString(),
    ...(fields.courtId ? { c: fields.courtId } : {}),
    h: qrHash,
  }
}

export function parseBookingQrPayload(raw: string): BookingQrPayload {
  let rawPayload: BookingQrPayload | CompactBookingQrPayload
  const normalizedRaw = normalizeRawBookingQrData(raw)
  try {
    rawPayload = JSON.parse(normalizedRaw)
  } catch {
    throw new Error('Invalid QR code format.')
  }

  const payload = normalizeBookingQrPayload(rawPayload)

  if (!payload.bookingId || !payload.userId || !payload.sportId || !payload.qrHash) {
    throw new Error('This QR code is missing its secure booking signature.')
  }

  return payload
}

export function verifyBookingQrPayload(raw: string, booking: BookingQrFields & { qrHash?: string | null }) {
  const payload = parseBookingQrPayload(raw)

  if (payload.bookingId !== booking.bookingId || payload.userId !== booking.userId) {
    throw new Error('This QR code does not match the booking record.')
  }

  const expectedHashes = [createBookingQrHash(booking), createLegacyBookingQrHash(booking)]
  const storedHashMatches = !booking.qrHash
    || safeEqual(payload.qrHash, booking.qrHash)
    || expectedHashes.some((hash) => safeEqual(booking.qrHash || '', hash))

  if (!expectedHashes.some((hash) => safeEqual(payload.qrHash, hash)) || !storedHashMatches) {
    throw new Error('This QR code could not be verified.')
  }

  return payload
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function normalizeBookingQrPayload(payload: BookingQrPayload | CompactBookingQrPayload): BookingQrPayload {
  if (isCompactBookingQrPayload(payload)) {
    return {
      bookingId: payload.b,
      userId: payload.u,
      sportId: payload.s,
      numberOfPlayers: payload.n,
      startAt: payload.a,
      endAt: payload.e,
      courtId: payload.c || null,
      qrVersion: payload.v,
      qrHash: payload.h,
    }
  }

  return payload
}

function isCompactBookingQrPayload(payload: BookingQrPayload | CompactBookingQrPayload): payload is CompactBookingQrPayload {
  return typeof (payload as CompactBookingQrPayload).b === 'string'
}

function normalizeRawBookingQrData(raw: string) {
  const trimmed = raw.trim()

  try {
    const parsedUrl = new URL(trimmed)
    const data = parsedUrl.searchParams.get('data')
    if (data) return normalizeRawBookingQrData(data)
  } catch {
  }

  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}
