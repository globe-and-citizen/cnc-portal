export const pendingWeeklyClaimsKey = (teamId?: string, userAddress?: string) => [
  'pending-weekly-claims',
  teamId,
  userAddress
]
export const signedWeeklyClaimsKey = (teamId?: string, userAddress?: string) => [
  'signed-weekly-claims',
  teamId,
  userAddress
]
