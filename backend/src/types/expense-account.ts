import { Prisma } from '@prisma/client'

export type BudgetLimit = Prisma.JsonObject & {
  approvedAddress: string
  budgetData: Array<{
    budgetType: number
    value: number
  }>
  expiry: number
  tokenAddress: string
}
