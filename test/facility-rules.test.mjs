import assert from 'node:assert/strict'
import test from 'node:test'
import { countCourtStudents, hasAvailableCapacity, isBookingPlayerCount, isCourtAvailable, isPublicSport, MAX_BOOKING_PLAYERS } from '../src/lib/facility-rules.ts'
import { hasEquipmentCapacity } from '../src/lib/booking-state.ts'

test('public facilities use people counts, while private facilities use courts', () => {
  assert.equal(isPublicSport({ sportType: 'public' }), true)
  assert.equal(isPublicSport({ sportType: 'private' }), false)
  assert.equal(isPublicSport({}), false)
})

test('a booking allows at most three players', () => {
  assert.equal(isBookingPlayerCount(MAX_BOOKING_PLAYERS), true)
  assert.equal(isBookingPlayerCount(MAX_BOOKING_PLAYERS + 1), false)
})

test('facility capacity is checked when a player enters', () => {
  assert.equal(hasAvailableCapacity(10, 9, 1), true)
  assert.equal(hasAvailableCapacity(10, 10, 1), false)
})

test('equipment is issued only when stock is available at entry', () => {
  assert.equal(hasEquipmentCapacity({ inUse: 2, total: 3 }, 1), true)
  assert.equal(hasEquipmentCapacity({ inUse: 2, total: 3 }, 2), false)
})

test('a manually occupied court cannot start a pending booking', () => {
  assert.equal(isCourtAvailable({ isActive: true, manualOccupied: false }), true)
  assert.equal(isCourtAvailable({ isActive: true, manualOccupied: true }), false)
})

test('court student counts include every active booking for that court', () => {
  const bookings = [
    { courtId: 'court-1', numberOfPlayers: 2 },
    { courtId: 'court-1', numberOfPlayers: 1 },
    { courtId: 'court-2', numberOfPlayers: 3 },
  ]
  assert.equal(countCourtStudents(bookings, 'court-1'), 3)
  assert.equal(countCourtStudents(bookings, 'court-2'), 3)
})
