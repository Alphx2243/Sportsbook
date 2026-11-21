import assert from 'node:assert/strict'
import test from 'node:test'
import { isPublicSport } from '../src/lib/facility-rules.ts'

test('public facilities use people counts, while private facilities use courts', () => {
  assert.equal(isPublicSport({ sportType: 'public' }), true)
  assert.equal(isPublicSport({ sportType: 'private' }), false)
  assert.equal(isPublicSport({}), false)
})
