import { readContract } from '@wagmi/core'
import type { Address } from 'viem'
import { expenseAccountEip712Abi } from '@/artifacts/abi/generated'
import { config } from '@/wagmi.config'

/** Check ownership on the approval's original contract before offering a state write. */
export async function isExpenseApprovalOwner(address: Address, wallet: string | undefined) {
  if (!wallet) return false
  try {
    const owner = await readContract(config, {
      address,
      abi: expenseAccountEip712Abi,
      functionName: 'owner'
    })
    return String(owner).toLowerCase() === wallet.toLowerCase()
  } catch {
    return false
  }
}
