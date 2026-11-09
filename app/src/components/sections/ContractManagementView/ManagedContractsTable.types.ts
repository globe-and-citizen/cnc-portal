import type { User } from '@/types'
import type { ManagedContractReadModel } from '@/composables/contracts/readManagedContracts'

export interface ContractActionState {
  pendingActionCount: number
  canManage: boolean
  canTogglePause: boolean
  canReviewPendingActions: boolean
}

export type ManagedContractRow = ManagedContractReadModel

export interface ContractTableRow {
  contract: ManagedContractRow
  owner: User
  holdsValue: boolean
  actionState?: ContractActionState
}
