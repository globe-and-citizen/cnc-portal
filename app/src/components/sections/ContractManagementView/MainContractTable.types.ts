import type { User } from '@/types'
import type { TableRow } from '@/types/table'

export interface ContractActionState {
  pendingActionCount: number
  canManage: boolean
  canReviewPendingActions: boolean
}

export interface ContractTableRow {
  contract: TableRow
  owner: User
  holdsValue: boolean
  actionState?: ContractActionState
}
