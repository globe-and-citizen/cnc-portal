import type { User } from '@/types/user'
import type { Address } from 'viem'

export type SupportedTokens = 'native' | 'usdc' | 'sher' | 'usdc.e'

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
  overtimeRatePerHour?: RatePerHour[] | null
  maximumOvertimeHoursPerWeek?: number
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
  fileAttachments?: FileAttachment[] | null // Files stored as JSON in database
  wageId: number
  wage: Wage
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
}

export interface FileAttachment {
  fileType: string // MIME type (e.g., image/png, application/pdf)
  fileSize: number // Size in bytes
  fileKey: string // S3 storage key (unique identifier)
  fileUrl: string // Presigned download URL
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
  imageScreens?: string[] // Deprecated field kept for backwards compatibility
}

export interface WeeklyClaim {
  id: number
  // Ajout de 'disabled' pour refléter les états backend susceptibles de bloquer la soumission
  status: 'signed' | 'withdrawn' | 'pending' | 'disabled'
  weekStart: string // ISO date string
  data: {
    ownerAddress?: Address
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

// --- Wage Form Types (used by SetMemberWageModal) ---

export type RateFormKey = 'hourlyRate' | 'hourlyRateUsdc' | 'hourlyRateToken'
export type RateToggleKey = 'nativeEnabled' | 'usdcEnabled' | 'sherEnabled'
