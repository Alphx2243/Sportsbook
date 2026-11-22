export const MAX_BOOKING_PLAYERS = 3

export function isPublicSport(sport: { sportType?: string | null }) {
  return sport.sportType === 'public'
}

export function isBookingPlayerCount(value: number) {
  return value >= 1 && value <= MAX_BOOKING_PLAYERS
}

export function hasAvailableCapacity(maxCapacity: number, occupied: number, incoming: number) {
  return occupied + incoming <= maxCapacity
}

export function isCourtAvailable(court: { isActive?: boolean; manualOccupied?: boolean } | null) {
  return Boolean(court?.isActive) && !court?.manualOccupied
}

export function countCourtStudents(bookings: Array<{ courtId?: string | null; numberOfPlayers?: number | null }>, courtId: string) {
  return bookings.reduce((total, booking) => total + (booking.courtId === courtId ? booking.numberOfPlayers || 0 : 0), 0)
}
