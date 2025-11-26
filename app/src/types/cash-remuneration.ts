import type { User } from '@/types/user'
import type { Address } from 'viem'

export type SupportedTokens = 'native' | 'usdc' | 'sher'

export interface RatePerHour {
  type: SupportedTokens
  amount: number
}
export interface WageClaim {
  hoursWorked: number
  hourlyRate: number | bigint
  date: number
  employeeAddress: string
}
export interface Wage {
  id: number
  teamId: number
  userAddress: Address
  ratePerHour: RatePerHour[]
  cashRatePerHour?: number //@deprecated use ratePerHour instead
  tokenRatePerHour?: number //@deprecated use ratePerHour instead
  usdcRatePerHour?: number //@deprecated use ratePerHour instead
  maximumHoursPerWeek: number
  nextWageId: number | null
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  user?: User
}

export interface Claim {
  id: number
  hoursWorked: number
  dayWorked: string // ISO date string
  memo: string
  wageId: number
  wage: Wage
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
}

export interface ClaimFormData {
  hoursWorked: string
  memo: string
  dayWorked: string
}

export interface ClaimSubmitPayload {
  hoursWorked: number
  memo: string
  dayWorked: string
}

export interface WeeklyClaim {
  id: number
  // Ajout de 'disabled' pour refléter les états backend susceptibles de bloquer la soumission
  status: 'signed' | 'withdrawn' | 'pending' | 'disabled'
  weekStart: string // ISO date string
  data: {
    ownerAddress: Address
  }
  memberAddress: Address
  teamId: number
  signature: string | null
  wageId: number
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  hoursWorked: number // total hours worked in the week, calculated field
  wage: Wage
  claims: Claim[]
  member?: User
}

// export interface ClaimResponse {
//   id: number
//   status: 'pending' | 'signed' | 'withdrawn' | 'disabled' // Assuming these are the possible statuses
//   hoursWorked: number
//   signature: string | null
//   tokenTx: string | null
//   wageId: number
//   createdAt: string // ISO date string
//   updatedAt: string // ISO date string

//   wage: Wage

//   // createdAt: string | Date | number
//   // address: string
//   // id: number
//   // hoursWorked: number
//   // hourlyRate: string
//   // name: string | null
//   // status: string
//   // cashRemunerationSignature: string | null
// }

// export interface WageResponse {
//   userAddress: Address
//   maximumHoursPerWeek: number
//   ratePerHour?: Array<{ type: string; amount: number }>
//   cashRatePerHour: number
//   tokenRatePerHour?: number
//   usdcRatePerHour?: number
//   sherRatePerHour?: number
// }

// export type CRSignClaim = Pick<
//   ClaimResponse,
//   'id' | 'status' | 'hoursWorked' | 'createdAt' | 'signature'
// > & {
//   wage: {
//     ratePerHour: RatePerHour
//     userAddress: Address
//   }
// }

// export type WeeklyClaimResponse = {
//   id: number
//   status: 'signed' | 'withdrawn' | 'pending'
//   weekStart: string
//   data: {
//     ownerAddress: Address
//   }
//   memberAddress: Address
//   teamId: 2
//   signature: null
//   wageId: 2
//   createdAt: string
//   updatedAt: string
//   wage: {
//     id: number
//     teamId: number
//     userAddress: Address
//     ratePerHour: RatePerHour
//     cashRatePerHour: number
//     tokenRatePerHour: number
//     usdcRatePerHour: number
//     maximumHoursPerWeek: number
//     nextWageId: number | null
//     createdAt: string
//     updatedAt: string
//   }
//   claims: {
//     id: number
//     status: 'pending' | 'signed' | 'withdrawn' | 'disabled'
//     hoursWorked: number
//     dayWorked: string
//     memo: string
//     signature: string | null
//     tokenTx: string | null
//     wageId: number
//     weeklyClaimId: number
//     createdAt: string
//     updatedAt: string
//   }[]
//   member: {
//     address: Address
//     name: string
//     imageUrl: string
//   }
// }[]
