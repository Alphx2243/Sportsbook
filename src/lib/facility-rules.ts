export function isPublicSport(sport: { sportType?: string | null }) {
  return sport.sportType === 'public'
}
