import type { Wage } from '@/types/cash-remuneration'

export interface Member {
  id: string
  name: string
  address: string
  teamId: number
  imageUrl?: string
  currentWage?: Wage
  scheduledWage?: Wage | null // Present when a wage change is scheduled for a future week.
}
