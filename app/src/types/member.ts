import type { Wage } from "@/types/cash-remuneration"

export interface Member {
  id: string
  name: string
  address: string
  teamId: number
  imageUrl?: string
  currentWage?: Wage
}
