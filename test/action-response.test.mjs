import assert from 'node:assert/strict'
import test from 'node:test'
import { fail } from '../src/lib/action-response.ts'
import { PublicError } from '../src/lib/public-error.js'

test('unexpected errors expose only the fallback and a matching log reference', (t) => {
  const log = t.mock.method(console, 'error', () => {})
  const result = fail(new Error('private database detail'), 'Could not load bookings')
  const [, { reference }] = log.mock.calls[0].arguments
  assert.ok(reference)
  assert.equal(result.error, `Could not load bookings. Reference: ${reference}`)
  assert.doesNotMatch(JSON.stringify(log.mock.calls[0].arguments), /private database detail/)
})

test('expected errors preserve the user-facing explanation', () => {
  assert.deepEqual(fail(new PublicError('Facility is full.')), { success: false, error: 'Facility is full.' })
})
