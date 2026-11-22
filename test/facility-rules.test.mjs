import assert from 'node:assert/strict'
import test from 'node:test'
import { isBookingPlayerCount, isPublicSport, MAX_BOOKING_PLAYERS } from '../src/lib/facility-rules.ts'

test('public facilities use people counts, while private facilities use courts', () => {
  assert.equal(isPublicSport({ sportType: 'public' }), true)
  assert.equal(isPublicSport({ sportType: 'private' }), false)
  assert.equal(isPublicSport({}), false)
})

test('a booking allows at most three players', () => {
  assert.equal(isBookingPlayerCount(MAX_BOOKING_PLAYERS), true)
  assert.equal(isBookingPlayerCount(MAX_BOOKING_PLAYERS + 1), false)
})
