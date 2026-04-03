import { vi } from 'vitest'
import {
  mockCashRemunerationReads,
  mockCashRemunerationWrites,
  mockExpenseAccountReads,
  mockExpenseAccountWrites
} from '../mocks/contract.mock'

vi.mock('@/composables/cashRemuneration/reads', () => ({
  useCashRemunerationOwner: vi.fn(() => mockCashRemunerationReads.owner)
}))

vi.mock('@/composables/expenseAccount/reads', () => ({
  useExpenseAccountOwner: vi.fn(() => mockExpenseAccountReads.owner)
}))

vi.mock('@/composables/cashRemuneration/writes', () => ({
  useCashRemunerationContractWrite: vi.fn((options?: { functionName?: string }) => {
    if (options?.functionName === 'ownerWithdrawAllToBank') {
      return mockCashRemunerationWrites.ownerWithdrawAllToBank
    }
    return mockCashRemunerationWrites.ownerWithdrawAllToBank
  })
}))

vi.mock('@/composables/expenseAccount/writes', () => ({
  useExpenseAccountContractWrite: vi.fn((options?: { functionName?: string }) => {
    if (options?.functionName === 'ownerWithdrawAllToBank') {
      return mockExpenseAccountWrites.ownerWithdrawAllToBank
    }
    return mockExpenseAccountWrites.ownerWithdrawAllToBank
  })
}))
