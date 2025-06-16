import type { Address } from 'viem'

export type SupportedTokens = 'native' | 'usdc' | 'sher'

export type RatePerHour = Array<{ type: SupportedTokens; amount: number }>

export interface WageClaim {
  hoursWorked: number
  hourlyRate: number | bigint
  date: number
  employeeAddress: string
}

export interface ClaimResponse {
  id: number
  status: 'pending' | 'signed' | 'withdrawn' | 'disabled' // Assuming these are the possible statuses
  hoursWorked: number
  signature: string | null
  tokenTx: string | null
  wageId: number
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  wage: {
    id: number
    teamId: number
    userAddress: string
    ratePerHour: RatePerHour //Array<{ type: string; amount: number }>
    cashRatePerHour: number
    tokenRatePerHour: number
    usdcRatePerHour: number
    maximumHoursPerWeek: number
    nextWageId: number | null
    createdAt: string // ISO date string
    updatedAt: string // ISO date string
    user: {
      address: string
      name: string
    }
  }

  // createdAt: string | Date | number
  // address: string
  // id: number
  // hoursWorked: number
  // hourlyRate: string
  // name: string | null
  // status: string
  // cashRemunerationSignature: string | null
}

export interface WageResponse {
  userAddress: Address
  maximumHoursPerWeek: number
  ratePerHour?: Array<{ type: string; amount: number }>
  cashRatePerHour: number
  tokenRatePerHour?: number
  usdcRatePerHour?: number
  sherRatePerHour?: number
}

export type CRSignClaim = Pick<
  ClaimResponse,
  'id' | 'status' | 'hoursWorked' | 'createdAt' | 'signature'
> & {
  wage: {
    ratePerHour: RatePerHour
    userAddress: Address
  }
}
