export const MAX_BOOKING_PLAYERS = 3

export function isPublicSport(sport: { sportType?: string | null }) {
  return sport.sportType === 'public'
}

export function isBookingPlayerCount(value: number) {
  return value >= 1 && value <= MAX_BOOKING_PLAYERS
}
