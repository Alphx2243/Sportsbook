const SUPPORTED_ROLL_NUMBER = /^[A-Z0-9][A-Z0-9._/-]{3,24}$/i

export function validateRollNumber(value: string) {
  const normalized = value.trim().toUpperCase()
  if (!SUPPORTED_ROLL_NUMBER.test(normalized)) {
    throw new Error('Roll number format is not supported.')
  }
  return normalized
}

export function deriveRollNumberFromInstituteEmail(email: string, displayName?: string) {
  const localPart = email.split('@')[0].trim().toLowerCase()
  const compactLocalPart = localPart.replace(/[^a-z0-9]/g, '')
  const nameParts = (displayName || '')
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)

  const prefixes = [nameParts.join(''), nameParts[0]].filter(Boolean)
  let candidate = compactLocalPart
  for (const prefix of prefixes) {
    if (candidate.startsWith(prefix) && candidate.length > prefix.length) {
      candidate = candidate.slice(prefix.length)
      break
    }
  }

  // Legacy BTech email aliases commonly omit the leading "20" from the roll number.
  if (/^\d{5}$/.test(candidate)) candidate = `20${candidate}`

  const preferred = candidate.length >= 4 ? candidate : compactLocalPart
  return validateRollNumber(preferred)
}
