import type { Member, Team } from '@/types'

export interface TraderSafe {
  name: string
  address: string
  trader: Member
}

export const getTraderSafes = (team: Team) => {
  return team.members
    .filter((member) => {
      // Only include members marked as traders with deployed safes
      const isTrader = member.memberTeamsData?.[0]?.isTrader === true
      const hasSafeAddress = !!member.traderSafeAddress && member.traderSafeAddress !== ''
      return isTrader && hasSafeAddress
    })
    .map((member) => ({
      name: `${member.name}'s Safe`,
      address: member.traderSafeAddress!,
      trader: member
    }))
}
