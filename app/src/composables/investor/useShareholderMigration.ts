import { ref } from 'vue'
import { readContract, writeContract, waitForTransactionReceipt } from '@wagmi/core'
import type { Address } from 'viem'
import { config } from '@/wagmi.config'
import { INVESTOR_ABI } from '@/artifacts/abi/investors'
import { OFFICER_ABI } from '@/artifacts/abi/officer'
import { log } from '@/utils'

export interface Shareholder {
  shareholder: Address
  amount: bigint
}

export type MigrationStatus =
  | 'idle'
  | 'reading'
  | 'submitting'
  | 'waiting'
  | 'done'
  | 'noop-empty'
  | 'noop-already-migrated'
  | 'blocked-inconsistent'
  | 'error'

export interface MigrationResult {
  status: MigrationStatus
  migratedCount?: number
  shareholders?: readonly Shareholder[]
}

// Shared shareholder migration flow. Given the previous Officer and the new
// InvestorV1 address, reads the live shareholder list off the old contract,
// guards against double-mint via totalSupply checks, and calls distributeMint
// on the new contract.
//
// Guards:
//   - totalSupply(new) === 0 → safe to migrate
//   - totalSupply(new) === sum(oldShareholders) → already migrated (noop)
//   - anything else → blocked to avoid double-minting or inconsistent state
export function useShareholderMigration() {
  const status = ref<MigrationStatus>('idle')
  const error = ref<Error | null>(null)
  const isRunning = ref(false)

  const findInvestorAddress = async (officerAddress: Address): Promise<Address | null> => {
    const contracts = (await readContract(config, {
      address: officerAddress,
      abi: OFFICER_ABI,
      functionName: 'getTeam'
    })) as readonly { contractType: string; contractAddress: Address }[]
    return contracts.find((c) => c.contractType === 'InvestorV1')?.contractAddress ?? null
  }

  const reset = () => {
    status.value = 'idle'
    error.value = null
  }

  const migrate = async (opts: {
    previousOfficerAddress: Address
    newInvestorAddress: Address
  }): Promise<MigrationResult> => {
    isRunning.value = true
    error.value = null
    status.value = 'reading'
    try {
      const oldInvestor = await findInvestorAddress(opts.previousOfficerAddress)
      if (!oldInvestor) {
        throw new Error('Previous Officer has no InvestorV1 sub-contract to migrate from')
      }

      const shareholders = (await readContract(config, {
        address: oldInvestor,
        abi: INVESTOR_ABI,
        functionName: 'getShareholders'
      })) as readonly Shareholder[]

      if (shareholders.length === 0) {
        status.value = 'noop-empty'
        return { status: 'noop-empty', shareholders }
      }

      const newSupply = (await readContract(config, {
        address: opts.newInvestorAddress,
        abi: INVESTOR_ABI,
        functionName: 'totalSupply'
      })) as bigint

      if (newSupply > 0n) {
        const expected = shareholders.reduce((acc, s) => acc + s.amount, 0n)
        if (newSupply === expected) {
          status.value = 'noop-already-migrated'
          return { status: 'noop-already-migrated', shareholders }
        }
        status.value = 'blocked-inconsistent'
        throw new Error(
          `New InvestorV1 already has totalSupply=${newSupply} that does not match the old shareholders sum (${expected}). ` +
            `Migration aborted to avoid double-minting.`
        )
      }

      status.value = 'submitting'
      const hash = await writeContract(config, {
        address: opts.newInvestorAddress,
        abi: INVESTOR_ABI,
        functionName: 'distributeMint',
        args: [shareholders.map((s) => ({ shareholder: s.shareholder, amount: s.amount }))]
      })

      status.value = 'waiting'
      await waitForTransactionReceipt(config, { hash })

      status.value = 'done'
      return { status: 'done', migratedCount: shareholders.length, shareholders }
    } catch (e) {
      error.value = e as Error
      if (status.value !== 'blocked-inconsistent') {
        status.value = 'error'
      }
      log.error('Shareholder migration failed:', e)
      throw e
    } finally {
      isRunning.value = false
    }
  }

  return { migrate, reset, status, error, isRunning }
}
