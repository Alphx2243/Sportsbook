import assert from 'node:assert/strict'
import test from 'node:test'
import { bookingDurationMs, extendedBookingEnd, outstandingBookingFilter, expireOverdueBookings } from '../src/lib/booking-state.ts'

test('cleanup leaves equipment alone when check-in wins after candidate selection', async () => {
  const now = new Date()
  const tx = {
    booking: {
      updateMany: async ({ where }) => {
        assert.deepEqual(where, { id: 'court-booking', status: 'pending', endAt: { lte: now } })
        return { count: 0 }
      },
    },
    bookingEquipment: { findMany: () => assert.fail('Active equipment must stay issued') },
  }
  let transactions = 0
  await expireOverdueBookings({
    booking: {
      findMany: async () => [{ id: 'court-booking' }],
      updateMany: async ({ where }) => assert.deepEqual(where, { status: 'active', endAt: { lte: now } }),
    },
    $transaction: async run => { transactions++; await run(tx) },
  }, now)
  assert.equal(transactions, 1)
})

test('booking duration must be positive and at most four hours, including across midnight', () => {
  const start = new Date('2026-01-01T23:00:00Z')
  const fourHours = 4 * 60 * 60 * 1000
  assert.equal(bookingDurationMs(start, new Date(+start + fourHours)), fourHours)
  for (const offset of [0, -1, fourHours + 1, NaN]) {
    assert.throws(() => bookingDurationMs(start, new Date(+start + offset)))
  }
})

test('only a still-active booking can extend up to the four-hour boundary', () => {
  const booking = { status: 'active', startAt: new Date(0), endAt: new Date(3 * 3600000) }
  const now = new Date(3600000)
  assert.equal(+extendedBookingEnd(booking, 60, now), 4 * 3600000)
  assert.throws(() => extendedBookingEnd(booking, 61, now))
  assert.throws(() => extendedBookingEnd(booking, 1, booking.endAt))
  for (const status of ['pending', 'returned', 'expired', 'completed']) {
    assert.throws(() => extendedBookingEnd({ ...booking, status }, 1, now))
  }
})

test('dashboard and rebooking filter requires check-in for expired private reservations', () => {
  assert.deepEqual(outstandingBookingFilter('student'), {
    userId: 'student',
    OR: [
      { status: { in: ['pending', 'active', 'returned'] } },
      { status: 'expired', scanned: true, sport: { sportType: 'private' } },
    ],
  })
})
