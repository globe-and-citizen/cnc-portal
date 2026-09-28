import type { User } from '@/types'
import type { TableRow } from '@/types/table'
import type {
  ContractPauseCapability,
  ContractPauseStatus
} from '@/utils/contracts/pauseCapabilities'

export interface ContractActionState {
  pendingActionCount: number
  canManage: boolean
  canChangeStatus: boolean
  canReviewPendingActions: boolean
}

export interface ManagedContractRow extends TableRow {
  pauseCapability?: ContractPauseCapability
  pauseStatus: ContractPauseStatus
}

export interface ContractTableRow {
  contract: ManagedContractRow
  owner: User
  holdsValue: boolean
  actionState?: ContractActionState
}
