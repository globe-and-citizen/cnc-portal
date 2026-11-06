import type { User } from '@/types'
import type { TeamContractReadModel } from '@/composables/contracts/readTeamContracts'

export interface ContractActionState {
  pendingActionCount: number
  canManage: boolean
  canChangeStatus: boolean
  canReviewPendingActions: boolean
}

export type ManagedContractRow = TeamContractReadModel

export interface ContractTableRow {
  contract: ManagedContractRow
  owner: User
  holdsValue: boolean
  actionState?: ContractActionState
}
