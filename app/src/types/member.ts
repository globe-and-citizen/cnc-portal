export interface Member {
  id: string
  name: string
  address: string
  teamId: number
  imageUrl?: string
  memberTeamsData?: Array<{ isTrader: boolean | null }>
  traderSafeAddress?: string
}
